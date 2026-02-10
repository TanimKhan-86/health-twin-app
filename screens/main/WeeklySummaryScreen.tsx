import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { ArrowLeft, CheckCircle, Moon, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NarrativeService } from "../../lib/narrative/index"; // Import direct
import { WeeklyAnalytics } from "../../lib/analytics";
import { getToday, getDaysAgo, formatDate } from "../../lib/demoData";

export default function WeeklySummaryScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [story, setStory] = useState("");
    const [analytics, setAnalytics] = useState<WeeklyAnalytics | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadSummary();
        }, [])
    );

    const loadSummary = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            if (!userId) return;

            const endDate = getToday();
            const startDate = getDaysAgo(6); // Last 7 days

            const result = await NarrativeService.generateWeeklyStory(userId, startDate, endDate);
            setStory(result.story);
            setAnalytics(result.analytics);

        } catch (e) {
            console.error("Failed to load summary", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <ScreenLayout gradientBackground>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="white" />
                </View>
            </ScreenLayout>
        );
    }

    // Helper to determine trend icon/color
    const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
        if (trend === 'improving') return { icon: TrendingUp, color: '#10b981', bg: 'bg-emerald-100' };
        if (trend === 'declining') return { icon: TrendingDown, color: '#ef4444', bg: 'bg-red-100' };
        return { icon: Minus, color: '#6b7280', bg: 'bg-gray-100' };
    };

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
                        <ArrowLeft color="white" size={20} />
                        <Text className="text-white font-bold ml-2">Back</Text>
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Weekly Report</Text>
                        <Text className="text-teal-200 text-xs">
                            {analytics ? `${analytics.week_start.slice(5)} - ${analytics.week_end.slice(5)}` : "Loading..."}
                        </Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>

                    {/* Narrative Card */}
                    <Card className="mb-6 bg-white/95 backdrop-blur-sm border-white/20">
                        <CardHeader>
                            <CardTitle className="text-center text-teal-800">Your Twin's Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="items-center">
                            <View className="transform scale-75 h-40 justify-center">
                                <DigitalTwinAvatar />
                            </View>
                            <View className="bg-teal-50 p-4 rounded-xl border border-teal-100 w-full mt-4">
                                <Text className="text-slate-700 leading-relaxed font-medium italic">
                                    "{story}"
                                </Text>
                            </View>
                        </CardContent>
                    </Card>

                    <Text className="text-white font-semibold mb-3 ml-1">Key Highlights</Text>

                    {analytics && (
                        <View className="space-y-3">
                            {/* Energy Trend */}
                            <Card className="flex-row items-center p-4">
                                <View className={`p-2 rounded-full mr-3 ${getTrendIcon(analytics.energy_trend).bg}`}>
                                    {React.createElement(getTrendIcon(analytics.energy_trend).icon, {
                                        size: 20,
                                        color: getTrendIcon(analytics.energy_trend).color
                                    })}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-800 font-bold">Energy Trend</Text>
                                    <Text className="text-slate-500 text-xs">
                                        Avg Score: {analytics.avg_energy_score} ({analytics.energy_trend})
                                    </Text>
                                </View>
                            </Card>

                            {/* Sleep & Mood Correlation */}
                            <Card className="flex-row items-center p-4">
                                <View className="p-2 rounded-full mr-3 bg-indigo-100">
                                    <Moon size={20} color="#6366f1" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-800 font-bold">Sleep & Mood</Text>
                                    <Text className="text-slate-500 text-xs">
                                        {analytics.sleep_mood_correlation}
                                    </Text>
                                </View>
                            </Card>

                            {/* Best Day */}
                            {analytics.best_energy_day && (
                                <Card className="flex-row items-center p-4">
                                    <View className="p-2 rounded-full mr-3 bg-amber-100">
                                        <Zap size={20} color="#f59e0b" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-slate-800 font-bold">Peak Performance</Text>
                                        <Text className="text-slate-500 text-xs">
                                            Best day was {analytics.best_energy_day.date} (Score: {Math.round(analytics.best_energy_day.score)})
                                        </Text>
                                    </View>
                                </Card>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
