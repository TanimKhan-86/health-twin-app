import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { MetricRow } from '../../components/ui/MetricRow';
import { ArrowLeft, Database, Server, Shield, HardDrive } from 'lucide-react-native';
import { useTheme } from '../../lib/design/useTheme';

const COLLECTIONS = ['users', 'healthentries', 'moodentries', 'streaks'];

export default function DatabaseViewerScreen({ navigation }: any) {
    const { colors, typography: typo, spacing, radii } = useTheme();

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: 12 }}>
                    <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                        <ArrowLeft size={24} color={colors.brand.primary} />
                    </Pressable>
                    <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                        Database
                    </Text>
                </View>

                {/* Status Card */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                    <Card padding="lg" style={{ alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.system.green + '15', alignItems: 'center', justifyContent: 'center' }}>
                            <Database size={28} color={colors.system.green} />
                        </View>
                        <Text style={{ fontSize: typo.title2.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                            MongoDB Atlas
                        </Text>
                        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: radii.full, backgroundColor: colors.system.green + '15' }}>
                            <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.system.green }}>
                                Connected
                            </Text>
                        </View>
                        <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, textAlign: 'center', lineHeight: 22 }}>
                            All data is stored securely in the cloud. No local database on this device.
                        </Text>
                    </Card>
                </View>

                {/* Info */}
                <SectionHeader title="Details" />
                <View style={{ paddingHorizontal: spacing.base }}>
                    <Card padding="none">
                        <MetricRow
                            icon={<Server size={16} color={colors.system.blue} />}
                            iconColor={colors.system.blue}
                            label="Provider"
                            value="MongoDB Atlas"
                        />
                        <MetricRow
                            icon={<Shield size={16} color={colors.system.green} />}
                            iconColor={colors.system.green}
                            label="Encryption"
                            value="TLS/SSL"
                        />
                        <MetricRow
                            icon={<HardDrive size={16} color={colors.system.purple} />}
                            iconColor={colors.system.purple}
                            label="Local Storage"
                            value="None"
                            showSeparator={false}
                        />
                    </Card>
                </View>

                {/* Collections */}
                <SectionHeader title="Collections" />
                <View style={{ paddingHorizontal: spacing.base }}>
                    <Card padding="md">
                        {COLLECTIONS.map((col, i) => (
                            <View key={col} style={{
                                flexDirection: 'row', alignItems: 'center', gap: 10,
                                paddingVertical: 10,
                                borderBottomWidth: i < COLLECTIONS.length - 1 ? 0.5 : 0,
                                borderBottomColor: colors.separator,
                            }}>
                                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.system.indigo + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Database size={14} color={colors.system.indigo} />
                                </View>
                                <Text style={{ fontSize: typo.body.fontSize, fontFamily: 'Inter-Regular', color: colors.text.primary }}>
                                    {col}
                                </Text>
                            </View>
                        ))}
                    </Card>
                </View>

                {/* Footer note */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                    <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary, textAlign: 'center' }}>
                        Use the Insights tab to view your stored health data.
                    </Text>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}
