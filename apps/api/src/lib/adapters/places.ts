import { env } from '../../config/env.js';
import { AppError } from '../http/errors.js';
import { safeError } from '../log/safe.js';
import {
  externalRequestDuration,
  externalRequestsTotal,
  observeAsync,
} from '../metrics/metrics.js';

export interface PlaceSuggestion {
  /** Provider's opaque id. Stable enough to re-resolve, never shown. */
  id: string;
  /** What the customer typed towards: "Manali". */
  name: string;
  /** The rest of it: "Himachal Pradesh, India". */
  context: string;
}

// Swappable place-search provider, same shape as the distance one.
export interface PlacesProvider {
  readonly name: string;
  suggest(query: string): Promise<PlaceSuggestion[]>;
}

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
// Typing is interactive: a suggestion that arrives after the next keystroke is
// worthless, so this is far tighter than the distance timeout.
const TIMEOUT_MS = 2_500;

interface AutocompleteResponse {
  status?: string;
  error_message?: string;
  predictions?: Array<{
    place_id?: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
    description?: string;
  }>;
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly name = 'google';

  constructor(private readonly apiKey: string) {}

  async suggest(query: string): Promise<PlaceSuggestion[]> {
    const url = new URL(AUTOCOMPLETE_URL);
    url.searchParams.set('input', query);
    // India only, and places rather than businesses: a customer books a trip to
    // a town, not to a particular restaurant in it.
    url.searchParams.set('components', 'country:in');
    url.searchParams.set('types', '(regions)');
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', this.apiKey);

    return observeAsync(
      externalRequestDuration,
      externalRequestsTotal,
      { provider: 'google', operation: 'places_autocomplete' },
      async () => {
        let res: Response;
        try {
          res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        } catch (err) {
          // Never log the URL: it carries the API key.
          console.error(`[places] autocomplete request failed: ${safeError(err)}`);
          throw AppError.serviceUnavailable('Could not search places right now');
        }

        if (!res.ok) {
          console.error(`[places] autocomplete HTTP ${res.status}`);
          throw AppError.serviceUnavailable('Could not search places right now');
        }

        const body = (await res.json()) as AutocompleteResponse;

        // Nothing matching is a normal answer, not a failure.
        if (body.status === 'ZERO_RESULTS') return [];
        if (body.status !== 'OK') {
          // error_message can name the key or the billing account.
          console.error(`[places] autocomplete status=${body.status}`);
          throw AppError.serviceUnavailable('Could not search places right now');
        }

        return (body.predictions ?? [])
          .map((p) => ({
            id: p.place_id ?? '',
            name: p.structured_formatting?.main_text ?? p.description ?? '',
            context: p.structured_formatting?.secondary_text ?? '',
          }))
          .filter((p) => p.id && p.name)
          .slice(0, 8);
      },
    );
  }
}

// Dev: searches the cities we have seeded, so the whole flow is exercisable
// without a billed key. Deliberately not a fake India-wide index - pretending
// to find places we cannot route to would hide the missing key rather than
// make it obvious.
export class StubPlacesProvider implements PlacesProvider {
  readonly name = 'stub';

  constructor(private readonly lookup: () => Promise<Array<{ name: string; state: string | null }>>) {}

  async suggest(query: string): Promise<PlaceSuggestion[]> {
    const q = query.trim().toLowerCase();
    const cities = await this.lookup();
    return cities
      .filter((c) => c.name.toLowerCase().includes(q) || (c.state ?? '').toLowerCase().includes(q))
      .slice(0, 8)
      .map((c) => ({
        id: `stub:${c.name}`,
        name: c.name,
        context: c.state ? `${c.state}, India` : 'India',
      }));
  }
}

export function makePlacesProvider(
  lookup: () => Promise<Array<{ name: string; state: string | null }>>,
): PlacesProvider {
  return env.MAPS_API_KEY
    ? new GooglePlacesProvider(env.MAPS_API_KEY)
    : new StubPlacesProvider(lookup);
}
