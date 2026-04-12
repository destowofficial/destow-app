# Destow API Integration — Walkthrough

## What Was Built

### New Files
| File | Purpose |
|---|---|
| [services/api.ts](file:///d:/SaiApp/Destow/destow-mobile/services/api.ts) | Base `fetch` wrapper — adds `Authorization: Bearer` header, handles errors as typed [ApiError](file:///d:/SaiApp/Destow/destow-mobile/services/api.ts#28-34) |
| [services/auth.service.ts](file:///d:/SaiApp/Destow/destow-mobile/services/auth.service.ts) | [verifyOtp()](file:///d:/SaiApp/Destow/destow-mobile/services/auth.service.ts#16-23), [googleSSO()](file:///d:/SaiApp/Destow/destow-mobile/services/auth.service.ts#24-30) → call backend `/auth/*` |
| [services/home.service.ts](file:///d:/SaiApp/Destow/destow-mobile/services/home.service.ts) | [getUserHomeInfo()](file:///d:/SaiApp/Destow/destow-backend/src/modules/home/home.service.ts#5-22), [searchRoute()](file:///d:/SaiApp/Destow/destow-backend/src/modules/home/home.service.ts#23-43) → call backend `/home/*` |
| [services/cabs.service.ts](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts) | [getAvailableCabs()](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts#47-56), [bookCab()](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts#57-60), [processPayment()](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts#61-68) → call backend `/cabs/*` |
| [services/history.service.ts](file:///d:/SaiApp/Destow/destow-mobile/services/history.service.ts) | [getTripHistory(page, limit)](file:///d:/SaiApp/Destow/destow-mobile/services/history.service.ts#11-20) → call backend `/history` |
| [services/user.service.ts](file:///d:/SaiApp/Destow/destow-mobile/services/user.service.ts) | [getProfile()](file:///d:/SaiApp/Destow/destow-mobile/services/user.service.ts#13-16), [updateProfile()](file:///d:/SaiApp/Destow/destow-mobile/services/user.service.ts#17-23) → call backend `/users/me` |
| [context/AuthContext.tsx](file:///d:/SaiApp/Destow/destow-mobile/context/AuthContext.tsx) | Stores JWT + user in `AsyncStorage`; exposes [login()](file:///d:/SaiApp/Destow/destow-mobile/context/AuthContext.tsx#28-29) / [logout()](file:///d:/SaiApp/Destow/destow-mobile/context/AuthContext.tsx#29-30) to all screens |

### Modified Screens
| Screen | Change |
|---|---|
| [app/_layout.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/_layout.tsx) | Wrapped with `<AuthProvider>` |
| [app/index.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/index.tsx) | Passes `phone` + `name` as route params to OTP screen |
| [app/otp.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/otp.tsx) | Reads real phone from params, saves mock session via [AuthContext](file:///d:/SaiApp/Destow/destow-mobile/context/AuthContext.tsx#16-23), loading state |
| [app/(tabs)/index.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/%28tabs%29/index.tsx) | Fetches real `userName` from `/home/user-info`; "Search Cabs" calls [searchRoute](file:///d:/SaiApp/Destow/destow-backend/src/modules/home/home.service.ts#23-43) API and navigates with `distanceKm` |
| [app/cab-listing.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/cab-listing.tsx) | Reads route params, calls [getAvailableCabs](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts#47-56) on mount, dynamic cab list, "Book" calls [bookCab](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts#57-60) + [processPayment](file:///d:/SaiApp/Destow/destow-mobile/services/cabs.service.ts#61-68) |
| [app/(tabs)/trips.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/%28tabs%29/trips.tsx) | Fetches trip history from `/history`, shows trip cards with status badges |
| [app/(tabs)/profile.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/%28tabs%29/profile.tsx) | Fetches real profile from `/users/me`, Logout clears `AsyncStorage` session |

---

## How to Test

### 1. Start the backend
```bash
cd d:\SaiApp\Destow\destow-backend
node server.js
```

### 2. Start the app (Android emulator)
```bash
cd d:\SaiApp\Destow\destow-mobile
npx expo start --android
```

> [!NOTE]
> The `BASE_URL` in [services/api.ts](file:///d:/SaiApp/Destow/destow-mobile/services/api.ts) is `http://10.0.2.2:3000/api/v1` — this is the Android emulator alias for your machine's localhost. For a **real device** on the same network, change it to your LAN IP (e.g. `http://192.168.1.x:3000/api/v1`).

### 3. Full flow
1. **Login screen** — enter any name + 10-digit phone → tap "Get OTP"
2. **OTP screen** — shows the phone you entered; enter any 6-digit code → tap "Verify & Login"  
   *(Mock mode: saves a test session in AsyncStorage and navigates to home)*
3. **Home screen** — greeting shows real user name from backend; fill From/To → "Search Cabs"
4. **Cab listing** — real cabs from DB loaded; tap "Book" → booking + payment processed → confirmation alert
5. **Trips tab** — shows the booking you just made with status badge + fare
6. **Profile tab** — shows real name/phone from backend; "Logout" clears session and returns to login

---

## Known Limitations

> [!IMPORTANT]
> **Firebase OTP is mocked.** The [app/otp.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/otp.tsx) currently saves a hardcoded `mock-jwt-token-dev` instead of a real Firebase ID token. This means:
> - `GET /home/user-info`, `GET /users/me`, `GET /history` etc. will fail with 401 until a real JWT is issued.
> - **To fully test with real data**, either: (a) install `@react-native-firebase/auth` and run `expo prebuild`, or (b) temporarily disable JWT auth in the backend middleware for local dev.
>
> All the wiring is in place — swapping the mock token for a real Firebase token is a one-line change in [app/otp.tsx](file:///d:/SaiApp/Destow/destow-mobile/app/otp.tsx).
