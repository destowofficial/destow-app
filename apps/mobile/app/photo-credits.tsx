import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, PageHead, Screen, Small } from '../components/ui/kit';
import credits from '../assets/cities/credits.json';
import { color, weight } from '../theme/tokens';
import { f, s } from '../theme/responsive';

// Attribution, because the licences require it.
//
// Every city photograph in this app comes from Wikimedia Commons under a
// Creative Commons licence. All of them permit commercial use; all but the CC0
// one make crediting the photographer a condition of that permission. This
// screen is how we meet it, which is why it is reachable from the profile menu
// rather than buried - an attribution nobody can find is not an attribution.
type Credit = { file: string; artist: string; licence: string; page: string };

export default function PhotoCredits() {
  const rows = Object.entries(credits as Record<string, Credit>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <Screen>
      <PageHead
        title="Photo credits"
        subtitle="City photographs from Wikimedia Commons, under Creative Commons."
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {rows.map(([city, c]) => (
          <Card key={city} style={styles.row} onPress={() => Linking.openURL(c.page)}>
            <Text style={styles.city}>{city}</Text>
            <Small>{c.artist}</Small>
            <View style={styles.licenceRow}>
              <Text style={styles.licence}>{c.licence}</Text>
            </View>
          </Card>
        ))}

        <Pressable
          onPress={() => Linking.openURL('https://commons.wikimedia.org')}
          accessibilityRole="link"
        >
          <Small style={styles.foot}>commons.wikimedia.org</Small>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: s(18), paddingBottom: s(30), gap: s(9) },
  intro: { marginBottom: s(4) },
  row: { padding: s(13), gap: s(3) },
  city: { fontSize: f(14.5), fontWeight: weight.bold, color: color.ink },
  licenceRow: { flexDirection: 'row', marginTop: s(5) },
  licence: {
    fontSize: f(11),
    fontWeight: weight.bold,
    color: color.sub,
    backgroundColor: color.bg,
    paddingHorizontal: s(8),
    paddingVertical: s(3),
    borderRadius: 999,
    overflow: 'hidden',
  },
  foot: { textAlign: 'center', marginTop: s(10) },
});
