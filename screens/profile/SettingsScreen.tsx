import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Share, Platform, Image, StyleSheet } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { useToast } from "../../components/ui/Toast";
import { User, Bell, Download, Trash2, LogOut, ChevronRight, Shield, Database, ArrowLeft } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { seedDemoWeek } from "../../lib/api/auth";
import { LinearGradient } from "expo-linear-gradient";

function SettingRow({ icon, iconBg, label, sub, onPress, isDestructive, rightEl }: {
    icon: React.ReactNode; iconBg: string; label: string; sub?: string;
    onPress?: () => void; isDestructive?: boolean; rightEl?: React.ReactNode;
}) {
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, isDestructive && { color: '#ef4444' }]}>{label}</Text>
                {sub && <Text style={styles.rowSub}>{sub}</Text>}
            </View>
            {rightEl || (!isDestructive && <ChevronRight size={18} color="#d1d5db" />)}
        </TouchableOpacity>
    );
}

export default function SettingsScreen({ navigation }: any) {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [notifications, setNotifications] = useState(true);

    const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

    const handleLogout = () => {
        const doLogout = () => logout();
        if (Platform.OS === 'web') { if (window.confirm('Sign out?')) doLogout(); }
        else Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: doLogout }]);
    };

    const handleSeedDemo = async () => {
        setIsSeeding(true);
        try {
            const ok = await seedDemoWeek();
            if (ok) showToast('🌱 7 days seeded! Check Weekly Summary & Achievements.', 'success');
            else showToast('❌ Seed failed — is the server running?', 'error');
        } catch { showToast('❌ Network error', 'error'); }
        finally { setIsSeeding(false); }
    };

    const handleExport = async () => {
        await Share.share({ message: JSON.stringify({ user: { name: user?.name, email: user?.email }, exportedAt: new Date().toISOString() }, null, 2), title: 'HealthTwin Export' });
    };

    return (
        <ScreenLayout gradientBackground>
            {/* Gradient Header */}
            <LinearGradient colors={["#7c3aed", "#6d28d9"]} style={styles.headerGrad}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="white" size={18} />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <Text style={styles.headerSub}>Manage your preferences</Text>
            </LinearGradient>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                        {user?.profileImage
                            ? <Image source={{ uri: user.profileImage }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                            : <Text style={styles.avatarInitials}>{initials}</Text>}
                    </View>
                    <View>
                        <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
                        <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
                        {user?.age && <Text style={styles.profileMeta}>{user.age}y · {user.heightCm}cm · {user.weightKg}kg</Text>}
                    </View>
                </View>

                <Text style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.section}>
                    <SettingRow icon={<User size={18} color="#7c3aed" />} iconBg="#f5f3ff" label="Account ID" sub={user?.id ? `${user.id.substring(0, 16)}...` : '—'} />
                    <View style={styles.divider} />
                    <SettingRow icon={<Shield size={18} color="#6366f1" />} iconBg="#eef2ff" label="Email" sub={user?.email ?? '—'} />
                </View>

                <Text style={styles.sectionLabel}>PREFERENCES</Text>
                <View style={styles.section}>
                    <SettingRow
                        icon={<Bell size={18} color="#f59e0b" />} iconBg="#fffbeb" label="Push Notifications"
                        rightEl={<Switch value={notifications} onValueChange={v => { setNotifications(v); showToast(v ? 'Notifications on' : 'Notifications off', v ? 'success' : 'info'); }} trackColor={{ false: '#e5e7eb', true: '#7c3aed' }} thumbColor="#fff" />}
                    />
                </View>

                <Text style={styles.sectionLabel}>DATA & DEMO</Text>
                <View style={styles.section}>
                    <SettingRow icon={<Database size={18} color="#10b981" />} iconBg="#ecfdf5"
                        label={isSeeding ? "Seeding..." : "Seed 7 Days Demo"} sub="Populate with sample health data"
                        onPress={isSeeding ? undefined : handleSeedDemo} />
                    <View style={styles.divider} />
                    <SettingRow icon={<Download size={18} color="#3b82f6" />} iconBg="#eff6ff"
                        label="Export Data (JSON)" sub="Share your health records" onPress={handleExport} />
                    <View style={styles.divider} />
                    <SettingRow icon={<Database size={18} color="#8b5cf6" />} iconBg="#f5f3ff"
                        label="Database Viewer" sub="Debug view" onPress={() => navigation.navigate("DatabaseViewer")} />
                </View>

                <Text style={styles.sectionLabel}>DANGER ZONE</Text>
                <View style={styles.section}>
                    <SettingRow icon={<Trash2 size={18} color="#ef4444" />} iconBg="#fef2f2"
                        label="Delete Account" isDestructive sub="This cannot be undone"
                        onPress={() => Alert.alert("Delete Account", "Permanently delete your profile?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: async () => { await logout(); showToast('Account deleted', 'info'); } }
                        ])} />
                </View>

                {/* Sign Out */}
                <TouchableOpacity onPress={handleLogout} activeOpacity={0.85}>
                    <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.logoutBtn}>
                        <LogOut size={18} color="white" />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.footer}>HealthTwin AI v1.0.0 · MongoDB Atlas</Text>
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    headerGrad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16 },
    backText: { color: '#fff', fontWeight: '700' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

    scroll: { padding: 16, paddingTop: 8, paddingBottom: 60 },

    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#e9d5ff' },
    avatarInitials: { color: '#fff', fontWeight: '800', fontSize: 22 },
    profileName: { fontSize: 17, fontWeight: '800', color: '#1e1b4b' },
    profileEmail: { fontSize: 13, color: '#7c3aed', marginTop: 2 },
    profileMeta: { fontSize: 11, color: '#9ca3af', marginTop: 4 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', marginLeft: 4, marginBottom: 8, marginTop: 8, letterSpacing: 0.8 },
    section: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, overflow: 'hidden', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '600', color: '#1e1b4b' },
    rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 70 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, paddingVertical: 16, marginTop: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
    logoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    footer: { textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 24 },
});
