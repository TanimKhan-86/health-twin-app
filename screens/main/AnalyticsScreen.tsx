import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { ArrowLeft, BarChart2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateWeeklyAnalytics, WeeklyAnalytics } from "../../lib/analytics";
import { getToday, getDaysAgo, formatDate } from "../../lib/demoData";

export default function AnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<WeeklyAnalytics | null>(null);
    const [energyChartData, setEnergyChartData] = useState<any[]>([]);
    const [stepsChartData, setStepsChartData] = useState<any[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadAnalytics();
        }, [weekOffset])
    );

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            if (!userId) return;

            // Calculate dates based on offset
            // End Date = Today - (offset * 7)
            // Start Date = End Date - 6
            const today = new Date();
            today.setDate(today.getDate() - (weekOffset * 7));
            const endDate = formatDate(today);

            const start = new Date(today);
            start.setDate(start.getDate() - 6);
            const startDate = formatDate(start);

            const analytics = await generateWeeklyAnalytics(userId, startDate, endDate);
            setData(analytics);

            // Fetch entries for charts
            // Lazy import to avoid cycle if any
            const { HealthService } = require('../../lib/services');
            const entries = await HealthService.getHealthEntriesRange(userId, startDate, endDate);

            const sortedEntries = entries.sort((a: any, b: any) => a.date.localeCompare(b.date));

            // Map to Chart Data
            const eData = sortedEntries.map((e: any) => ({
                value: e.energy_score || 0,
                label: e.date.slice(5), // MM-DD
                dataPointText: String(Math.round(e.energy_score || 0))
            }));

            const sData = sortedEntries.map((e: any) => ({
                value: e.steps || 0,
                label: e.date.slice(5),
                frontColor: '#14b8a6'
            }));

            // Fill missing days with 0 for better visualization if needed, 
            // but for now let's just show what we have.
            // If empty, we might want to show empty chart placeholders.

            setEnergyChartData(eData);
            setStepsChartData(sData);

        } catch (e) {
            console.error("Failed to load analytics", e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevWeek = () => setWeekOffset(prev => prev + 1);
    const handleNextWeek = () => setWeekOffset(prev => Math.max(0, prev - 1));

    const handlePopulateData = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            if (userId) {
                const { DemoDataHelper } = require('../../lib/demoData');
                await DemoDataHelper.addSampleHealthData(userId);
                await DemoDataHelper.addSampleMoodData(userId);
                await loadAnalytics(); // Reload
            }
        } catch (e) {
            console.error(e);
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
                            <Text className="text-teal-200 text-xs">Deep Dive</Text>
                        </View>
                    </View>

                    {/* Date Navigator */}
                    <View className="flex-row items-center bg-white/10 rounded-full p-1">
                        <TouchableOpacity onPress={handlePrevWeek} className="p-2">
                            <ChevronLeft color="white" size={20} />
                        </TouchableOpacity>
                        <Text className="text-white text-xs font-bold mx-2">
                            {data ? `${data.week_start.slice(5)} - ${data.week_end.slice(5)}` : "..."}
                        </Text>
                        <TouchableOpacity
                            onPress={handleNextWeek}
                            className={`p-2 ${weekOffset === 0 ? 'opacity-30' : ''}`}
                            disabled={weekOffset === 0}
                        >
                            <ChevronRight color="white" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

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
                            <Text className="text-center text-xs text-slate-500 mt-2">Daily Energy Scores (0-100)</Text>
                        </CardContent>
                    </Card>

                    {/* Steps Activity */}
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
                                    <Text className="text-slate-400 py-10">No step data for this period</Text>
                                )}
                            </View>
                        </CardContent>
                    </Card>

                    {/* Insights */}
                    <Card className="bg-white/95 backdrop-blur-sm mb-6">
                        <CardContent className="p-6">
                            <Text className="text-lg font-bold text-slate-800 mb-4">Key Insights</Text>

                            <View className="space-y-3">
                                <View className="flex-row justify-between">
                                    <Text className="text-slate-600">Avg Energy</Text>
                                    <Text className="font-bold text-purple-600">{data?.avg_energy_score}</Text>
                                </View>
                                <View className="h-[1px] bg-slate-100" />

                                <View className="flex-row justify-between">
                                    <Text className="text-slate-600">Avg Steps</Text>
                                    <Text className="font-bold text-teal-600">{data?.avg_steps.toLocaleString()}</Text>
                                </View>
                                <View className="h-[1px] bg-slate-100" />

                                <View className="flex-row justify-between">
                                    <Text className="text-slate-600">Best Day</Text>
                                    <Text className="font-bold text-slate-800">
                                        {data?.best_energy_day ? `${data.best_energy_day.date} (${data.best_energy_day.score})` : 'N/A'}
                                    </Text>
                                </View>

                                <View className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <Text className="text-blue-800 text-sm leading-6">
                                        {data?.sleep_mood_correlation || "Keep tracking to see correlations!"}
                                    </Text>
                                </View>
                            </View>
                        </CardContent>
                    </Card>

                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
