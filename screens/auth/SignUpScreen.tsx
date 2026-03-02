import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Image, Alert, Platform } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Heart, Check, Camera } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../lib/design/useTheme";

export default function SignUpScreen({ navigation }: any) {
    const { register } = useAuth();
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        age: "",
        height: "",
        weight: "",
        profileImage: null as string | null
    });

    const handleNext = () => {
        if (step === 1) {
            if (!formData.firstName || !formData.email || !formData.password) {
                const msg = "Please fill in all required fields.";
                if (Platform.OS === 'web') alert(msg);
                else Alert.alert("Missing Fields", msg);
                return;
            }
            if (formData.password.length < 8) {
                const msg = "Password must be at least 8 characters.";
                if (Platform.OS === 'web') alert(msg);
                else Alert.alert("Password Too Short", msg);
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                const msg = "Passwords do not match.";
                if (Platform.OS === 'web') alert(msg);
                else Alert.alert("Mismatch", msg);
                return;
            }
        }
        if (step < 3) setStep(step + 1);
        else handleSignup();
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const dataUri = asset.base64
                ? `data:image/jpeg;base64,${asset.base64}`
                : asset.uri;
            setFormData({ ...formData, profileImage: dataUri });
        }
    };

    const handleSignup = async () => {
        setIsLoading(true);
        try {
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            const profile = {
                age: formData.age ? parseInt(formData.age) : undefined,
                heightCm: formData.height ? parseFloat(formData.height) : undefined,
                weightKg: formData.weight ? parseFloat(formData.weight) : undefined,
                profileImage: formData.profileImage ?? undefined,
            };
            const user = await register(fullName, formData.email, formData.password, profile);
            if (!user) {
                const msg = "Failed to create account. Email might already be in use.";
                if (Platform.OS === 'web') alert(msg);
                else Alert.alert("Error", msg);
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

    const renderStepIndicator = (num: number) => {
        const isActive = step === num;
        const isCompleted = step > num;
        return (
            <View style={{ alignItems: 'center' }}>
                <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isCompleted ? colors.system.blue : isActive ? colors.system.blue + '15' : colors.fill.secondary,
                    borderWidth: isActive ? 2 : 0,
                    borderColor: colors.system.blue,
                }}>
                    {isCompleted ? (
                        <Check size={16} color="#FFFFFF" />
                    ) : (
                        <Text style={{
                            fontSize: typo.footnote.fontSize,
                            fontFamily: 'Inter-SemiBold', fontWeight: '600',
                            color: isActive ? colors.system.blue : colors.text.tertiary,
                        }}>{num}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
                {/* Logo */}
                <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
                    <View style={{
                        width: 56, height: 56, borderRadius: radii.lg,
                        backgroundColor: colors.system.blue + '10',
                        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.base,
                    }}>
                        <Heart size={28} color={colors.system.blue} fill={colors.system.blue} />
                    </View>
                    <Text style={{ fontSize: typo.largeTitle.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>
                        Create Account
                    </Text>
                    <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>
                        Set up your health profile
                    </Text>
                </View>

                {/* Step Indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
                    {renderStepIndicator(1)}
                    <View style={{ flex: 1, height: 1, backgroundColor: step > 1 ? colors.system.blue : colors.separator, marginHorizontal: spacing.sm }} />
                    {renderStepIndicator(2)}
                    <View style={{ flex: 1, height: 1, backgroundColor: step > 2 ? colors.system.blue : colors.separator, marginHorizontal: spacing.sm }} />
                    {renderStepIndicator(3)}
                </View>

                {/* Step Labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: 8, marginBottom: spacing.lg }}>
                    <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: step >= 1 ? colors.system.blue : colors.text.tertiary }}>Account</Text>
                    <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: step >= 2 ? colors.system.blue : colors.text.tertiary }}>Profile</Text>
                    <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: step >= 3 ? colors.system.blue : colors.text.tertiary }}>Photo</Text>
                </View>

                {/* Form */}
                <View style={{ paddingHorizontal: spacing.base }}>
                    {step === 1 && (
                        <View style={{ gap: spacing.base }}>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="First Name"
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Last Name"
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                                    />
                                </View>
                            </View>
                            <Input
                                label="Email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChangeText={(t) => setFormData({ ...formData, email: t })}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Input
                                label="Password"
                                placeholder="Min. 8 characters"
                                value={formData.password}
                                onChangeText={(t) => setFormData({ ...formData, password: t })}
                                secureTextEntry
                            />
                            <Input
                                label="Confirm Password"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
                                secureTextEntry
                            />
                        </View>
                    )}

                    {step === 2 && (
                        <View style={{ gap: spacing.base }}>
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.sm }}>
                                Optional — helps personalize your experience
                            </Text>
                            <Input
                                label="Age"
                                placeholder="e.g. 28"
                                value={formData.age}
                                onChangeText={(t) => setFormData({ ...formData, age: t })}
                                keyboardType="numeric"
                            />
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Height (cm)"
                                        placeholder="e.g. 175"
                                        value={formData.height}
                                        onChangeText={(t) => setFormData({ ...formData, height: t })}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Weight (kg)"
                                        placeholder="e.g. 70"
                                        value={formData.weight}
                                        onChangeText={(t) => setFormData({ ...formData, weight: t })}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={{ alignItems: 'center', gap: spacing.lg, paddingTop: spacing.base }}>
                            <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', color: colors.text.primary }}>
                                Profile Photo
                            </Text>
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, textAlign: 'center' }}>
                                Add a photo to personalize your profile
                            </Text>
                            <Pressable
                                onPress={pickImage}
                                style={{
                                    width: 140, height: 140, borderRadius: 70,
                                    backgroundColor: colors.fill.secondary,
                                    borderWidth: 2, borderStyle: 'dashed',
                                    borderColor: colors.separator,
                                    alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {formData.profileImage ? (
                                    <Image
                                        source={{ uri: formData.profileImage }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={{ alignItems: 'center', gap: 8 }}>
                                        <Camera size={28} color={colors.text.tertiary} />
                                        <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Medium', color: colors.text.tertiary }}>
                                            Tap to upload
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                            {formData.profileImage && (
                                <Pressable onPress={() => setFormData({ ...formData, profileImage: null })}>
                                    <Text style={{ fontSize: typo.footnote.fontSize, fontFamily: 'Inter-Regular', color: colors.system.red }}>
                                        Remove Photo
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.xl }}>
                    <Button
                        label={isLoading ? "Creating Account..." : (step === 3 ? "Create Account" : "Continue")}
                        onPress={handleNext}
                        isLoading={isLoading}
                        fullWidth
                    />

                    {step > 1 ? (
                        <Pressable onPress={handleBack} style={{ alignItems: 'center', paddingTop: spacing.base }} disabled={isLoading}>
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Medium', color: colors.text.secondary }}>
                                Back
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: spacing.lg, gap: 4 }}>
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>
                                Already have an account?
                            </Text>
                            <Pressable onPress={() => navigation.navigate("SignIn")}>
                                <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.system.blue }}>
                                    Sign In
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}
