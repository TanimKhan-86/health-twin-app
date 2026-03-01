import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, Platform, Image, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { LineChart } from "react-native-gifted-charts";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ArrowLeft, Activity, Moon, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react-native";
import { Video, ResizeMode } from "expo-av";
import { calculatePredictedEnergy, predictMoodState, generatePredictionInsight, generateHabitSimulation } from "../../lib/prediction/model";
import { getHealthHistory } from "../../lib/api/auth";
import { apiFetch } from "../../lib/api/client";
import { LinearGradient } from "expo-linear-gradient";

const screenWidth = Dimensions.get("window").width;
type ScenarioAvatarState = 'happy' | 'sad' | 'sleepy';
type ConfidenceLevel = 'high' | 'medium' | 'low';
const SCENARIO_STATES: ScenarioAvatarState[] = ['happy', 'sad', 'sleepy'];
type ScenarioSlot = 'A' | 'B';
interface ScenarioStateDecision {
    state: ScenarioAvatarState;
    ruleName: string;
    ruleExpression: string;
    matchedBecause: string;
}
interface SavedScenario {
    sleep: number;
    steps: number;
    energy: number;
    mood: string;
    avatarState: ScenarioAvatarState;
    confidence: ConfidenceLevel;
    savedAtLabel: string;
}
interface FeasibilityAssessment {
    confidence: ConfidenceLevel;
    warnings: string[];
    isUnrealistic: boolean;
}
interface DataConfidenceAssessment {
    confidence: ConfidenceLevel;
    loggedDays: number;
    totalDays: number;
    note: string;
}

