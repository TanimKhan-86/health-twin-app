import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { LineChart } from "react-native-gifted-charts";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { HealthScoreRing } from "../../components/ui/HealthScoreRing";
import { ArrowLeft, Moon, RefreshCw, TrendingUp, Footprints } from "lucide-react-native";
import { calculatePredictedEnergy, predictMoodState, generatePredictionInsight, generateHabitSimulation } from "../../lib/prediction/model";
import { getHealthHistory } from "../../lib/api/auth";
import { useTheme } from "../../lib/design/useTheme";

const screenWidth = Dimensions.get("window").width;

export default function WhatIfScreen({ navigation }: any) {
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [loading, setLoading] = useState(true);

    const [baselineSteps, setBaselineSteps] = useState(5000);
    const [baselineSleep, setBaselineSleep] = useState(6.5);
    const [baselineEnergy, setBaselineEnergy] = useState(60);

    const [simSteps, setSimSteps] = useState(5000);
    const [simSleep, setSimSleep] = useState(6.5);

    const predictedEnergy = useMemo(() => calculatePredictedEnergy(simSleep, simSteps), [simSleep, simSteps]);
    const predictedMood = useMemo(() => predictMoodState(simSleep, predictedEnergy), [simSleep, predictedEnergy]);

    const forecastData = useMemo(() =>
        generateHabitSimulation(baselineSleep, baselineSteps, simSleep, simSteps, 30),
        [baselineSleep, baselineSteps, simSleep, simSteps]);

    const chartData = useMemo(() =>
        forecastData.map((point) => ({
            value: point.predictedEnergy,
            label: point.day % 5 === 0 ? `D${point.day}` : '',
        })),
        [forecastData]);

    const energyDiff = predictedEnergy - baselineEnergy;
    const finalEnergyDiff = forecastData[forecastData.length - 1].predictedEnergy - baselineEnergy;

    const narrative = useMemo(() => generatePredictionInsight(
        baselineEnergy, predictedEnergy,
        simSleep - baselineSleep, simSteps - baselineSteps
    ), [baselineEnergy, predictedEnergy, simSleep, simSteps]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const history = await getHealthHistory(7);
            if (history.length > 0) {
                const h = history as any[];
                const avgSteps = Math.round(h.reduce((s, e) => s + e.steps, 0) / h.length);
                const avgSleep = h.reduce((s, e) => s + e.sleepHours, 0) / h.length;
                setBaselineSteps(avgSteps);
                setBaselineSleep(Number(avgSleep.toFixed(1)));
                setBaselineEnergy(calculatePredictedEnergy(avgSleep, avgSteps));
                setSimSteps(avgSteps);
                setSimSleep(Number(avgSleep.toFixed(1)));
            } else {
                setBaselineSteps(6500);
                setBaselineSleep(7.0);
                setBaselineEnergy(calculatePredictedEnergy(7.0, 6500));
                setSimSteps(6500);
                setSimSleep(7.0);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const resetSimulation = () => {
        setSimSteps(baselineSteps);
        setSimSleep(baselineSleep);
    };

    const stepsDiff = simSteps - baselineSteps;
    const sleepDiff = simSleep - baselineSleep;

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: 12 }}>
                    <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                        <ArrowLeft size={24} color={colors.brand.primary} />
                    </Pressable>
                    <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                        What If
                    </Text>
                </View>
                <Text style={{ paddingHorizontal: spacing.base, marginTop: 4, fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>
                    See how changes affect your health score
                </Text>

                {loading ? (
                    <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg, gap: spacing.base }}>
                        <Skeleton width="100%" height={200} borderRadius={radii.md} />
                        <Skeleton width="100%" height={180} borderRadius={radii.md} />
                        <Skeleton width="100%" height={240} borderRadius={radii.md} />
                    </View>
                ) : (
                    <>
                        {/* Score Ring */}
                        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                            <Card padding="lg" style={{ alignItems: 'center', gap: 12 }}>
                                <HealthScoreRing score={predictedEnergy} size={140} strokeWidth={12} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{
                                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full,
                                        backgroundColor: energyDiff >= 0 ? colors.system.green + '15' : colors.system.red + '15',
                                    }}>
                                        <Text style={{
                                            fontSize: typo.caption1.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600',
                                            color: energyDiff >= 0 ? colors.system.green : colors.system.red,
                                        }}>
                                            {energyDiff >= 0 ? '+' : ''}{energyDiff} pts
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>
                                        vs current
                                    </Text>
                                </View>
                                <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Medium', color: colors.text.secondary }}>
                                    {predictedMood}
                                </Text>
                            </Card>
                        </View>

                        {/* AI Narrative */}
                        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base }}>
                            <Card padding="md">
                                <View style={{ borderLeftWidth: 3, borderLeftColor: colors.brand.primary, paddingLeft: 12 }}>
                                    <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.primary, lineHeight: 22 }}>
                                        {narrative}
                                    </Text>
                                </View>
                            </Card>
                        </View>

                        {/* Controls */}
                        <SectionHeader
                            title="Adjust Habits"
                            action={
                                <Pressable onPress={resetSimulation} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <RefreshCw size={12} color={colors.text.secondary} />
                                    <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>Reset</Text>
                                </Pressable>
                            }
                        />
                        <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
                            {/* Steps Slider */}
                            <Card padding="md">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.health.activity + '15', alignItems: 'center', justifyContent: 'center' }}>
                                        <Footprints size={16} color={colors.health.activity} />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: typo.body.fontSize, fontFamily: 'Inter-Medium', color: colors.text.primary }}>
                                        Daily Steps
                                    </Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.health.activity }}>
                                            {simSteps.toLocaleString()}
                                        </Text>
                                        <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>
                                            {stepsDiff > 0 ? '+' : ''}{stepsDiff.toLocaleString()} from avg
                                        </Text>
                                    </View>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={20000}
                                    step={500}
                                    value={simSteps}
                                    onValueChange={setSimSteps}
                                    minimumTrackTintColor={colors.health.activity}
                                    maximumTrackTintColor={colors.fill.tertiary}
                                    thumbTintColor={colors.health.activity}
                                    style={{ marginTop: 4 }}
                                />
                            </Card>

                            {/* Sleep Slider */}
                            <Card padding="md">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.health.sleep + '15', alignItems: 'center', justifyContent: 'center' }}>
                                        <Moon size={16} color={colors.health.sleep} />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: typo.body.fontSize, fontFamily: 'Inter-Medium', color: colors.text.primary }}>
                                        Nightly Sleep
                                    </Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.health.sleep }}>
                                            {simSleep.toFixed(1)}h
                                        </Text>
                                        <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>
                                            {sleepDiff > 0 ? '+' : ''}{sleepDiff.toFixed(1)}h from avg
                                        </Text>
                                    </View>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={12}
                                    step={0.5}
                                    value={simSleep}
                                    onValueChange={setSimSleep}
                                    minimumTrackTintColor={colors.health.sleep}
                                    maximumTrackTintColor={colors.fill.tertiary}
                                    thumbTintColor={colors.health.sleep}
                                    style={{ marginTop: 4 }}
                                />
                            </Card>
                        </View>

                        {/* 30-Day Forecast */}
                        <SectionHeader title="30-Day Forecast" />
                        <View style={{ paddingHorizontal: spacing.base }}>
                            <Card padding="md">
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TrendingUp size={18} color={colors.health.energy} />
                                        <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary }}>
                                            Energy Projection
                                        </Text>
                                    </View>
                                    <View style={{
                                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full,
                                        backgroundColor: finalEnergyDiff >= 0 ? colors.system.green + '15' : colors.system.red + '15',
                                    }}>
                                        <Text style={{
                                            fontSize: typo.caption1.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600',
                                            color: finalEnergyDiff >= 0 ? colors.system.green : colors.system.red,
                                        }}>
                                            {finalEnergyDiff >= 0 ? '+' : ''}{finalEnergyDiff} by Day 30
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <LineChart
                                        data={chartData}
                                        height={180}
                                        width={screenWidth - 100}
                                        spacing={(screenWidth - 100) / 30}
                                        thickness={2.5}
                                        color={colors.health.energy}
                                        hideDataPoints
                                        hideRules
                                        yAxisThickness={0}
                                        xAxisThickness={0.5}
                                        xAxisColor={colors.separator}
                                        textColor={colors.text.secondary}
                                        maxValue={100}
                                        noOfSections={5}
                                        areaChart
                                        startFillColor={colors.health.energy + '40'}
                                        endFillColor={colors.health.energy + '05'}
                                        startOpacity={0.4}
                                        endOpacity={0.05}
                                        curved
                                        isAnimated
                                        animationDuration={1000}
                                    />
                                </View>
                                <Text style={{ textAlign: 'center', fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary, marginTop: 8 }}>
                                    Predicted Energy Score over 30 days
                                </Text>
                            </Card>
                        </View>
                    </>
                )}
            </ScrollView>
        </ScreenLayout>
    );
}
