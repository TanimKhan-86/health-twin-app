import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, PenSquare, BarChart2, User } from 'lucide-react-native';
import { useTheme } from '../lib/design/useTheme';

// Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import DailyLogScreen from '../screens/main/DailyLogScreen';
import DataEntryScreen from '../screens/main/DataEntryScreen';
import WhatIfScreen from '../screens/main/WhatIfScreen';
import AnalyticsScreen from '../screens/main/AnalyticsScreen';
import WeeklySummaryScreen from '../screens/main/WeeklySummaryScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import AchievementsScreen from '../screens/main/AchievementsScreen';
import DatabaseViewerScreen from '../screens/dev/DatabaseViewerScreen';

const Tab = createBottomTabNavigator();
const TodayStack = createNativeStackNavigator();
const InsightsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// ── Today Tab Stack ──
function TodayStackScreen() {
    return (
        <TodayStack.Navigator screenOptions={{ headerShown: false }}>
            <TodayStack.Screen name="Dashboard" component={DashboardScreen} />
            <TodayStack.Screen name="DataEntry" component={DataEntryScreen} />
            <TodayStack.Screen name="WhatIf" component={WhatIfScreen} />
        </TodayStack.Navigator>
    );
}

// ── Insights Tab Stack ──
function InsightsStackScreen() {
    return (
        <InsightsStack.Navigator screenOptions={{ headerShown: false }}>
            <InsightsStack.Screen name="Analytics" component={AnalyticsScreen} />
            <InsightsStack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
        </InsightsStack.Navigator>
    );
}

// ── Profile Tab Stack ──
function ProfileStackScreen() {
    return (
        <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ProfileStack.Screen name="Settings" component={SettingsScreen} />
            <ProfileStack.Screen name="Achievements" component={AchievementsScreen} />
            <ProfileStack.Screen name="DatabaseViewer" component={DatabaseViewerScreen} />
        </ProfileStack.Navigator>
    );
}

// ── Main Tab Navigator ──
export function TabNavigator() {
    const { colors, typography: typo } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.brand.primary,
                tabBarInactiveTintColor: colors.gray[1],
                tabBarStyle: {
                    backgroundColor: colors.background.secondary,
                    borderTopColor: colors.separatorNonOpaque,
                    borderTopWidth: 0.5,
                    elevation: 0,
                    shadowOpacity: 0,
                    paddingTop: 4,
                },
                tabBarLabelStyle: {
                    fontSize: typo.caption2.fontSize,
                    fontFamily: 'Inter-Medium',
                    fontWeight: '500',
                },
            }}
        >
            <Tab.Screen
                name="TodayTab"
                component={TodayStackScreen}
                options={{
                    tabBarLabel: 'Today',
                    tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="LogTab"
                component={DailyLogScreen}
                options={{
                    tabBarLabel: 'Log',
                    tabBarIcon: ({ color, size }) => <PenSquare size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="InsightsTab"
                component={InsightsStackScreen}
                options={{
                    tabBarLabel: 'Insights',
                    tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStackScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
}
