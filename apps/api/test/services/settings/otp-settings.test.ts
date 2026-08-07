import { describe, it, expect } from 'bun:test';

process.env.DATABASE_URL ||= 'postgres://destow:pw@localhost:5432/destow';
process.env.JWT_SECRET ||= 'test_secret_at_least_32_characters_long';
const { resolveSettings } = await import('@/services/settings/otp-settings.service.js');

// The database says what SHOULD be on; env decides what CAN be on. resolveSettings
// is the intersection, and it is pure so it can be exercised without a database.
describe('resolveSettings', () => {
  it('keeps only channels whose credentials are configured', () => {
    const s = resolveSettings(
      { otpChannels: ['whatsapp', 'telegram'], otpDefaultChannel: 'whatsapp', otpFallbackChannel: null },
      ['whatsapp'],
    );
    expect(s.channels).toEqual(['whatsapp']);
  });

  // The failure this prevents: an admin enables WhatsApp, someone later rotates
  // the credentials out of env, and every login then fails at send time with a
  // provider that was built anyway. Here it just stops being offered.
  it('drops a channel whose credentials disappeared', () => {
    const s = resolveSettings(
      { otpChannels: ['whatsapp', 'telegram'], otpDefaultChannel: 'telegram', otpFallbackChannel: null },
      ['telegram'],
    );
    expect(s.channels).toEqual(['telegram']);
    expect(s.defaultChannel).toBe('telegram');
  });

  it('falls through to a surviving channel when the stored default is gone', () => {
    const s = resolveSettings(
      { otpChannels: ['whatsapp', 'telegram'], otpDefaultChannel: 'whatsapp', otpFallbackChannel: null },
      ['telegram'],
    );
    expect(s.defaultChannel).toBe('telegram');
  });

  it('keeps a fallback that is still available', () => {
    const s = resolveSettings(
      {
        otpChannels: ['whatsapp', 'telegram'],
        otpDefaultChannel: 'telegram',
        otpFallbackChannel: 'whatsapp',
      },
      ['whatsapp', 'telegram'],
    );
    expect(s.fallbackChannel).toBe('whatsapp');
  });

  it('drops a fallback that is no longer available', () => {
    const s = resolveSettings(
      {
        otpChannels: ['telegram'],
        otpDefaultChannel: 'telegram',
        otpFallbackChannel: 'whatsapp',
      },
      ['telegram'],
    );
    expect(s.fallbackChannel).toBeUndefined();
  });

  it('yields no channels when nothing the admin enabled is configured', () => {
    const s = resolveSettings(
      { otpChannels: ['whatsapp'], otpDefaultChannel: 'whatsapp', otpFallbackChannel: null },
      [],
    );
    expect(s.channels).toEqual([]);
  });
});
