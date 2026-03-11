import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../hooks/useAuth';

import { ThemeProvider } from '../hooks/useTheme';

// Root Layout Wrapper
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Logic to protect generic routes when user is unauthenticated
function AuthLayout() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to the login page
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect away from login to the tab-based dashboard
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  return <Slot />;
}