const AVATAR_STATE_META: Record<ScenarioAvatarState, { label: string; emoji: string }> = {
    happy: { label: 'Happy', emoji: '😄' },
    sad: { label: 'Sad', emoji: '😔' },
    sleepy: { label: 'Sleepy', emoji: '😴' },
};
const CONFIDENCE_META: Record<ConfidenceLevel, { label: string; color: string; bg: string; border: string }> = {
    high: { label: 'High', color: '#047857', bg: '#ecfdf5', border: '#6ee7b7' },
    medium: { label: 'Medium', color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
    low: { label: 'Low', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};

function inferSimulationAvatarDecision(simSleep: number, predictedEnergy: number): ScenarioStateDecision {
    if (simSleep <= 4.5) {
        return {
            state: 'sleepy',
            ruleName: 'Rule A',
            ruleExpression: 'if sleep <= 4.5h -> sleepy',
            matchedBecause: `sleep=${simSleep.toFixed(1)}h`,
        };
    }

    if (simSleep <= 5.5 && predictedEnergy < 55) {
        return {
            state: 'sleepy',
            ruleName: 'Rule B',
            ruleExpression: 'if sleep <= 5.5h and predictedEnergy < 55 -> sleepy',
            matchedBecause: `sleep=${simSleep.toFixed(1)}h and energy=${predictedEnergy}`,
        };
    }

    if (simSleep >= 7 && predictedEnergy >= 70) {
        return {
            state: 'happy',
            ruleName: 'Rule C',
            ruleExpression: 'if sleep >= 7h and predictedEnergy >= 70 -> happy',
            matchedBecause: `sleep=${simSleep.toFixed(1)}h and energy=${predictedEnergy}`,
        };
    }

    return {
        state: 'sad',
        ruleName: 'Rule D',
        ruleExpression: 'otherwise -> sad',
        matchedBecause: `sleep=${simSleep.toFixed(1)}h and energy=${predictedEnergy}`,
    };
}

function normalizeStateVideos(raw?: Record<string, string> | null): Partial<Record<ScenarioAvatarState, string>> {
    if (!raw) return {};
    return {
        happy: typeof raw.happy === 'string' ? raw.happy : undefined,
        sad: typeof raw.sad === 'string' ? raw.sad : undefined,
        sleepy: typeof raw.sleepy === 'string' ? raw.sleepy : undefined,
    };
}

function hasAllScenarioStates(videoByState: Partial<Record<ScenarioAvatarState, string>>): boolean {
    return SCENARIO_STATES.every((state) => typeof videoByState[state] === 'string' && !!videoByState[state]);
}

function assessScenarioFeasibility(
    simSleep: number,
    simSteps: number,
    baselineSleep: number,
    baselineSteps: number
): FeasibilityAssessment {
    let risk = 0;
    const warnings: string[] = [];

    if (simSleep < 4) {
        risk += 3;
        warnings.push(`Sleep at ${simSleep.toFixed(1)}h is likely unsustainable for daily planning.`);
    } else if (simSleep < 5) {
        risk += 1;
        warnings.push(`Very low sleep (${simSleep.toFixed(1)}h) may reduce forecast reliability.`);
    }

    if (simSleep > 10) {
        risk += 3;
        warnings.push(`Sleep at ${simSleep.toFixed(1)}h is unusually high for a long-term routine.`);
    } else if (simSleep > 9) {
        risk += 1;
        warnings.push(`High sleep (${simSleep.toFixed(1)}h) is less common in day-to-day patterns.`);
    }

    if (simSteps < 1000) {
        risk += 1;
        warnings.push(`Very low steps (${simSteps.toLocaleString()}) may represent an outlier day.`);
    }

    if (simSteps > 18000) {
        risk += 2;
        warnings.push(`Very high steps (${simSteps.toLocaleString()}) can be hard to maintain daily.`);
    }

    if (Math.abs(simSleep - baselineSleep) >= 3) {
        risk += 2;
        warnings.push(`Sleep change is large vs baseline (${(simSleep - baselineSleep).toFixed(1)}h).`);
    }

    if (Math.abs(simSteps - baselineSteps) >= 9000) {
        risk += 1;
        warnings.push(`Step change is large vs baseline (${(simSteps - baselineSteps).toLocaleString()}).`);
    }

    if (simSleep >= 10 && simSteps >= 16000) {
        risk += 2;
        warnings.push('Combining very high sleep with very high steps is likely unrealistic.');
    }

    if (simSleep <= 4.5 && simSteps >= 16000) {
        risk += 2;
        warnings.push('Low sleep with very high activity is an extreme combination.');
    }

    if (risk >= 6) {
        return { confidence: 'low', warnings, isUnrealistic: true };
    }
    if (risk >= 3) {
        return { confidence: 'medium', warnings, isUnrealistic: false };
    }
    return { confidence: 'high', warnings, isUnrealistic: false };
}

function confidenceRank(confidence: ConfidenceLevel): number {
    if (confidence === 'high') return 3;
    if (confidence === 'medium') return 2;
    return 1;
}

function lowerConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
    return confidenceRank(a) <= confidenceRank(b) ? a : b;
}

function assessDataConfidence(loggedDays: number, totalDays: number = 7): DataConfidenceAssessment {
    const safeLogged = Math.max(0, Math.min(totalDays, loggedDays));
    if (safeLogged <= 2) {
        return {
            confidence: 'low',
            loggedDays: safeLogged,
            totalDays,
            note: `Only ${safeLogged}/${totalDays} recent logs found. Forecast is tentative.`,
        };
    }
    if (safeLogged <= 4) {
        return {
            confidence: 'medium',
            loggedDays: safeLogged,
            totalDays,
            note: `Partial history (${safeLogged}/${totalDays} logs). Use forecast directionally.`,
        };
    }
    return {
        confidence: 'high',
        loggedDays: safeLogged,
        totalDays,
        note: `Good recent coverage (${safeLogged}/${totalDays} logs).`,
    };
}

export default function WhatIfScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);

    const [baselinesteps, setBaselineSteps] = useState(5000);
    const [baselineSleep, setBaselineSleep] = useState(6.5);
    const [baselineEnergy, setBaselineEnergy] = useState(60);

    const [simSteps, setSimSteps] = useState(5000);
    const [simSleep, setSimSleep] = useState(6.5);
    const [avatarLoading, setAvatarLoading] = useState(true);
    const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
    const [avatarVideoByState, setAvatarVideoByState] = useState<Partial<Record<ScenarioAvatarState, string>>>({});
    const [avatarVideoFailed, setAvatarVideoFailed] = useState(false);
    const [scenarioA, setScenarioA] = useState<SavedScenario | null>(null);
    const [scenarioB, setScenarioB] = useState<SavedScenario | null>(null);
    const [availableLogDays, setAvailableLogDays] = useState(0);

    const predictedEnergy = useMemo(() => calculatePredictedEnergy(simSleep, simSteps), [simSleep, simSteps]);
    const predictedMood = useMemo(() => predictMoodState(simSleep, predictedEnergy), [simSleep, predictedEnergy]);
    const baselineMood = useMemo(() => predictMoodState(baselineSleep, baselineEnergy), [baselineSleep, baselineEnergy]);
    const baselineDecision = useMemo(() => inferSimulationAvatarDecision(baselineSleep, baselineEnergy), [baselineSleep, baselineEnergy]);
    const baselineFeasibility = useMemo(
        () => assessScenarioFeasibility(baselineSleep, baselinesteps, baselineSleep, baselinesteps),
        [baselineSleep, baselinesteps]
    );
    const simulationDecision = useMemo(
        () => inferSimulationAvatarDecision(simSleep, predictedEnergy),
        [simSleep, predictedEnergy]
    );
    const feasibility = useMemo(
        () => assessScenarioFeasibility(simSleep, simSteps, baselineSleep, baselinesteps),
        [simSleep, simSteps, baselineSleep, baselinesteps]
    );
    const dataConfidence = useMemo(
        () => assessDataConfidence(availableLogDays, 7),
        [availableLogDays]
    );
    const baselineCombinedConfidence = useMemo(
        () => lowerConfidence(baselineFeasibility.confidence, dataConfidence.confidence),
        [baselineFeasibility.confidence, dataConfidence.confidence]
    );
    const combinedConfidence = useMemo(
        () => lowerConfidence(feasibility.confidence, dataConfidence.confidence),
        [feasibility.confidence, dataConfidence.confidence]
    );
    const simulatedAvatarState = simulationDecision.state;
    const previewVideoUrl = useMemo(
        () =>
            avatarVideoByState[simulatedAvatarState] ||
            avatarVideoByState.happy ||
            avatarVideoByState.sad ||
            avatarVideoByState.sleepy ||
            null,
        [avatarVideoByState, simulatedAvatarState]
    );
    const forecastData = useMemo(() => generateHabitSimulation(baselineSleep, baselinesteps, simSleep, simSteps, 30), [baselineSleep, baselinesteps, simSleep, simSteps]);

    const chartData = useMemo(() => forecastData.map((point) => ({
        value: point.predictedEnergy, label: point.day % 5 === 0 ? `D${point.day}` : '',
        dataPointText: point.day === 30 ? point.predictedEnergy.toString() : '',
    })), [forecastData]);

    const finalEnergyDiff = forecastData[forecastData.length - 1].predictedEnergy - baselineEnergy;

    const narrative = useMemo(() => generatePredictionInsight(
        baselineEnergy, predictedEnergy, simSleep - baselineSleep, simSteps - baselinesteps
    ), [baselineEnergy, predictedEnergy, simSleep, simSteps]);
    const finalNarrative = useMemo(() => {
        if (dataConfidence.confidence === 'low') {
            return `Limited data (${dataConfidence.loggedDays}/${dataConfidence.totalDays} logs). ${narrative}`;
        }
        if (dataConfidence.confidence === 'medium') {
            return `Partial data (${dataConfidence.loggedDays}/${dataConfidence.totalDays} logs). ${narrative}`;
        }
        return narrative;
    }, [dataConfidence.confidence, dataConfidence.loggedDays, dataConfidence.totalDays, narrative]);
    const dataConfidenceMeta = CONFIDENCE_META[dataConfidence.confidence];
    const combinedConfidenceMeta = CONFIDENCE_META[combinedConfidence];
    const comparisonCards = useMemo(() => [
        {
            key: 'baseline',
            title: 'Baseline',
            subtitle: '7-day average',
            scenario: {
                sleep: baselineSleep,
                steps: baselinesteps,
                energy: baselineEnergy,
                mood: baselineMood,
                avatarState: baselineDecision.state,
                confidence: baselineCombinedConfidence,
                savedAtLabel: 'Auto',
            },
            isBaseline: true,
        },
        {
            key: 'scenario-a',
            title: 'Scenario A',
            subtitle: scenarioA ? `Saved ${scenarioA.savedAtLabel}` : 'Not saved yet',
            scenario: scenarioA,
            isBaseline: false,
        },
        {
            key: 'scenario-b',
            title: 'Scenario B',
            subtitle: scenarioB ? `Saved ${scenarioB.savedAtLabel}` : 'Not saved yet',
            scenario: scenarioB,
            isBaseline: false,
        },
    ], [baselineSleep, baselinesteps, baselineEnergy, baselineMood, baselineDecision.state, baselineCombinedConfidence, scenarioA, scenarioB]);

    useEffect(() => {
        loadData();
        loadAvatarLibrary();
    }, []);

    useEffect(() => {
        setAvatarVideoFailed(false);
    }, [previewVideoUrl, simulationDecision.state]);

    const loadAvatarLibrary = async () => {
        try {
            setAvatarLoading(true);
            let resolvedImageUrl: string | null = null;
            let resolvedVideos: Partial<Record<ScenarioAvatarState, string>> = {};

            const library = await apiFetch<{ imageUrl?: string | null; videoByState?: Record<string, string> }>('/api/avatar/library');
            if (library.success && library.data) {
                resolvedImageUrl = library.data.imageUrl ?? resolvedImageUrl;
                resolvedVideos = { ...resolvedVideos, ...normalizeStateVideos(library.data.videoByState || {}) };
            }

            const fallback = await apiFetch<{ state?: string; videoUrl?: string; imageUrl?: string | null; videoByState?: Record<string, string> }>('/api/avatar/state');
            if (fallback.success && fallback.data) {
                resolvedImageUrl = fallback.data.imageUrl ?? resolvedImageUrl;
                resolvedVideos = { ...resolvedVideos, ...normalizeStateVideos(fallback.data.videoByState || {}) };
                const state = fallback.data.state as ScenarioAvatarState | undefined;
                const videoUrl = fallback.data.videoUrl;
                if (state && videoUrl) {
                    resolvedVideos[state] = videoUrl;
                }
            }

            if (!hasAllScenarioStates(resolvedVideos)) {
                const missingStates = SCENARIO_STATES.filter((state) => !resolvedVideos[state]);
                const stateFetches = await Promise.all(
                    missingStates.map(async (state) => {
                        const response = await apiFetch<{ state?: string; videoUrl?: string; imageUrl?: string | null }>(
                            `/api/avatar/state?state=${encodeURIComponent(state)}`
                        );
                        if (!response.success || !response.data?.videoUrl) return null;
                        return {
                            state,
                            videoUrl: response.data.videoUrl,
                            imageUrl: response.data.imageUrl ?? null,
                        };
                    })
                );

                for (const result of stateFetches) {
                    if (!result) continue;
                    resolvedVideos[result.state] = result.videoUrl;
                    if (!resolvedImageUrl && result.imageUrl) {
                        resolvedImageUrl = result.imageUrl;
                    }
                }
            }

            setAvatarImageUrl(resolvedImageUrl);
            setAvatarVideoByState(resolvedVideos);
        } catch (e) {
            console.warn('Avatar library load error:', e);
        } finally {
            setAvatarLoading(false);
        }
    };

    const loadData = async () => {
        try {
            const history = await getHealthHistory(7);
            const logCount = Array.isArray(history) ? history.length : 0;
            setAvailableLogDays(logCount);
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
        } catch (e) {
            setAvailableLogDays(0);
            console.error(e);
        }
        finally { setLoading(false); }
    };

    const saveScenario = (slot: ScenarioSlot) => {
        const saved: SavedScenario = {
            sleep: simSleep,
            steps: simSteps,
            energy: predictedEnergy,
            mood: predictedMood,
            avatarState: simulationDecision.state,
            confidence: combinedConfidence,
            savedAtLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        if (slot === 'A') {
            setScenarioA(saved);
            return;
        }
        setScenarioB(saved);
    };

    const resetSimulation = () => { setSimSteps(baselinesteps); setSimSleep(baselineSleep); };

    return (
        <ScreenLayout gradientBackground>
            <View style={{ flex: 1 }}>
                <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.headerGrad}>
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
                            <View style={styles.avatarPreviewShell}>
                                {avatarLoading && !previewVideoUrl && !avatarImageUrl ? (
                                    <ActivityIndicator size="small" color="#7c3aed" />
                                ) : previewVideoUrl && !avatarVideoFailed ? (
                                    Platform.OS === 'web' ? (
                                        <video
                                            key={previewVideoUrl}
                                            src={previewVideoUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            onError={() => setAvatarVideoFailed(true)}
                                            style={styles.webVideo}
                                        />
                                    ) : (
                                        <Video
                                            key={previewVideoUrl}
                                            source={{ uri: previewVideoUrl }}
                                            style={styles.nativeVideo}
                                            resizeMode={ResizeMode.COVER}
                                            isMuted
                                            shouldPlay
                                            isLooping
                                            onError={() => setAvatarVideoFailed(true)}
                                        />
                                    )
                                ) : avatarImageUrl ? (
                                    <Image source={{ uri: avatarImageUrl }} style={styles.nativeVideo} resizeMode="cover" />
                                ) : (
                                    <Text style={styles.avatarFallbackText}>Setup avatar in Settings</Text>
                                )}
                            </View>
                            <View style={styles.moodBadge}>
                                <Text style={styles.moodText}>
                                    {AVATAR_STATE_META[simulatedAvatarState].label} {AVATAR_STATE_META[simulatedAvatarState].emoji}
                                </Text>
                            </View>
                            <Text style={styles.moodSubText}>Scenario model: {predictedMood}</Text>
                            <Text style={[styles.dataConfidenceInline, { color: dataConfidenceMeta.color }]}>
                                Data confidence: {dataConfidenceMeta.label} ({dataConfidence.loggedDays}/{dataConfidence.totalDays} logs)
                            </Text>
                            <View style={styles.whyPanel}>
                                <Text style={styles.whyTitle}>Why this state?</Text>
                                <Text style={styles.whyRule}>{simulationDecision.ruleName}: {simulationDecision.ruleExpression}</Text>
                                <Text style={styles.whyMatch}>Matched because: {simulationDecision.matchedBecause}</Text>
                                <Text style={styles.whyValues}>
                                    Current values: sleep={simSleep.toFixed(1)}h, steps={simSteps.toLocaleString()}, predictedEnergy={predictedEnergy}
                                </Text>
                            </View>
                            <Text style={styles.narrativeText}>{finalNarrative}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Adjust Habits</Text>
                            <TouchableOpacity onPress={resetSimulation} style={styles.resetBtn}>
                                <RefreshCw size={14} color="#7c3aed" />
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

                        <View
                            style={[
                                styles.guardrailPanel,
                                combinedConfidence === 'low'
                                    ? styles.guardrailPanelLow
                                    : combinedConfidence === 'medium'
                                        ? styles.guardrailPanelMedium
                                        : styles.guardrailPanelHigh,
                            ]}
                        >
                            <View style={styles.guardrailHeader}>
                                <View style={styles.guardrailTitleRow}>
                                    <AlertTriangle size={14} color={combinedConfidenceMeta.color} />
                                    <Text style={styles.guardrailTitle}>Feasibility Guardrails</Text>
                                </View>
                                <View style={[styles.confidenceBadge, { backgroundColor: combinedConfidenceMeta.bg, borderColor: combinedConfidenceMeta.border }]}>
                                    <Text style={[styles.confidenceBadgeText, { color: combinedConfidenceMeta.color }]}>
                                        Confidence: {combinedConfidenceMeta.label}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.dataConfidenceRow}>
                                <Text style={styles.dataConfidenceLabel}>Data coverage</Text>
                                <Text style={[styles.dataConfidenceValue, { color: dataConfidenceMeta.color }]}>
                                    {dataConfidenceMeta.label} ({dataConfidence.loggedDays}/{dataConfidence.totalDays})
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.dataConfidenceNote,
                                    dataConfidence.confidence === 'low' ? styles.dataConfidenceNoteLow : undefined,
                                ]}
                            >
                                {dataConfidence.note}
                            </Text>

                            {feasibility.warnings.length > 0 ? (
                                <View style={styles.guardrailWarnings}>
                                    {feasibility.warnings.map((warning, idx) => (
                                        <Text key={`warning-${idx}`} style={styles.guardrailWarningText}>• {warning}</Text>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.guardrailSafeText}>Inputs look realistic for daily planning.</Text>
                            )}

                            {(feasibility.isUnrealistic || dataConfidence.confidence === 'low') && (
                                <Text style={styles.guardrailLowText}>
                                    Low confidence: results are less certain due to unrealistic inputs and/or limited recent logs.
                                </Text>
                            )}
                        </View>

                        <View style={styles.saveScenarioRow}>
                            <TouchableOpacity style={styles.saveScenarioBtn} onPress={() => saveScenario('A')}>
                                <Text style={styles.saveScenarioBtnText}>Save as Scenario A</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveScenarioBtn} onPress={() => saveScenario('B')}>
                                <Text style={styles.saveScenarioBtnText}>Save as Scenario B</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Scenario Comparison */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Baseline vs Scenario A/B</Text>
                        </View>
                        <Text style={styles.compareHint}>
                            Save up to 2 scenarios and compare energy, mood, and avatar outcome side-by-side.
                        </Text>

                        <View style={styles.compareTable}>
                            <View style={[styles.compareTableRow, styles.compareTableHeaderRow]}>
                                <View style={[styles.compareMetricCell, styles.compareMetricHeaderCell]}>
                                    <Text style={styles.compareHeaderText}>Metric</Text>
                                </View>
                                {comparisonCards.map((card) => (
                                    <View
                                        key={`${card.key}-header`}
                                        style={[
                                            styles.compareValueCell,
                                            styles.compareHeaderCell,
                                            card.isBaseline ? styles.compareBaselineValueCell : undefined,
                                        ]}
                                    >
                                        <Text style={styles.compareHeaderText}>{card.title}</Text>
                                        <Text style={styles.compareHeaderSubText}>
                                            {card.isBaseline ? 'Auto' : card.scenario ? card.scenario.savedAtLabel : 'Not saved'}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.compareTableRow}>
                                <View style={styles.compareMetricCell}>
                                    <Text style={styles.compareMetricLabel}>Energy</Text>
                                </View>
                                {comparisonCards.map((card) => {
                                    const scenario = card.scenario;
                                    const delta = scenario ? scenario.energy - baselineEnergy : null;
                                    return (
                                        <View key={`${card.key}-energy`} style={[styles.compareValueCell, card.isBaseline ? styles.compareBaselineValueCell : undefined]}>
                                            <Text style={styles.compareCellPrimary}>{scenario ? scenario.energy : '—'}</Text>
                                            <Text
                                                style={[
                                                    styles.compareCellSecondary,
                                                    !card.isBaseline && delta !== null
                                                        ? { color: delta >= 0 ? '#059669' : '#dc2626' }
                                                        : undefined,
                                                ]}
                                            >
                                                {card.isBaseline
                                                    ? 'baseline'
                                                    : delta === null
                                                        ? 'not set'
                                                        : `${delta >= 0 ? '+' : ''}${delta} vs`}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.compareTableRow}>
                                <View style={styles.compareMetricCell}>
                                    <Text style={styles.compareMetricLabel}>Mood</Text>
                                </View>
                                {comparisonCards.map((card) => (
                                    <View key={`${card.key}-mood`} style={[styles.compareValueCell, card.isBaseline ? styles.compareBaselineValueCell : undefined]}>
                                        <Text style={styles.compareCellText}>{card.scenario ? card.scenario.mood : '—'}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.compareTableRow}>
                                <View style={styles.compareMetricCell}>
                                    <Text style={styles.compareMetricLabel}>Confidence</Text>
                                </View>
                                {comparisonCards.map((card) => {
                                    const scenario = card.scenario;
                                    const confidence: ConfidenceLevel | null = scenario ? scenario.confidence : null;
                                    const meta = confidence ? CONFIDENCE_META[confidence] : null;
                                    return (
                                        <View key={`${card.key}-confidence`} style={[styles.compareValueCell, card.isBaseline ? styles.compareBaselineValueCell : undefined]}>
                                            <Text style={[styles.compareCellText, meta ? { color: meta.color } : undefined]}>
                                                {meta ? meta.label : '—'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.compareTableRow}>
                                <View style={styles.compareMetricCell}>
                                    <Text style={styles.compareMetricLabel}>Avatar</Text>
                                </View>
                                {comparisonCards.map((card) => {
                                    const avatarMeta = card.scenario ? AVATAR_STATE_META[card.scenario.avatarState] : null;
                                    return (
                                        <View key={`${card.key}-avatar`} style={[styles.compareValueCell, card.isBaseline ? styles.compareBaselineValueCell : undefined]}>
                                            <Text style={styles.compareCellText}>
                                                {avatarMeta ? `${avatarMeta.label} ${avatarMeta.emoji}` : '—'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.compareTableRow}>
                                <View style={styles.compareMetricCell}>
                                    <Text style={styles.compareMetricLabel}>Sleep</Text>
                                </View>
                                {comparisonCards.map((card) => (
                                    <View key={`${card.key}-sleep`} style={[styles.compareValueCell, card.isBaseline ? styles.compareBaselineValueCell : undefined]}>
                                        <Text style={styles.compareCellText}>{card.scenario ? `${card.scenario.sleep.toFixed(1)}h` : '—'}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={[styles.compareTableRow, styles.compareTableRowLast]}>
                                <View style={styles.compareMetricCell}>
                                    <Text style={styles.compareMetricLabel}>Steps</Text>
                                </View>
                                {comparisonCards.map((card) => (
                                    <View key={`${card.key}-steps`} style={[styles.compareValueCell, card.isBaseline ? styles.compareBaselineValueCell : undefined]}>
                                        <Text style={styles.compareCellText}>{card.scenario ? card.scenario.steps.toLocaleString() : '—'}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Forecast Chart */}
                    <View style={styles.card}>
                        <View style={styles.forecastHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.iconWrap, { backgroundColor: '#f5f3ff' }]}><TrendingUp size={16} color="#7c3aed" /></View>
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
                                spacing={(screenWidth - 90) / 30} thickness={3} color="#7c3aed"
                                hideDataPoints hideRules={false} rulesType="solid" rulesColor="#f8fafc"
                                yAxisColor="#e2e8f0" xAxisColor="#e2e8f0"
                                yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }} xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}
                                maxValue={100} noOfSections={4} areaChart
                                startFillColor="#7c3aed" endFillColor="#f5f3ff" startOpacity={0.18} endOpacity={0.04}
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
    headerGrad: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 26,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.26)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    backText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    headerTitle: { fontSize: 25, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
    scroll: { padding: 16, paddingBottom: 80 },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 22,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#ede9fe',
    },
    avatarPreviewShell: {
        width: 154,
        height: 154,
        borderRadius: 77,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#fff',
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
    avatarFallbackText: {
        color: '#6d28d9',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        paddingHorizontal: 14,
    },
    moodBadge: {
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        marginTop: 12,
        marginBottom: 10,
    },
    moodText: { color: '#6d28d9', fontWeight: '800', fontSize: 15 },
    moodSubText: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginBottom: 8 },
    dataConfidenceInline: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
    whyPanel: {
        width: '100%',
        backgroundColor: '#f8f7ff',
        borderColor: '#ddd6fe',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    whyTitle: { color: '#5b21b6', fontSize: 12, fontWeight: '800', marginBottom: 5 },
    whyRule: { color: '#6d28d9', fontSize: 11, fontWeight: '700' },
    whyMatch: { color: '#4b5563', fontSize: 11, marginTop: 4, fontWeight: '600' },
    whyValues: { color: '#6b7280', fontSize: 11, marginTop: 4, fontWeight: '600' },
    narrativeText: {
        color: '#4b5563',
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 20,
        paddingHorizontal: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ede9fe',
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#312e81' },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    resetText: { color: '#6d28d9', fontWeight: '700', fontSize: 12 },
    controlGroup: { paddingVertical: 6 },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    controlLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlLabel: { fontWeight: '700', color: '#334155', fontSize: 14 },
    controlVal: { fontWeight: '800', fontSize: 20 },
    controlSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    guardrailPanel: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 10,
    },
    guardrailPanelHigh: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
    guardrailPanelMedium: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
    guardrailPanelLow: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    guardrailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    guardrailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    guardrailTitle: { color: '#312e81', fontSize: 12, fontWeight: '800' },
    confidenceBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    confidenceBadgeText: { fontSize: 10, fontWeight: '800' },
    dataConfidenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    dataConfidenceLabel: { fontSize: 11, color: '#4b5563', fontWeight: '700' },
    dataConfidenceValue: { fontSize: 11, fontWeight: '800' },
    dataConfidenceNote: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 8 },
    dataConfidenceNoteLow: { color: '#b91c1c' },
    guardrailWarnings: { gap: 4 },
    guardrailWarningText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
    guardrailSafeText: { fontSize: 11, color: '#065f46', fontWeight: '700' },
    guardrailLowText: { marginTop: 8, fontSize: 11, color: '#b91c1c', fontWeight: '800' },
    saveScenarioRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    saveScenarioBtn: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d8b4fe',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    saveScenarioBtnText: { color: '#6d28d9', fontSize: 12, fontWeight: '800' },
    compareHint: { color: '#6b7280', fontSize: 12, marginTop: -2, marginBottom: 12, lineHeight: 17 },
    compareTable: {
        borderWidth: 1,
        borderColor: '#e9e5ff',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    compareTableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#ede9fe', minHeight: 44 },
    compareTableHeaderRow: { borderTopWidth: 0, backgroundColor: '#f5f3ff' },
    compareTableRowLast: {},
    compareMetricCell: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 9,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ede9fe',
    },
    compareMetricHeaderCell: { backgroundColor: '#f5f3ff' },
    compareValueCell: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ede9fe',
    },
    compareBaselineValueCell: { backgroundColor: '#f5f3ff' },
    compareHeaderCell: {},
    compareHeaderText: { color: '#4c1d95', fontWeight: '800', fontSize: 11, textAlign: 'center' },
    compareHeaderSubText: { color: '#7c3aed', fontWeight: '700', fontSize: 10, textAlign: 'center', marginTop: 2 },
    compareMetricLabel: { color: '#475569', fontWeight: '700', fontSize: 12 },
    compareCellPrimary: { color: '#1f2937', fontWeight: '800', fontSize: 15, lineHeight: 18 },
    compareCellSecondary: { color: '#64748b', fontWeight: '600', fontSize: 10, marginTop: 2, textAlign: 'center' },
    compareCellText: { color: '#334155', fontWeight: '700', fontSize: 11, textAlign: 'center' },
    divider: { height: 1, backgroundColor: '#ede9fe', marginVertical: 8 },
    forecastHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    forecastDiff: { fontSize: 17, fontWeight: '800' },
    forecastSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
