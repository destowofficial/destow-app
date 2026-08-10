import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Button, Small } from './ui/kit';
import { Icon } from './ui/Icon';
import { color, radius, shadow, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';

// Dropping a pin where the car should actually turn up.
//
// The pin is fixed to the centre of the screen and the map moves underneath it,
// rather than a marker being dragged around. It is the pattern every mapping
// app converged on for a reason: your thumb never covers the thing you are
// aiming at, and the target stays put while you pan.
//
// The address is resolved on the device. Reverse geocoding through expo-location
// uses the platform's own geocoder, so panning costs nothing per move - which
// matters when a settle-and-resolve fires on every pan.

/** Roughly a large city across, which is where somebody starts a search. */
const START_DELTA = 0.12;
/** Close enough to pick a street, which is where they finish. */
const PICKED_DELTA = 0.006;
/** Let the map settle before spending a geocode on a position they are leaving. */
const SETTLE_MS = 400;
/** Delhi, so an unresolved location opens somewhere rather than in the ocean. */
const FALLBACK: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: START_DELTA,
  longitudeDelta: START_DELTA,
};

export function MapPickerSheet({
  open,
  title,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (place: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const map = useRef<MapView | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  // Panning fires repeatedly and the geocoder answers out of order; only the
  // newest request may write the address.
  const latest = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setAddress(null);
      setDenied(false);
      return;
    }
    // Opening on the customer's own position is right far more often than not -
    // most trips start where the phone is.
    void locate();
    return () => {
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function resolve(region: Region) {
    const seq = ++latest.current;
    setResolving(true);
    try {
      const [hit] = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      if (seq !== latest.current) return;
      setAddress(hit ? describe(hit) : null);
    } catch {
      if (seq === latest.current) setAddress(null);
    } finally {
      if (seq === latest.current) setResolving(false);
    }
  }

  function onRegionSettled(region: Region) {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => void resolve(region), SETTLE_MS);
  }

  async function locate() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        // Refused permission is not a dead end - the map still pans.
        if (!address) void resolve(FALLBACK);
        return;
      }
      setDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: PICKED_DELTA,
        longitudeDelta: PICKED_DELTA,
      };
      // Always recentre: this is only reached because they asked to be located.
      map.current?.animateToRegion(region, 500);
      void resolve(region);
    } catch {
      if (!address) void resolve(FALLBACK);
    } finally {
      setLocating(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialRegion={FALLBACK}
          onRegionChangeComplete={onRegionSettled}
          showsUserLocation={!denied}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        />

        {/* Fixed to the centre, lifted by half its own height so the point of
            the pin sits on the spot rather than the middle of the glyph. */}
        <View pointerEvents="none" style={styles.crosshair}>
          <Icon name="pin" size={38} color={color.blue} />
          <View style={styles.pinShadow} />
        </View>

        <View style={[styles.top, { paddingTop: insets.top + s(8) }]}>
          <Pressable
            onPress={onClose}
            style={styles.round}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="back" size={20} color={color.ink} />
          </Pressable>
          <View style={styles.titleChip}>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => void locate()}
          style={[styles.locate, { bottom: insets.bottom + s(150) }]}
          accessibilityRole="button"
          accessibilityLabel="Use my current location"
        >
          {locating ? (
            <ActivityIndicator color={color.blue} size="small" />
          ) : (
            <Icon name="dot" size={20} color={color.blue} />
          )}
        </Pressable>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + s(14) }]}>
          <Text style={styles.label}>{title}</Text>
          {resolving ? (
            <Small>Finding that place…</Small>
          ) : (
            <Text style={styles.address} numberOfLines={2}>
              {address ?? 'Move the map to choose a point'}
            </Text>
          )}
          {denied ? (
            <Small style={styles.denied}>
              Location is off, so the map opened at a default. Pan to your pickup point.
            </Small>
          ) : null}
          <Button
            label="Confirm this point"
            onPress={() => address && onConfirm(address)}
            disabled={!address || resolving}
            style={styles.confirm}
          />
        </View>
      </View>
    </Modal>
  );
}

// A pickup a driver can actually find: the street and the locality, not the
// full postal address with the country on the end.
function describe(hit: Location.LocationGeocodedAddress): string {
  const near = [hit.name, hit.street].filter(Boolean);
  // `name` is often the street number, which duplicates `street`.
  const head = near.length > 1 && hit.street?.includes(hit.name ?? '') ? hit.street : near[0];
  const parts = [head, hit.district, hit.city ?? hit.subregion, hit.region].filter(
    (p, i, all): p is string => !!p && all.indexOf(p) === i,
  );
  return parts.slice(0, 3).join(', ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },

  crosshair: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // The pin's point is at its foot, so the glyph rides above centre.
    paddingBottom: s(38),
  },
  pinShadow: {
    width: s(8),
    height: s(4),
    borderRadius: 999,
    backgroundColor: 'rgba(16,24,40,0.28)',
    marginTop: -s(2),
  },

  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(14) },
  round: {
    width: s(40),
    height: s(40),
    borderRadius: 999,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  titleChip: {
    paddingHorizontal: s(14),
    paddingVertical: s(9),
    borderRadius: 999,
    backgroundColor: color.card,
    ...shadow.md,
  },
  title: { fontSize: f(13.5), fontWeight: weight.bold, color: color.ink },

  locate: {
    position: 'absolute',
    right: s(16),
    width: s(46),
    height: s(46),
    borderRadius: 999,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: s(18),
    paddingTop: s(16),
    gap: s(4),
    ...shadow.lg,
  },
  label: {
    fontSize: f(11),
    fontWeight: weight.bold,
    color: color.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  address: { fontSize: f(16), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },
  denied: { marginTop: s(4) },
  confirm: { marginTop: s(14) },
});
