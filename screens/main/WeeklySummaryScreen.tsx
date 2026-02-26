import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ArrowLeft, Moon, Zap, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory, getMoodHistory } from "../../lib/api/auth";
import { LinearGradient } from "expo-linear-gradient";

interface HealthEntry { date: string; steps: number; sleepHours: number; energyScore: number; }
interface MoodEntry { date: string; mood: string; energyLevel: number; }

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function generateNarrative(health: HealthEntry[]): string {
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
    useFocusEffect(useCallback(() => { loadSummary(); }, []));

    const loadSummary = async () => {
        setLoading(true);
        try {
            const [h, m] = await Promise.all([getHealthHistory(7), getMoodHistory(7)]);
            setHealth(h as any[]); setMoods(m as any[]);
        } catch (e) { console.error("Weekly summary load error", e); }
        finally { setLoading(false); }
    };

    const avgEnergy = Math.round(avg(health.map(e => e.energyScore)));
    const avgSleep = avg(health.map(e => e.sleepHours)).toFixed(1);
    const avgSteps = Math.round(avg(health.map(e => e.steps)));
    const bestDay = health.reduce<HealthEntry | null>((best, e) => !best || e.energyScore > best.energyScore ? e : best, null);

    const trend: 'improving' | 'declining' | 'stable' = (() => {
        if (health.length < 4) return 'stable';
        const sorted = [...health].sort((a, b) => a.date.localeCompare(b.date));
        const first = avg(sorted.slice(0, 3).map(e => e.energyScore));
        const last = avg(sorted.slice(-3).map(e => e.energyScore));
        return last > first + 5 ? 'improving' : last < first - 5 ? 'declining' : 'stable';
    })();

    const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
    const trendColor = trend === 'improving' ? '#10b981' : trend === 'declining' ? '#ef4444' : '#6b7280';
    const trendBg = trend === 'improving' ? '#ecfdf5' : trend === 'declining' ? '#fef2f2' : '#f3f4f6';

    const startDate = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(5, 10); })();
    const endDate = new Date().toISOString().slice(5, 10);

    return (
        <ScreenLayout gradientBackground>
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#7c3aed" />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <LinearGradient colors={["#10b981", "#059669"]} style={styles.headerGrad}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft color="white" size={18} />
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Weekly Report</Text>
                        <Text style={styles.headerSub}>{startDate} – {endDate} · MongoDB ☁️</Text>
                    </LinearGradient>

                    <ScrollView contentContainerStyle={styles.scroll}>
                        {/* Narrative */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconWrap, { backgroundColor: '#ecfdf5' }]}><Activity size={18} color="#10b981" /></View>
                                <Text style={styles.cardTitle}>Your Twin's Analysis</Text>
                            </View>
                            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}><DigitalTwinAvatar /></View>
                            <View style={styles.narrativeBox}>
                                <Text style={styles.narrativeText}>"{generateNarrative(health)}"</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionLabel}>KEY HIGHLIGHTS</Text>
                        {health.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No logs this week. Use the Daily Log screen to start tracking! 📝</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 10 }}>
                                <View style={styles.card}>
                                    <View style={styles.row}>
                                        <View style={[styles.iconWrap, { backgroundColor: trendBg }]}><TrendIcon size={18} color={trendColor} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rowTitle}>Energy Trend</Text>
                                            <Text style={styles.rowSub}>Avg Score: {avgEnergy}/100 · {trend}</Text>
                                        </View>
                                        <Text style={[styles.bigStat, { color: trendColor }]}>{avgEnergy}</Text>
                                    </View>
                                </View>
                                <View style={styles.card}>
                                    <View style={styles.row}>
                                        <View style={[styles.iconWrap, { backgroundColor: '#eef2ff' }]}><Moon size={18} color="#6366f1" /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rowTitle}>Sleep & Activity</Text>
                                            <Text style={styles.rowSub}>{avgSteps.toLocaleString()} steps · {avgSleep}h sleep</Text>
                                        </View>
                                        <Text style={[styles.bigStat, { color: '#6366f1' }]}>{avgSleep}h</Text>
                                    </View>
                                </View>
                                {bestDay && (
                                    <View style={styles.card}>
                                        <View style={styles.row}>
                                            <View style={[styles.iconWrap, { backgroundColor: '#fffbeb' }]}><Zap size={18} color="#f59e0b" /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.rowTitle}>Peak Performance</Text>
                                                <Text style={styles.rowSub}>Best day: {bestDay.date}</Text>
                                            </View>
                                            <Text style={[styles.bigStat, { color: '#f59e0b' }]}>{Math.round(bestDay.energyScore)}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    headerGrad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16 },
    backText: { color: '#fff', fontWeight: '700' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    scroll: { padding: 16, paddingBottom: 60 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', marginBottom: 8, marginTop: 4, letterSpacing: 0.8 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 10, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e1b4b' },
    iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    narrativeBox: { backgroundColor: '#f5f3ff', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: '#10b981', marginTop: 8 },
    narrativeText: { color: '#374151', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: '#1e1b4b' },
    rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    bigStat: { fontSize: 22, fontWeight: '800' },
    emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
    emptyText: { color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
