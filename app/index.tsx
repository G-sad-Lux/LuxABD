import { Redirect } from 'expo-router';

// Redirect root / to the tab navigator
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
