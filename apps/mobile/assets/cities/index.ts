import type { ImageSourcePropType } from 'react-native';

// City photographs, discovered rather than listed.
//
// The images themselves are not in git - they are ~2MB of Wikimedia Commons
// files that would bloat the history for something regenerable - so this cannot
// be a hand-written list of `require('./agra.jpg')`. A static require of a file
// that is not there is a bundler error, not a missing image, and a fresh clone
// would fail to start.
//
// `require.context` is resolved by Metro at bundle time over whatever actually
// exists on disk. With the photos present the map is full; without them it is
// empty and every list falls back to its pin tile. Both are working states.
//
// Run `make city-photos` to fetch them. Attribution for each one lives in
// credits.json and is shown on the Photo credits screen, which the Creative
// Commons licences require.
declare const require: {
  context(dir: string, useSubdirs: boolean, match: RegExp): {
    keys(): string[];
    (id: string): ImageSourcePropType;
  };
};

const photos = require.context('./', false, /\.jpg$/);

export const cityPhotos: Record<string, ImageSourcePropType> = Object.fromEntries(
  photos.keys().map((key) => {
    // './manali.jpg' -> 'manali'
    const slug = key.replace(/^\.\//, '').replace(/\.jpg$/, '');
    return [slug, photos(key)];
  }),
);

/** Undefined when we have no photograph of somewhere, which is normal. */
export function cityPhoto(name: string): ImageSourcePropType | undefined {
  return cityPhotos[name.trim().toLowerCase()];
}
