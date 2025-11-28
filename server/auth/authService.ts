import { storage } from '../storage';
import { generateTokenPair, verifyToken, type TokenPayload } from '../security/jwtConfig';
import { 
  logSuccessfulLogin, 
  logFailedLogin, 
  logSecurityEvent 
} from '../security/logger';
import { 
  recordFailedLogin, 
  resetFailedLogins, 
  isIPBanned 
} from '../security/rateLimiter';
import { 
  generateTOTPSecret, 
  verifyTOTP, 
  generateBackupCodes, 
  hashBackupCode,
  generateQRCode 
} from '../security/twoFactor';
import { hashPassword, verifyPassword } from '../security/password';
import type { User } from '@shared/schema';

export interface LoginResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  requires2FA?: boolean;
  message?: string;
}

export interface Register2FAResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Login with email/password and optional 2FA
 * STEP 2: Dual Authentication - Returns JWT tokens + maintains session compatibility
 */
export async function login(
  email: string, 
  password: string, 
  totpCode: string | undefined,
  ip: string
): Promise<LoginResult> {
  // Check if IP is banned
  if (isIPBanned(ip)) {
    return {
      success: false,
      message: 'Your IP has been temporarily banned due to too many failed login attempts. Please try again in 10 minutes.'
    };
  }

  try {
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user || !user.password) {
      logFailedLogin(email, ip, 'User not found or no password set');
      recordFailedLogin(ip);
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password);
    
    if (!passwordValid) {
      logFailedLogin(email, ip, 'Invalid password');
      recordFailedLogin(ip);
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if 2FA is enabled for this user
    const twoFactorAuth = await storage.getTwoFactorAuth(user.id);
    
    if (twoFactorAuth && twoFactorAuth.enabled) {
      // 2FA is enabled - verify TOTP code
      if (!totpCode) {
        return {
          success: false,
          requires2FA: true,
          message: 'Two-factor authentication code required'
        };
      }

      // Verify TOTP code
      const totpValid = verifyTOTP(twoFactorAuth.secret, totpCode);
      
      if (!totpValid) {
        // Check backup codes as fallback
        const backupCodes = (twoFactorAuth.backupCodes as string[]) || [];
        const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));
        const backupCodeValid = hashedBackupCodes.includes(hashBackupCode(totpCode));
        
        if (!backupCodeValid) {
          logFailedLogin(email, ip, '2FA code invalid');
          recordFailedLogin(ip);
          return {
            success: false,
            message: 'Invalid two-factor authentication code'
          };
        }
        
        // Backup code used - remove it from the list
        const codeIndex = backupCodes.findIndex(code => hashBackupCode(code) === hashBackupCode(totpCode));
        if (codeIndex !== -1) {
          backupCodes.splice(codeIndex, 1);
          await storage.updateTwoFactorAuth(user.id, { backupCodes });
          logSecurityEvent('BACKUP_CODE_USED', user.id, ip, { email });
        }
      }
    }

    // Login successful - reset failed attempts
    resetFailedLogins(ip);

    // Generate JWT tokens (12-hour access token, 7-day refresh token)
    const { accessToken, refreshToken } = generateTokenPair({
      id: user.id,
      role: user.role,
      email: user.email!
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await storage.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: ip,
      userAgent: 'Unknown' // Will be set from request headers in route
    });

    // Log successful login
    logSuccessfulLogin(user.id, email, ip);
    
    // Log to audit trail
    await storage.logUserAction({
      userId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: ip,
      details: { email, method: twoFactorAuth?.enabled ? '2FA' : 'password' }
    });

    return {
      success: true,
      user: {
        ...user,
        password: null // Don't return password hash
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    logFailedLogin(email, ip, error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string, ip: string): Promise<{ accessToken?: string; message?: string }> {
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return { message: 'Invalid token type' };
    }

    // Check if refresh token exists in database and is not revoked
    const storedToken = await storage.getRefreshToken(refreshToken);
    
    if (!storedToken || storedToken.revokedAt) {
      logSecurityEvent('REFRESH_TOKEN_INVALID', decoded.userId, ip, { reason: 'Token not found or revoked' });
      return { message: 'Invalid or revoked refresh token' };
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      logSecurityEvent('REFRESH_TOKEN_EXPIRED', decoded.userId, ip);
      return { message: 'Refresh token expired' };
    }

    // Generate new access token
    const { accessToken } = generateTokenPair({
      id: decoded.userId,
      role: decoded.role,
      email: decoded.email
    });

    logSecurityEvent('TOKEN_REFRESHED', decoded.userId, ip);

    return { accessToken };
  } catch (error) {
    logSecurityEvent('TOKEN_REFRESH_FAILED', null, ip, { error: error instanceof Error ? error.message : 'Unknown' });
    return { message: 'Failed to refresh token' };
  }
}

