import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft, Lock, Trophy } from 'lucide-react-native';
import { GamificationService } from '../../lib/gamification';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/design/useTheme';

export default function AchievementsScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [badges, setBadges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadBadges(); }, [user]);

    const loadBadges = async () => {
        try {
            const userId = user?.id ?? 'demo-user';
            await GamificationService.checkAchievements(userId);
            const data = await GamificationService.getBadgeProgress(userId);
            setBadges(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const unlocked = badges.filter(b => b.isUnlocked).length;

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: 12 }}>
                    <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                        <ArrowLeft size={24} color={colors.brand.primary} />
                    </Pressable>
                    <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                        Achievements
                    </Text>
                </View>

                {/* Stats */}
                <View style={{ flexDirection: 'row', paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.sm }}>
                    <Card padding="md" style={{ flex: 1, alignItems: 'center' }}>
                        <Trophy size={24} color={colors.system.orange} />
                        <Text style={{ fontSize: typo.title1.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>
                            {unlocked}
                        </Text>
                        <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>Unlocked</Text>
                    </Card>
                    <Card padding="md" style={{ flex: 1, alignItems: 'center' }}>
                        <Lock size={24} color={colors.gray[1]} />
                        <Text style={{ fontSize: typo.title1.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>
                            {badges.length}
                        </Text>
                        <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>Total</Text>
                    </Card>
                </View>

                {/* Badges */}
                <SectionHeader title="Badges" />

                {loading ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.base, gap: spacing.sm }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} width="48%" height={140} borderRadius={radii.md} style={{ marginBottom: 0 }} />
                        ))}
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.base, gap: spacing.sm }}>
                        {badges.map((badge) => (
                            <View key={badge.id} style={{ width: '48%' }}>
                                <Card padding="md" style={{
                                    alignItems: 'center',
                                    gap: 6,
                                    height: 140,
                                    justifyContent: 'center',
                                    opacity: badge.isUnlocked ? 1 : 0.5,
                                }}>
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: badge.isUnlocked ? colors.system.orange + '15' : colors.fill.tertiary,
                                    }}>
                                        {badge.isUnlocked ? (
                                            <Text style={{ fontSize: 24 }}>{badge.icon}</Text>
                                        ) : (
                                            <Lock size={20} color={colors.gray[1]} />
                                        )}
                                    </View>
                                    <Text style={{
                                        fontSize: typo.footnote.fontSize,
                                        fontFamily: 'Inter-SemiBold',
                                        fontWeight: '600',
                                        color: badge.isUnlocked ? colors.text.primary : colors.text.tertiary,
                                        textAlign: 'center',
                                    }}>
                                        {badge.name}
                                    </Text>
                                    <Text style={{
                                        fontSize: typo.caption2.fontSize,
                                        fontFamily: 'Inter-Regular',
                                        color: colors.text.tertiary,
                                        textAlign: 'center',
                                    }} numberOfLines={2}>
                                        {badge.description}
                                    </Text>
                                </Card>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </ScreenLayout>
    );
}
