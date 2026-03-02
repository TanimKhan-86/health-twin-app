import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { HealthScoreRing } from "../../components/ui/HealthScoreRing";
import { ListItem } from "../../components/ui/ListItem";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { Skeleton } from "../../components/ui/Skeleton";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { Activity, Heart, Moon, Zap, Sparkles, Trophy, Calendar, Flame } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { getStreak, getTodayHealth } from "../../lib/api/auth";
import { useTheme, getScoreColor } from "../../lib/design/useTheme";

function MetricCard({ icon, label, value, subValue, color, onPress }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue: string;
    color: string;
    onPress?: () => void;
}) {
    const { colors, typography: typo, radii, shadows } = useTheme();

    return (
        <AnimatedPressable onPress={onPress} style={{ flex: 1 }}>
            <Card padding="md" style={{ alignItems: 'center', gap: 6 }}>
                <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: color + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {icon}
                </View>
                <Text style={{
                    fontSize: typo.title2.fontSize,
                    fontFamily: 'Inter-Bold',
                    fontWeight: '700',
                    color: colors.text.primary,
                }}>
                    {value}
                </Text>
                <Text style={{
                    fontSize: typo.caption1.fontSize,
                    fontFamily: 'Inter-Medium',
                    color: colors.text.secondary,
                }}>
                    {label}
                </Text>
                <Text style={{
                    fontSize: typo.caption2.fontSize,
                    fontFamily: 'Inter-SemiBold',
                    color,
                }}>
                    {subValue}
                </Text>
            </Card>
        </AnimatedPressable>
    );
}

