import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Heart, ArrowLeft, Check } from "lucide-react-native";

export default function SignUpScreen({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleSignup();
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const handleSignup = () => {
        navigation.replace("Main");
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
                            placeholder="Demo password (for this profile only)"
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

                        <Text className="text-center text-slate-500 text-sm mt-2">
                            This is a prototype demo using simulated data.
                        </Text>
                    </View>
                )}

                {step === 2 && (
                    <View className="space-y-4">
                        <Text className="text-center text-slate-600 mb-2">Tell us about yourself for the simulation</Text>
                        <Input
                            placeholder="Age"
                            keyboardType="numeric"
                            className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                            placeholderTextColor="#94a3b8"
                        />
                        <View className="flex-row space-x-4">
                            <Input
                                containerClassName="flex-1"
                                placeholder="Height (cm)"
                                keyboardType="numeric"
                                className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                                placeholderTextColor="#94a3b8"
                            />
                            <Input
                                containerClassName="flex-1"
                                placeholder="Weight (kg)"
                                keyboardType="numeric"
                                className="bg-purple-50/50 border-purple-100/80 rounded-2xl h-14"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    </View>
                )}
                {step === 3 && (
                    <View className="space-y-4 items-center py-8">
                        <View className="h-24 w-24 bg-green-100 rounded-full items-center justify-center mb-4">
                            <Check size={40} color="#10b981" />
                        </View>
                        <Text className="text-xl font-bold text-slate-800">All Set!</Text>
                        <Text className="text-center text-slate-500">
                            Your digital twin is ready to be initialized.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View className="pb-10 pt-4">
                <Button
                    label="Continue"
                    onPress={handleNext}
                    className="w-full bg-brand-primary h-14 rounded-full shadow-lg shadow-brand-primary/30"
                    labelClasses="text-lg font-semibold"
                />

                <View className="mt-6 flex-row justify-center space-x-1">
                    <Text className="text-slate-500">Already have a profile?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                        <Text className="font-bold text-brand-secondary">Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </ScreenLayout>
    );
}
