import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { ArrowLeft, Lock, Trophy } from 'lucide-react-native';
import { GamificationService } from '../../lib/gamification';
import { UserService } from '../../lib/services'; // Assuming we have a way to get ID, or use demo

export default function AchievementsScreen({ navigation }: any) {
    const [badges, setBadges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBadges();
    }, []);

    const loadBadges = async () => {
        try {
            // Demo User ID for now, consistent with other screens
            const userId = 'demo-user-123';
            // Force check achievements first to ensure latest state
            await GamificationService.checkAchievements(userId);
            const data = await GamificationService.getBadgeProgress(userId);
            setBadges(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
                        <ArrowLeft color="white" size={20} />
                        <Text className="text-white font-bold ml-2">Back</Text>
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Achievements</Text>
                        <Text className="text-teal-200 text-xs">Your health milestones</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    {/* Stats Summary */}
                    <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
                        <CardContent className="flex-row justify-around py-4">
                            <View className="items-center">
                                <Text className="text-3xl font-bold text-white">{badges.filter(b => b.isUnlocked).length}</Text>
                                <Text className="text-teal-100 text-xs">Unlocked</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-3xl font-bold text-white">{badges.length}</Text>
                                <Text className="text-teal-100 text-xs">Total Available</Text>
                            </View>
                        </CardContent>
                    </Card>

                    {/* Badges Grid */}
                    <View className="flex-row flex-wrap justify-between">
                        {badges.map((badge) => (
                            <View key={badge.id} className="w-[48%] mb-4">
                                <Card className={`h-40 ${badge.isUnlocked ? 'bg-white/95' : 'bg-white/50 border-white/10'}`}>
                                    <CardContent className="h-full items-center justify-center p-3 text-center">
                                        <View className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${badge.isUnlocked ? 'bg-amber-100' : 'bg-slate-200'}`}>
                                            {badge.isUnlocked ? (
                                                <Text className="text-2xl">{badge.icon}</Text>
                                            ) : (
                                                <Lock size={20} color="#94a3b8" />
                                            )}
                                        </View>
                                        <Text className={`font-bold text-sm mb-1 ${badge.isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>
                                            {badge.name}
                                        </Text>
                                        <Text className="text-xs text-slate-400 text-center" numberOfLines={2}>
                                            {badge.description}
                                        </Text>
                                    </CardContent>
                                </Card>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
