import { Vehicle } from '../services/types';

export const vehicles: Vehicle[] = [
  {
    id: 1,
    type: 'AC Seater Bus',
    category: 'Bus',
    capacity: '40 seats',
    imageUrl:
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBidXN8ZW58MXx8fHwxNzgyODAxMDI4fDA&ixlib=rb-4.1.0&q=80&w=600',
    ratePerKm: 12,
    amenities: ['AC', 'WiFi', 'Charging Port', 'Water'],
    rating: 4.8,
    reviews: 324,
  },
  {
    id: 2,
    type: 'Luxury Sleeper Bus',
    category: 'Bus',
    capacity: '32 sleeper',
    imageUrl:
      'https://images.unsplash.com/photo-1690094607119-3a846673bf4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBidXMlMjBpbnRlcmlvciUyMGluZGlhfGVufDF8fHx8MTc4MjgwMDk1Nnww&ixlib=rb-4.1.0&q=80&w=600',
    ratePerKm: 15,
    amenities: ['AC', 'WiFi', 'Pillow', 'Blanket'],
    rating: 4.9,
    reviews: 567,
  },
  {
    id: 3,
    type: 'Premium Sedan',
    category: 'Car',
    capacity: '4 seats',
    imageUrl:
      'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWRhbiUyMGNhciUyMGJsYWNrfGVufDF8fHx8MTc4MjgwMTAyOHww&ixlib=rb-4.1.0&q=80&w=600',
    ratePerKm: 18,
    amenities: ['AC', 'Music System', 'Sanitized', 'Water'],
    rating: 4.7,
    reviews: 189,
  },
  {
    id: 4,
    type: 'SUV',
    category: 'Car',
    capacity: '6 seats',
    imageUrl:
      'https://images.unsplash.com/photo-1732868809555-e858caee2547?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXYlMjBjYXIlMjB3aGl0ZXxlbnwxfHx8fDE3ODI4MDEwMjh8MA&ixlib=rb-4.1.0&q=80&w=600',
    ratePerKm: 20,
    amenities: ['AC', 'Large Boot', 'Music', 'Water'],
    rating: 4.8,
    reviews: 412,
  },
];
