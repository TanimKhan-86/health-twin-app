import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { ArrowLeft, Moon, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory, getMoodHistory } from "../../lib/api/auth";

interface HealthEntry { date: string; steps: number; sleepHours: number; energyScore: number; }
interface MoodEntry { date: string; mood: string; energyLevel: number; }

function avg(arr: number[]) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function generateNarrative(health: HealthEntry[], moods: MoodEntry[]): string {
    if (!health.length) return "Start logging your health data and I'll generate your personal weekly story here! 📊";

    const avgEnergy = avg(health.map(e => e.energyScore));
    const avgSleep = avg(health.map(e => e.sleepHours));
    const avgSteps = avg(health.map(e => e.steps));


    const energyLabel = avgEnergy >= 75 ? 'excellent' : avgEnergy >= 50 ? 'moderate' : 'low';
    const sleepLabel = avgSleep >= 7.5 ? 'well-rested' : avgSleep >= 6 ? 'somewhat rested' : 'sleep-deprived';
    const stepsLabel = avgSteps >= 8000 ? 'very active' : avgSteps >= 5000 ? 'moderately active' : 'lightly active';

    return `This week, your digital twin observed ${energyLabel} energy levels averaging ${Math.round(avgEnergy)}/100. You were ${sleepLabel} with ${avgSleep.toFixed(1)} hours of sleep per night, and ${stepsLabel} with an average of ${Math.round(avgSteps).toLocaleString()} steps per day. ${avgEnergy >= 65 ? 'Keep up the great work! 💪' : 'Try logging 30 more minutes of sleep each night — it has the biggest impact on your energy score.'}`;
}

export default function WeeklySummaryScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<HealthEntry[]>([]);
    const [moods, setMoods] = useState<MoodEntry[]>([]);

    useFocusEffect(
        useCallback(() => { loadSummary(); }, [])
    );

    const loadSummary = async () => {
        setLoading(true);
        try {
            const [h, m] = await Promise.all([
                getHealthHistory(7),
                getMoodHistory(7),
            ]);
            setHealth(h as any[]);
            setMoods(m as any[]);
        } catch (e) {
            console.error("Weekly summary load error", e);
        } finally {
            setLoading(false);
        }
    };

    // ─── Computed analytics ───────────────────────────────────────────────────
    const avgEnergy = Math.round(avg(health.map(e => e.energyScore)));
    const avgSleep = avg(health.map(e => e.sleepHours)).toFixed(1);
    const avgSteps = Math.round(avg(health.map(e => e.steps)));
    const bestDay = health.reduce<HealthEntry | null>((best, e) =>
        !best || e.energyScore > best.energyScore ? e : best, null);

    const trend: 'improving' | 'declining' | 'stable' = (() => {
        if (health.length < 4) return 'stable';
        const sorted = [...health].sort((a, b) => a.date.localeCompare(b.date));
        const first = avg(sorted.slice(0, 3).map(e => e.energyScore));
        const last = avg(sorted.slice(-3).map(e => e.energyScore));
        return last > first + 5 ? 'improving' : last < first - 5 ? 'declining' : 'stable';
    })();

    const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
    const trendColor = trend === 'improving' ? '#10b981' : trend === 'declining' ? '#ef4444' : '#6b7280';
    const trendBg = trend === 'improving' ? 'bg-emerald-100' : trend === 'declining' ? 'bg-red-100' : 'bg-gray-100';

    const narrative = generateNarrative(health, moods);

    if (loading) {
        return (
            <ScreenLayout gradientBackground>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="white" />
                </View>
            </ScreenLayout>
        );
    }

    const startDate = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(5, 10); })();
    const endDate = new Date().toISOString().slice(5, 10);

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
                        <Text className="text-teal-200 text-xs">{startDate} – {endDate} · MongoDB ☁️</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

                    {/* Narrative Card */}
                    <Card className="mb-6 bg-white/95 backdrop-blur-sm border-white/20">
                        <CardHeader>
                            <CardTitle className="text-center text-teal-800">Your Twin's Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="items-center">
                            <View className="h-40 justify-center">
                                <DigitalTwinAvatar />
                            </View>
                            <View className="bg-teal-50 p-4 rounded-xl border border-teal-100 w-full mt-4">
                                <Text className="text-slate-700 leading-relaxed font-medium italic">
                                    "{narrative}"
                                </Text>
                            </View>
                        </CardContent>
                    </Card>

                    <Text className="text-white font-semibold mb-3 ml-1">Key Highlights</Text>

                    {health.length === 0 ? (
                        <Card className="bg-white/95">
                            <CardContent className="p-6 items-center">
                                <Text className="text-slate-500 text-center">No logs this week. Use the Daily Log screen to start tracking! 📝</Text>
                            </CardContent>
                        </Card>
                    ) : (
                        <View className="space-y-3">
                            {/* Energy Trend */}
                            <Card className="flex-row items-center p-4">
                                <View className={`p-2 rounded-full mr-3 ${trendBg}`}>
                                    <TrendIcon size={20} color={trendColor} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-800 font-bold">Energy Trend</Text>
                                    <Text className="text-slate-500 text-xs">
                                        Avg Score: {avgEnergy}/100 ({trend})
                                    </Text>
                                </View>
                            </Card>

                            {/* Sleep & Mood */}
                            <Card className="flex-row items-center p-4">
                                <View className="p-2 rounded-full mr-3 bg-indigo-100">
                                    <Moon size={20} color="#6366f1" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-800 font-bold">Sleep & Mood</Text>
                                    <Text className="text-slate-500 text-xs">
                                        Avg sleep: {avgSleep}h · Avg steps: {avgSteps.toLocaleString()}
                                    </Text>
                                </View>
                            </Card>

                            {/* Best Day */}
                            {bestDay && (
                                <Card className="flex-row items-center p-4">
                                    <View className="p-2 rounded-full mr-3 bg-amber-100">
                                        <Zap size={20} color="#f59e0b" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-slate-800 font-bold">Peak Performance</Text>
                                        <Text className="text-slate-500 text-xs">
                                            Best day: {bestDay.date} (Score: {Math.round(bestDay.energyScore)})
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
