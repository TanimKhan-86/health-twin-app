import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Activity, Moon, Smile, ArrowLeft, Save, Calendar, RefreshCw, Download, User } from "lucide-react-native";
import { useToast } from "../../components/ui/Toast";
import { DemoDataHelper } from "../../lib/demoData";
import { HealthService, MoodService, UserService } from "../../lib/services";
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from '../../lib/database';

// Tabs
const sections = [
    { title: "Physical", icon: Activity, color: "bg-purple-500", theme: "purple" },
    { title: "Sleep", icon: Moon, color: "bg-indigo-500", theme: "indigo" },
    { title: "Mood", icon: Smile, color: "bg-teal-500", theme: "teal" }
];

export default function DailyLogScreen({ navigation }: any) {
    const { showToast } = useToast();
    const [currentSection, setCurrentSection] = useState(0);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form State
    const [steps, setSteps] = useState("8500");
    const [activeMinutes, setActiveMinutes] = useState(30);
    const [sleepHours, setSleepHours] = useState(7.5);
    const [mood, setMood] = useState("good");
    const [energy, setEnergy] = useState(7);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const id = await AsyncStorage.getItem('USER_ID');
        if (id) setUserId(id);
    };

    const handleNext = () => {
        if (currentSection < sections.length - 1) {
            setCurrentSection(currentSection + 1);
        } else {
            handleSave();
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Save Health
            const calculatedEnergy = (sleepHours / 8) * 0.6 + (parseInt(steps) / 10000) * 0.4;
            await HealthService.upsertHealthEntry({
                user_id: userId,
                date: today,
                steps: parseInt(steps) || 0,
                sleep_hours: sleepHours,
                energy_score: Math.min(100, Math.max(0, calculatedEnergy * 100))
            });

            // Save Mood
            await MoodService.addMoodEntry({
                user_id: userId,
                date: today,
                mood_value: mood as any,
                emotion_score: energy * 10, // Approximate
                diary_text: "Daily log entry"
            });

            showToast("Entry saved successfully!", "success");

            // Navigate to Main (replace to prevent going back)
            navigation.replace("Main");

        } catch (error) {
            console.error(error);
            showToast("Failed to save entry", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadExample = async () => {
        setLoading(true);
        try {
            // Check if user exists, if not create one
            let uid = userId;
            if (!uid) {
                uid = await DemoDataHelper.createDemoUser();
                await AsyncStorage.setItem('USER_ID', uid);
                setUserId(uid);
            }

            // Populate data
            if (uid) {
                await DemoDataHelper.addSampleHealthData(uid);
                await DemoDataHelper.addSampleMoodData(uid);
                showToast("Example week loaded!", "success");
                navigation.replace("Main"); // Go to dashboard with data
            }
        } catch (e) {
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setLoading(true);
        try {
            const database = db.getDB();
            await database.runAsync('DELETE FROM health_entries');
            await database.runAsync('DELETE FROM moods');
            showToast("Demo data reset.", "info");
        } catch (e) {
            showToast("Error resetting data", "error");
        } finally {
            setLoading(false);
        }
    };

    const renderSectionContent = () => {
        switch (currentSection) {
            case 0: // Physical
                return (
                    <View className="space-y-6">
                        <View className="flex-row items-center space-x-4 mb-4">
                            <View className="bg-purple-100 p-3 rounded-full">
                                <Activity size={24} className="text-purple-600" color="#9333ea" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-slate-800">Physical Activity</Text>
                                <Text className="text-slate-500 text-sm">Track your movement and exercise</Text>
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-slate-700 mb-2">Steps Taken</Text>
                            <Input
                                placeholder="e.g. 8500"
                                keyboardType="numeric"
                                value={steps}
                                onChangeText={setSteps}
                                className="bg-blue-50/50 border-blue-100 text-blue-600 text-lg font-bold text-center h-14"
                            />
                        </View>

                        <View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-slate-700">Active Minutes: {Math.round(activeMinutes)} min</Text>
                            </View>
                            <Slider
                                minimumValue={0}
                                maximumValue={120}
                                step={5}
                                value={activeMinutes}
                                onValueChange={setActiveMinutes}
                                minimumTrackTintColor="#8b5cf6"
                                maximumTrackTintColor="#e2e8f0"
                                thumbTintColor="#8b5cf6"
                            />
                            <View className="flex-row justify-between mt-1">
                                <Text className="text-xs text-slate-400">0</Text>
                                <Text className="text-xs text-slate-400">60</Text>
                                <Text className="text-xs text-slate-400">120 min</Text>
                            </View>
                        </View>
                    </View>
                );
            case 1: // Sleep
                return (
                    <View className="space-y-6">
                        <View className="flex-row items-center space-x-4 mb-4">
                            <View className="bg-indigo-100 p-3 rounded-full">
                                <Moon size={24} className="text-indigo-600" color="#4f46e5" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-slate-800">Sleep & Rest</Text>
                                <Text className="text-slate-500 text-sm">How well did you sleep?</Text>
                            </View>
                        </View>

                        <View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-slate-700">Duration</Text>
                                <Text className="text-lg font-bold text-indigo-600">{sleepHours.toFixed(1)} hrs</Text>
                            </View>
                            <Slider
                                minimumValue={0}
                                maximumValue={12}
                                step={0.5}
                                value={sleepHours}
                                onValueChange={setSleepHours}
                                minimumTrackTintColor="#6366f1"
                                maximumTrackTintColor="#e2e8f0"
                                thumbTintColor="#6366f1"
                            />
                        </View>
                    </View>
                );
            case 2: // Mood
                return (
                    <View className="space-y-6">
                        <View className="flex-row items-center space-x-4 mb-4">
                            <View className="bg-teal-100 p-3 rounded-full">
                                <Smile size={24} className="text-teal-600" color="#0d9488" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-slate-800">Mood & Energy</Text>
                                <Text className="text-slate-500 text-sm">Check in with yourself</Text>
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-slate-700 mb-2">How do you feel?</Text>
                            <View className="flex-row justify-between gap-2">
                                {['great', 'good', 'okay', 'bad'].map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setMood(m)}
                                        className={`flex-1 p-3 rounded-xl border-2 items-center ${mood === m ? 'border-teal-500 bg-teal-50' : 'border-slate-100 bg-white'}`}
                                    >
                                        <Text className={`capitalize ${mood === m ? 'font-bold text-teal-700' : 'text-slate-500'}`}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View className="mt-4">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-slate-700">Energy Level</Text>
                                <Text className="text-sm font-bold text-teal-600">{Math.round(energy)}/10</Text>
                            </View>
                            <Slider
                                minimumValue={1}
                                maximumValue={10}
                                step={1}
                                value={energy}
                                onValueChange={setEnergy}
                                minimumTrackTintColor="#0d9488"
                                maximumTrackTintColor="#e2e8f0"
                                thumbTintColor="#0d9488"
                            />
                        </View>
                    </View>
                );
        }
    };

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header Section */}
                <View className="px-6 pt-4 pb-8">
                    <Text className="text-white text-3xl font-bold mb-1">Daily Demo Log</Text>
                    <Text className="text-white/80 text-base mb-4">Enter simulated values for today.</Text>

                    <View className="bg-white/20 self-start px-3 py-1 rounded-full flex-row items-center space-x-2">
                        <Calendar size={14} color="white" />
                        <Text className="text-white font-medium text-sm">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* Main Content Card */}
                <View className="flex-1 bg-slate-50 rounded-t-[40px] px-6 pt-8 pb-6 shadow-2xl">

                    {/* Data Input Method Box */}
                    <View className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex-row items-center space-x-4 mb-6">
                        <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center">
                            <User size={24} color="#a855f7" />
                        </View>
                        <View>
                            <Text className="text-slate-900 font-bold text-base">Data Input Method</Text>
                            <Text className="text-slate-500 text-sm">Manual demo entry.</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row space-x-4 mb-8">
                        <TouchableOpacity
                            onPress={handleLoadExample}
                            className="flex-1 flex-row items-center justify-center space-x-2 bg-white border border-slate-200 py-3 rounded-xl shadow-sm"
                        >
                            <Download size={18} color="#64748b" />
                            <Text className="text-slate-600 font-medium text-xs">Load Example Week</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleReset}
                            className="flex-1 flex-row items-center justify-center space-x-2 bg-white border border-slate-200 py-3 rounded-xl shadow-sm"
                        >
                            <RefreshCw size={18} color="#64748b" />
                            <Text className="text-slate-600 font-medium text-xs">Reset Demo Data</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tabs / Section Indicators */}
                    <View className="flex-row justify-between mb-6 bg-white p-1 rounded-xl border border-slate-100">
                        {sections.map((section, index) => {
                            const isActive = index === currentSection;
                            const Icon = section.icon;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setCurrentSection(index)}
                                    className={`flex-1 flex-row items-center justify-center py-2 rounded-lg space-x-2 ${isActive ? 'bg-purple-600 shadow-md' : ''}`}
                                >
                                    <Icon size={16} color={isActive ? 'white' : '#94a3b8'} />
                                    <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                        {section.title}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    {/* Form Content */}
                    <View className="flex-1 bg-blue-50/50 border border-blue-100 rounded-3xl p-6 mb-4">
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {renderSectionContent()}
                        </ScrollView>
                    </View>

                    {/* Footer Navigation */}
                    <View className="flex-row space-x-4 mt-auto">
                        {currentSection > 0 && (
                            <TouchableOpacity
                                onPress={() => setCurrentSection(currentSection - 1)}
                                className="flex-1 bg-white border border-purple-100 py-4 rounded-full items-center justify-center"
                            >
                                <Text className="text-purple-400 font-bold">Previous</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={handleNext}
                            className="flex-1 bg-purple-600 py-4 rounded-full items-center justify-center shadow-lg shadow-purple-200"
                        >
                            <Text className="text-white font-bold text-lg">
                                {currentSection === sections.length - 1 ? "Save & Continue" : "Next Section"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>

                {loading && (
                    <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-t-[40px]">
                        <ActivityIndicator size="large" color="white" />
                    </View>
                )}
            </View>
        </ScreenLayout>
    );
}
