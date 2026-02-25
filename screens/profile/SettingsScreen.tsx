import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Share, Platform, Image } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { useColorScheme } from "nativewind";
import {
    User, Bell, Moon, Download, Trash2, LogOut, ChevronRight, Shield, Database
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { seedDemoWeek } from "../../lib/api/auth";

interface SettingItemProps {
    icon: React.ReactNode;
    label: string;
    onPress?: () => void;
    value?: string | boolean;
    isDestructive?: boolean;
    isSwitch?: boolean;
    onSwitchChange?: (val: boolean) => void;
}

function SettingItem({ icon, label, onPress, value, isDestructive, isSwitch, onSwitchChange }: SettingItemProps) {
    return (
        <TouchableOpacity
            onPress={isSwitch ? undefined : onPress}
            className="flex-row items-center justify-between p-4 bg-white/80 border-b border-slate-100"
            disabled={isSwitch}
        >
            <View className="flex-row items-center space-x-3">
                <View className={`p-2 rounded-full ${isDestructive ? 'bg-red-100' : 'bg-slate-100'}`}>
                    {icon}
                </View>
                <Text className={`font-medium text-base ${isDestructive ? 'text-red-500' : 'text-slate-700'}`}>
                    {label}
                </Text>
            </View>

            <View>
                {isSwitch ? (
                    <Switch
                        value={value as boolean}
                        onValueChange={onSwitchChange}
                        trackColor={{ false: "#cbd5e1", true: "#8b5cf6" }}
                        thumbColor={"#ffffff"}
                    />
                ) : (
                    <View className="flex-row items-center space-x-2">
                        {value && <Text className="text-slate-400 text-sm">{value as string}</Text>}
                        {!isDestructive && <ChevronRight size={20} color="#cbd5e1" />}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function SettingsScreen({ navigation }: any) {
    const { user: authUser, logout } = useAuth();
    const { showToast } = useToast();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const [isLoading, setIsLoading] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [notifications, setNotifications] = useState(true);

    // ─── Handlers ─────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        const doLogout = async () => {
            await logout(); // Clears JWT + state; RootNavigator auto-routes to SignIn
        };

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
        setIsLoading(true);
        try {
            const exportObj = {
                user: {
                    name: authUser?.name,
                    email: authUser?.email,
                    age: authUser?.age,
                    heightCm: authUser?.heightCm,
                    weightKg: authUser?.weightKg,
                },
                exportedAt: new Date().toISOString(),
                note: 'Full health history export coming soon',
            };
            await Share.share({
                message: JSON.stringify(exportObj, null, 2),
                title: 'HealthTwin Data Export',
            });
        } catch {
            showToast('Export failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            "Delete Account",
            "This will permanently delete your profile. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        showToast('Account deleted', 'info');
                    }
                }
            ]
        );
    };

    const handleSeedDemo = async () => {
        setIsSeeding(true);
        try {
            const ok = await seedDemoWeek();
            if (ok) showToast('🌱 7 days seeded! Check Weekly Summary & Achievements.', 'success');
            else showToast('❌ Seed failed', 'error');
        } catch {
            showToast('❌ Network error', 'error');
        } finally {
            setIsSeeding(false);
        }
    };

    // ─── Derived display values ───────────────────────────────────────────────────

    const initials = authUser?.name
        ? authUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <ScreenLayout gradientBackground>
            {/* Header */}
            <View className="p-4 pt-2 flex-row items-center space-x-4">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                >
                    <ChevronRight style={{ transform: [{ rotate: '180deg' }] }} color="white" size={24} />
                </TouchableOpacity>
                <View>
                    <Text className="text-white text-xl font-bold">Settings</Text>
                    <Text className="text-teal-200 text-xs">Manage your preferences</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Profile Card */}
                <View className="bg-white/10 rounded-2xl p-4 mb-6 flex-row items-center space-x-4">
                    <View className="h-16 w-16 rounded-full bg-white/20 items-center justify-center overflow-hidden border-2 border-white/30">
                        {authUser?.profileImage ? (
                            <Image
                                source={{ uri: authUser.profileImage }}
                                style={{ width: 64, height: 64 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text className="text-white font-bold text-xl">{initials}</Text>
                        )}
                    </View>
                    <View>
                        <Text className="text-white font-bold text-lg">{authUser?.name ?? '—'}</Text>
                        <Text className="text-teal-200 text-sm">{authUser?.email ?? '—'}</Text>
                        {authUser?.age && (
                            <Text className="text-white/60 text-xs mt-1">
                                {authUser.age}y · {authUser.heightCm}cm · {authUser.weightKg}kg
                            </Text>
                        )}
                    </View>
                </View>

                {/* Profile Settings */}
                <Text className="text-white/80 font-bold mb-2 ml-2 uppercase text-xs">Account</Text>
                <View className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <SettingItem
                        icon={<User size={20} color="#64748b" />}
                        label="Account ID"
                        value={authUser?.id ? `${authUser.id.substring(0, 12)}...` : '—'}
                        onPress={() => { }}
                    />
                    <SettingItem
                        icon={<Shield size={20} color="#64748b" />}
                        label="Email"
                        value={authUser?.email ?? '—'}
                        onPress={() => { }}
                    />
                </View>

                {/* Preferences */}
                <Text className="text-white/80 font-bold mb-2 ml-2 uppercase text-xs">Preferences</Text>
                <View className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <SettingItem
                        icon={<Bell size={20} color="#64748b" />}
                        label="Notifications"
                        isSwitch
                        value={notifications}
                        onSwitchChange={(val) => {
                            setNotifications(val);
                            showToast(val ? 'Notifications on' : 'Notifications off', val ? 'success' : 'info');
                        }}
                    />
                    <SettingItem
                        icon={<Moon size={20} color="#64748b" />}
                        label="Dark Mode"
                        isSwitch
                        value={colorScheme === 'dark'}
                        onSwitchChange={toggleColorScheme}
                    />
                </View>

                {/* Data & Privacy */}
                <Text className="text-white/80 font-bold mb-2 ml-2 uppercase text-xs">Data & Privacy</Text>
                <View className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <SettingItem
                        icon={<Download size={20} color="#3b82f6" />}
                        label="Export Data (JSON)"
                        onPress={handleExportData}
                    />
                    <SettingItem
                        icon={<Database size={20} color="#8b5cf6" />}
                        label="View Database (Debug)"
                        onPress={() => navigation.navigate("DatabaseViewer")}
                    />
                    <SettingItem
                        icon={<Database size={20} color="#10b981" />}
                        label={isSeeding ? "Seeding 7 Days... ⏳" : "🌱 Seed 7 Days (Demo)"}
                        onPress={handleSeedDemo}
                    />
                    <SettingItem
                        icon={<Trash2 size={20} color="#ef4444" />}
                        label="Delete Account"
                        isDestructive
                        onPress={handleDeleteAccount}
                    />
                </View>


                {/* Sign Out */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/20 space-x-2"
                >
                    <LogOut size={20} color="white" />
                    <Text className="text-white font-bold text-lg ml-2">Sign Out</Text>
                </TouchableOpacity>

                <Text className="text-center text-white/40 text-xs mt-8">
                    HealthTwin AI v1.0.0 · MongoDB Atlas
                </Text>
            </ScrollView>
        </ScreenLayout>
    );
}
