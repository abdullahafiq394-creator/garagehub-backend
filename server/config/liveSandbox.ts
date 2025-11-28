/**
 * Live Sandbox Configuration
 * Handles test mode features for multi-user field testing
 */

export interface LiveSandboxConfig {
  enabled: boolean;
  walletCredit: string; // Initial wallet balance for test users (in RM)
  autoReset: boolean; // Auto-reset wallets every 24h
  dataRetention: number; // Hours before test data auto-deletion
  states: string[]; // Geographic distribution states
}

export function getLiveSandboxConfig(): LiveSandboxConfig {
  const enabled = process.env.LIVE_SANDBOX === 'true';
  
  return {
    enabled,
    walletCredit: enabled ? (process.env.SANDBOX_WALLET_CREDIT || '50') : '0',
    autoReset: process.env.SANDBOX_AUTO_RESET === 'true',
    dataRetention: parseInt(process.env.SANDBOX_DATA_RETENTION || '48'),
    states: enabled 
      ? (process.env.SANDBOX_STATES || 'Kelantan,Selangor,Johor').split(',')
      : []
  };
}

export function isLiveSandboxMode(): boolean {
  return process.env.LIVE_SANDBOX === 'true';
}

export function getSandboxWalletCredit(): string {
  const config = getLiveSandboxConfig();
  return config.enabled ? config.walletCredit : '0';
}
