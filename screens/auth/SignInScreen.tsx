import React, { useState } from "react";
import { View, Text, Pressable, Alert, Keyboard, TouchableWithoutFeedback, Platform } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { CircuitBoard } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../lib/design/useTheme";

export default function SignInScreen({ navigation }: any) {
    const { login } = useAuth();
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password.");
            return;
        }
        setIsLoading(true);
        try {
            const user = await login(email, password);
            if (!user) {
                const msg = "Invalid email or password.";
                if (Platform.OS === 'web') alert(msg);
                else Alert.alert("Invalid Credentials", msg);
            }
        } catch (error) {
            console.error(error);
            const msg = "Something went wrong. Please try again.";
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert("Error", msg);
        } finally {
            setIsLoading(false);
        }
    };

    const content = (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: radii.xl,
                    backgroundColor: colors.brand.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.base,
                }}>
                    <CircuitBoard size={40} color="#FFFFFF" />
                </View>
                <Text style={{
                    fontSize: typo.largeTitle.fontSize,
                    lineHeight: typo.largeTitle.lineHeight,
                    fontFamily: 'Inter-Bold',
                    fontWeight: '700',
                    color: colors.text.primary,
                }}>
                    HealthTwin
                </Text>
                <Text style={{
                    fontSize: typo.subheadline.fontSize,
                    fontFamily: 'Inter-Regular',
                    color: colors.text.secondary,
                    marginTop: 4,
                }}>
                    Your Digital Health Companion
                </Text>
            </View>

            {/* Form */}
            <View style={{ gap: spacing.base }}>
                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <Input
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <Pressable onPress={() => console.log("Forgot password")}>
                    <Text style={{
                        textAlign: 'right',
                        fontSize: typo.footnote.fontSize,
                        fontFamily: 'Inter-Medium',
                        color: colors.brand.primary,
                    }}>
                        Forgot Password?
                    </Text>
                </Pressable>
            </View>

            {/* Actions */}
            <View style={{ marginTop: spacing['2xl'], gap: spacing.base }}>
                <Button
                    label={isLoading ? "Signing in..." : "Sign In"}
                    onPress={handleLogin}
                    isLoading={isLoading}
                    fullWidth
                    size="lg"
                />

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1, height: 0.5, backgroundColor: colors.separator }} />
                    <Text style={{
                        fontSize: typo.caption1.fontSize,
                        fontFamily: 'Inter-Medium',
                        color: colors.text.tertiary,
                    }}>
                        OR
                    </Text>
                    <View style={{ flex: 1, height: 0.5, backgroundColor: colors.separator }} />
                </View>

                {/* Social */}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                        <Button variant="outline" label="Google" fullWidth />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Button variant="outline" label="Apple" fullWidth />
                    </View>
                </View>
            </View>

            {/* Sign Up Link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing['2xl'], gap: 4 }}>
                <Text style={{
                    fontSize: typo.subheadline.fontSize,
                    fontFamily: 'Inter-Regular',
                    color: colors.text.secondary,
                }}>
                    Don't have an account?
                </Text>
                <Pressable onPress={() => navigation.navigate("SignUp")}>
                    <Text style={{
                        fontSize: typo.subheadline.fontSize,
                        fontFamily: 'Inter-SemiBold',
                        fontWeight: '600',
                        color: colors.brand.primary,
                    }}>
                        Sign Up
                    </Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <ScreenLayout>
            {Platform.OS === 'web' ? content : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    {content}
                </TouchableWithoutFeedback>
            )}
        </ScreenLayout>
    );
}