export default function DashboardScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, typography: typo, spacing, mode } = useTheme();
    const [streak, setStreak] = useState(0);
    const [todayHealth, setTodayHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [])
    );

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const [streakData, health] = await Promise.all([
                getStreak(),
                getTodayHealth(),
            ]);
            setStreak(streakData?.currentStreak ?? 0);
            setTodayHealth(health);
        } catch (e) {
            console.warn('Dashboard load error:', e);
        } finally {
            setLoading(false);
        }
    };

    const firstName = user?.name?.split(' ')[0] || 'there';
    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    // Calculate overall health score from available data
    const energyScore = todayHealth?.energyScore ?? 0;
    const sleepScore = todayHealth?.sleepHours ? Math.min((todayHealth.sleepHours / 8) * 100, 100) : 0;
    const stepsScore = todayHealth?.steps ? Math.min((todayHealth.steps / 10000) * 100, 100) : 0;
    const overallScore = todayHealth ? Math.round((energyScore + sleepScore + stepsScore) / 3) : 0;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <ScreenLayout>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: spacing.base,
                    paddingTop: spacing.sm,
                    paddingBottom: spacing.base,
                }}>
                    <View>
                        <Text style={{
                            fontSize: typo.largeTitle.fontSize,
                            lineHeight: typo.largeTitle.lineHeight,
                            fontFamily: 'Inter-Bold',
                            fontWeight: '700',
                            color: colors.text.primary,
                        }}>
                            Today
                        </Text>
                        <Text style={{
                            fontSize: typo.subheadline.fontSize,
                            fontFamily: 'Inter-Regular',
                            color: colors.text.secondary,
                            marginTop: 2,
                        }}>
                            {getGreeting()}, {firstName}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {/* Streak badge */}
                        {streak > 0 && (
                            <Pressable
                                onPress={() => navigation.navigate('ProfileTab', { screen: 'Achievements' })}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 9999,
                                    backgroundColor: colors.system.orange + '15',
                                }}
                            >
                                <Flame size={16} color={colors.system.orange} />
                                <Text style={{
                                    fontSize: typo.footnote.fontSize,
                                    fontFamily: 'Inter-Bold',
                                    color: colors.system.orange,
                                }}>
                                    {streak}
                                </Text>
                            </Pressable>
                        )}

                        {/* Profile avatar */}
                        <Pressable
                            onPress={() => navigation.navigate('ProfileTab', { screen: 'Settings' })}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: colors.system.blue + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            {user?.profileImage && (user.profileImage.startsWith('http') || user.profileImage.startsWith('data:')) ? (
                                <Image
                                    source={{ uri: user.profileImage }}
                                    style={{ width: 36, height: 36, borderRadius: 18 }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={{
                                    fontSize: typo.footnote.fontSize,
                                    fontFamily: 'Inter-Bold',
                                    color: colors.system.blue,
                                }}>
                                    {initials}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Health Score Ring with Avatar */}
                <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                    {loading ? (
                        <Skeleton width={180} height={180} borderRadius={90} />
                    ) : (
                        <HealthScoreRing
                            score={overallScore}
                            size={180}
                            strokeWidth={10}
                            label={overallScore > 0 ? undefined : 'No data'}
                        >
                            <DigitalTwinAvatar
                                size={150}
                                fallbackImage={
                                    user?.profileImage && (user.profileImage.startsWith('http') || user.profileImage.startsWith('data:'))
                                        ? user.profileImage
                                        : undefined
                                }
                            />
                        </HealthScoreRing>
                    )}
                    <Text style={{
                        fontSize: typo.subheadline.fontSize,
                        fontFamily: 'Inter-Regular',
                        color: colors.text.secondary,
                        marginTop: spacing.sm,
                        textAlign: 'center',
                    }}>
                        {overallScore > 0
                            ? `Score: ${overallScore} — ${overallScore > 70 ? 'Great' : overallScore > 40 ? 'Moderate' : 'Low'} today`
                            : 'Log your vitals to see your score'}
                    </Text>
                </View>

                {/* Metrics Grid */}
                <SectionHeader title="Health Metrics" />
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    paddingHorizontal: spacing.base,
                    gap: spacing.sm,
                }}>
                    <View style={{ width: '48%', flexGrow: 1 }}>
                        <MetricCard
                            icon={<Heart color={colors.health.heartRate} size={18} />}
                            label="Heart Rate"
                            value={todayHealth?.heartRate != null ? `${todayHealth.heartRate}` : '—'}
                            subValue={todayHealth?.heartRate != null ? (todayHealth.heartRate <= 100 ? 'Normal' : 'Elevated') : 'Log today'}
                            color={colors.health.heartRate}
                        />
                    </View>
                    <View style={{ width: '48%', flexGrow: 1 }}>
                        <MetricCard
                            icon={<Activity color={colors.health.activity} size={18} />}
                            label="Steps"
                            value={todayHealth?.steps != null ? todayHealth.steps.toLocaleString() : '—'}
                            subValue={todayHealth?.steps != null ? (todayHealth.steps >= 8000 ? 'On track' : 'Keep going') : 'Log today'}
                            color={colors.health.activity}
                        />
                    </View>
                    <View style={{ width: '48%', flexGrow: 1 }}>
                        <MetricCard
                            icon={<Moon color={colors.health.sleep} size={18} />}
                            label="Sleep"
                            value={todayHealth?.sleepHours != null ? `${todayHealth.sleepHours}h` : '—'}
                            subValue={todayHealth?.sleepHours != null ? (todayHealth.sleepHours >= 7 ? 'Well rested' : 'Need more') : 'Log today'}
                            color={colors.health.sleep}
                        />
                    </View>
                    <View style={{ width: '48%', flexGrow: 1 }}>
                        <MetricCard
                            icon={<Zap color={colors.health.energy} size={18} />}
                            label="Energy"
                            value={todayHealth?.energyScore != null ? `${Math.round(todayHealth.energyScore)}` : '—'}
                            subValue={todayHealth?.energyScore != null ? (todayHealth.energyScore >= 70 ? 'High' : 'Low') : 'Log today'}
                            color={colors.health.energy}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <SectionHeader title="Quick Actions" />
                <View style={{ paddingHorizontal: spacing.base }}>
                    <Card padding="none">
                        <ListItem
                            icon={<Activity size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.health.activity}
                            title="Log Daily Vitals"
                            subtitle="Track your health data"
                            onPress={() => navigation.navigate("DataEntry")}
                        />
                        <ListItem
                            icon={<Sparkles size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.indigo}
                            title="What-If Scenarios"
                            subtitle="AI-powered predictions"
                            onPress={() => navigation.navigate("WhatIf")}
                        />
                        <ListItem
                            icon={<Trophy size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.orange}
                            title="Achievements"
                            subtitle={streak > 0 ? `${streak} day streak` : 'Start your streak'}
                            onPress={() => navigation.navigate('ProfileTab', { screen: 'Achievements' })}
                        />
                        <ListItem
                            icon={<Calendar size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.green}
                            title="Weekly Summary"
                            subtitle="Your health report"
                            showSeparator={false}
                            onPress={() => navigation.navigate('InsightsTab', { screen: 'WeeklySummary' })}
                        />
                    </Card>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}
