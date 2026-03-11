import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../../hooks/useTheme';

const Colors = {
  light: { tabBg: '#FFFFFF', tabBorder: '#E5E7EB', tabActive: '#0EA5E9', tabInactive: '#9CA3AF' },
  dark:  { tabBg: '#111827', tabBorder: '#1F2937', tabActive: '#38BDF8', tabInactive: '#6B7280' },
};

export default function TabLayout() {
  const { activeTheme } = useThemeContext();
  const theme = Colors[activeTheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBg,
          borderTopColor: theme.tabBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hogar',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="termostato"
        options={{
          title: 'Termostato',
          tabBarIcon: ({ color, size }) => <Feather name="thermometer" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="energia"
        options={{
          title: 'Energía',
          tabBarIcon: ({ color, size }) => <Feather name="zap" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
