import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  focused,
  color,
}: {
  name: IconName;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={styles.iconWrapper}>
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={23} color={color} />
      </View>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="redeem"
        options={{
          title: 'Redeem',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="gift" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="document-text" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    height: 74,
    paddingBottom: 12,
    paddingTop: 10,
    elevation: 12,
    shadowColor: '#0F231A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: THEME.colors.primarySurface,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.primary,
  },
});
