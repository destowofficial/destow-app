import { describe, it, expect } from 'bun:test';
import { updateMeBody } from '../src/users';

// The profile contract is where shape and normalization are decided: the
// controller parses with this before any service sees the body, so these rules
// never reach the database layer to be re-checked.
describe('updateMeBody', () => {
  it('normalizes a GSTIN to uppercase', () => {
    const parsed = updateMeBody.parse({
      customerType: 'business',
      companyName: 'Acme Logistics',
      gstin: '29abcde1234f1z5',
    });
    expect(parsed.gstin).toBe('29ABCDE1234F1Z5');
  });

  it('rejects a malformed GSTIN rather than storing junk', () => {
    const r = updateMeBody.safeParse({
      customerType: 'business',
      companyName: 'Acme',
      gstin: 'NOTAGSTIN',
    });
    expect(r.success).toBe(false);
  });

  // Company details on an individual account would be data nothing ever reads.
  it('refuses company details without a business account type', () => {
    expect(updateMeBody.safeParse({ companyName: 'Acme Logistics' }).success).toBe(false);
    expect(updateMeBody.safeParse({ gstin: '29ABCDE1234F1Z5' }).success).toBe(false);
  });

  it('accepts company details on a business account', () => {
    const r = updateMeBody.safeParse({ customerType: 'business', companyName: 'Acme Logistics' });
    expect(r.success).toBe(true);
  });

  // Switching back to an individual account must not be blocked by the rule
  // that guards company details.
  it('allows setting an individual account type on its own', () => {
    expect(updateMeBody.safeParse({ customerType: 'individual' }).success).toBe(true);
  });

  it('still refuses an empty patch', () => {
    expect(updateMeBody.safeParse({}).success).toBe(false);
  });

  it('lowercases an email', () => {
    expect(updateMeBody.parse({ email: 'Priya@Destow.IN' }).email).toBe('priya@destow.in');
  });
});
