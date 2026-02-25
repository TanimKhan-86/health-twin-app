import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Activity, Moon, Smile, ArrowLeft, Save, Terminal, Calendar } from "lucide-react-native";
import { logHealth, logMood } from "../../lib/api/auth";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/ui/Toast";


const sections = [
    {
        title: "Physical Activity",
        icon: Activity,
        color: "bg-blue-500",
        theme: "blue"
    },
    {
        title: "Sleep & Recovery",
        icon: Moon,
        color: "bg-indigo-500",
        theme: "indigo"
    },
    {
        title: "Mood & Wellness",
        icon: Smile,
        color: "bg-orange-500",
        theme: "orange"
    }
];

export default function DataEntryScreen({ navigation }: any) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [currentSection, setCurrentSection] = useState(0);
    const [saving, setSaving] = useState(false);

    // Form State
    const [steps, setSteps] = useState("");
    const [activeMinutes, setActiveMinutes] = useState(30);
    const [sleepHours, setSleepHours] = useState(7);
    const [sleepQuality, setSleepQuality] = useState("");
    const [mood, setMood] = useState("");
    const [energy, setEnergy] = useState(5);
    const [stress, setStress] = useState(3);

    const handleNext = async () => {
        if (currentSection < sections.length - 1) {
            setCurrentSection(currentSection + 1);
        } else {
            // Last step — save to MongoDB
            setSaving(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const result = await logHealth({
                    date: today,
                    steps: parseInt(steps) || 0,
                    sleepHours,
                    energyScore: energy * 10,
                });
                if (mood) {
                    await logMood({ date: today, mood, energyLevel: energy });
                }
                if (result) {
                    showToast('✅ Vitals saved to MongoDB!', 'success');
                    setTimeout(() => navigation.goBack(), 800);
                } else {
                    showToast('❌ Save failed — check your connection', 'error');
                }
            } catch (e) {
                console.error('Save error:', e);
                showToast('❌ Error saving data', 'error');
            } finally {
                setSaving(false);
            }
        }
    };


    const renderSectionContent = () => {
        switch (currentSection) {
            case 0: // Activity
                return (
                    <View className="space-y-6">
                        <View>
                            <Text className="text-sm font-medium text-slate-700 mb-2">Steps Taken</Text>
                            <Input
                                placeholder="e.g. 8500"
                                keyboardType="numeric"
                                value={steps}
                                onChangeText={setSteps}
                            />
                        </View>
                        <View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-slate-700">Active Minutes</Text>
                                <Text className="text-sm font-bold text-brand-primary">{Math.round(activeMinutes)} min</Text>
                            </View>
                            <Slider
                                minimumValue={0}
                                maximumValue={120}
                                step={5}
                                value={activeMinutes}
                                onValueChange={setActiveMinutes}
                                minimumTrackTintColor="#14b8a6"
                                maximumTrackTintColor="#cbd5e1"
                                thumbTintColor="#14b8a6"
                            />
                        </View>
                    </View>
                );
            case 1: // Sleep
                return (
                    <View className="space-y-6">
                        <View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-slate-700">Sleep Duration</Text>
                                <Text className="text-sm font-bold text-brand-primary">{sleepHours.toFixed(1)} hrs</Text>
                            </View>
                            <Slider
                                minimumValue={0}
                                maximumValue={12}
                                step={0.5}
                                value={sleepHours}
                                onValueChange={setSleepHours}
                                minimumTrackTintColor="#6366f1"
                                maximumTrackTintColor="#cbd5e1"
                                thumbTintColor="#6366f1"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-slate-700 mb-2">Sleep Quality</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {["Excellent", "Good", "Fair", "Poor"].map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        onPress={() => setSleepQuality(q)}
                                        className={`px-4 py-2 rounded-full border ${sleepQuality === q ? 'bg-indigo-100 border-indigo-500' : 'bg-white border-slate-200'}`}
                                    >
                                        <Text className={sleepQuality === q ? 'text-indigo-700 font-medium' : 'text-slate-600'}>{q}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                );
            case 2: // Wellness
                return (
                    <View className="space-y-6">
                        <View>
                            <Text className="text-sm font-medium text-slate-700 mb-2">How are you feeling?</Text>
                            <View className="flex-row justify-between">
                                {[
                                    { val: 'happy', icon: Smile, color: 'text-green-500', bg: 'bg-green-100' },
                                    { val: 'okay', icon: Terminal, color: 'text-yellow-500', bg: 'bg-yellow-100' }, // using Terminal as neutral
                                    { val: 'sad', icon: Activity, color: 'text-red-500', bg: 'bg-red-100' } // using Activity as stressed
                                ].map((item) => (
                                    <TouchableOpacity
                                        key={item.val}
                                        onPress={() => setMood(item.val)}
                                        className={`p-4 rounded-xl border-2 flex-1 mx-1 items-center ${mood === item.val ? `border-${item.color.split('-')[1]}-500 ${item.bg}` : 'border-slate-100 bg-white'}`}
                                    >
                                        <item.icon size={24} className={item.color} color={mood === item.val ? undefined : 'gray'} />
                                        <Text className={`text-xs mt-1 capitalize ${mood === item.val ? 'font-bold' : 'text-slate-500'}`}>{item.val}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-slate-700">Energy Level</Text>
                                <Text className="text-sm font-bold text-brand-primary">{Math.round(energy)}/10</Text>
                            </View>
                            <Slider
                                minimumValue={1}
                                maximumValue={10}
                                step={1}
                                value={energy}
                                onValueChange={setEnergy}
                                minimumTrackTintColor="#f59e0b"
                                maximumTrackTintColor="#cbd5e1"
                                thumbTintColor="#f59e0b"
                            />
                        </View>
                    </View>
                );
        }
    };

    const CurrentIcon = sections[currentSection].icon;

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 flex-row items-center bg-white/20 px-3 py-2 rounded-full self-start">
                        <ArrowLeft color="white" size={20} />
                        <Text className="text-white font-bold ml-2">Back</Text>
                    </TouchableOpacity>
                    <Text className="text-white text-2xl font-bold">Daily Log</Text>
                    <View className="flex-row items-center space-x-2 mt-1">
                        <Calendar size={14} color="#ccfbf1" />
                        <Text className="text-teal-100 text-sm">{new Date().toDateString()}</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="px-6 mb-6 flex-row space-x-2">
                    {sections.map((_, i) => (
                        <View
                            key={i}
                            className={`h-1 flex-1 rounded-full ${i <= currentSection ? 'bg-teal-400' : 'bg-white/20'}`}
                        />
                    ))}
                </View>

                {/* Form Card */}
                <View className="bg-white rounded-t-3xl flex-1 px-6 pt-8 pb-10 shadow-2xl">
                    <View className="flex-row items-center space-x-4 mb-8">
                        <View className={`p-3 rounded-2xl ${sections[currentSection].color}`}>
                            <CurrentIcon color="white" size={24} />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-slate-900">{sections[currentSection].title}</Text>
                            <Text className="text-slate-500">Step {currentSection + 1} of 3</Text>
                        </View>
                    </View>

                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
                        {renderSectionContent()}
                    </ScrollView>

                    <View className="mt-4 pt-4 border-t border-slate-100">
                        <Button
                            label={saving ? "Saving..." : (currentSection === sections.length - 1 ? "Save Entry" : "Next Section")}
                            onPress={handleNext}
                            icon={currentSection === sections.length - 1 ? <Save color="white" size={20} /> : undefined}
                        />
                        {currentSection > 0 && (
                            <TouchableOpacity onPress={() => setCurrentSection(currentSection - 1)} className="mt-4 items-center">
                                <Text className="text-slate-500 font-medium">Previous Step</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </ScreenLayout>
    );
}
