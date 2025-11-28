/**
 * Runtime validation for Live Sandbox Mode
 * Detects placeholder secrets and prevents insecure configurations
 */

export function validateLiveSandboxConfig(): void {
  const isLiveSandbox = process.env.LIVE_SANDBOX === 'true';
  
  if (!isLiveSandbox) {
    return; // No validation needed in normal mode
  }

  const sessionSecret = process.env.SESSION_SECRET || '';
  const databaseUrl = process.env.DATABASE_URL || '';

  // Check for placeholder patterns
  const placeholderPatterns = [
    '${SESSION_SECRET}',
    '${DATABASE_URL}',
    '<your-',
    'REPLACE_ME',
    'CHANGE_THIS'
  ];

  const hasPlaceholders = placeholderPatterns.some(pattern => 
    sessionSecret.includes(pattern) || databaseUrl.includes(pattern)
  );

  if (hasPlaceholders) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ⚠️  CRITICAL SECURITY WARNING - LIVE SANDBOX MODE           ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error('❌ Invalid configuration detected!');
    console.error('   SESSION_SECRET or DATABASE_URL contains placeholder values.\n');
    console.error('This is a security risk and will cause authentication failures.\n');
    console.error('✅ Fix:');
    console.error('   Run: tsx scripts/activate-live-test-mode.ts');
    console.error('   This will properly merge secrets from your existing .env\n');
    process.exit(1);
  }

  // Warn if session secret is too short
  if (sessionSecret.length < 32) {
    console.warn('\n⚠️  Warning: SESSION_SECRET is shorter than recommended (32+ chars)');
    console.warn('   Consider generating a stronger secret for production use.\n');
  }

  console.log('✅ [LiveSandbox] Configuration validated successfully');
  console.log(`   Wallet Credit: RM${process.env.SANDBOX_WALLET_CREDIT || '50'}`);
  console.log(`   States: ${process.env.SANDBOX_STATES || 'Kelantan,Selangor,Johor'}`);
  console.log(`   Auto-Reset: ${process.env.SANDBOX_AUTO_RESET === 'true' ? 'Enabled' : 'Disabled'}\n`);
}
