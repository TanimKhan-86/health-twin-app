import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ArrowLeft, BarChart2, TrendingUp, ChevronLeft, ChevronRight, Activity } from "lucide-react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory } from "../../lib/api/auth";
import { LinearGradient } from "expo-linear-gradient";

interface HealthEntry { date: string; steps: number; sleepHours: number; energyScore: number; }

function avg(arr: number[]): number { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; }
function getWeekRange(offset: number) {
    const end = new Date(); end.setDate(end.getDate() - offset * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
}
function filterByRange(entries: HealthEntry[], startDate: string, endDate: string) {
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
}

export default function AnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [allHealth, setAllHealth] = useState<HealthEntry[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const loadData = async () => {
        setLoading(true);
        try { const health = await getHealthHistory(60); setAllHealth(health as any[]); }
        catch (e) { console.error("Analytics load", e); }
        finally { setLoading(false); }
    };

    const { startDate, endDate } = getWeekRange(weekOffset);
    const weekEntries = filterByRange(allHealth, startDate, endDate).sort((a, b) => a.date.localeCompare(b.date));

    const avgEnergy = avg(weekEntries.map(e => e.energyScore));
    const avgSteps = avg(weekEntries.map(e => e.steps));
    const avgSleep = weekEntries.length ? (weekEntries.reduce((s, e) => s + e.sleepHours, 0) / weekEntries.length).toFixed(1) : '0.0';
    const bestDay = weekEntries.reduce<HealthEntry | null>((b, e) => !b || e.energyScore > b.energyScore ? e : b, null);

    const energyChartData = weekEntries.map(e => ({ value: Math.round(e.energyScore), label: e.date.slice(8, 10), dataPointText: String(Math.round(e.energyScore)) }));
    const stepsChartData = weekEntries.map(e => ({ value: e.steps, label: e.date.slice(8, 10), frontColor: '#14b8a6' }));

    return (
        <ScreenLayout gradientBackground>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={["#6366f1", "#4f46e5"]} style={styles.headerGrad}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="white" size={18} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.headerTitle}>Analytics</Text>
                            <Text style={styles.headerSub}>From MongoDB Atlas ☁️</Text>
                        </View>
                        <View style={styles.navRow}>
                            <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} style={styles.navBtn}><ChevronLeft color="white" size={18} /></TouchableOpacity>
                            <Text style={styles.navText}>{startDate.slice(5)} – {endDate.slice(5)}</Text>
                            <TouchableOpacity onPress={() => setWeekOffset(o => Math.max(0, o - 1))} style={[styles.navBtn, weekOffset === 0 && { opacity: 0.3 }]} disabled={weekOffset === 0}><ChevronRight color="white" size={18} /></TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
                    ) : weekEntries.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={[styles.iconWrap, { backgroundColor: '#eef2ff' }]}><Activity size={24} color="#6366f1" /></View>
                            <Text style={styles.emptyTitle}>No data this week</Text>
                            <Text style={styles.emptyText}>Log your health in the Daily Log to see analytics here.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Energy Chart */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconWrapSm, { backgroundColor: '#f5f3ff' }]}><TrendingUp size={16} color="#7c3aed" /></View>
                                    <Text style={styles.cardTitle}>Energy Trend</Text>
                                </View>
                                {energyChartData.length > 0 ? (
                                    <View style={{ height: 200, paddingLeft: 10 }}>
                                        <LineChart data={energyChartData} color="#7c3aed" thickness={3} dataPointsColor="#7c3aed" textColor="#6b7280" hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#f3f4f6" height={160} width={280} initialSpacing={20} />
                                    </View>
                                ) : <Text style={styles.noData}>No data</Text>}
                            </View>

                            {/* Steps Chart */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconWrapSm, { backgroundColor: '#f0fdfa' }]}><BarChart2 size={16} color="#14b8a6" /></View>
                                    <Text style={styles.cardTitle}>Daily Steps</Text>
                                </View>
                                {stepsChartData.length > 0 ? (
                                    <View style={{ height: 200, paddingLeft: 10 }}>
                                        <BarChart data={stepsChartData} barWidth={22} noOfSections={3} barBorderRadius={4} frontColor="#14b8a6" yAxisThickness={0} xAxisThickness={1} xAxisColor="#f3f4f6" height={160} width={280} initialSpacing={15} />
                                    </View>
                                ) : <Text style={styles.noData}>No data</Text>}
                            </View>

                            {/* Insights */}
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconWrapSm, { backgroundColor: '#fffbeb' }]}><Text style={{ fontSize: 16 }}>💡</Text></View>
                                    <Text style={styles.cardTitle}>Key Insights</Text>
                                </View>
                                <View style={styles.insightRow}><Text style={styles.inLabel}>Avg Energy</Text><Text style={[styles.inVal, { color: '#7c3aed' }]}>{avgEnergy}/100</Text></View>
                                <View style={styles.divider} />
                                <View style={styles.insightRow}><Text style={styles.inLabel}>Avg Steps</Text><Text style={[styles.inVal, { color: '#14b8a6' }]}>{avgSteps.toLocaleString()}</Text></View>
                                <View style={styles.divider} />
                                <View style={styles.insightRow}><Text style={styles.inLabel}>Avg Sleep</Text><Text style={[styles.inVal, { color: '#6366f1' }]}>{avgSleep}h</Text></View>
                                <View style={styles.divider} />
                                <View style={styles.insightRow}><Text style={styles.inLabel}>Best Day</Text><Text style={[styles.inVal, { color: '#1e1b4b' }]}>{bestDay ? `${bestDay.date.slice(5)} (${Math.round(bestDay.energyScore)})` : '—'}</Text></View>
                                <View style={styles.insightAlert}>
                                    <Text style={styles.insightAlertText}>{weekEntries.length < 3 ? "🔍 Log more days to see deeper patterns." : avgEnergy >= 70 ? "✨ You're performing above average!" : "💤 Try getting more sleep — it boosts energy scores."}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    headerGrad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12 },
    backText: { color: '#fff', fontWeight: '700' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    navRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    navBtn: { padding: 4 },
    navText: { color: '#fff', fontWeight: '700', fontSize: 12, marginHorizontal: 4 },
    scroll: { padding: 16, paddingBottom: 60 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#eef2ff' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    iconWrapSm: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b' },
    insightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
    inLabel: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
    inVal: { fontWeight: '800', fontSize: 15 },
    divider: { height: 1, backgroundColor: '#f3f4f6' },
    insightAlert: { backgroundColor: '#f5f3ff', padding: 16, borderRadius: 14, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#7c3aed' },
    insightAlertText: { color: '#4c1d95', fontSize: 13, lineHeight: 20, fontWeight: '500' },
    emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', marginTop: 20 },
    iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b', marginBottom: 8 },
    emptyText: { color: '#6b7280', textAlign: 'center', lineHeight: 22, fontSize: 14 },
    noData: { color: '#9ca3af', textAlign: 'center', marginVertical: 40 },
});
