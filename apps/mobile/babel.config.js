module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 compiles worklet functions here. Without it they ship as
      // ordinary closures, and the native worklets runtime reads them as
      // compiled worklets - which is a memcpy against a garbage pointer and a
      // SIGSEGV in libworklets.so about a second after the bundle loads.
      //
      // Must stay last: it has to run after every other transform.
      'react-native-worklets/plugin',
    ],
  };
};
