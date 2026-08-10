import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { City, PlaceSuggestion, PopularRoute } from '@destow/contracts';
import { Label, Small } from './ui/kit';
import { Icon } from './ui/Icon';
import { cityPhoto } from '../assets/cities';
import { suggestPlaces } from '../services/destow';
import { MapPickerSheet } from './MapPickerSheet';
import { color, radius, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';
import { km } from '../lib/format';

// Where the customer says where they are going.
//
// Full screen rather than a half-height sheet: the moment the keyboard comes up
// a partial sheet has almost nothing left to show, and the results end up
// underneath it. It still slides up from the bottom, so it reads as a step
// inside asking for a trip rather than a departure from the app.
//
// The list is the maps provider's, not our cities table. People go to towns we
// have never taken a booking for, and a search that only knows what we seeded
// finds nothing for most of India.
const DEBOUNCE_MS = 250;
const MIN_QUERY = 3;

export function DestinationSheet({
  open,
  onClose,
  onPick,
  cities,
  popular,
  exclude,
  mapTitle,
  placeholder,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (city: string) => void;
  cities: City[];
  popular: PopularRoute[];
  exclude?: string;
  /** What the map is being asked for, e.g. "Pickup point". */
  mapTitle?: string;
  /** The field asks for a pickup as often as a destination. */
  placeholder?: string;
}) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [onMap, setOnMap] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  // Every keystroke past the debounce is a billed autocomplete call, and replies
  // can land out of order - only the newest one may write to the list.
  const latest = useRef(0);

  const query = q.trim();
  const searchable = query.length >= MIN_QUERY;

  useEffect(() => {
    if (!open) return;
    if (!searchable) {
      setResults([]);
      setSearching(false);
      setFailed(false);
      return;
    }
    const seq = ++latest.current;
    setSearching(true);
    setFailed(false);
    const t = setTimeout(async () => {
      try {
        const found = await suggestPlaces(query);
        if (seq === latest.current) setResults(found);
      } catch {
        if (seq === latest.current) {
          setResults([]);
          setFailed(true);
        }
      } finally {
        if (seq === latest.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, searchable, open]);

  function pick(name: string) {
    setQ('');
    setResults([]);
    onPick(name);
  }

  function close() {
    setQ('');
    setResults([]);
    onClose();
  }

  const shelf = popular.filter((r) => r.to !== exclude);
  const everywhere = cities.filter(
    (c) => c.name !== exclude && !new Set(shelf.map((r) => r.to)).has(c.name),
  );

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Pressable onPress={close} hitSlop={10} accessibilityLabel="Back" accessibilityRole="button">
            <Icon name="back" size={22} color={color.ink} />
          </Pressable>
          <View style={styles.field}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={placeholder ?? 'Where do you want to go?'}
              placeholderTextColor={color.dim}
              style={styles.input}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Search destinations"
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear">
                <Icon name="cross" size={17} color={color.dim} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + s(24) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setOnMap(true)}
            style={({ pressed }) => [styles.onMap, pressed && styles.placePressed]}
            accessibilityRole="button"
            accessibilityLabel="Choose the point on a map"
          >
            <View style={styles.onMapPlate}>
              <Icon name="pin" size={19} color={color.blue} />
            </View>
            <View style={styles.placeText}>
              <Text style={styles.placeName}>Choose on map</Text>
              <Small>Drop a pin exactly where the car should come</Small>
            </View>
            <Icon name="forward" size={16} color={color.dim} />
          </Pressable>

          {query.length > 0 && !searchable ? (
            <Small style={styles.hint}>Keep typing — at least {MIN_QUERY} letters.</Small>
          ) : null}

          {searchable ? (
            <>
              {searching ? (
                <View style={styles.busy}>
                  <ActivityIndicator color={color.blue} />
                </View>
              ) : null}

              {!searching && failed ? (
                <View style={styles.none}>
                  <Text style={styles.noneTitle}>Couldn&apos;t search just now</Text>
                  <Small style={styles.noneText}>Check your connection and try again.</Small>
                </View>
              ) : null}

              {!searching && !failed && results.length === 0 ? (
                <View style={styles.none}>
                  <Text style={styles.noneTitle}>Nowhere by that name</Text>
                  <Small style={styles.noneText}>Try a nearby town or a different spelling.</Small>
                </View>
              ) : null}

              {results.map((r) => (
                <Place key={r.id} name={r.name} note={r.context} onPress={() => pick(r.name)} />
              ))}
            </>
          ) : (
            <>
              {shelf.length > 0 ? (
                <>
                  <Label style={styles.shelfLabel}>Popular right now</Label>
                  {shelf.slice(0, 4).map((r) => (
                    <Place
                      key={`${r.from}-${r.to}`}
                      name={r.to}
                      note={km(r.distanceM) || undefined}
                      onPress={() => pick(r.to)}
                    />
                  ))}
                </>
              ) : null}

              {everywhere.length > 0 ? (
                <>
                  <Label style={styles.shelfLabel}>Where we run</Label>
                  {everywhere.map((c) => (
                    <Place key={c.id} name={c.name} note={c.state} onPress={() => pick(c.name)} />
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      <MapPickerSheet
        open={onMap}
        title={mapTitle ?? 'Choose the point'}
        onClose={() => setOnMap(false)}
        onConfirm={(place) => {
          setOnMap(false);
          pick(place);
        }}
      />
    </Modal>
  );
}

// A photograph carries a place in a way an icon cannot: people recognise the
// hills above Manali before they read the word. Somewhere the maps provider
// returned that we have no photograph for gets a pin of the same size, so the
// list does not jump as it scrolls.
function Place({ name, note, onPress }: { name: string; note?: string; onPress: () => void }) {
  const photo = cityPhoto(name);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.place, pressed && styles.placePressed]}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      {photo ? (
        <Image source={photo} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Icon name="pin" size={22} color={color.blue} />
        </View>
      )}
      <View style={styles.placeText}>
        <Text style={styles.placeName}>{name}</Text>
        {note ? <Small numberOfLines={1}>{note}</Small> : null}
      </View>
      <Icon name="forward" size={16} color={color.dim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingHorizontal: s(16),
    paddingVertical: s(10),
    backgroundColor: color.card,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingHorizontal: s(14),
    paddingVertical: s(11),
    backgroundColor: color.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
  },
  input: { flex: 1, fontSize: f(15.5), fontWeight: weight.semi, color: color.ink, padding: 0 },

  list: { paddingHorizontal: s(16), paddingTop: s(12), gap: s(8) },
  shelfLabel: { marginTop: s(8), marginBottom: s(2) },
  hint: { paddingVertical: s(14), textAlign: 'center' },
  busy: { paddingVertical: s(28) },

  onMap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(13),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: s(11),
    borderWidth: 1,
    borderColor: color.blueBorder,
    marginBottom: s(4),
  },
  onMapPlate: {
    width: s(42),
    height: s(42),
    borderRadius: radius.md,
    backgroundColor: color.blueWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(13),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: s(9),
    borderWidth: 1,
    borderColor: color.line,
  },
  placePressed: { backgroundColor: color.blueWash, borderColor: color.blueBorder },
  photo: { width: s(54), height: s(54), borderRadius: radius.md, backgroundColor: color.line },
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.blueWash },
  placeText: { flex: 1, gap: s(2) },
  placeName: { fontSize: f(15.5), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },

  none: { alignItems: 'center', paddingVertical: s(40), gap: s(5) },
  noneTitle: { fontSize: f(15), fontWeight: weight.bold, color: color.ink },
  noneText: { textAlign: 'center' },
});
