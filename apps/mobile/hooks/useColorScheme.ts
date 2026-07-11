import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '../stores/useAppStore';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const isDarkMode = useAppStore((s) => s.isDarkMode);

  return isDarkMode ? 'dark' : (systemScheme ?? 'light');
}
