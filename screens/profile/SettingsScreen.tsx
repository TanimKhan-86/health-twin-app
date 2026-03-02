import React, { useState } from "react";
import { View, Text, ScrollView, Alert, Share, Platform, Image, Pressable } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { ListItem } from "../../components/ui/ListItem";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { useColorScheme } from "nativewind";
import {
    User, Bell, Moon, Download, Trash2, LogOut, Shield, Database, Sprout
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { seedDemoWeek } from "../../lib/api/auth";
import { useTheme } from "../../lib/design/useTheme";

export default function SettingsScreen({ navigation }: any) {
    const { user: authUser, logout } = useAuth();
    const { showToast } = useToast();
    const { colors, typography: typo, spacing } = useTheme();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const [isSeeding, setIsSeeding] = useState(false);
    const [notifications, setNotifications] = useState(true);

    const handleLogout = async () => {
        const doLogout = async () => { await logout(); };
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to sign out?')) doLogout();
        } else {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: doLogout },
            ]);
        }
    };

    const handleExportData = async () => {
        try {
            const exportObj = {
                user: { name: authUser?.name, email: authUser?.email, age: authUser?.age },
                exportedAt: new Date().toISOString(),
            };
            await Share.share({ message: JSON.stringify(exportObj, null, 2), title: 'HealthTwin Export' });
        } catch {
            showToast('Export failed', 'error');
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert("Delete Account", "This will permanently delete your profile.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => { await logout(); showToast('Account deleted', 'info'); } },
        ]);
    };

    const handleSeedDemo = async () => {
        setIsSeeding(true);
        try {
            const ok = await seedDemoWeek();
            if (ok) showToast('7 days seeded! Check Weekly Summary.', 'success');
            else showToast('Seed failed', 'error');
        } catch { showToast('Network error', 'error'); } finally { setIsSeeding(false); }
    };

    const initials = authUser?.name
        ? authUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <ScreenLayout>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.sm }}>
                    <Text style={{
                        fontSize: typo.largeTitle.fontSize,
                        lineHeight: typo.largeTitle.lineHeight,
                        fontFamily: 'Inter-Bold',
                        fontWeight: '700',
                        color: colors.text.primary,
                    }}>
                        Profile
                    </Text>
                </View>

                {/* Profile Card */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base }}>
                    <Card padding="md">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: colors.brand.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}>
                                {authUser?.profileImage && (authUser.profileImage.startsWith('http') || authUser.profileImage.startsWith('data:')) ? (
                                    <Image source={{ uri: authUser.profileImage }} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" />
                                ) : (
                                    <Text style={{ fontSize: typo.title3.fontSize, fontFamily: 'Inter-Bold', color: colors.brand.primary }}>{initials}</Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: typo.title3.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                    {authUser?.name ?? '—'}
                                </Text>
                                <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, marginTop: 2 }}>
                                    {authUser?.email ?? '—'}
                                </Text>
                                {authUser?.age && (
                                    <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary, marginTop: 2 }}>
                                        {authUser.age}y · {authUser.heightCm}cm · {authUser.weightKg}kg
                                    </Text>
                                )}
                            </View>
                        </View>
                    </Card>
                </View>

                {/* Account */}
                <SectionHeader title="Account" />
                <View style={{ paddingHorizontal: spacing.base }}>
                    <Card padding="none">
                        <ListItem
                            icon={<User size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.blue}
                            title="Account ID"
                            value={authUser?.id ? `${authUser.id.substring(0, 8)}...` : '—'}
                            showChevron={false}
                        />
                        <ListItem
                            icon={<Shield size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.green}
                            title="Email"
                            value={authUser?.email ?? '—'}
                            showChevron={false}
                            showSeparator={false}
                        />
                    </Card>
                </View>

                {/* Preferences */}
                <SectionHeader title="Preferences" />
                <View style={{ paddingHorizontal: spacing.base }}>
                    <Card padding="none">
                        <ListItem
                            icon={<Bell size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.red}
                            title="Notifications"
                            showChevron={false}
                            switchValue={notifications}
                            onSwitchChange={(val) => {
                                setNotifications(val);
                                showToast(val ? 'Notifications on' : 'Notifications off', val ? 'success' : 'info');
                            }}
                        />
                        <ListItem
                            icon={<Moon size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.indigo}
                            title="Dark Mode"
                            showChevron={false}
                            showSeparator={false}
                            switchValue={colorScheme === 'dark'}
                            onSwitchChange={toggleColorScheme}
                        />
                    </Card>
                </View>

                {/* Data & Privacy */}
                <SectionHeader title="Data & Privacy" />
                <View style={{ paddingHorizontal: spacing.base }}>
                    <Card padding="none">
                        <ListItem
                            icon={<Download size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.blue}
                            title="Export Data"
                            onPress={handleExportData}
                        />
                        <ListItem
                            icon={<Database size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.purple}
                            title="View Database"
                            subtitle="Debug tool"
                            onPress={() => navigation.navigate("DatabaseViewer")}
                        />
                        <ListItem
                            icon={<Sprout size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.green}
                            title={isSeeding ? "Seeding..." : "Seed Demo Data"}
                            subtitle="Add 7 days of sample data"
                            onPress={handleSeedDemo}
                        />
                        <ListItem
                            icon={<Trash2 size={16} color="#FFFFFF" />}
                            iconBackgroundColor={colors.system.red}
                            title="Delete Account"
                            destructive
                            showChevron={false}
                            showSeparator={false}
                            onPress={handleDeleteAccount}
                        />
                    </Card>
                </View>

                {/* Sign Out */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.xl }}>
                    <Button
                        variant="destructive"
                        label="Sign Out"
                        icon={<LogOut size={18} color="#FFFFFF" />}
                        fullWidth
                        onPress={handleLogout}
                    />
                </View>

                {/* Version */}
                <Text style={{
                    textAlign: 'center',
                    fontSize: typo.caption1.fontSize,
                    fontFamily: 'Inter-Regular',
                    color: colors.text.quaternary,
                    marginTop: spacing['2xl'],
                }}>
                    HealthTwin v1.0.0
                </Text>
            </ScrollView>
        </ScreenLayout>
    );
}
