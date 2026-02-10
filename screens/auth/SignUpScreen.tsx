import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Platform } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Heart, ArrowLeft, Check, Camera, Upload } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { UserService } from "../../lib/services";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignUpScreen({ navigation }: any) {
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
                Alert.alert("Missing Fields", "Please fill in all required fields.");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                Alert.alert("Password Mismatch", "Passwords do not match.");
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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setFormData({ ...formData, profileImage: result.assets[0].uri });
        }
    };

    const handleSignup = async () => {
        setIsLoading(true);
        try {
            const userId = `user_${Date.now()}`; // Simple ID generation

            await UserService.upsertUser({
                user_id: userId,
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                password: formData.password,
                profile_image: formData.profileImage || undefined,
                study_mode: 'both',
                consent_given: true, // Implicit for demo
                settings_json: JSON.stringify({
                    age: formData.age,
                    height: formData.height,
                    weight: formData.weight
                })
            });

            // Persist session
            await AsyncStorage.setItem('USER_ID', userId);

            if (Platform.OS === 'web') {
                alert("Account created successfully!");
                navigation.replace("Main");
            } else {
                Alert.alert("Success", "Account created successfully!", [
                    { text: "OK", onPress: () => navigation.replace("Main") }
                ]);
            }
        } catch (error) {
            console.error(error);
            const msg = "Failed to create account. Email might be in use.";
            if (Platform.OS === 'web') {
                alert(msg);
            } else {
                Alert.alert("Error", msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to render the circular steps
    const renderStep = (num: number) => {
        const isActive = step === num;
        const isCompleted = step > num;

        return (
            <View className="items-center justify-center">
                <View
                    className={`h-8 w-8 rounded-full items-center justify-center border ${isActive ? "border-brand-primary bg-purple-50" :
                        isCompleted ? "bg-brand-primary border-brand-primary" : "border-slate-300 bg-white"
                        }`}
                >
                    {isCompleted ? (
                        <Check size={16} color="white" />
                    ) : (
                        <Text className={`font-medium ${isActive ? "text-brand-primary" : "text-slate-400"}`}>
                            {num}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ScreenLayout gradientBackground className="px-6 pt-12">

            {/* Header Area */}
            <View className="items-center mb-6">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 mb-4">
                    <Heart size={32} color="#8b5cf6" fill="#8b5cf6" />
                </View>
                <Text className="text-xl font-bold text-brand-primary mb-1">HealthTwin AI</Text>
                <Text className="text-sm text-brand-secondary mb-6">Your Digital Health Companion</Text>

                <Text className="text-3xl font-bold text-slate-900 text-center">Create a Profile</Text>
                <Text className="text-slate-500 text-center mt-2 px-8">
                    Create a demo profile to store your avatar and health data.
                </Text>
            </View>

            {/* Stepper */}
            <View className="flex-row items-center justify-center mb-8 px-4">
                {renderStep(1)}
                <View className={`flex-1 h-px mx-2 ${step > 1 ? "bg-brand-primary" : "bg-slate-200"}`} />
                {renderStep(2)}
                <View className={`flex-1 h-px mx-2 ${step > 2 ? "bg-brand-primary" : "bg-slate-200"}`} />
                {renderStep(3)}
            </View>

            {/* Form Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
                {step === 1 && (
                    <View className="space-y-4">
                        <View className="flex-row space-x-4">
                            <Input
                                containerClassName="flex-1"
                                placeholder="First Name"
                                value={formData.firstName}
                                onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                                className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                                placeholderTextColor="#94a3b8"
                            />
                            <Input
                                containerClassName="flex-1"
                                placeholder="Last Name"
                                value={formData.lastName}
                                onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                                className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        <Input
                            placeholder="Email Address"
                            value={formData.email}
                            onChangeText={(t) => setFormData({ ...formData, email: t })}
                            keyboardType="email-address"
                            className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                            placeholderTextColor="#94a3b8"
                        />

                        <Input
                            placeholder="Password"
                            value={formData.password}
                            onChangeText={(t) => setFormData({ ...formData, password: t })}
                            secureTextEntry
                            className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                            placeholderTextColor="#94a3b8"
                        />

                        <Input
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
                            secureTextEntry
                            className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>
                )}

                {step === 2 && (
                    <View className="space-y-4">
                        <Text className="text-center text-slate-600 mb-2">Tell us about yourself for the simulation</Text>
                        <Input
                            placeholder="Age"
                            value={formData.age}
                            onChangeText={(t) => setFormData({ ...formData, age: t })}
                            keyboardType="numeric"
                            className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                            placeholderTextColor="#94a3b8"
                        />
                        <View className="flex-row space-x-4">
                            <Input
                                containerClassName="flex-1"
                                placeholder="Height (cm)"
                                value={formData.height}
                                onChangeText={(t) => setFormData({ ...formData, height: t })}
                                keyboardType="numeric"
                                className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                                placeholderTextColor="#94a3b8"
                            />
                            <Input
                                containerClassName="flex-1"
                                placeholder="Weight (kg)"
                                value={formData.weight}
                                onChangeText={(t) => setFormData({ ...formData, weight: t })}
                                keyboardType="numeric"
                                className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View className="space-y-6 items-center py-4">
                        <Text className="text-xl font-bold text-slate-800">Profile Picture</Text>
                        <Text className="text-center text-slate-500 px-4">
                            Upload a photo to personalize your dashboard and digital twin.
                        </Text>

                        <TouchableOpacity
                            onPress={pickImage}
                            className="h-40 w-40 rounded-full bg-purple-50 border-2 border-dashed border-purple-200 items-center justify-center overflow-hidden"
                        >
                            {formData.profileImage ? (
                                <Image
                                    source={{ uri: formData.profileImage }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="items-center space-y-2">
                                    <Camera size={32} color="#a855f7" />
                                    <Text className="text-xs text-brand-primary font-medium">Tap to Upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {formData.profileImage && (
                            <TouchableOpacity onPress={() => setFormData({ ...formData, profileImage: null })}>
                                <Text className="text-red-500 text-sm">Remove Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View className="pb-10 pt-4">
                <Button
                    label={isLoading ? "Creating Profile..." : (step === 3 ? "Complete Sign Up" : "Continue")}
                    onPress={handleNext}
                    disabled={isLoading}
                    className="w-full bg-brand-primary h-14 rounded-full shadow-lg shadow-brand-primary/30"
                    labelClasses="text-lg font-semibold"
                />

                {step === 1 && (
                    <View className="mt-6 flex-row justify-center space-x-1">
                        <Text className="text-slate-500">Already have a profile?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                            <Text className="font-bold text-brand-secondary">Sign In</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step > 1 && (
                    <TouchableOpacity onPress={handleBack} className="mt-4 items-center" disabled={isLoading}>
                        <Text className="text-slate-400 font-medium">Back</Text>
                    </TouchableOpacity>
                )}
            </View>

        </ScreenLayout>
    );
}
