import "./global.css";
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database & Helpers
import db from './lib/database';
import { DemoDataHelper } from './lib/demoData';
import { HealthService, UserService } from './lib/services'; // Added UserService

// Screens
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import DailyLogScreen from './screens/main/DailyLogScreen'; // Added DailyLogScreen
import DashboardScreen from './screens/main/DashboardScreen';
import DataEntryScreen from './screens/main/DataEntryScreen';
import WhatIfScreen from './screens/main/WhatIfScreen';
import AchievementsScreen from './screens/main/AchievementsScreen';
import WeeklySummaryScreen from './screens/main/WeeklySummaryScreen';
import AnalyticsScreen from './screens/main/AnalyticsScreen';
import SettingsScreen from './screens/profile/SettingsScreen';
import DatabaseViewerScreen from './screens/dev/DatabaseViewerScreen';
import { ToastProvider } from './components/ui/Toast';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false); // Changed from isDbReady
  const [initialRoute, setInitialRoute] = useState("SignIn"); // Added initialRoute state
  const [dbError, setDbError] = useState<Error | null>(null); // Changed type of dbError

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize Database
        console.log('Initializing database...');
        await db.init();
        console.log('Database initialized successfully');

        // Seed Demo Data if needed
        const hasData = await DemoDataHelper.checkIfDataExists();
        if (!hasData) {
          console.log('Seeding demo data...');
          await DemoDataHelper.populateAllDemoData();
        }

        // Check Auth State
        const userId = await AsyncStorage.getItem('USER_ID');

        if (userId) {
          // Verify user exists in DB (Fix for zombie sessions)
          const user = await UserService.getUser(userId);

          if (!user) {
            console.log("User not found in DB, clearing session.");
            await AsyncStorage.removeItem('USER_ID');
            setInitialRoute("SignIn");
          } else {
            // Check if data exists for today
            const today = new Date().toISOString().split('T')[0];
            const entry = await HealthService.getHealthEntry(userId, today);

            if (entry) {
              setInitialRoute("Main");
            } else {
              // No data for today, go to Daily Log
              setInitialRoute("DailyLog");
            }
          }
        } else {
          setInitialRoute("SignIn");
        }

      } catch (e) {
        console.warn('Initialization Error:', e);
        setDbError(e as Error); // Set error as an Error object
      } finally {
        setIsReady(true); // Set isReady to true in finally block
      }
    }

    prepare();

    // Cleanup on unmount
    return () => {
      db.close();
    };
  }, []);

  // Show loading screen while app initializes
  if (!isReady) { // Changed condition
    return (
      <View className="flex-1 items-center justify-center bg-slate-900"> {/* Updated styling */}
        <ActivityIndicator size="large" color="#a855f7" /> {/* Updated color */}
        <Text className="text-slate-400 mt-4">Initializing HealthTwin...</Text> {/* Updated text and styling */}
      </View>
    );
  }

  // Show error screen if database fails
  if (dbError) { // Changed condition
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 p-8"> {/* Updated styling */}
        <Text className="text-red-400 text-xl font-bold mb-4">Initialization Failed</Text> {/* Updated text and styling */}
        <Text className="text-slate-200 text-center text-lg mb-2">Database Locked</Text>
        <Text className="text-slate-400 text-center mb-6">
          {dbError.message.includes("Access Handle")
            ? "This app is open in another tab. Please close other tabs and reload."
            : dbError.message}
        </Text>
        <Text className="text-slate-500 text-sm text-center">Reference: {dbError.name}</Text>
      </View>
    );
  }

  // Render app once database is ready
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute} // Changed to initialRoute state
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="DailyLog" component={DailyLogScreen} />
            <Stack.Screen name="Main" component={DashboardScreen} />

            {/* Feature screens */}
            <Stack.Screen name="DataEntry" component={DataEntryScreen} />
            <Stack.Screen name="WhatIf" component={WhatIfScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="DatabaseViewer" component={DatabaseViewerScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" /> {/* Added StatusBar */}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
