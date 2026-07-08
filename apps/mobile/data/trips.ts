import { Trip } from '../services/types';

export const trips: Trip[] = [
  {
    id: 'DST26070501',
    from: 'Delhi',
    to: 'Agra',
    date: 'July 5, 2026',
    time: '9:00 AM',
    status: 'upcoming',
    vehicleType: 'AC Seater Bus',
    fare: 3047,
  },
  {
    id: 'DST26062301',
    from: 'Mumbai',
    to: 'Pune',
    date: 'June 23, 2026',
    time: '2:00 PM',
    status: 'completed',
    vehicleType: 'Premium Sedan',
    fare: 2664,
  },
  {
    id: 'DST26061501',
    from: 'Bangalore',
    to: 'Mysore',
    date: 'June 15, 2026',
    time: '11:00 AM',
    status: 'completed',
    vehicleType: 'SUV',
    fare: 2860,
  },
  {
    id: 'DST26060801',
    from: 'Chennai',
    to: 'Pondicherry',
    date: 'June 8, 2026',
    time: '7:00 AM',
    status: 'cancelled',
    vehicleType: 'AC Seater Bus',
    fare: 1800,
  },
];
