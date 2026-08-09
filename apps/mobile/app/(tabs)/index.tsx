import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, ErrorState, H2, Hero, Label, Loading, P, Row, Screen, Small } from '../../components/ui/kit';
import { Icon } from '../../components/ui/Icon';
import { color, radius, shadow, weight } from '../../theme/tokens';
import { f, s } from '../../theme/responsive';
import { listCities, listPopularRoutes } from '../../services/destow';
import { useAsync } from '../../hooks/useAsync';
import { rupees, km } from '../../lib/format';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBookingStore } from '../../stores/useBookingStore';

// One job: start a search. Popular routes are observed from real bookings rather
// than curated, so an empty shelf on a young deployment is honest - the city
// list carries the screen until there is demand to show.
export default function Home() {
  const user = useAuthStore((st) => st.user);
  const setRoute = useBookingStore((st) => st.setRoute);

  const routes = useAsync(listPopularRoutes, []);
  const cities = useAsync(listCities, []);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  function start(from?: string, to?: string) {
    setRoute({ from: from ?? '', to: to ?? '' });
    router.push('/(booking)/plan');
  }

  const loading = routes.loading && cities.loading;

  return (
    <Screen>
      <Hero>
        <Row style={styles.heroRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <H2 style={styles.name}>{user?.name?.split(' ')[0] ?? 'there'}</H2>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.name)}</Text>
          </View>
        </Row>
      </Hero>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <Card lift style={styles.search}>
          <Pressable onPress={() => start()} accessibilityRole="button">
            <View style={styles.leg}>
              <Icon name="dot" size={17} color={color.ok} />
              <View style={styles.legText}>
                <Label>From</Label>
                <Text style={styles.legValue}>Delhi</Text>
              </View>
            </View>
            <View style={styles.legDivider} />
            <View style={styles.leg}>
              <Icon name="pin" size={17} color={color.red} />
              <View style={styles.legText}>
                <Label>To</Label>
                <Text style={[styles.legValue, styles.legPlaceholder]}>Where are you going?</Text>
              </View>
            </View>
            <View style={styles.searchCta}>
              <Icon name="search" size={16} color={color.white} />
              <Text style={styles.searchCtaText}>Search</Text>
            </View>
          </Pressable>
        </Card>

        {loading ? (
          <View style={styles.block}>
            <Loading />
          </View>
        ) : routes.error && cities.error ? (
          <View style={styles.block}>
            <ErrorState
              message={routes.error}
              onRetry={() => {
                routes.reload();
                cities.reload();
              }}
            />
          </View>
        ) : (routes.data?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <H2 style={styles.sectionTitle}>Popular routes</H2>
            {routes.data!.slice(0, 6).map((r) => (
              <Card key={`${r.from}-${r.to}`} style={styles.row} onPress={() => start(r.from, r.to)}>
                <Row>
                  <View style={styles.plate}>
                    <Icon name="pin" size={18} color={color.blue} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {r.from} ⇄ {r.to}
                    </Text>
                    <Small>{r.bookings} trips booked</Small>
                  </View>
                  <Icon name="forward" size={16} color={color.dim} />
                </Row>
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <H2 style={styles.sectionTitle}>Where to?</H2>
            <P style={styles.sectionNote}>
              We run outstation round trips across {cities.data?.length ?? 0} cities.
            </P>
            {(cities.data ?? []).slice(0, 8).map((c) => (
              <Card key={c.id} style={styles.row} onPress={() => start('Delhi', c.name)}>
                <Row>
                  <View style={styles.plate}>
                    <Icon name="pin" size={18} color={color.blue} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{c.name}</Text>
                    {c.state ? <Small>{c.state}</Small> : null}
                  </View>
                  <Icon name="forward" size={16} color={color.dim} />
                </Row>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function initials(name?: string | null): string {
  if (!name) return '·';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  heroRow: { paddingTop: s(6) },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: f(12.5) },
  name: { color: color.white },
  avatar: {
    width: s(38),
    height: s(38),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: color.white, fontSize: f(14), fontWeight: weight.bold },

  scroll: { flex: 1, marginTop: -s(26) },
  scrollBody: { paddingBottom: s(28) },
  search: { marginHorizontal: s(18), padding: s(6) },
  leg: { flexDirection: 'row', alignItems: 'center', gap: s(11), padding: s(11) },
  legText: { flex: 1 },
  legValue: { fontSize: f(14.5), fontWeight: weight.semi, color: color.ink },
  legPlaceholder: { color: color.dim, fontWeight: weight.medium },
  legDivider: { height: 1, backgroundColor: color.line, marginLeft: s(40) },
  searchCta: {
    height: s(42),
    borderRadius: radius.md,
    backgroundColor: color.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: s(8),
    margin: s(5),
    ...shadow.blue,
  },
  searchCtaText: { color: color.white, fontSize: f(14.5), fontWeight: weight.bold },

  block: { height: s(200) },
  section: { marginTop: s(22), paddingHorizontal: s(18), gap: s(9) },
  sectionTitle: { marginBottom: s(2) },
  sectionNote: { marginBottom: s(4) },
  row: { padding: s(12) },
  rowText: { flex: 1 },
  rowTitle: { fontSize: f(14), fontWeight: weight.semi, color: color.ink },
  plate: {
    width: s(36),
    height: s(36),
    borderRadius: radius.md,
    backgroundColor: color.blueWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
