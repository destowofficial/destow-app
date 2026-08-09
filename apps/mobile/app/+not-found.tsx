import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Button, H1, P, Screen } from '../components/ui/kit';
import { s } from '../theme/responsive';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <View style={styles.body}>
          <H1 style={styles.centre}>That page has moved</H1>
          <P style={styles.centre}>
            The link you followed does not lead anywhere in the app any more.
          </P>
          <Button
            label="Back to home"
            onPress={() => router.replace('/(tabs)')}
            style={styles.cta}
          />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: s(24), gap: s(10) },
  centre: { textAlign: 'center' },
  cta: { marginTop: s(14), alignSelf: 'stretch' },
});
