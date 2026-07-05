import { env } from '../config/env.js';

export interface DistanceResult {
  distanceM: number; // metres
  durationS: number; // seconds
}

// Swappable distance/route provider.
export interface DistanceProvider {
  distance(from: string, to: string): Promise<DistanceResult>;
}

// Google Distance Matrix - wired when the key is present.
class GoogleDistanceProvider implements DistanceProvider {
  async distance(_from: string, _to: string): Promise<DistanceResult> {
    throw new Error('GoogleDistanceProvider not implemented - set MAPS_API_KEY');
  }
}

// Dev: deterministic estimate (stable per route) until Maps is wired.
class StubDistanceProvider implements DistanceProvider {
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
  ? new GoogleDistanceProvider()
  : new StubDistanceProvider();
