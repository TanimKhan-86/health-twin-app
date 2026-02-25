import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";

import { ScreenLayout } from "../../components/ScreenLayout";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { Card, CardContent } from "../../components/ui/Card";
import { Activity, Heart, Moon, Wind, Droplets, Trophy } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { getStreak, getTodayHealth } from "../../lib/api/auth";


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
                    {icon}
                </View>
                <Text className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</Text>
                <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</Text>
                <Text className={`text-[10px] font-bold ${color}`}>{subValue}</Text>
            </CardContent>
        </Card>
    );
}

export default function DashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const [streak, setStreak] = useState(0);
    const [todayHealth, setTodayHealth] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [])
    );

    const loadDashboard = async () => {
        try {
            const [streakData, health] = await Promise.all([
                getStreak(),
                getTodayHealth(),
            ]);
            setStreak(streakData?.currentStreak ?? 0);
            setTodayHealth(health);
        } catch (e) {
            console.warn('Dashboard load error:', e);
        }
    };

    const firstName = user?.name?.split(' ')[0] || 'there';
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <ScreenLayout gradientBackground>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="p-6 flex-row justify-between items-center">
                    <View>
                        <Text className="text-teal-100 font-medium">Good morning,</Text>
                        <Text className="text-2xl font-bold text-white">{firstName} 👋</Text>
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
                            {user?.profileImage ? (
                                <Image
                                    source={{ uri: user.profileImage }}
                                    style={{ width: 40, height: 40, borderRadius: 20 }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text className="text-white font-bold text-sm">{initials}</Text>
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
                                Your health data is stored securely in the cloud ☁️
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
                            value={todayHealth?.steps != null ? todayHealth.steps.toLocaleString() : '—'}
                            subValue={todayHealth?.steps != null ? (todayHealth.steps >= 8000 ? 'Great! 🏃' : 'Keep going!') : 'Log today'}
                            color="text-blue-500"
                        />
                    </View>
                    <View className="flex-row justify-between">
                        <MetricCard
                            icon={<Moon color="#8b5cf6" size={20} />}
                            label="Sleep"
                            value={todayHealth?.sleepHours != null ? `${todayHealth.sleepHours}h` : '—'}
                            subValue={todayHealth?.sleepHours != null ? (todayHealth.sleepHours >= 7 ? 'Well rested 😴' : 'Need more rest') : 'Log today'}
                            color="text-purple-500"
                        />
                        <MetricCard
                            icon={<Droplets color="#06b6d4" size={20} />}
                            label="Energy"
                            value={todayHealth?.energyScore != null ? `${Math.round(todayHealth.energyScore)}` : '—'}
                            subValue={todayHealth?.energyScore != null ? (todayHealth.energyScore >= 70 ? 'High energy ⚡' : 'Low energy') : 'Log today'}
                            color="text-cyan-500"
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="p-6 pt-4 flex-row justify-between">
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
                <View className="p-4 mt-2 space-y-3">
                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm"
                        onPress={() => navigation.navigate("DataEntry")}
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-teal-100 dark:bg-teal-900/50 p-2 rounded-full">
                                <Activity size={20} color="#0d9488" />
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 dark:text-slate-100">Log Daily Vitals</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">Saved to MongoDB ☁️</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm"
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
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm"
                        onPress={() => navigation.navigate("Achievements")}
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full">
                                <Trophy size={20} color="#d97706" />
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 dark:text-slate-100">Achievements</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">🔥 {streak} day streak</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center justify-between shadow-sm"
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
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}
