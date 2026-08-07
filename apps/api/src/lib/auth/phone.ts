import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { AppError } from '../http/errors.js';

const DEFAULT_REGION = 'IN';

function invalid(message: string): never {
  throw AppError.unprocessable('Validation failed', { phone: [message] });
}

// The single authority for turning user input into a stored phone number.
// Everything persisted or compared - users.phone, otps.phone, Redis rate-limit
// keys - is the E.164 string this returns, so two spellings of one number can
// never become two accounts.
export function canonicalizePhone(raw: string): string {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') invalid('Phone number is required');

  let parsed;
  try {
    parsed = parsePhoneNumberWithError(trimmed, DEFAULT_REGION);
  } catch {
    invalid('Not a valid phone number');
  }

  if (!parsed.isValid()) invalid('Not a valid phone number');

  // getType() needs the full metadata bundle (~10x the size) for marginal
  // benefit. For the launch market a direct check is cheaper and clearer:
  // Indian mobile numbers are ten digits beginning 6-9.
  if (parsed.countryCallingCode === '91' && !/^[6-9]\d{9}$/.test(parsed.nationalNumber)) {
    invalid('Must be a valid Indian mobile number');
  }

  return parsed.number;
}
