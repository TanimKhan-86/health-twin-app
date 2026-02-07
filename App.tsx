import "./global.css";
import React from 'react';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import DashboardScreen from './screens/main/DashboardScreen';

import DataEntryScreen from './screens/main/DataEntryScreen';
import WhatIfScreen from './screens/main/WhatIfScreen';
import WeeklySummaryScreen from './screens/main/WeeklySummaryScreen';
import AnalyticsScreen from './screens/main/AnalyticsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  console.log("App Component Mounting");
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="SignIn"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Main" component={DashboardScreen} />

          {/* Add other screens as we implement them */}
          <Stack.Screen name="DataEntry" component={DataEntryScreen} />
          <Stack.Screen name="WhatIf" component={WhatIfScreen} />
          <Stack.Screen name="Summary" component={WeeklySummaryScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
