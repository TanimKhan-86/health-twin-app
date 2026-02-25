import "./global.css";
import React from 'react';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Screens
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import DailyLogScreen from './screens/main/DailyLogScreen';
import DashboardScreen from './screens/main/DashboardScreen';
import DataEntryScreen from './screens/main/DataEntryScreen';
import WhatIfScreen from './screens/main/WhatIfScreen';
import AchievementsScreen from './screens/main/AchievementsScreen';
import WeeklySummaryScreen from './screens/main/WeeklySummaryScreen';
import AnalyticsScreen from './screens/main/AnalyticsScreen';
import SettingsScreen from './screens/profile/SettingsScreen';
import DatabaseViewerScreen from './screens/dev/DatabaseViewerScreen';
import { ToastProvider } from './components/ui/Toast';
import { ActivityIndicator, View, Text } from 'react-native';

const Stack = createNativeStackNavigator();

// ─── Auth Navigator: Sign In / Sign Up ────────────────────────────────────────
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// ─── App Navigator: Protected screens ─────────────────────────────────────────
function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={DashboardScreen} />
      <Stack.Screen name="DailyLog" component={DailyLogScreen} />
      <Stack.Screen name="DataEntry" component={DataEntryScreen} />
      <Stack.Screen name="WhatIf" component={WhatIfScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DatabaseViewer" component={DatabaseViewerScreen} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator: Switches between Auth ↔ App based on auth state ──────────
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={{ color: '#94a3b8', marginTop: 16 }}>Loading HealthTwin...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="light" />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
