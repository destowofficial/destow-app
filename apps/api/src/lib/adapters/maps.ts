import { env } from '../../config/env.js';
import { AppError } from '../http/errors.js';
import { safeError } from '../log/safe.js';
import {
  externalRequestDuration,
  externalRequestsTotal,
  observeAsync,
} from '../metrics/metrics.js';

export interface DistanceResult {
  distanceM: number; // metres
  durationS: number; // seconds
}

// Swappable distance/route provider.
export interface DistanceProvider {
  readonly name: string;
  distance(from: string, to: string): Promise<DistanceResult>;
}

const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
// A quote blocks a customer staring at a spinner, so a slow answer is worse than
// no answer - the route cache means the next attempt usually costs nothing.
const TIMEOUT_MS = 5_000;

// Distance Matrix reports status twice: once for the request and once per
// element. A request can be OK while the only element is ZERO_RESULTS, so
// checking the outer status alone silently yields undefined distances.
interface MatrixResponse {
  status?: string;
  error_message?: string;
  rows?: Array<{
    elements?: Array<{
      status?: string;
      distance?: { value?: number };
      duration?: { value?: number };
    }>;
  }>;
}

// Their fault vs ours. A place that cannot be routed is a 422 the customer can
// act on by picking somewhere else; a quota or key problem is a 503, because
// retrying is reasonable and it is not the customer's doing.
function mapElementStatus(status: string, from: string, to: string): never {
  switch (status) {
    case 'ZERO_RESULTS':
      throw AppError.unprocessable('Validation failed', {
        to: [`No driving route between "${from}" and "${to}"`],
      });
    case 'NOT_FOUND':
      throw AppError.unprocessable('Validation failed', {
        from: ['One of those places could not be found'],
      });
    case 'MAX_ROUTE_LENGTH_EXCEEDED':
      throw AppError.unprocessable('Validation failed', {
        to: ['That route is too long to price'],
      });
    default:
      throw AppError.serviceUnavailable('Could not calculate that route right now');
  }
}

export class GoogleDistanceProvider implements DistanceProvider {
  readonly name = 'google';

  constructor(private readonly apiKey: string) {}

  async distance(from: string, to: string): Promise<DistanceResult> {
    const url = new URL(DISTANCE_MATRIX_URL);
    url.searchParams.set('origins', from);
    url.searchParams.set('destinations', to);
    url.searchParams.set('mode', 'driving');
    // Bias ambiguous names to India: "Agra" should resolve to Uttar Pradesh, not
    // a same-named town elsewhere.
    url.searchParams.set('region', 'in');
    url.searchParams.set('key', this.apiKey);

    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'google', operation: 'distance_matrix' },
      async () => {
        let res: Response;
        try {
          res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        } catch (err) {
          // Never let the URL reach a log - it carries the API key.
          console.error(`[maps] distance request failed: ${safeError(err)}`);
          throw AppError.serviceUnavailable('Could not calculate that route right now');
        }

        if (!res.ok) {
          console.error(`[maps] distance matrix HTTP ${res.status}`);
          throw AppError.serviceUnavailable('Could not calculate that route right now');
        }

        const body = (await res.json()) as MatrixResponse;

        if (body.status !== 'OK') {
          // error_message can name the key or the billing account, so it is
          // logged and never returned.
          console.error(`[maps] distance matrix status=${body.status}`);
          throw AppError.serviceUnavailable('Could not calculate that route right now');
        }

        const element = body.rows?.[0]?.elements?.[0];
        if (!element) throw AppError.serviceUnavailable('Could not calculate that route right now');
        if (element.status !== 'OK') mapElementStatus(element.status ?? 'UNKNOWN', from, to);

        const distanceM = element.distance?.value;
        const durationS = element.duration?.value;

        // Already metres and seconds, which is what we store - but a malformed
        // payload must not become a zero-distance quote, i.e. a free trip.
        if (!Number.isFinite(distanceM) || !Number.isFinite(durationS) || (distanceM ?? 0) <= 0) {
          console.error('[maps] distance matrix returned no usable distance');
          throw AppError.serviceUnavailable('Could not calculate that route right now');
        }

        return { distanceM: Math.round(distanceM!), durationS: Math.round(durationS!) };
      },
    );
  }
}

// Dev: deterministic estimate (stable per route) so the whole booking flow is
// exercisable without a billed API key. Stable matters - a quote and the fare
// frozen at booking must agree.
export class StubDistanceProvider implements DistanceProvider {
  readonly name = 'stub';

  async distance(from: string, to: string): Promise<DistanceResult> {
    const key = `${from.trim().toLowerCase()}|${to.trim().toLowerCase()}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    const distanceM = (120 + (hash % 680)) * 1000; // stable 120-800 km
    const durationS = Math.round((distanceM / 1000 / 50) * 3600); // ~50 km/h
    return { distanceM, durationS };
  }
}

export const maps: DistanceProvider = env.MAPS_API_KEY
  ? new GoogleDistanceProvider(env.MAPS_API_KEY)
  : new StubDistanceProvider();
