import "./global.css";
import React from 'react';
import { LogBox, ActivityIndicator, View, Text } from 'react-native';
LogBox.ignoreLogs([
    'SafeAreaView has been deprecated',
    'No suitable URL request handler found for media://',
    '[expo-av]: Expo AV has been deprecated',
]);
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Design System
import { ThemeProvider } from './lib/design/ThemeProvider';
import { colors } from './lib/design/tokens';

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Navigation
import { TabNavigator } from './navigation/TabNavigator';

// Auth Screens
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';

// Toast
import { ToastProvider } from './components/ui/Toast';

const AuthStack = createNativeStackNavigator();

// ── Auth Navigator ──
function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="SignIn" component={SignInScreen} />
            <AuthStack.Screen name="SignUp" component={SignUpScreen} />
        </AuthStack.Navigator>
    );
}

// ── Root Navigator ──
function RootNavigator() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.background.primary.light,
            }}>
                <ActivityIndicator size="large" color={colors.brand.primary.light} />
                <Text style={{
                    color: colors.text.secondary.light,
                    marginTop: 16,
                    fontFamily: 'Inter-Medium',
                    fontSize: 15,
                }}>
                    Loading HealthTwin...
                </Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}

// ── Root App ──
export default function App() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <RootNavigator />
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
