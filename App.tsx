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

// Screens
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import DashboardScreen from './screens/main/DashboardScreen';
import DataEntryScreen from './screens/main/DataEntryScreen';
import WhatIfScreen from './screens/main/WhatIfScreen';
import AchievementsScreen from './screens/main/AchievementsScreen';
import WeeklySummaryScreen from './screens/main/WeeklySummaryScreen';
import AnalyticsScreen from './screens/main/AnalyticsScreen';

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
        // const userId = await AsyncStorage.getItem('USER_ID');
        // if (userId) {
        //   setInitialRoute("Main");
        // }

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
        <Text className="text-red-400 text-xl font-bold mb-2">Initialization Failed</Text> {/* Updated text and styling */}
        <Text className="text-slate-400 text-center">{dbError.message}</Text> {/* Display error message */}
      </View>
    );
  }

  // Render app once database is ready
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute} // Changed to initialRoute state
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Main" component={DashboardScreen} />

          {/* Feature screens */}
          <Stack.Screen name="DataEntry" component={DataEntryScreen} />
          <Stack.Screen name="WhatIf" component={WhatIfScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" /> {/* Added StatusBar */}
    </SafeAreaProvider>
  );
}
