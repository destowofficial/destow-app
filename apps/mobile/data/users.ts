import { AuthUser } from '../services/types';

export const mockUsers: AuthUser[] = [
  {
    id: 'usr_001',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '9876543210',
    dateOfBirth: '1995-03-15',
    totalTrips: 12,
    rating: 4.9,
    createdAt: '2025-01-10',
  },
  {
    id: 'usr_002',
    name: 'Sarthak Bhatt',
    email: 'sarthak.bhatt@example.com',
    phone: '9123456789',
    dateOfBirth: '1992-07-22',
    totalTrips: 5,
    rating: 4.7,
    createdAt: '2025-06-01',
  },
  {
    id: 'usr_003',
    name: 'Anita Patel',
    email: 'anita.patel@example.com',
    phone: '9988776655',
    totalTrips: 0,
    rating: 0,
    createdAt: '2026-07-01',
  },
];

export const mockOtpStore: Record<string, string> = {
  '9876543210': '123456',
  '9123456789': '654321',
  '9988776655': '111111',
};

export const DEFAULT_OTP = '123456';
