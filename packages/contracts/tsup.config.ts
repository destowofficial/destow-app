import { defineConfig } from 'tsup';

// Emits ESM (.js) + CJS (.cjs) + d.ts so both the Node/esbuild backend and
// (later) the React Native / Metro mobile app consume it without resolution friction.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
