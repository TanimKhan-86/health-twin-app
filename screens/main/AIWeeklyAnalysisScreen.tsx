import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { ArrowLeft, Sparkles, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getHealthHistory, getMoodHistory } from '../../lib/api/auth';
import { apiFetch } from '../../lib/api/client';

interface AIAnalysis {
    narrative: string;
    tips: string[];
    predictedOutcome: string;
    disclaimer: string;
}

export default function AIWeeklyAnalysisScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [healthCount, setHealthCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            fetchAnalysis();
        }, [])
    );

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const [healthData, moodData] = await Promise.all([
                getHealthHistory(7),
                getMoodHistory(7),
            ]);

            setHealthCount((healthData as any[]).length);

            if ((healthData as any[]).length === 0) {
                setError('No health data found for this week. Log at least one day to get your AI analysis!');
                setLoading(false);
                return;
            }

            const response = await apiFetch<AIAnalysis>('/api/ai/weekly-analysis', {
                method: 'POST',
                body: JSON.stringify({ healthData, moodData }),
            });

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to get AI analysis');
            }

            setAnalysis(response.data);
        } catch (err: any) {
            console.error('AI analysis error:', err);
            setError(
                err?.response?.data?.error ||
                'Could not generate your analysis. Please check your connection and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenLayout gradientBackground>
            <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <ArrowLeft color="white" size={20} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Your Weekly Analysis</Text>
                        <Text style={styles.subtitle}>Powered by Gemini AI ✨</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>

                    {/* Loading State */}
                    {loading && (
                        <Card style={styles.card}>
                            <CardContent style={styles.centeredContent}>
                                <ActivityIndicator size="large" color="#0d9488" />
                                <Text style={styles.loadingTitle}>Analysing your week...</Text>
                                <Text style={styles.loadingSubtitle}>
                                    Gemini AI is reviewing {healthCount > 0 ? `${healthCount} days` : 'your'} of health data
                                </Text>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <Card style={styles.card}>
                            <CardContent style={styles.centeredContent}>
                                <AlertCircle size={40} color="#ef4444" />
                                <Text style={styles.errorTitle}>Analysis Unavailable</Text>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity style={styles.retryButton} onPress={fetchAnalysis}>
                                    <Text style={styles.retryText}>Try Again</Text>
                                </TouchableOpacity>
                            </CardContent>
                        </Card>
                    )}

                    {/* Results */}
                    {!loading && analysis && (
                        <>
                            {/* AI Narrative */}
                            <Card style={styles.card}>
                                <CardContent style={styles.narrativeContent}>
                                    <View style={styles.sectionHeader}>
                                        <Sparkles size={20} color="#0d9488" />
                                        <Text style={styles.sectionTitle}>Your Week in Review</Text>
                                    </View>
                                    <View style={styles.narrativeBox}>
                                        <Text style={styles.narrativeText}>"{analysis.narrative}"</Text>
                                    </View>
                                </CardContent>
                            </Card>

                            {/* Tips */}
                            <Card style={styles.card}>
                                <CardContent>
                                    <View style={styles.sectionHeader}>
                                        <Lightbulb size={20} color="#f59e0b" />
                                        <Text style={styles.sectionTitle}>3 Tips to Improve</Text>
                                    </View>
                                    {analysis.tips.map((tip, index) => (
                                        <View key={index} style={styles.tipRow}>
                                            <View style={styles.tipBadge}>
                                                <Text style={styles.tipNumber}>{index + 1}</Text>
                                            </View>
                                            <Text style={styles.tipText}>{tip}</Text>
                                        </View>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Predicted Outcome */}
                            <Card style={styles.outcomeCard}>
                                <CardContent>
                                    <View style={styles.sectionHeader}>
                                        <TrendingUp size={20} color="#10b981" />
                                        <Text style={[styles.sectionTitle, { color: '#fff' }]}>If You Follow These Tips...</Text>
                                    </View>
                                    <Text style={styles.outcomeText}>{analysis.predictedOutcome}</Text>
                                </CardContent>
                            </Card>

                            {/* Disclaimer */}
                            <View style={styles.disclaimerBox}>
                                <Text style={styles.disclaimerText}>{analysis.disclaimer}</Text>
                            </View>

                            {/* Refresh Button */}
                            <TouchableOpacity style={styles.refreshButton} onPress={fetchAnalysis}>
                                <Sparkles size={16} color="#fff" />
                                <Text style={styles.refreshText}>Regenerate Analysis</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 16,
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    backText: { color: '#fff', fontWeight: 'bold' },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    subtitle: { color: '#99f6e4', fontSize: 12 },
    scroll: { padding: 16, paddingBottom: 48 },
    card: { marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.97)' },
    centeredContent: { alignItems: 'center', padding: 32, gap: 12 },
    loadingTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
    loadingSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },
    errorTitle: { fontSize: 16, fontWeight: 'bold', color: '#ef4444', marginTop: 8 },
    errorText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
    retryButton: {
        marginTop: 12,
        backgroundColor: '#0d9488',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retryText: { color: '#fff', fontWeight: 'bold' },
    narrativeContent: { padding: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    narrativeBox: {
        backgroundColor: '#f0fdfa',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ccfbf1',
    },
    narrativeText: { color: '#0f766e', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    tipBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#fef3c7',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    tipNumber: { color: '#92400e', fontWeight: 'bold', fontSize: 13 },
    tipText: { flex: 1, color: '#334155', fontSize: 14, lineHeight: 20 },
    outcomeCard: {
        marginBottom: 16,
        backgroundColor: '#0d9488',
    },
    outcomeText: { color: '#fff', fontSize: 14, lineHeight: 22, fontWeight: '500' },
    disclaimerBox: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    disclaimerText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', lineHeight: 16 },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    refreshText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
