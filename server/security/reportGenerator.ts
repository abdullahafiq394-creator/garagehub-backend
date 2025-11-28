import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SecurityConfig {
  jwtAccessTokenExpiry: string;
  jwtRefreshTokenExpiry: string;
  rateLimits: {
    auth: { windowMs: string; max: number };
    api: { windowMs: string; max: number };
    order: { windowMs: string; max: number };
    upload: { windowMs: string; max: number };
  };
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  ipBanning: {
    maxFailedAttempts: number;
    banWindowMs: string;
  };
  twoFactorAuth: {
    enabled: boolean;
    algorithm: string;
    backupCodesCount: number;
  };
  auditLogging: {
    enabled: boolean;
    retentionPeriod: string;
  };
}

/**
 * Generate comprehensive security report
 */
export function generateSecurityReport(): string {
  const config: SecurityConfig = {
    jwtAccessTokenExpiry: '15 minutes',
    jwtRefreshTokenExpiry: '7 days',
    rateLimits: {
      auth: { windowMs: '15 minutes', max: 5 },
      api: { windowMs: '15 minutes', max: 100 },
      order: { windowMs: '1 hour', max: 20 },
      upload: { windowMs: '1 hour', max: 10 }
    },
    passwordRequirements: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    ipBanning: {
      maxFailedAttempts: 5,
      banWindowMs: '10 minutes'
    },
    twoFactorAuth: {
      enabled: true,
      algorithm: 'SHA1 (TOTP)',
      backupCodesCount: 10
    },
    auditLogging: {
      enabled: true,
      retentionPeriod: '7-30 days (rotating)'
    }
  };

  const report = `# GarageHub Security Configuration Report
Generated: ${new Date().toISOString()}

## Executive Summary
This document provides a comprehensive overview of the security measures implemented in GarageHub System, an enterprise-grade automotive workshop ecosystem platform.

---

## 1. Authentication & Authorization

### 1.1 Hybrid Authentication System
- **Session-Based Auth**: Secure session cookies with PostgreSQL storage
- **JWT Authentication**: RS256 asymmetric encryption for stateless API access
- **Access Token Expiry**: ${config.jwtAccessTokenExpiry}
- **Refresh Token Expiry**: ${config.jwtRefreshTokenExpiry}
- **Token Storage**: HttpOnly cookies with SameSite=Strict

### 1.2 Role-Based Access Control (RBAC)
Supported roles:
- Customer
- Workshop
- Supplier
- Runner (Delivery Personnel)
- Towing Service
- Administrator

### 1.3 Two-Factor Authentication (2FA)
- **Status**: ${config.twoFactorAuth.enabled ? 'Enabled' : 'Disabled'}
- **Algorithm**: ${config.twoFactorAuth.algorithm}
- **Implementation**: Google Authenticator-compatible TOTP
- **QR Code Generation**: Automatic setup with QR code
- **Backup Recovery Codes**: ${config.twoFactorAuth.backupCodesCount} codes per user
- **Endpoints**:
  - POST /api/auth/2fa/setup - Generate 2FA secret and QR code
  - POST /api/auth/2fa/verify - Verify TOTP token
  - POST /api/auth/2fa/disable - Disable 2FA for user

---

## 2. Password Security

### 2.1 Password Requirements
- **Minimum Length**: ${config.passwordRequirements.minLength} characters
- **Uppercase Letters**: ${config.passwordRequirements.requireUppercase ? 'Required' : 'Optional'}
- **Lowercase Letters**: ${config.passwordRequirements.requireLowercase ? 'Required' : 'Optional'}
- **Numbers**: ${config.passwordRequirements.requireNumbers ? 'Required' : 'Optional'}
- **Special Characters**: ${config.passwordRequirements.requireSpecialChars ? 'Required' : 'Optional'}

### 2.2 Password Storage
- **Hashing Algorithm**: bcrypt
- **Salt Rounds**: 12
- **Password Reset**: Secure token-based reset flow

---

## 3. Rate Limiting & IP Protection

### 3.1 Rate Limiting Configuration

#### Authentication Endpoints
- **Window**: ${config.rateLimits.auth.windowMs}
- **Max Requests**: ${config.rateLimits.auth.max}
- **Endpoints Protected**: /api/auth/*, /api/auth/jwt/*

#### General API Endpoints
- **Window**: ${config.rateLimits.api.windowMs}
- **Max Requests**: ${config.rateLimits.api.max}

#### Order Creation Endpoints
- **Window**: ${config.rateLimits.order.windowMs}
- **Max Requests**: ${config.rateLimits.order.max}

#### File Upload Endpoints
- **Window**: ${config.rateLimits.upload.windowMs}
- **Max Requests**: ${config.rateLimits.upload.max}

### 3.2 IP Banning
- **Failed Login Threshold**: ${config.ipBanning.maxFailedAttempts} attempts
- **Ban Window**: ${config.ipBanning.banWindowMs}
- **Auto-Unban**: After ban window expires
- **Logging**: All ban events logged to security log

---

## 4. Audit Logging & Monitoring

### 4.1 Audit Trail
- **Status**: ${config.auditLogging.enabled ? 'Enabled' : 'Disabled'}
- **Retention Period**: ${config.auditLogging.retentionPeriod}
- **Database Table**: user_actions
- **Logged Events**:
  - User login/logout
  - Failed login attempts
  - IP bans
  - 2FA setup/disable
  - Password changes
  - Admin actions
  - Rate limit violations

### 4.2 Security Logging
- **Implementation**: Winston logger with daily rotating files
- **Log Levels**: error, warn, info, http, verbose, debug
- **Log Files**:
  - \`logs/security-%DATE%.log\` - Security-specific events (30 days)
  - \`logs/application-%DATE%.log\` - General application logs (7 days)
  - \`logs/error-%DATE%.log\` - Error logs (14 days)

### 4.3 Admin Audit Endpoints
- **GET /api/admin/audit-logs**: View all audit logs (limit: 100)
- **GET /api/admin/audit-logs/:userId**: View user-specific audit logs (limit: 50)
- **Authentication**: Admin role required
- **Query Parameters**: userId (filter), limit (pagination)

---

## 5. Security Headers & Middleware

### 5.1 Helmet.js Configuration
- **Content Security Policy (CSP)**: Configured
- **HTTP Strict Transport Security (HSTS)**: Enabled
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: Enabled
- **Referrer-Policy**: no-referrer

### 5.2 CORS Configuration
- **Allowed Origins**: Configurable per environment
- **Credentials**: Supported
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Headers**: Content-Type, Authorization

---

## 6. Database Security

### 6.1 Session Storage
- **Implementation**: connect-pg-simple
- **Database**: PostgreSQL (Neon serverless)
- **Table**: sessions
- **Cleanup**: Automatic expired session removal

### 6.2 Security Tables
- **user_actions**: Audit trail of all user activities
- **users**: Extended with twoFactorSecret, twoFactorEnabled, backupCodes
- **refresh_tokens**: JWT refresh token management

### 6.3 Data Protection
- **Connection**: SSL/TLS encrypted
- **Credentials**: Environment variables only
- **ORM**: Drizzle with parameterized queries (SQL injection protection)

---

## 7. JWT Token Management

### 7.1 Token Generation
- **Algorithm**: RS256 (Asymmetric)
- **Private Key**: RSA 2048-bit
- **Public Key**: Available for verification
- **Payload**: userId, email, role

### 7.2 Token Endpoints
- **POST /api/auth/jwt/login**: Login and receive access + refresh tokens
- **POST /api/auth/jwt/refresh**: Refresh access token using refresh token
- **POST /api/auth/jwt/logout**: Revoke refresh token (single device)
- **POST /api/auth/jwt/logout-all**: Revoke all refresh tokens (all devices)

### 7.3 Token Storage
- **Access Token**: HttpOnly cookie, SameSite=Strict
- **Refresh Token**: HttpOnly cookie, SameSite=Strict
- **Database**: Refresh tokens stored with device fingerprint

---

## 8. OWASP Top 10 Compliance

### A01:2021 - Broken Access Control
✅ **Mitigated**: RBAC middleware, role-based route protection, ownership verification

### A02:2021 - Cryptographic Failures
✅ **Mitigated**: bcrypt password hashing (12 rounds), JWT RS256 encryption, HTTPS enforcement

### A03:2021 - Injection
✅ **Mitigated**: Drizzle ORM with parameterized queries, input validation with Zod schemas

### A04:2021 - Insecure Design
✅ **Mitigated**: Security-first architecture, defense in depth, principle of least privilege

### A05:2021 - Security Misconfiguration
✅ **Mitigated**: Helmet.js security headers, secure default configurations, environment-based settings

### A06:2021 - Vulnerable and Outdated Components
✅ **Mitigated**: Regular dependency updates, security audits, locked versions in package.json

### A07:2021 - Identification and Authentication Failures
✅ **Mitigated**: 2FA support, strong password requirements, IP banning, rate limiting

### A08:2021 - Software and Data Integrity Failures
✅ **Mitigated**: Audit logging, request validation, signed JWTs

### A09:2021 - Security Logging and Monitoring Failures
✅ **Mitigated**: Winston logging, audit trail database, admin monitoring endpoints

### A10:2021 - Server-Side Request Forgery (SSRF)
✅ **Mitigated**: URL validation, allowlist for external requests, input sanitization

---

## 9. Compliance & Best Practices

### 9.1 Industry Standards
- ✅ OWASP Top 10 compliance
- ✅ NIST password guidelines
- ✅ PCI DSS recommendations (rate limiting, logging, access control)
- ✅ GDPR-ready (audit trails, data access controls)

### 9.2 Security Best Practices
- ✅ Defense in depth
- ✅ Principle of least privilege
- ✅ Secure by default
- ✅ Fail securely
- ✅ Separation of duties
- ✅ Complete mediation

---

## 10. Maintenance & Monitoring

### 10.1 Regular Security Tasks
- **Daily**: Monitor security logs for anomalies
- **Weekly**: Review failed login attempts and IP bans
- **Monthly**: Rotate JWT signing keys, audit user permissions
- **Quarterly**: Security audit, dependency updates, penetration testing

### 10.2 Incident Response
1. **Detection**: Automated alerts for security events
2. **Investigation**: Review audit logs and security logs
3. **Containment**: IP banning, account suspension
4. **Recovery**: Reset credentials, revoke tokens
5. **Post-Mortem**: Document incident, update security measures

---

## 11. API Security Endpoints Summary

### Authentication Endpoints
\`\`\`
POST /api/auth/jwt/login          - JWT login with 2FA support
POST /api/auth/jwt/refresh        - Refresh access token
POST /api/auth/jwt/logout         - Logout single device
POST /api/auth/jwt/logout-all     - Logout all devices
\`\`\`

### 2FA Endpoints
\`\`\`
POST /api/auth/2fa/setup          - Setup 2FA (returns QR code)
POST /api/auth/2fa/verify         - Verify TOTP token
POST /api/auth/2fa/disable        - Disable 2FA
\`\`\`

### Admin Security Endpoints
\`\`\`
GET /api/admin/audit-logs         - View all audit logs
GET /api/admin/audit-logs/:userId - View user audit logs
\`\`\`

---

## 12. Environment Configuration

### Required Environment Variables
\`\`\`
DATABASE_URL              - PostgreSQL connection string
SESSION_SECRET            - Session encryption secret (32+ characters)
JWT_PRIVATE_KEY           - RSA private key for JWT signing
JWT_PUBLIC_KEY            - RSA public key for JWT verification
NODE_ENV                  - development | production
\`\`\`

### Security Recommendations
- Use strong, randomly-generated secrets
- Rotate SESSION_SECRET quarterly
- Rotate JWT keys monthly in production
- Never commit secrets to version control
- Use separate credentials per environment

---

## 13. Conclusion

GarageHub System implements enterprise-grade security measures following industry best practices and compliance standards. The hybrid authentication approach provides flexibility while maintaining security, and the comprehensive audit trail ensures full accountability and transparency.

**Security Contact**: security@garagehub.example.com
**Last Updated**: ${new Date().toISOString()}
**Next Review**: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

---

*This report is confidential and should only be shared with authorized personnel.*
`;

  return report;
}

/**
 * Save security report to file
 */
export function saveSecurityReport(): string {
  const report = generateSecurityReport();
  const reportPath = path.join(process.cwd(), 'SECURITY_REPORT.md');
  
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  return reportPath;
}
