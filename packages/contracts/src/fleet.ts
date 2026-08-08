import { z } from 'zod';
import { DRIVER_STATUS } from './enums';

// ₹1000/km. Not a business rule so much as a fat-finger guard: a provider
// meaning ₹13.00 and typing paise-as-rupees would otherwise list at ₹1300/km,
// and the first customer to book it pays for the typo.
const MAX_PRICE_PER_KM_PAISE = 100_000;

const pricePerKmPaise = z
  .number()
  .int('Price must be whole paise - no fractions of a paisa')
  .positive()
  .max(MAX_PRICE_PER_KM_PAISE, 'That is above ₹1000/km - check the units (paise, not rupees)');

// Indian plates vary by era and series (old state codes, BH series), so this is
// deliberately permissive on shape and strict only on characters.
const registrationNo = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9- ]{4,15}$/, 'Not a valid registration number')
  .transform((s) => s.replace(/[\s-]/g, ''));

export const createVehicleBody = z.object({
  vehicleTypeId: z.string().uuid(),
  pricePerKmPaise,
  registrationNo: registrationNo.optional(),
  modelName: z.string().trim().min(1).max(120).optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

// Everything optional, but at least one field - an empty PATCH should be a clear
// 422, not a silent no-op that reads as success.
export const updateVehicleBody = z
  .object({
    pricePerKmPaise: pricePerKmPaise.optional(),
    modelName: z.string().trim().min(1).max(120).optional(),
    amenities: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const createDriverBody = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(15),
  licenseNo: z.string().trim().min(4).max(30).toUpperCase().optional(),
});

export const updateDriverBody = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(8).max(15).optional(),
    licenseNo: z.string().trim().min(4).max(30).toUpperCase().optional(),
    status: z.enum(DRIVER_STATUS).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export type CreateVehicleBody = z.infer<typeof createVehicleBody>;
export type UpdateVehicleBody = z.infer<typeof updateVehicleBody>;
export type CreateDriverBody = z.infer<typeof createDriverBody>;
export type UpdateDriverBody = z.infer<typeof updateDriverBody>;
