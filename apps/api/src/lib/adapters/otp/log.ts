import type { OtpDeliveryProvider } from './types.js';

// Dev only: logs the code so login works locally without any real provider.
// env validation forbids enabling this channel in production.
export class LogProvider implements OtpDeliveryProvider {
  readonly channel = 'log' as const;
  async sendOtp(phone: string, code: string): Promise<void> {
    console.log(`\n[DEV OTP] ${phone} -> ${code}\n`);
  }
}
