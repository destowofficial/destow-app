import { describe, it, expect } from 'bun:test';
import { CLIENT, CLIENT_ROLE, OTP_CLIENT } from '../src/clients';
import { USER_ROLE } from '../src/enums';

describe('clients', () => {
  it('maps every client to exactly one role', () => {
    for (const client of CLIENT) {
      expect(USER_ROLE).toContain(CLIENT_ROLE[client]);
    }
    expect(Object.keys(CLIENT_ROLE).sort()).toEqual([...CLIENT].sort());
  });

  // If two clients ever shared a role, a token minted for one would be
  // interchangeable with the other and the whole separation would be cosmetic.
  it('gives each client a distinct role', () => {
    const roles = CLIENT.map((c) => CLIENT_ROLE[c]);
    expect(new Set(roles).size).toBe(CLIENT.length);
  });

  it('excludes admin_web from the OTP clients', () => {
    expect(OTP_CLIENT).not.toContain('admin_web');
    expect([...OTP_CLIENT].every((c) => (CLIENT as readonly string[]).includes(c))).toBe(true);
  });
});
