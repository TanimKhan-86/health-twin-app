import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert, Keyboard, TouchableWithoutFeedback, Platform } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { CircuitBoard } from "lucide-react-native";
import { UserService } from "../../lib/services";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignInScreen({ navigation }: any) {
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
            const user = await UserService.authenticateUser(email, password);

            if (user && user.user_id) {
                await AsyncStorage.setItem('USER_ID', user.user_id);
                navigation.replace("Main");
            } else {
                Alert.alert("Invalid Credentials", "Please check your email and password.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const content = (
        <View className="flex-1 justify-center p-6">
            <View className="mb-10 items-center">
                {/* Logo Area */}
                <View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand-primary shadow-xl shadow-brand-primary/30 mb-6">
                    <CircuitBoard size={48} color="#ffffff" />
                </View>
                <Text className="text-3xl font-bold text-slate-900 dark:text-white">HealthTwin AI</Text>
                <Text className="mt-2 text-brand-primary font-medium">Your Digital Health Companion</Text>
            </View>

            <View className="w-full bg-white/80 dark:bg-slate-800/80 p-6 rounded-3xl shadow-lg shadow-purple-100 dark:shadow-none border border-white dark:border-slate-700">
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">Welcome Back</Text>
                </View>

                <View className="space-y-4">
                    <Input
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="bg-purple-50/50 dark:bg-slate-900/50 border-purple-100 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                        placeholderTextColor="#94a3b8"
                    />
                    <Input
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        className="bg-purple-50/50 dark:bg-slate-900/50 border-purple-100 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                        placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity onPress={() => console.log("Forgot password")}>
                        <Text className="text-right text-sm text-brand-primary font-medium">
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-8 space-y-4">
                    <Button
                        label={isLoading ? "Signing in..." : "Sign In"}
                        onPress={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-brand-primary shadow-lg shadow-brand-primary/25 rounded-xl h-14"
                        labelClasses="text-lg font-semibold"
                    />

                    <View className="flex-row items-center space-x-2 my-2">
                        <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        <Text className="text-xs text-slate-400 font-medium">OR CONTINUE WITH</Text>
                        <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </View>

                    <View className="flex-row space-x-3 w-full justify-center">
                        <Button variant="outline" className="flex-1 border-slate-200 dark:border-slate-700" label="Google" labelClasses="text-slate-600 dark:text-slate-300" />
                        <Button variant="outline" className="flex-1 border-slate-200 dark:border-slate-700" label="Apple" labelClasses="text-slate-600 dark:text-slate-300" />
                    </View>
                </View>
            </View>

            <View className="mt-8 flex-row justify-center space-x-1">
                <Text className="text-slate-500 dark:text-slate-400">Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                    <Text className="font-bold text-brand-primary">Sign Up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenLayout gradientBackground>
            {Platform.OS === 'web' ? (
                content
            ) : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    {content}
                </TouchableWithoutFeedback>
            )}
        </ScreenLayout>
    );
}
