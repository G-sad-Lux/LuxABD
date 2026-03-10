import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

// Root Layout Wrapper
export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthLayout />
    </AuthProvider>
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
      // Redirect away from login to main dashboard
      router.replace('/');
    }
  }, [session, isLoading, segments]);

  return <Slot />;
}
