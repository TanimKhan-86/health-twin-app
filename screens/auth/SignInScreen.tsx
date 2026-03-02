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
import type { AppScreenProps } from "../../lib/navigation/types";

export default function SignInScreen({ navigation }: AppScreenProps<'SignIn'>) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const normalizedEmail = email.trim().toLowerCase();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const passwordValid = password.length >= 6;
    const canSubmit = emailValid && passwordValid && !isLoading;

    const handleLogin = async () => {
        setErrorMsg(null);
        setTouched({ email: true, password: true });
        if (!emailValid || !passwordValid) {
            setErrorMsg("Please enter a valid email and a password with at least 6 characters.");
            return;
        }
        setIsLoading(true);
        try {
            const cleanEmail = normalizedEmail;
            const cleanPassword = password;
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
                <Text style={styles.authModeNote}>Prototype mode: email/password sign-in only.</Text>

                {errorMsg ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                ) : null}

                <TextInput
                    style={[
                        styles.input,
                        touched.email ? (emailValid ? styles.inputValid : styles.inputInvalid) : null,
                    ]}
                    placeholder="Email"
                    placeholderTextColor="#a78bfa"
                    value={email}
                    onChangeText={(value) => {
                        setEmail(value);
                        if (errorMsg) setErrorMsg(null);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {touched.email && (
                    <Text style={emailValid ? styles.validHint : styles.invalidHint}>
                        {emailValid ? "Looks good." : "Enter a valid email address."}
                    </Text>
                )}

                <View style={styles.passwordWrap}>
                    <TextInput
                        style={[
                            styles.input,
                            styles.passwordInput,
                            touched.password ? (passwordValid ? styles.inputValid : styles.inputInvalid) : null,
                        ]}
                        placeholder="Password"
                        placeholderTextColor="#a78bfa"
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            if (errorMsg) setErrorMsg(null);
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((prev) => !prev)}>
                        <Text style={styles.eyeBtnText}>{showPassword ? "Hide" : "Show"}</Text>
                    </TouchableOpacity>
                </View>
                {touched.password && (
                    <Text style={passwordValid ? styles.validHint : styles.invalidHint}>
                        {passwordValid ? "Password length is valid." : "Password must be at least 6 characters."}
                    </Text>
                )}

                <TouchableOpacity onPress={handleLogin} disabled={!canSubmit} activeOpacity={0.85}>
                    <LinearGradient
                        colors={canSubmit ? ["#7c3aed", "#6d28d9"] : ["#c4b5fd", "#a78bfa"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Sign In</Text>
                        }
                    </LinearGradient>
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
    authModeNote: { marginTop: -12, marginBottom: 16, fontSize: 12, color: '#6b7280', textAlign: 'center' },

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
    inputValid: {
        borderColor: '#34d399',
    },
    inputInvalid: {
        borderColor: '#f87171',
    },
    validHint: {
        marginTop: -8,
        marginBottom: 10,
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
    },
    invalidHint: {
        marginTop: -8,
        marginBottom: 10,
        fontSize: 12,
        color: '#dc2626',
        fontWeight: '600',
    },
    passwordWrap: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 74,
        marginBottom: 12,
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        top: 13,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#ede9fe',
    },
    eyeBtnText: {
        color: '#6d28d9',
        fontSize: 12,
        fontWeight: '700',
    },

    primaryBtn: {
        borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#6d28d9', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    },
    primaryBtnDisabled: {
        shadowOpacity: 0.08,
    },
    primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

    bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
    bottomText: { color: '#5b21b6', fontSize: 14 },
    bottomLink: { color: '#7c3aed', fontWeight: '800', fontSize: 14 },
});
