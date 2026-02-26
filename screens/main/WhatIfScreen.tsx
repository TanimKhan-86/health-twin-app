import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { LineChart } from "react-native-gifted-charts";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ArrowLeft, Activity, Moon, RefreshCw, TrendingUp } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { calculatePredictedEnergy, predictMoodState, generatePredictionInsight, generateHabitSimulation } from "../../lib/prediction/model";
import { getHealthHistory } from "../../lib/api/auth";
import { LinearGradient } from "expo-linear-gradient";

const screenWidth = Dimensions.get("window").width;

export default function WhatIfScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);

    const [baselinesteps, setBaselineSteps] = useState(5000);
    const [baselineSleep, setBaselineSleep] = useState(6.5);
    const [baselineEnergy, setBaselineEnergy] = useState(60);

    const [simSteps, setSimSteps] = useState(5000);
    const [simSleep, setSimSleep] = useState(6.5);

    const predictedEnergy = useMemo(() => calculatePredictedEnergy(simSleep, simSteps), [simSleep, simSteps]);
    const predictedMood = useMemo(() => predictMoodState(simSleep, predictedEnergy), [simSleep, predictedEnergy]);
    const forecastData = useMemo(() => generateHabitSimulation(baselineSleep, baselinesteps, simSleep, simSteps, 30), [baselineSleep, baselinesteps, simSleep, simSteps]);

    const chartData = useMemo(() => forecastData.map((point) => ({
        value: point.predictedEnergy, label: point.day % 5 === 0 ? `D${point.day}` : '',
        dataPointText: point.day === 30 ? point.predictedEnergy.toString() : '',
    })), [forecastData]);

    const finalEnergyDiff = forecastData[forecastData.length - 1].predictedEnergy - baselineEnergy;

    const narrative = useMemo(() => generatePredictionInsight(
        baselineEnergy, predictedEnergy, simSleep - baselineSleep, simSteps - baselinesteps
    ), [baselineEnergy, predictedEnergy, simSleep, simSteps]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const history = await getHealthHistory(7);
            if (history.length > 0) {
                const h = history as any[];
                const avgSteps = Math.round(h.reduce((s, e) => s + e.steps, 0) / h.length);
                const avgSleep = h.reduce((s, e) => s + e.sleepHours, 0) / h.length;
                setBaselineSteps(avgSteps); setBaselineSleep(Number(avgSleep.toFixed(1)));
                setBaselineEnergy(calculatePredictedEnergy(avgSleep, avgSteps));
                setSimSteps(avgSteps); setSimSleep(Number(avgSleep.toFixed(1)));
            } else {
                setBaselineSteps(6500); setBaselineSleep(7.0);
                setBaselineEnergy(calculatePredictedEnergy(7.0, 6500));
                setSimSteps(6500); setSimSleep(7.0);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const resetSimulation = () => { setSimSteps(baselinesteps); setSimSleep(baselineSleep); };

    return (
        <ScreenLayout gradientBackground>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={["#db2777", "#be185d"]} style={styles.headerGrad}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="white" size={18} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scenario Explorer</Text>
                    <Text style={styles.headerSub}>See how lifestyle changes affect you</Text>
                </LinearGradient>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Avatar Preview */}
                    <View style={styles.card}>
                        <View style={{ alignItems: 'center', marginVertical: 10 }}>
                            <View style={{ transform: [{ scale: 0.85 }], height: 160 }}><DigitalTwinAvatar /></View>
                            <View style={styles.moodBadge}><Text style={styles.moodText}>{predictedMood}</Text></View>
                            <Text style={styles.narrativeText}>{narrative}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Adjust Habits</Text>
                            <TouchableOpacity onPress={resetSimulation} style={styles.resetBtn}>
                                <RefreshCw size={14} color="#db2777" />
                                <Text style={styles.resetText}>Reset</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.controlGroup}>
                            <View style={styles.controlRow}>
                                <View style={styles.controlLabelRow}>
                                    <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}><Activity size={16} color="#3b82f6" /></View>
                                    <Text style={styles.controlLabel}>Daily Steps</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.controlVal, { color: '#3b82f6' }]}>{simSteps.toLocaleString()}</Text>
                                    <Text style={styles.controlSub}>{simSteps - baselinesteps > 0 ? '+' : ''}{simSteps - baselinesteps} from avg</Text>
                                </View>
                            </View>
                            <Slider
                                minimumValue={0} maximumValue={20000} step={500}
                                value={simSteps} onValueChange={setSimSteps}
                                minimumTrackTintColor="#3b82f6" thumbTintColor="#3b82f6"
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.controlGroup}>
                            <View style={styles.controlRow}>
                                <View style={styles.controlLabelRow}>
                                    <View style={[styles.iconWrap, { backgroundColor: '#eef2ff' }]}><Moon size={16} color="#6366f1" /></View>
                                    <Text style={styles.controlLabel}>Nightly Sleep</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.controlVal, { color: '#6366f1' }]}>{simSleep.toFixed(1)}h</Text>
                                    <Text style={styles.controlSub}>{simSleep - baselineSleep > 0 ? '+' : ''}{(simSleep - baselineSleep).toFixed(1)}h from avg</Text>
                                </View>
                            </View>
                            <Slider
                                minimumValue={0} maximumValue={12} step={0.5}
                                value={simSleep} onValueChange={setSimSleep}
                                minimumTrackTintColor="#6366f1" thumbTintColor="#6366f1"
                            />
                        </View>
                    </View>

                    {/* Forecast Chart */}
                    <View style={styles.card}>
                        <View style={styles.forecastHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.iconWrap, { backgroundColor: '#fdf2f8' }]}><TrendingUp size={16} color="#db2777" /></View>
                                <Text style={styles.cardTitle}>30-Day Energy Forecast</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.forecastDiff, { color: finalEnergyDiff >= 0 ? '#10b981' : '#ef4444' }]}>
                                    {finalEnergyDiff >= 0 ? '+' : ''}{finalEnergyDiff} pts
                                </Text>
                                <Text style={styles.forecastSub}>by Day 30</Text>
                            </View>
                        </View>

                        <View style={{ marginLeft: -10, marginTop: 10, height: 200 }}>
                            <LineChart
                                data={chartData} height={160} width={screenWidth - 90}
                                spacing={(screenWidth - 90) / 30} thickness={3} color="#db2777"
                                hideDataPoints hideRules={false} rulesType="solid" rulesColor="#f8fafc"
                                yAxisColor="#e2e8f0" xAxisColor="#e2e8f0"
                                yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }} xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}
                                maxValue={100} noOfSections={4} areaChart
                                startFillColor="#db2777" endFillColor="#fdf2f8" startOpacity={0.2} endOpacity={0.05}
                                animationDuration={800} isAnimated
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    headerGrad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12 },
    backText: { color: '#fff', fontWeight: '700' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    scroll: { padding: 16, paddingBottom: 60 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#db2777', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#fdf2f8' },
    moodBadge: { backgroundColor: '#fdf2f8', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#fbcfe8', marginTop: 10, marginBottom: 16 },
    moodText: { color: '#be185d', fontWeight: '800', fontSize: 16 },
    narrativeText: { color: '#4b5563', textAlign: 'center', fontSize: 14, lineHeight: 22, paddingHorizontal: 10, fontStyle: 'italic' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e1b4b' },
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fdf2f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    resetText: { color: '#db2777', fontWeight: '700', fontSize: 12 },
    controlGroup: { paddingVertical: 8 },
    controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    controlLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    controlLabel: { fontWeight: '700', color: '#374151', fontSize: 15 },
    controlVal: { fontWeight: '800', fontSize: 18 },
    controlSub: { fontSize: 11, color: '#9ca3af', marginTop: 2, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
    forecastHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    forecastDiff: { fontSize: 16, fontWeight: '800' },
    forecastSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