/**
 * Logout - Revoke refresh token
 */
export async function logout(refreshToken: string, userId: string, ip: string): Promise<void> {
  try {
    await storage.revokeRefreshToken(refreshToken);
    
    await storage.logUserAction({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: ip
    });
    
    logSecurityEvent('LOGOUT', userId, ip);
  } catch (error) {
    logSecurityEvent('LOGOUT_FAILED', userId, ip, { error: error instanceof Error ? error.message : 'Unknown' });
  }
}

/**
 * Logout all sessions - Revoke all refresh tokens for user
 */
export async function logoutAll(userId: string, ip: string): Promise<void> {
  try {
    await storage.revokeAllRefreshTokens(userId);
    
    await storage.logUserAction({
      userId,
      action: 'LOGOUT_ALL',
      resource: 'auth',
      ipAddress: ip
    });
    
    logSecurityEvent('LOGOUT_ALL', userId, ip);
  } catch (error) {
    logSecurityEvent('LOGOUT_ALL_FAILED', userId, ip, { error: error instanceof Error ? error.message : 'Unknown' });
  }
}

/**
 * STEP 3: Setup 2FA for user
 */
export async function setup2FA(userId: string, email: string, ip: string): Promise<Register2FAResult> {
  // Generate TOTP secret
  const { secret, qrCodeUrl } = generateTOTPSecret(email);
  
  // Generate backup codes
  const backupCodes = generateBackupCodes(10);
  
  // Generate QR code as base64 image
  const qrCode = await generateQRCode(qrCodeUrl);
  
  // Store in database (not enabled until verified)
  await storage.createTwoFactorAuth({
    userId,
    secret,
    enabled: false,
    backupCodes: backupCodes.map(code => hashBackupCode(code))
  });
  
  logSecurityEvent('2FA_SETUP_INITIATED', userId, ip);
  
  return {
    secret,
    qrCode,
    backupCodes // Return plain codes to user (only shown once)
  };
}

/**
 * Verify and enable 2FA
 */
export async function verify2FA(userId: string, totpCode: string, ip: string): Promise<{ success: boolean; message: string }> {
  const twoFactorAuth = await storage.getTwoFactorAuth(userId);
  
  if (!twoFactorAuth) {
    return { success: false, message: '2FA not set up for this user' };
  }
  
  // Verify TOTP code
  const valid = verifyTOTP(twoFactorAuth.secret, totpCode);
  
  if (!valid) {
    logSecurityEvent('2FA_VERIFICATION_FAILED', userId, ip);
    return { success: false, message: 'Invalid verification code' };
  }
  
  // Enable 2FA
  await storage.updateTwoFactorAuth(userId, { enabled: true });
  
  await storage.logUserAction({
    userId,
    action: '2FA_ENABLED',
    resource: 'auth',
    ipAddress: ip
  });
  
  logSecurityEvent('2FA_ENABLED', userId, ip);
  
  return { success: true, message: 'Two-factor authentication enabled successfully' };
}

/**
 * Disable 2FA
 */
export async function disable2FA(userId: string, password: string, ip: string): Promise<{ success: boolean; message: string }> {
  // Verify password before disabling 2FA
  const user = await storage.getUser(userId);
  
  if (!user || !user.password) {
    return { success: false, message: 'User not found' };
  }
  
  const passwordValid = await verifyPassword(password, user.password);
  
  if (!passwordValid) {
    return { success: false, message: 'Invalid password' };
  }
  
  // Disable 2FA
  await storage.deleteTwoFactorAuth(userId);
  
  await storage.logUserAction({
    userId,
    action: '2FA_DISABLED',
    resource: 'auth',
    ipAddress: ip
  });
  
  logSecurityEvent('2FA_DISABLED', userId, ip);
  
  return { success: true, message: 'Two-factor authentication disabled successfully' };
}

// Export as default object for easier importing
export const authService = {
  login,
  refreshAccessToken,
  logout,
  logoutAll,
  setup2FA,
  verify2FA,
  disable2FA,
  hashPassword,
  verifyPassword
};
