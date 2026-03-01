import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Image } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { ArrowLeft, RefreshCw, Sparkles, CalendarDays, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { FutureInsight, getFutureInsight } from '../../lib/api/auth';
import { apiFetch } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';

const STATE_THEME = {
    happy: { label: 'Happy', color: '#10b981', bg: '#ecfdf5', emoji: '😄' },
    sad: { label: 'Sad', color: '#7c3aed', bg: '#f5f3ff', emoji: '😔' },
    sleepy: { label: 'Sleepy', color: '#f59e0b', bg: '#fffbeb', emoji: '😴' },
} as const;

type FutureState = keyof typeof STATE_THEME;

export default function FutureYouScreen({ navigation }: any) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [insight, setInsight] = useState<FutureInsight | null>(null);
    const [videoFailed, setVideoFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInsight = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);

        try {
            setError(null);
            const data = await getFutureInsight(7);
            if (!data) {
                setError('Could not load future prediction');
                return;
            }
            setInsight(data);
        } catch (e: any) {
            setError(e?.message || 'Could not load future prediction');
        } finally {
            if (silent) setRefreshing(false);
            else setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadInsight(false);
        }, [loadInsight])
    );

    const projectedState = (insight?.projectedState || 'sad') as FutureState;
    const dominantState = (insight?.dominantState || 'sad') as FutureState;
    const currentState = (insight?.currentState || 'sad') as FutureState;

    const projectedTheme = STATE_THEME[projectedState];
    const dominantTheme = STATE_THEME[dominantState];
    const currentTheme = STATE_THEME[currentState];

    const totalTracked = useMemo(() => {
        if (!insight) return 0;
        return insight.stateBreakdown.happy + insight.stateBreakdown.sad + insight.stateBreakdown.sleepy;
    }, [insight]);

    const handleSeedDemo = async () => {
        setRefreshing(true);
        try {
            let seeded = false;
            const primary = await apiFetch('/api/seed/demo', { method: 'POST' });
            seeded = primary.success;
            if (!seeded) {
                const fallback = await apiFetch('/api/health/seed-demo', { method: 'POST' });
                seeded = fallback.success;
            }

            if (seeded) {
                showToast('7 days demo data seeded. Re-analyzing Future You...', 'success');
                await loadInsight(true);
                return;
            }
            showToast('Could not seed demo data', 'error');
        } catch (e: any) {
            showToast(e?.message || 'Could not seed demo data', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <ScreenLayout gradientBackground>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#7c3aed" />
                    <Text style={{ marginTop: 12, color: '#4c1d95', fontWeight: '700' }}>
                        Analyzing your last 7 days...
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout gradientBackground>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.headerGrad}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="white" size={18} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Future You</Text>
                    <Text style={styles.headerSub}>7-day behavior trend prediction</Text>
                </LinearGradient>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={styles.avatarFrame}>
                                {insight?.media?.projectedVideoUrl && !videoFailed ? (
                                    Platform.OS === 'web' ? (
                                        <video
                                            src={insight.media.projectedVideoUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            onError={() => setVideoFailed(true)}
                                            style={styles.webVideo}
                                        />
                                    ) : (
                                        <Video
                                            key={insight.media.projectedVideoUrl}
                                            source={{ uri: insight.media.projectedVideoUrl }}
                                            style={styles.nativeVideo}
                                            resizeMode={ResizeMode.COVER}
                                            isLooping
                                            shouldPlay
                                            isMuted
                                            onError={() => setVideoFailed(true)}
                                        />
                                    )
                                ) : insight?.media?.imageUrl ? (
                                    <Image source={{ uri: insight.media.imageUrl }} style={styles.nativeVideo} resizeMode="cover" />
                                ) : (
                                    <Text style={styles.emptyAvatarText}>No avatar media</Text>
                                )}
                            </View>

                            <View style={[styles.pill, { backgroundColor: projectedTheme.bg, borderColor: projectedTheme.color }]}>
                                <Sparkles size={14} color={projectedTheme.color} />
                                <Text style={[styles.pillText, { color: projectedTheme.color }]}>
                                    Next week onward: {projectedTheme.label} {projectedTheme.emoji}
                                </Text>
                            </View>

                            <Text style={styles.insightText}>
                                {insight?.insight || 'Could not generate future insight.'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <CalendarDays size={16} color="#7c3aed" />
                            <Text style={styles.cardTitle}>State Summary (Last 7 Days)</Text>
                        </View>

                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Dominant</Text>
                                <Text style={[styles.summaryValue, { color: dominantTheme.color }]}>
                                    {dominantTheme.label} {dominantTheme.emoji}
                                </Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Current</Text>
                                <Text style={[styles.summaryValue, { color: currentTheme.color }]}>
                                    {currentTheme.label} {currentTheme.emoji}
                                </Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Projection</Text>
                                <Text style={[styles.summaryValue, { color: projectedTheme.color }]}>
                                    {projectedTheme.label} {projectedTheme.emoji}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.reasonLine}>• {insight?.reasoning?.dominant}</Text>
                        <Text style={styles.reasonLine}>• {insight?.reasoning?.current}</Text>
                        <Text style={styles.reasonLine}>• {insight?.reasoning?.projection}</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <TrendingUp size={16} color="#7c3aed" />
                            <Text style={styles.cardTitle}>Trait Distribution</Text>
                        </View>

                        {(['happy', 'sad', 'sleepy'] as FutureState[]).map((state) => {
                            const theme = STATE_THEME[state];
                            const count = insight?.stateBreakdown?.[state] ?? 0;
                            const percent = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0;
                            return (
                                <View key={state} style={styles.barRow}>
                                    <Text style={styles.barLabel}>{theme.emoji} {theme.label}</Text>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: theme.color }]} />
                                    </View>
                                    <Text style={styles.barCount}>{count}d</Text>
                                </View>
                            );
                        })}
                    </View>

                    {!insight?.hasSevenDayData && (
                        <View style={styles.card}>
                            <Text style={styles.emptyTitle}>No 7-day data yet</Text>
                            <Text style={styles.emptySub}>
                                Seed demo data first, then Future You can predict whether your next weeks trend happy, sad, or sleepy.
                            </Text>
                            <TouchableOpacity style={styles.seedBtn} onPress={handleSeedDemo} disabled={refreshing}>
                                {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw size={16} color="#fff" />}
                                <Text style={styles.seedBtnText}>{refreshing ? 'Seeding...' : 'Seed 7 Days Demo'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity style={styles.refreshBtn} onPress={() => loadInsight(true)} disabled={refreshing}>
                        {refreshing ? <ActivityIndicator size="small" color="#6d28d9" /> : <RefreshCw size={16} color="#6d28d9" />}
                        <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Re-analyze Future You'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.whatIfCta} activeOpacity={0.85} onPress={() => navigation.navigate('WhatIf')}>
                        <LinearGradient
                            colors={['#7c3aed', '#6d28d9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.whatIfCtaInner}
                        >
                            <Text style={styles.whatIfCtaTitle}>Want to improve? What-if I did...</Text>
                            <Text style={styles.whatIfCtaSub}>Open Scenario Explorer</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    headerGrad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    backText: { color: '#fff', fontWeight: '700' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    scroll: { padding: 16, paddingBottom: 60 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#f3f0ff',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    avatarFrame: {
        width: 164,
        height: 164,
        borderRadius: 82,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: '#ffffff',
        backgroundColor: '#ede9fe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    webVideo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
    } as any,
    nativeVideo: { width: '100%', height: '100%' },
    emptyAvatarText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    pill: {
        marginTop: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pillText: { fontWeight: '800', fontSize: 13 },
    insightText: {
        marginTop: 12,
        textAlign: 'center',
        color: '#4b5563',
        fontSize: 14,
        lineHeight: 21,
        fontWeight: '500',
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardTitle: { fontWeight: '800', fontSize: 16, color: '#1e1b4b' },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    summaryItem: {
        flex: 1,
        backgroundColor: '#faf5ff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ede9fe',
    },
    summaryLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    summaryValue: { marginTop: 3, fontSize: 14, fontWeight: '800' },
    reasonLine: { marginTop: 8, color: '#4b5563', fontSize: 13, lineHeight: 19 },
    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    barLabel: { width: 84, color: '#1e1b4b', fontWeight: '700', fontSize: 12 },
    barTrack: { flex: 1, height: 8, borderRadius: 6, backgroundColor: '#e9d5ff', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 6 },
    barCount: { width: 30, textAlign: 'right', color: '#4b5563', fontWeight: '700', fontSize: 12 },
    emptyTitle: { fontWeight: '800', fontSize: 16, color: '#1e1b4b' },
    emptySub: { marginTop: 6, color: '#6b7280', lineHeight: 20, fontSize: 13 },
    seedBtn: {
        marginTop: 14,
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexDirection: 'row',
    },
    seedBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    refreshBtn: {
        backgroundColor: '#f5f3ff',
        borderColor: '#ddd6fe',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexDirection: 'row',
    },
    refreshText: { color: '#6d28d9', fontWeight: '800', fontSize: 14 },
    errorText: { color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 8 },
    whatIfCta: {
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 4,
    },
    whatIfCtaInner: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
    whatIfCtaTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
    whatIfCtaSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 12, marginTop: 2 },
});
