import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Share, Platform } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import {
    User, Settings, Bell, Moon, Download, Trash2, LogOut, ChevronRight, Shield, Database
} from "lucide-react-native";
import { UserService, HealthService, MoodService, AchievementService } from "../../lib/services";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from "@react-navigation/native";

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
            className="flex-row items-center justify-between p-4 bg-white/80 border-b border-slate-100 first:rounded-t-2xl last:rounded-b-2xl last:border-0"
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
                        {value && <Text className="text-slate-400 text-sm">{value}</Text>}
                        {!isDestructive && <ChevronRight size={20} color="#cbd5e1" />}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

import { useColorScheme } from "nativewind";

// ...

export default function SettingsScreen({ navigation }: any) {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    // NativeWind Hook
    const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();

    // Preferences (Demo)
    const [notifications, setNotifications] = useState(true);
    // const [darkMode, setDarkMode] = useState(false); // Removed manual state

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userId = await AsyncStorage.getItem('USER_ID');
        if (userId) {
            const u = await UserService.getUser(userId);
            setUser(u);
        }
    };

    const handleExportData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Aggregate all data
            const health = await HealthService.getRecentEntries(user.user_id, 30);
            const moods = await MoodService.getRecentMoods(user.user_id, 30);
            const achievements = await AchievementService.getAchievements(user.user_id);

            const exportObj = {
                user: user,
                health_entries: health,
                mood_entries: moods,
                achievements: achievements,
                exported_at: new Date().toISOString(),
                app_version: "1.0.0"
            };

            const jsonString = JSON.stringify(exportObj, null, 2);

            await Share.share({
                message: jsonString,
                title: "HealthTwin Data Export"
            });

        } catch (error) {
            Alert.alert("Error", "Failed to export data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.removeItem('USER_ID');
                        // Reset navigation stack
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: "SignIn" }],
                            })
                        );
                    }
                }
            ]
        );
    };

    const handleResetToday = async () => {
        Alert.alert(
            "Reset Today",
            "Clear data for today only? This allows you to test the Daily Log screen again.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (user?.user_id) {
                                const db = (await import('../../lib/database')).default.getDB();
                                const today = new Date().toISOString().split('T')[0];
                                // Delete today's entries
                                await db.runAsync('DELETE FROM health_entries WHERE user_id = ? AND date = ?', [user.user_id, today]);
                                await db.runAsync('DELETE FROM moods WHERE user_id = ? AND date = ?', [user.user_id, today]);

                                showToast("Data cleared. Restarting...", "success");
                                // Force reload or navigate
                                navigation.dispatch(
                                    CommonActions.reset({ index: 0, routes: [{ name: "DailyLog" }] })
                                );
                            }
                        } catch (e) {
                            showToast("Error resetting data", "error");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            "Delete Account",
            "This will permanently delete your profile and all recorded data. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (user?.user_id) {
                                await UserService.deleteUser(user.user_id);
                                await AsyncStorage.removeItem('USER_ID');
                                navigation.dispatch(
                                    CommonActions.reset({
                                        index: 0,
                                        routes: [{ name: "SignUp" }],
                                    })
                                );
                            }
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete account.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScreenLayout gradientBackground>
            {/* Header */}
            <View className="p-4 pt-2 flex-row items-center space-x-4">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                    <ChevronRight className="rotate-180" color="white" size={24} />
                    {/* Using ChevronRight rotated as back arrow or just ArrowLeft if imported */}
                </TouchableOpacity>
                <View>
                    <Text className="text-white text-xl font-bold">Settings</Text>
                    <Text className="text-teal-200 text-xs">Manage your preferences</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Profile Section */}
                <Text className="text-white/80 font-bold mb-2 ml-2 uppercase text-xs">Profile</Text>
                <View className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <SettingItem
                        icon={<User size={20} color="#64748b" />}
                        label="Name"
                        value={user?.name || "Loading..."}
                        onPress={() => console.log("Edit Name")}
                    />
                    <SettingItem
                        icon={<Shield size={20} color="#64748b" />}
                        label="User ID"
                        value={user?.user_id ? `${user.user_id.substring(0, 8)}...` : "..."}
                        onPress={() => { }}
                    />
                </View>

                {/* Preferences Section */}
                <Text className="text-white/80 font-bold mb-2 ml-2 uppercase text-xs">Preferences</Text>
                <View className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <SettingItem
                        icon={<Bell size={20} color="#64748b" />}
                        label="Notifications"
                        isSwitch
                        value={notifications}
                        onSwitchChange={(val: boolean) => {
                            setNotifications(val);
                            showToast(
                                val ? "Notifications turned on" : "Notifications turned off",
                                val ? "success" : "info"
                            );
                        }}
                    />
                    <SettingItem
                        icon={<Moon size={20} color="#64748b" />}
                        label="Dark Mode"
                        isSwitch
                        value={colorScheme === "dark"}
                        onSwitchChange={toggleColorScheme}
                    />
                    <Text className="text-xs text-slate-400 text-center mt-2">
                        Debug: Scheme is {colorScheme}
                    </Text>
                </View>

                {/* Data Section */}
                <Text className="text-white/80 font-bold mb-2 ml-2 uppercase text-xs">Data & Privacy</Text>
                <View className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <SettingItem
                        icon={<Download size={20} color="#3b82f6" />}
                        label="Export Data (JSON)"
                        onPress={handleExportData}
                    />
                    <SettingItem
                        icon={<Settings size={20} color="#f59e0b" />}
                        label="Reset Today's Data (Debug)"
                        onPress={handleResetToday}
                    />
                    <SettingItem
                        icon={<Database size={20} color="#8b5cf6" />}
                        label="View Database (Debug)"
                        onPress={() => navigation.navigate("DatabaseViewer")}
                    />
                    <SettingItem
                        icon={<Trash2 size={20} color="#ef4444" />}
                        label="Delete Account"
                        isDestructive
                        onPress={handleDeleteAccount}
                    />
                </View>

                {/* Logout */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/20 space-x-2"
                >
                    <LogOut size={20} color="white" />
                    <Text className="text-white font-bold text-lg">Sign Out</Text>
                </TouchableOpacity>

                <Text className="text-center text-white/40 text-xs mt-8">
                    HealthTwin AI v1.0.0
                </Text>

            </ScrollView>
        </ScreenLayout>
    );
}
