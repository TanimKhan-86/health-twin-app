import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { MetricRow } from "../../components/ui/MetricRow";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { TrendingUp, BarChart2, ChevronLeft, ChevronRight, Zap, Footprints, Moon, Star } from "lucide-react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory } from "../../lib/api/auth";
import { useTheme } from "../../lib/design/useTheme";

interface HealthEntry { date: string; steps: number; sleepHours: number; energyScore: number; }

function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function getWeekRange(offset: number) {
    const end = new Date(); end.setDate(end.getDate() - offset * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
}

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen({ navigation }: any) {
    const { colors, typography: typo, spacing } = useTheme();
    const chartWidth = screenWidth - 96;
    const [loading, setLoading] = useState(true);
    const [allHealth, setAllHealth] = useState<HealthEntry[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const loadData = async () => {
        setLoading(true);
        try {
            const health = await getHealthHistory(60);
            setAllHealth(health as any[]);
        } catch (e) { console.error("Analytics load error", e); }
        finally { setLoading(false); }
    };

    const { startDate, endDate } = getWeekRange(weekOffset);
    const weekEntries = allHealth.filter(e => e.date >= startDate && e.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
    const avgEnergy = avg(weekEntries.map(e => e.energyScore));
    const avgSteps = avg(weekEntries.map(e => e.steps));
    const avgSleep = weekEntries.length ? (weekEntries.reduce((s, e) => s + e.sleepHours, 0) / weekEntries.length).toFixed(1) : '0';
    const bestDay = weekEntries.reduce<HealthEntry | null>((best, e) => !best || e.energyScore > best.energyScore ? e : best, null);

    const energyChartData = weekEntries.map(e => ({ value: Math.round(e.energyScore), label: e.date.slice(8) }));
    const stepsChartData = weekEntries.map(e => ({ value: e.steps, label: e.date.slice(8), frontColor: colors.health.activity }));

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.sm }}>
                    <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                        Insights
                    </Text>
                </View>

                {/* Week Navigator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.base, gap: spacing.base }}>
                    <Pressable onPress={() => setWeekOffset(o => o + 1)} hitSlop={10}>
                        <ChevronLeft size={20} color={colors.text.secondary} />
                    </Pressable>
                    <Text style={{ fontSize: typo.footnote.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary }}>
                        {startDate.slice(5)} – {endDate.slice(5)}
                    </Text>
                    <Pressable onPress={() => setWeekOffset(o => Math.max(0, o - 1))} hitSlop={10} disabled={weekOffset === 0}>
                        <ChevronRight size={20} color={weekOffset === 0 ? colors.gray[4] : colors.text.secondary} />
                    </Pressable>
                </View>

                {loading ? (
                    <View style={{ paddingHorizontal: spacing.base, gap: spacing.base }}>
                        <Skeleton width="100%" height={240} borderRadius={10} />
                        <Skeleton width="100%" height={240} borderRadius={10} />
                        <Skeleton width="100%" height={180} borderRadius={10} />
                    </View>
                ) : weekEntries.length === 0 ? (
                    <View style={{ paddingHorizontal: spacing.base }}>
                        <Card padding="lg" style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
                            <TrendingUp color={colors.brand.primary} size={36} />
                            <Text style={{ fontSize: typo.title3.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary, textAlign: 'center' }}>
                                No data this week
                            </Text>
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, textAlign: 'center' }}>
                                Log your daily vitals to see analytics here.
                            </Text>
                        </Card>
                    </View>
                ) : (
                    <>
                        {/* Energy Chart */}
                        <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.base }}>
                            <Card padding="md">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Zap size={18} color={colors.health.energy} />
                                    <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary }}>Energy Trend</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <LineChart
                                        data={energyChartData}
                                        color={colors.health.energy}
                                        thickness={2.5}
                                        dataPointsColor={colors.health.energy}
                                        textColor={colors.text.secondary}
                                        hideRules
                                        yAxisThickness={0}
                                        xAxisThickness={0.5}
                                        xAxisColor={colors.separator}
                                        height={160}
                                        initialSpacing={20}
                                        width={chartWidth}
                                        curved
                                        areaChart
                                        startFillColor={colors.health.energy + '40'}
                                        endFillColor={colors.health.energy + '05'}
                                        startOpacity={0.4}
                                        endOpacity={0.05}
                                        isAnimated
                                        animationDuration={800}
                                    />
                                </View>
                                <Text style={{ textAlign: 'center', fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary, marginTop: 8 }}>
                                    Daily Energy Score (0–100)
                                </Text>
                            </Card>
                        </View>

                        {/* Steps Chart */}
                        <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.base }}>
                            <Card padding="md">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Footprints size={18} color={colors.health.activity} />
                                    <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary }}>Daily Steps</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <BarChart
                                        data={stepsChartData}
                                        barWidth={22}
                                        noOfSections={3}
                                        barBorderRadius={4}
                                        frontColor={colors.health.activity}
                                        yAxisThickness={0}
                                        xAxisThickness={0.5}
                                        xAxisColor={colors.separator}
                                        height={160}
                                        width={chartWidth}
                                        initialSpacing={15}
                                        isAnimated
                                    />
                                </View>
                            </Card>
                        </View>

                        {/* Key Insights */}
                        <SectionHeader title="Key Insights" />
                        <View style={{ paddingHorizontal: spacing.base }}>
                            <Card padding="none">
                                <MetricRow
                                    icon={<Zap size={16} color={colors.health.energy} />}
                                    iconColor={colors.health.energy}
                                    label="Avg Energy"
                                    value={`${avgEnergy}/100`}
                                />
                                <MetricRow
                                    icon={<Footprints size={16} color={colors.health.activity} />}
                                    iconColor={colors.health.activity}
                                    label="Avg Steps"
                                    value={avgSteps.toLocaleString()}
                                />
                                <MetricRow
                                    icon={<Moon size={16} color={colors.health.sleep} />}
                                    iconColor={colors.health.sleep}
                                    label="Avg Sleep"
                                    value={`${avgSleep} hrs`}
                                />
                                <MetricRow
                                    icon={<Star size={16} color={colors.system.orange} />}
                                    iconColor={colors.system.orange}
                                    label="Best Day"
                                    value={bestDay ? `${bestDay.date.slice(5)} (${Math.round(bestDay.energyScore)})` : 'N/A'}
                                    showSeparator={false}
                                />
                            </Card>

                            {/* AI Insight */}
                            <Card padding="md" style={{ marginTop: spacing.base }}>
                                <View style={{ borderLeftWidth: 3, borderLeftColor: colors.brand.primary, paddingLeft: 12 }}>
                                    <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.primary, lineHeight: 22 }}>
                                        {weekEntries.length < 3
                                            ? "Log more days to see deeper patterns and correlations."
                                            : avgEnergy >= 70
                                                ? "You're performing above average this week. Keep it up!"
                                                : "Try getting 30 more minutes of sleep — it correlates with higher energy scores."}
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
