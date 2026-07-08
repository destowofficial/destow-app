# DESTOW

Premium Indian travel-tech platform for intercity bus and car bookings with transparent ₹/km pricing.

## Features

- **Transparent Pricing** — See exact fare upfront with ₹/km rate display
- **Intercity Booking** — Bus and car options across 30+ Indian cities
- **Vehicle Selection** — Compare vehicles by amenities, capacity, and rating
- **Trip Management** — Track upcoming, completed, and cancelled trips
- **User Profile** — Stats, settings, and account management

## Screens

| Screen | Description |
|--------|-------------|
| Splash | Animated logo with gradient background |
| Onboarding | 3-slide intro (Travel, Pricing, Safety) |
| Home | Search card, service selector, popular routes |
| Search | City autocomplete, date picker, passenger count |
| Vehicles | Filterable vehicle cards with ₹/km rates |
| Fare | Transparent pricing breakdown with GST |
| Confirmation | Success animation, driver details, booking ID |
| My Trips | Filterable trip list with status badges |
| Profile | User info, menu items, stats, logout |

## Tech Stack

- **Expo SDK 57** (managed workflow)
- **Expo Router** (file-based navigation)
- **TypeScript** (strict mode)
- **Zustand** (state management)
- **React Native Reanimated** (animations)
- **Inter** font (Google Fonts)

## Project Structure

```
app/                    # Screens and layouts (Expo Router)
├── (auth)/             # Splash + Onboarding
├── (tabs)/             # Home, My Trips, Profile
└── (booking)/          # Search → Vehicles → Fare → Confirmation
components/             # Reusable UI components
├── ui/                 # Primitives (Header, Button, Tabs, etc.)
├── cards/              # Screen-specific cards
└── form/               # Form inputs
services/               # API abstraction layer
├── api.ts              # Mock service functions
└── types.ts            # TypeScript interfaces
data/                   # Mock data fixtures
stores/                 # Zustand state stores
theme/                  # Design tokens (colors, typography, spacing)
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Start web version
npx expo start --web

# Start iOS
npx expo start --ios

# Start Android
npx expo start --android
```

## Navigation Flow

```
Splash → Onboarding → Home (tabs)
                          │
              ┌───────────┼───────────┐
              │           │           │
           Home        My Trips    Profile
              │
              ▼
           Search → Vehicles → Fare → Confirmation
```

## State Management

Two Zustand stores manage all app state:

- **useBookingStore** — Search params, selected vehicle, fare breakdown
- **useAppStore** — Onboarding status, dark mode toggle, user profile

## Mock Data Layer

All data comes from `services/api.ts` which returns mock data with simulated latency (600–1200ms). To switch to a real API:

1. Set `EXPO_PUBLIC_USE_MOCK=false` in `.env`
2. Update `services/api.ts` to make real `fetch()` calls
3. Components and stores remain unchanged

## Design System

- **Colors** — Blue primary (#2563eb), Emerald success (#10b981), Orange warning (#f97316)
- **Typography** — Inter font, weights 300–700, sizes xs(10) to hero(32)
- **Spacing** — 4px base grid (xs=4, sm=8, md=12, base=16, lg=20, xl=24)
- **Radii** — Rounded cards (16px), buttons (12px), pills (9999px)

## Build

```bash
# Development build
eas build --profile development

# Preview build
eas build --profile preview

# Production build
eas build --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## License

© 2026 DESTOW Pvt Ltd. All rights reserved.
