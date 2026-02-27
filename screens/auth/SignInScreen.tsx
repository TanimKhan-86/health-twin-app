import React, { useState } from "react";
import {
    View, Text, TouchableOpacity,
    Keyboard, TouchableWithoutFeedback, Platform,
    StyleSheet, ActivityIndicator
} from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { CircuitBoard } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { TextInput } from "react-native";

export default function SignInScreen({ navigation }: any) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleLogin = async () => {
        setErrorMsg(null);
        if (!email || !password) {
            setErrorMsg("Please enter both email and password.");
            return;
        }
        setIsLoading(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const cleanPassword = password.trim();
            const user = await login(cleanEmail, cleanPassword);
            if (!user) {
                setErrorMsg("Invalid email or password.");
            }
        } catch {
            setErrorMsg("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const content = (
        <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoSection}>
                <View style={styles.logoWrap}>
                    <CircuitBoard size={36} color="#ffffff" />
                </View>
                <Text style={styles.appName}>HealthTwin AI</Text>
                <Text style={styles.tagline}>Your Digital Health Companion</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSubtitle}>Sign in to your account</Text>

                {errorMsg ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                ) : null}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#a78bfa"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#a78bfa"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.forgotWrap}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
                    <LinearGradient
                        colors={["#7c3aed", "#6d28d9"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.primaryBtn}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Sign In</Text>
                        }
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                    <View style={styles.divLine} />
                    <Text style={styles.divText}>Or continue with</Text>
                    <View style={styles.divLine} />
                </View>

                <TouchableOpacity style={styles.googleBtn}>
                    <Text style={styles.googleBtnText}>🌐  Continue with Google</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                    <Text style={styles.bottomLink}>Sign Up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenLayout gradientBackground>
            {Platform.OS === 'web' ? content : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>{content}</TouchableWithoutFeedback>
            )}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    logoSection: { alignItems: 'center', marginBottom: 32 },
    logoWrap: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: '#7c3aed',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45, shadowRadius: 16, elevation: 12,
        marginBottom: 16,
    },
    appName: { fontSize: 26, fontWeight: '800', color: '#3b0764', letterSpacing: 0.3 },
    tagline: { fontSize: 14, color: '#7c3aed', fontWeight: '500', marginTop: 4 },

    card: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 28,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
    cardTitle: { fontSize: 22, fontWeight: '800', color: '#1e1b4b', textAlign: 'center' },
    cardSubtitle: { fontSize: 13, color: '#7c3aed', textAlign: 'center', marginTop: 4, marginBottom: 24 },

    errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fca5a5' },
    errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', fontWeight: '500' },

    input: {
        backgroundColor: '#f5f3ff',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e9d5ff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1e1b4b',
        marginBottom: 12,
    },
    forgotWrap: { alignItems: 'flex-end', marginBottom: 20 },
    forgotText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },

    primaryBtn: {
        borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#6d28d9', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    },
    primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    divLine: { flex: 1, height: 1, backgroundColor: '#e9d5ff' },
    divText: { marginHorizontal: 12, color: '#a78bfa', fontSize: 12, fontWeight: '600' },

    googleBtn: {
        borderWidth: 1.5, borderColor: '#e9d5ff',
        borderRadius: 14, paddingVertical: 14,
        alignItems: 'center',
    },
    googleBtnText: { color: '#4c1d95', fontSize: 15, fontWeight: '600' },

    bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
    bottomText: { color: '#5b21b6', fontSize: 14 },
    bottomLink: { color: '#7c3aed', fontWeight: '800', fontSize: 14 },
});
