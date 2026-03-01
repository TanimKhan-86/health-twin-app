import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { Activity, Heart, Moon, Droplets, Trophy, Zap } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { getStreak, getTodayHealth } from "../../lib/api/auth";
import { apiFetch } from "../../lib/api/client";
import { LinearGradient } from "expo-linear-gradient";

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue: string;
    iconBg: string;
}

function MetricCard({ icon, label, value, subValue, iconBg }: MetricCardProps) {
    return (
        <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>{icon}</View>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricSub}>{subValue}</Text>
        </View>
    );
}

export default function DashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const [streak, setStreak] = useState(0);
    const [todayHealth, setTodayHealth] = useState<any>(null);
    const [avatarKey, setAvatarKey] = useState("init");
    const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(user?.profileImage ?? null);

    useFocusEffect(useCallback(() => { loadDashboard(); }, []));

    const loadDashboard = async () => {
        try {
            const [streakData, health, avatarStatus] = await Promise.all([
                getStreak(),
                getTodayHealth(),
                apiFetch<{ hasAvatar: boolean; avatarUrl?: string }>('/api/avatar/status'),
            ]);
            setStreak(streakData?.currentStreak ?? 0);
            setTodayHealth(health);
            setProfileAvatarUrl((avatarStatus.success ? avatarStatus.data?.avatarUrl ?? null : null) ?? user?.profileImage ?? null);
            setAvatarKey(Date.now().toString()); // Force avatar refresh
        } catch (e) { console.warn('Dashboard load error:', e); }
    };

    const firstName = user?.name?.split(' ')[0] || 'there';
    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <ScreenLayout gradientBackground>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good morning,</Text>
                        <Text style={styles.name}>{firstName} 👋</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => navigation.navigate('Achievements')} style={styles.streakBadge}>
                            <Text style={styles.streakEmoji}>🔥</Text>
                            <Text style={styles.streakNum}>{streak}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={styles.avatarWrap}>
                            {profileAvatarUrl
                                ? <Image source={{ uri: profileAvatarUrl }} style={styles.avatarImg} />
                                : <Text style={styles.avatarInitials}>{initials}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <DigitalTwinAvatar key={avatarKey} />
                </View>

                {/* Metric Cards */}
                <View style={styles.metricsContainer}>
                    <Text style={styles.sectionTitle}>Live Health Metrics</Text>
                    <View style={styles.metricsGrid}>
                        <MetricCard
                            icon={<Heart color="#ef4444" size={18} />} iconBg="#fef2f2"
                            label="Heart Rate" value="72 BPM" subValue="Normal"
                        />
                        <MetricCard
                            icon={<Activity color="#7c3aed" size={18} />} iconBg="#f5f3ff"
                            label="Steps"
                            value={todayHealth?.steps != null ? todayHealth.steps.toLocaleString() : '—'}
                            subValue={todayHealth?.steps != null ? (todayHealth.steps >= 8000 ? '🏃 Great!' : 'Keep going!') : 'Log today'}
                        />
                        <MetricCard
                            icon={<Moon color="#6366f1" size={18} />} iconBg="#eef2ff"
                            label="Sleep"
                            value={todayHealth?.sleepHours != null ? `${todayHealth.sleepHours}h` : '—'}
                            subValue={todayHealth?.sleepHours != null ? (todayHealth.sleepHours >= 7 ? '😴 Rested' : 'Need rest') : 'Log today'}
                        />
                        <MetricCard
                            icon={<Zap color="#f59e0b" size={18} />} iconBg="#fffbeb"
                            label="Energy"
                            value={todayHealth?.energyScore != null ? `${Math.round(todayHealth.energyScore)}` : '—'}
                            subValue={todayHealth?.energyScore != null ? (todayHealth.energyScore >= 70 ? '⚡ High' : 'Low') : 'Log today'}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('FutureYou')}>
                        <Text style={styles.quickBtnText}>🔮 Future You</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickBtn, styles.quickBtnRight]} onPress={() => navigation.navigate('Analytics')}>
                        <Text style={styles.quickBtnText}>📊 Analytics</Text>
                    </TouchableOpacity>
                </View>

                {/* Action List */}
                <View style={styles.actionList}>
                    {[
                        { icon: '📋', label: 'Log Daily Vitals', sub: 'Saved to MongoDB ☁️', screen: 'DataEntry', color: '#7c3aed' },
                        { icon: '🌀', label: 'What-If Scenarios', sub: 'AI Predictions', screen: 'WhatIf', color: '#6366f1' },
                        { icon: '🏆', label: 'Achievements', sub: `🔥 ${streak} day streak`, screen: 'Achievements', color: '#f59e0b' },
                        { icon: '📈', label: 'Weekly Summary', sub: "Your Twin's Report", screen: 'WeeklySummary', color: '#10b981' },
                    ].map((item) => (
                        <TouchableOpacity key={item.screen} style={styles.actionRow} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
                            <View style={[styles.actionIconWrap, { backgroundColor: item.color + '18' }]}>
                                <Text style={styles.actionIconEmoji}>{item.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionLabel}>{item.label}</Text>
                                <Text style={styles.actionSub}>{item.sub}</Text>
                            </View>
                            <Text style={styles.actionChevron}>›</Text>
                        </TouchableOpacity>
                    ))}

                    {/* AI Weekly Analysis — featured */}
                    <TouchableOpacity onPress={() => navigation.navigate("AIWeeklyAnalysis")} activeOpacity={0.85}>
                        <LinearGradient
                            colors={["#7c3aed", "#6d28d9"]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.aiActionRow}
                        >
                            <View style={styles.aiIconWrap}>
                                <Text style={{ fontSize: 22 }}>🤖</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.aiActionLabel}>Your Weekly Analysis</Text>
                                <Text style={styles.aiActionSub}>Powered by Gemini AI ✨</Text>
                            </View>
                            <Text style={styles.aiChevron}>›</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    greeting: { fontSize: 14, color: '#6d28d9', fontWeight: '500' },
    name: { fontSize: 24, fontWeight: '800', color: '#1e1b4b' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4, borderWidth: 1, borderColor: '#e9d5ff' },
    streakEmoji: { fontSize: 16 },
    streakNum: { fontWeight: '800', color: '#7c3aed', fontSize: 15 },
    avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
    avatarImg: { width: 40, height: 40, borderRadius: 20 },
    avatarInitials: { color: '#fff', fontWeight: '800', fontSize: 14 },

    avatarSection: { height: 280, justifyContent: 'center' },

    metricsContainer: { paddingHorizontal: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', marginBottom: 12 },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricCard: {
        flex: 1, minWidth: '45%', backgroundColor: '#ffffff',
        borderRadius: 20, padding: 16, alignItems: 'center',
        shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
        borderWidth: 1, borderColor: '#f3f0ff',
    },
    metricIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    metricValue: { fontSize: 20, fontWeight: '800', color: '#1e1b4b' },
    metricLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginTop: 2 },
    metricSub: { fontSize: 10, fontWeight: '700', color: '#7c3aed', marginTop: 2 },

    quickActions: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
    quickBtn: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#e9d5ff', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    quickBtnRight: {},
    quickBtnText: { fontWeight: '700', color: '#4c1d95', fontSize: 14 },

    actionList: { paddingHorizontal: 20, gap: 10 },
    actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 18, padding: 16, gap: 14, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f3f0ff' },
    actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionIconEmoji: { fontSize: 20 },
    actionLabel: { fontSize: 15, fontWeight: '700', color: '#1e1b4b' },
    actionSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    actionChevron: { fontSize: 22, color: '#c4b5fd', fontWeight: '300' },

    aiActionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, gap: 14, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    aiIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    aiActionLabel: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
    aiActionSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    aiChevron: { fontSize: 22, color: 'rgba(255,255,255,0.6)', fontWeight: '300' },
});
