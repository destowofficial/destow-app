import { db } from '../../db/connection.js';
import { users, otps } from '../../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' });

function signJwt(userId: string) {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalizes phone number to +91 representation.
 */
function normalizePhone(phone: string) {
  return phone.startsWith('+') ? phone : `+91${phone.replace(/\\D/g, '')}`;
}

export async function requestOtpToken(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
  
  await db.insert(otps).values({
    phone: normalizedPhone,
    code,
    expiresAt
  });
  
  try {
     const command = new PublishCommand({
       PhoneNumber: normalizedPhone,
       Message: `Your Destow verification code is ${code}. It expires in 5 minutes.`
     });
     await snsClient.send(command);
  } catch (err: any) {
     console.error('AWS SNS Error:', err);
     throw new Error('Failed to send OTP via SMS. Ensure AWS limits are adequate.');
  }

  return { success: true, message: 'OTP sent successfully' };
}

export async function verifyOtpToken(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);
  
  const validOtps = await db
    .select()
    .from(otps)
    .where(
      and(
        eq(otps.phone, normalizedPhone),
        eq(otps.code, code),
        gt(otps.expiresAt, new Date())
      )
    )
    .orderBy(desc(otps.createdAt))
    .limit(1);
    
  if (validOtps.length === 0) {
    throw new Error('Invalid or expired OTP');
  }
  
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.phone, normalizedPhone))
    .limit(1);
    
  let user = existing[0];
  
  if (!user) {
    const [created] = await db.insert(users).values({
      phone: normalizedPhone,
      name: 'Destow User',
      authProvider: 'phone'
    }).returning();
    user = created;
  }
  
  await db.delete(otps).where(eq(otps.phone, normalizedPhone));
  
  const token = signJwt(user.id);
  return { token, user: { id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl } };
}
