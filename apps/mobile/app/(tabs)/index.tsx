import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ErrorState, Label, Loading, Screen, Small } from '../../components/ui/kit';
import { DestinationSheet } from '../../components/DestinationSheet';
import { Icon } from '../../components/ui/Icon';
import { Logo } from '../../components/ui/Logo';
import { cityPhoto } from '../../assets/cities';
import { color, radius, shadow, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { listCities, listPopularRoutes } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { km } from '../../lib/format';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBookingStore } from '../../stores/useBookingStore';

// One job, one control: say where you are going.
//
// Everything else a trip needs - the pickup address, the dates - is asked for
// on the next screen, once there is a destination to hang it on. A home screen
// that asks for four things at once gets none of them.
export default function Home() {
  const user = useAuthStore((st) => st.user);
  const setRoute = useBookingStore((st) => st.setRoute);
  const [picking, setPicking] = useState(false);

  const routes = useAsync(listPopularRoutes, []);
  const cities = useAsync(listCities, []);

  const first = user?.name?.split(' ')[0];
  const popular = routes.data ?? [];
  const onShelf = new Set(popular.map((r) => r.to));
  const elsewhere = (cities.data ?? []).filter((c) => !onShelf.has(c.name)).slice(0, 8);

  function choose(to: string) {
    setPicking(false);
    setRoute({ from: '', to });
    router.push('/(booking)/plan');
  }

  return (
    <Screen ground={color.blue}>
      <View style={styles.head}>
        <Text style={styles.title}>{first ? `Where to, ${first}?` : 'Where to?'}</Text>
        <Text style={styles.sub}>
          {cities.data?.length
            ? `Outstation round trips across Indida`
            : 'Outstation round trips'}
        </Text>

        <Pressable
          onPress={() => setPicking(true)}
          style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}
          accessibilityRole="search"
          accessibilityLabel="Where do you want to go?"
        >
          <Logo height={s(17)} />
          <View style={styles.markRule} />
          <Text style={styles.placeholder}>Where do you want to go?</Text>
          <Icon name="search" size={19} color={color.blue} />
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {routes.loading && cities.loading ? (
            <Loading />
          ) : routes.error && cities.error ? (
            <ErrorState
              message={routes.error}
              onRetry={() => {
                routes.reload();
                cities.reload();
              }}
            />
          ) : (
            <>
              {/* Observed from real bookings, so this shelf is one tile or none
                  on a young deployment - and an empty shelf is not drawn. */}
              {popular.length > 0 ? (
                <>
                  <Label style={styles.shelfLabel}>Popular right now</Label>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.reel}
                  >
                    {popular.slice(0, 6).map((r) => (
                      <Pressable
                        key={`${r.from}-${r.to}`}
                        onPress={() => choose(r.to)}
                        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`${r.from} to ${r.to}`}
                      >
                        <PhotoTile name={r.to} />
                        <View style={styles.tileText}>
                          <Text style={styles.tileName}>{r.to}</Text>
                          <Small>{km(r.distanceM) || `from ${r.from}`}</Small>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {/* Everywhere else we go. With one popular route the screen would
                  otherwise be nine tenths empty, which reads as broken rather
                  than new - this is the content that makes it a screen. */}
              {elsewhere.length > 0 ? (
                <>
                  <Label style={styles.shelfLabel}>Where we run</Label>
                  <View style={styles.grid}>
                    {elsewhere.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => choose(c.name)}
                        style={({ pressed }) => [styles.cell, pressed && styles.tilePressed]}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                      >
                        <PhotoTile name={c.name} />
                        <View style={styles.tileText}>
                          <Text style={styles.tileName}>{c.name}</Text>
                          <Small>{c.state}</Small>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      <DestinationSheet
        open={picking}
        onClose={() => setPicking(false)}
        onPick={choose}
        cities={cities.data ?? []}
        popular={popular}
      />
    </Screen>
  );
}

function PhotoTile({ name }: { name: string }) {
  const photo = cityPhoto(name);
  if (!photo) {
    return (
      <View style={[styles.tilePhoto, styles.tileFallback]}>
        <Text style={styles.tileLetter}>{name[0]}</Text>
      </View>
    );
  }
  return <Image source={photo} style={styles.tilePhoto} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  head: {
    backgroundColor: color.blue,
    paddingHorizontal: s(18),
    paddingTop: s(4),
    paddingBottom: s(18),
  },
  title: { color: color.white, fontSize: f(21), fontWeight: weight.black, letterSpacing: -0.6 },
  sub: { color: 'rgba(255,255,255,0.82)', fontSize: f(13), marginTop: s(3) },

  sheet: { flex: 1, backgroundColor: color.bg },
  body: { paddingBottom: s(28), paddingTop: s(4) },

  // Lifted over the seam between the blue and the ground so the control reads
  // as the subject of the screen rather than the first row of a list.
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    marginTop: s(16),
    paddingHorizontal: s(16),
    paddingVertical: s(16),
    backgroundColor: color.card,
    borderRadius: radius.xl,
    ...shadow.md,
  },
  searchPressed: { backgroundColor: color.blueWash },
  markRule: { width: 1, height: f(20), backgroundColor: color.line },
  placeholder: { flex: 1, fontSize: f(15.5), fontWeight: weight.semi, color: color.dim },

  shelfLabel: { marginTop: s(20), marginBottom: s(10), paddingHorizontal: s(18) },
  reel: { paddingHorizontal: s(18), gap: s(12) },
  tile: {
    width: s(150),
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  tilePressed: { borderColor: color.blueBorder },
  tilePhoto: { width: '100%', height: s(96), backgroundColor: color.line },
  tileFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.blueWash },
  tileLetter: { fontSize: f(30), fontWeight: weight.black, color: color.blue },
  tileText: { padding: s(11), gap: s(2) },
  // Two to a row, sized off the gap rather than a fixed width so it holds from
  // a small phone to a tablet.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(12), paddingHorizontal: s(18) },
  cell: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  tileName: { fontSize: f(15), fontWeight: weight.bold, color: color.ink, letterSpacing: -0.2 },
});
