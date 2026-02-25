import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { ArrowLeft, BarChart2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory, getMoodHistory } from "../../lib/api/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthEntry {
    date: string;
    steps: number;
    sleepHours: number;
    energyScore: number;
}

interface MoodEntry {
    date: string;
    mood: string;
    energyLevel: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function getWeekRange(offset: number) {
    const end = new Date();
    end.setDate(end.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
}

function filterByRange(entries: HealthEntry[], startDate: string, endDate: string) {
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [allHealth, setAllHealth] = useState<HealthEntry[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const health = await getHealthHistory(60); // Last 60 days
            setAllHealth(health as any[]);
        } catch (e) {
            console.error("Analytics load error", e);
        } finally {
            setLoading(false);
        }
    };

    // ─── Compute analytics for current week ───────────────────────────────────
    const { startDate, endDate } = getWeekRange(weekOffset);
    const weekEntries = filterByRange(allHealth, startDate, endDate)
        .sort((a, b) => a.date.localeCompare(b.date));

    const avgEnergy = avg(weekEntries.map(e => e.energyScore));
    const avgSteps = avg(weekEntries.map(e => e.steps));
    const avgSleep = weekEntries.length
        ? (weekEntries.reduce((s, e) => s + e.sleepHours, 0) / weekEntries.length).toFixed(1)
        : '0.0';

    const bestDay = weekEntries.reduce<HealthEntry | null>((best, e) =>
        !best || e.energyScore > best.energyScore ? e : best, null);

    // Chart data
    const energyChartData = weekEntries.map(e => ({
        value: Math.round(e.energyScore),
        label: e.date.slice(5),
        dataPointText: String(Math.round(e.energyScore)),
    }));

    const stepsChartData = weekEntries.map(e => ({
        value: e.steps,
        label: e.date.slice(5),
        frontColor: '#a855f7',
    }));

    if (loading) {
        return (
            <ScreenLayout gradientBackground>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="white" />
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-4">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
                            <ArrowLeft color="white" size={20} />
                            <Text className="text-white font-bold ml-2">Back</Text>
                        </TouchableOpacity>
                        <View>
                            <Text className="text-white text-xl font-bold">Analytics</Text>
                            <Text className="text-teal-200 text-xs">From MongoDB Atlas ☁️</Text>
                        </View>
                    </View>

                    {/* Week Navigator */}
                    <View className="flex-row items-center bg-white/10 rounded-full p-1">
                        <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} className="p-2">
                            <ChevronLeft color="white" size={20} />
                        </TouchableOpacity>
                        <Text className="text-white text-xs font-bold mx-2">
                            {startDate.slice(5)} – {endDate.slice(5)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setWeekOffset(o => Math.max(0, o - 1))}
                            className={`p-2 ${weekOffset === 0 ? 'opacity-30' : ''}`}
                            disabled={weekOffset === 0}
                        >
                            <ChevronRight color="white" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

                    {weekEntries.length === 0 ? (
                        <Card className="bg-white/95">
                            <CardContent className="p-8 items-center">
                                <TrendingUp color="#a855f7" size={40} />
                                <Text className="text-slate-700 font-bold text-lg mt-4 text-center">No data this week</Text>
                                <Text className="text-slate-400 text-sm text-center mt-2">
                                    Log your health in the Daily Log to see analytics here.
                                </Text>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Energy Trend */}
                            <Card className="mb-6 bg-white/95 backdrop-blur-sm">
                                <CardContent className="p-4">
                                    <View className="flex-row items-center space-x-2 mb-4">
                                        <TrendingUp color="#a855f7" size={20} />
                                        <Text className="text-lg font-bold text-slate-800">Energy Trend</Text>
                                    </View>
                                    <View className="items-center">
                                        {energyChartData.length > 0 ? (
                                            <LineChart
                                                data={energyChartData}
                                                color="#a855f7"
                                                thickness={3}
                                                dataPointsColor="#a855f7"
                                                textColor="gray"
                                                hideRules
                                                yAxisThickness={0}
                                                xAxisThickness={1}
                                                xAxisColor="lightgray"
                                                height={180}
                                                initialSpacing={20}
                                                width={280}
                                            />
                                        ) : (
                                            <Text className="text-slate-400 py-10">No energy data for this period</Text>
                                        )}
                                    </View>
                                    <Text className="text-center text-xs text-slate-500 mt-2">Daily Energy Scores (0–100)</Text>
                                </CardContent>
                            </Card>

                            {/* Steps */}
                            <Card className="mb-6 bg-white/95 backdrop-blur-sm">
                                <CardContent className="p-4">
                                    <View className="flex-row items-center space-x-2 mb-4">
                                        <BarChart2 color="#14b8a6" size={20} />
                                        <Text className="text-lg font-bold text-slate-800">Daily Steps</Text>
                                    </View>
                                    <View className="items-center">
                                        {stepsChartData.length > 0 ? (
                                            <BarChart
                                                data={stepsChartData}
                                                barWidth={22}
                                                noOfSections={3}
                                                barBorderRadius={4}
                                                frontColor="#14b8a6"
                                                yAxisThickness={0}
                                                xAxisThickness={1}
                                                xAxisColor="lightgray"
                                                height={180}
                                                width={280}
                                                initialSpacing={15}
                                            />
                                        ) : (
                                            <Text className="text-slate-400 py-10">No step data</Text>
                                        )}
                                    </View>
                                </CardContent>
                            </Card>

                            {/* Key Insights */}
                            <Card className="bg-white/95 backdrop-blur-sm mb-6">
                                <CardContent className="p-6">
                                    <Text className="text-lg font-bold text-slate-800 mb-4">Key Insights</Text>
                                    <View className="space-y-3">
                                        <View className="flex-row justify-between">
                                            <Text className="text-slate-600">Avg Energy</Text>
                                            <Text className="font-bold text-purple-600">{avgEnergy}/100</Text>
                                        </View>
                                        <View className="h-[1px] bg-slate-100" />
                                        <View className="flex-row justify-between">
                                            <Text className="text-slate-600">Avg Steps</Text>
                                            <Text className="font-bold text-teal-600">{avgSteps.toLocaleString()}</Text>
                                        </View>
                                        <View className="h-[1px] bg-slate-100" />
                                        <View className="flex-row justify-between">
                                            <Text className="text-slate-600">Avg Sleep</Text>
                                            <Text className="font-bold text-indigo-600">{avgSleep} hrs</Text>
                                        </View>
                                        <View className="h-[1px] bg-slate-100" />
                                        <View className="flex-row justify-between">
                                            <Text className="text-slate-600">Best Day</Text>
                                            <Text className="font-bold text-slate-800">
                                                {bestDay ? `${bestDay.date.slice(5)} (${Math.round(bestDay.energyScore)})` : 'N/A'}
                                            </Text>
                                        </View>
                                        <View className="mt-4 p-3 bg-purple-50 rounded-lg">
                                            <Text className="text-purple-800 text-sm leading-6">
                                                {weekEntries.length < 3
                                                    ? "🔍 Log more days to see deeper patterns and correlations."
                                                    : avgEnergy >= 70
                                                        ? "✨ You're performing above average this week. Keep it up!"
                                                        : "💡 Try getting 30 more minutes of sleep — it correlates with higher energy scores."}
                                            </Text>
                                        </View>
                                    </View>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
