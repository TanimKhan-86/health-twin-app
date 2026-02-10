import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { Card, CardContent } from "../../components/ui/Card";
import { Activity, Heart, Moon, Wind, Droplets, Trophy } from "lucide-react-native";

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue: string;
    color: string;
}

function MetricCard({ icon, label, value, subValue, color }: MetricCardProps) {
    return (
        <Card className="flex-1 m-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border-0">
            <CardContent className="p-4 items-center space-y-2">
                <View className={`p-2 rounded-full bg-opacity-10 ${color.replace("text-", "bg-")}`}>
                    {/* Clone element logic or just wrap icon. Lucide icons are components. */}
                    {icon}
                </View>
                <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</Text>
                <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</Text>
                <Text className={`text-[10px] font-bold ${color}`}>{subValue}</Text>
            </CardContent>
        </Card>
    );
}

import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "react-native";
import { StreakService, UserService, User } from "../../lib/services"; // Import services
import AsyncStorage from '@react-native-async-storage/async-storage';

// ... inside component ...
export default function DashboardScreen({ navigation }: any) {
    const [streak, setStreak] = useState(0);
    const [user, setUser] = useState<User | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            const targetUserId = userId || 'demo-user-123'; // Fallback to demo if auth bypassed 

            // Load User Profile
            const userData = await UserService.getUser(targetUserId);
            if (userData) setUser(userData);

            // Load Streak
            const s = await StreakService.getStreak(targetUserId);
            if (s) setStreak(s.current_streak);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <ScreenLayout gradientBackground>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="p-6 flex-row justify-between items-center">
                    <View>
                        <Text className="text-teal-100 font-medium">Good Morning,</Text>
                        <Text className="text-2xl font-bold text-white">
                            {user?.name?.split(' ')[0] || "Sakif"}
                        </Text>
                    </View>

                    <View className="flex-row space-x-3">
                        {/* Streak Badge */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Achievements')}
                            className="h-10 px-3 rounded-full bg-orange-500/20 border border-orange-500/50 flex-row items-center space-x-1"
                        >
                            <Text className="text-lg">🔥</Text>
                            <Text className="text-white font-bold">{streak}</Text>
                        </TouchableOpacity>

                        {/* Profile Avatar */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Settings")}
                            className="h-10 w-10 rounded-full bg-white/20 items-center justify-center border border-white/30 overflow-hidden"
                        >
                            {user?.profile_image ? (
                                <Image source={{ uri: user.profile_image }} className="h-full w-full" resizeMode="cover" />
                            ) : (
                                <Text className="text-white font-bold">
                                    {user?.name ? user.name.substring(0, 2).toUpperCase() : "SM"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Avatar Section */}
                <View className="h-[300px] justify-center">
                    <DigitalTwinAvatar />
                    <View className="absolute bottom-4 w-full items-center">
                        <View className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <Text className="text-white text-sm font-medium">
                                "Your energy levels are rising! Great start!"
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick Stats Grid */}
                <View className="px-4">
                    <Text className="text-white font-semibold mb-4 ml-1">Live Health Metrics</Text>
                    <View className="flex-row justify-between mb-2">
                        <MetricCard
                            icon={<Heart color="#ef4444" size={20} />}
                            label="Heart Rate"
                            value="72 BPM"
                            subValue="Normal"
                            color="text-red-500"
                        />
                        <MetricCard
                            icon={<Activity color="#3b82f6" size={20} />}
                            label="Steps"
                            value="2,430"
                            subValue="12% vs yday"
                            color="text-blue-500"
                        />
                    </View>
                    <View className="flex-row justify-between">
                        <MetricCard
                            icon={<Moon color="#8b5cf6" size={20} />}
                            label="Sleep"
                            value="7h 12m"
                            subValue="92 Sleep Score"
                            color="text-purple-500"
                        />
                        <MetricCard
                            icon={<Droplets color="#06b6d4" size={20} />}
                            label="Hydration"
                            value="1.2 L"
                            subValue="On Track"
                            color="text-cyan-500"
                        />
                    </View>
                </View>

                {/* Quick Actions / Navigation */}
                <View className="p-6 pt-0 flex-row justify-between">
                    <TouchableOpacity
                        className="bg-purple-600/20 p-4 rounded-2xl flex-1 mr-2 items-center border border-purple-500/30"
                        onPress={() => navigation.navigate('WhatIf')}
                    >
                        <Text className="text-purple-200 font-bold">🔮 Future You</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-teal-600/20 p-4 rounded-2xl flex-1 ml-2 items-center border border-teal-500/30"
                        onPress={() => navigation.navigate('Analytics')}
                    >
                        <Text className="text-teal-200 font-bold">📊 Analytics</Text>
                    </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View className="p-4 mt-4 space-y-3">
                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm active:bg-slate-50 dark:active:bg-slate-700"
                        onPress={() => navigation.navigate("DataEntry")}
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-teal-100 dark:bg-teal-900/50 p-2 rounded-full">
                                <Activity size={20} color="#0d9488" />
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 dark:text-slate-100">Log Daily Vitals</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">Record your metrics</Text>
                            </View>
                        </View>
                        <View className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center">
                            <Text className="text-slate-400">arrow</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm active:bg-slate-50 active:dark:bg-slate-700"
                        onPress={() => navigation.navigate("WhatIf")}
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                                <Wind size={20} color="#4f46e5" />
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 dark:text-slate-100">What-If Scenarios</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">AI Predictions</Text>
                            </View>
                        </View>
                        <View className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center">
                            <Text className="text-slate-400">arrow</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm active:bg-slate-50 active:dark:bg-slate-700"
                        onPress={() => navigation.navigate("Achievements")} // Navigate to achievements
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full">
                                <Trophy size={20} color="#d97706" />
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 dark:text-slate-100">Achievements</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">View your badges</Text>
                            </View>
                        </View>
                        <View className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center">
                            <Text className="text-slate-400">arrow</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm active:bg-slate-50 active:dark:bg-slate-700"
                        onPress={() => navigation.navigate("WeeklySummary")}
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full">
                                <Activity size={20} color="#10b981" />
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 dark:text-slate-100">Weekly Summary</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">Your Twin's Report</Text>
                            </View>
                        </View>
                        <View className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center">
                            <Text className="text-slate-400">arrow</Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </ScreenLayout>
    );
}
