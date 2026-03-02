import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { MetricRow } from "../../components/ui/MetricRow";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { ArrowLeft, Moon, Zap, TrendingUp, TrendingDown, Minus, Footprints, Star, BarChart2 } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory, getMoodHistory } from "../../lib/api/auth";
import { useTheme } from "../../lib/design/useTheme";

interface HealthEntry { date: string; steps: number; sleepHours: number; energyScore: number; }
interface MoodEntry { date: string; mood: string; energyLevel: number; }

function avg(arr: number[]) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function generateNarrative(health: HealthEntry[]): string {
    if (!health.length) return "Start logging your health data to see your personal weekly insights here.";

    const avgEnergy = avg(health.map(e => e.energyScore));
    const avgSleep = avg(health.map(e => e.sleepHours));
    const avgSteps = avg(health.map(e => e.steps));

    const energyLabel = avgEnergy >= 75 ? 'excellent' : avgEnergy >= 50 ? 'moderate' : 'low';
    const sleepLabel = avgSleep >= 7.5 ? 'well-rested' : avgSleep >= 6 ? 'somewhat rested' : 'sleep-deprived';
    const stepsLabel = avgSteps >= 8000 ? 'very active' : avgSteps >= 5000 ? 'moderately active' : 'lightly active';

    return `This week you had ${energyLabel} energy levels averaging ${Math.round(avgEnergy)}/100. You were ${sleepLabel} with ${avgSleep.toFixed(1)} hours of sleep per night, and ${stepsLabel} with ${Math.round(avgSteps).toLocaleString()} daily steps. ${avgEnergy >= 65 ? 'Keep up the great work!' : 'Try getting 30 more minutes of sleep each night for better energy.'}`;
}

export default function WeeklySummaryScreen({ navigation }: any) {
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<HealthEntry[]>([]);
    const [moods, setMoods] = useState<MoodEntry[]>([]);

    useFocusEffect(useCallback(() => { loadSummary(); }, []));

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

    const trendColor = trend === 'improving' ? colors.system.green : trend === 'declining' ? colors.system.red : colors.text.secondary;
    const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;

    const narrative = generateNarrative(health);

    const startDate = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(5, 10); })();
    const endDate = new Date().toISOString().slice(5, 10);

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: 12 }}>
                    <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                        <ArrowLeft size={24} color={colors.brand.primary} />
                    </Pressable>
                    <View>
                        <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                            Weekly Report
                        </Text>
                        <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>
                            {startDate} – {endDate}
                        </Text>
                    </View>
                </View>

                {loading ? (
                    <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg, gap: spacing.base }}>
                        <Skeleton width="100%" height={140} borderRadius={radii.md} />
                        <Skeleton width="100%" height={200} borderRadius={radii.md} />
                        <Skeleton width="100%" height={120} borderRadius={radii.md} />
                    </View>
                ) : health.length === 0 ? (
                    <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.xl }}>
                        <Card padding="lg" style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
                            <BarChart2 size={36} color={colors.brand.primary} />
                            <Text style={{ fontSize: typo.title3.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary, textAlign: 'center' }}>
                                No data this week
                            </Text>
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, textAlign: 'center' }}>
                                Log your daily vitals to see your weekly report.
                            </Text>
                        </Card>
                    </View>
                ) : (
                    <>
                        {/* AI Narrative */}
                        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                            <Card padding="md">
                                <View style={{ borderLeftWidth: 3, borderLeftColor: colors.brand.primary, paddingLeft: 12 }}>
                                    <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.primary, lineHeight: 22 }}>
                                        {narrative}
                                    </Text>
                                </View>
                            </Card>
                        </View>

                        {/* Key Metrics */}
                        <SectionHeader title="Key Metrics" />
                        <View style={{ paddingHorizontal: spacing.base }}>
                            <Card padding="none">
                                <MetricRow
                                    icon={<Zap size={16} color={colors.health.energy} />}
                                    iconColor={colors.health.energy}
                                    label="Avg Energy"
                                    value={`${avgEnergy}/100`}
                                />
                                <MetricRow
                                    icon={<Moon size={16} color={colors.health.sleep} />}
                                    iconColor={colors.health.sleep}
                                    label="Avg Sleep"
                                    value={`${avgSleep} hrs`}
                                />
                                <MetricRow
                                    icon={<Footprints size={16} color={colors.health.activity} />}
                                    iconColor={colors.health.activity}
                                    label="Avg Steps"
                                    value={avgSteps.toLocaleString()}
                                />
                                <MetricRow
                                    icon={<Star size={16} color={colors.system.orange} />}
                                    iconColor={colors.system.orange}
                                    label="Best Day"
                                    value={bestDay ? `${bestDay.date.slice(5)} (${Math.round(bestDay.energyScore)})` : 'N/A'}
                                    showSeparator={false}
                                />
                            </Card>
                        </View>

                        {/* Trend */}
                        <SectionHeader title="Trend" />
                        <View style={{ paddingHorizontal: spacing.base }}>
                            <Card padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: trendColor + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendIcon size={20} color={trendColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary }}>
                                        Energy is {trend}
                                    </Text>
                                    <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, marginTop: 2 }}>
                                        {trend === 'improving' ? 'Your habits are paying off.' :
                                         trend === 'declining' ? 'Consider adjusting sleep or activity.' :
                                         'Consistent performance this week.'}
                                    </Text>
                                </View>
                            </Card>
                        </View>
                    </>
                )}
            </ScrollView>
        </ScreenLayout>
    );
}
