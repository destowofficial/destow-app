import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { env } from '../../config/env.js';
import {
  externalRequestDuration,
  externalRequestsTotal,
  observeAsync,
} from '../metrics/metrics.js';

// Swappable SMS delivery. Add MSG91/Twilio impls behind the same interface.
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

class SnsSmsProvider implements SmsProvider {
  private client = new SNSClient({ region: env.AWS_REGION });

  async sendOtp(phone: string, code: string): Promise<void> {
    await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'aws_sns', operation: 'send_otp' },
      () =>
        this.client.send(
          new PublishCommand({
            PhoneNumber: phone,
            Message: `Your Destow verification code is ${code}. It expires in 5 minutes.`,
            MessageAttributes: {
              'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
            },
          }),
        ).then(() => undefined),
    );
  }
}

// Dev: no real SMS - log the code so login works locally.
class LogSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    await observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'dev_log_sms', operation: 'send_otp' },
      async () => {
        console.log(`\n[DEV OTP] ${phone} -> ${code}\n`);
      },
    );
  }
}

export const sms: SmsProvider =
  env.NODE_ENV === 'production' ? new SnsSmsProvider() : new LogSmsProvider();
