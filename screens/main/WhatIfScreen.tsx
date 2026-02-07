import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, Activity, Moon, Zap } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";

export default function WhatIfScreen({ navigation }: any) {
    const [steps, setSteps] = useState(8500);
    const [sleep, setSleep] = useState(7.5);
    const [energy, setEnergy] = useState(75);

    const getAvatarState = () => {
        if (sleep >= 8 && energy >= 80) return "Energetic! 🚀";
        if (sleep >= 6 && energy >= 60) return "Balanced 😊";
        if (sleep < 6 || energy < 40) return "Tired 😴";
        return "Low Energy 🔋";
    };

    const narrative = getAvatarState() === "Energetic! 🚀"
        ? "With high activity and great rest, your digital twin is thriving! Keep this up for optimal long-term health."
        : getAvatarState() === "Balanced 😊"
            ? "You're maintaining a healthy balance. A little more sleep could boost your recovery even further."
            : "Your twin is feeling the strain. Prioritize rest tonight to recover your energy reserves.";

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Scenario Explorer</Text>
                        <Text className="text-teal-200 text-xs text-wrap flex-shrink">See how lifestyle changes affect you</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    {/* Avatar Preview */}
                    <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
                        <CardContent className="items-center py-8">
                            <View className="transform scale-75">
                                <DigitalTwinAvatar />
                            </View>
                            <View className="mt-4 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                                <Text className="text-white font-bold text-lg">{getAvatarState()}</Text>
                            </View>
                            <Text className="text-teal-50 text-center mt-4 text-sm px-4">
                                {narrative}
                            </Text>
                        </CardContent>
                    </Card>

                    {/* Controls */}
                    <Card className="bg-white/95 backdrop-blur-sm">
                        <CardContent className="p-6 space-y-6">
                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Activity size={16} color="#3b82f6" />
                                        <Text className="font-medium text-slate-700">Steps</Text>
                                    </View>
                                    <Text className="font-bold text-blue-600">{steps}</Text>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={20000}
                                    step={500}
                                    value={steps}
                                    onValueChange={setSteps}
                                    minimumTrackTintColor="#3b82f6"
                                    thumbTintColor="#3b82f6"
                                />
                            </View>

                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Moon size={16} color="#6366f1" />
                                        <Text className="font-medium text-slate-700">Sleep</Text>
                                    </View>
                                    <Text className="font-bold text-indigo-600">{sleep.toFixed(1)}h</Text>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={12}
                                    step={0.5}
                                    value={sleep}
                                    onValueChange={setSleep}
                                    minimumTrackTintColor="#6366f1"
                                    thumbTintColor="#6366f1"
                                />
                            </View>

                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Zap size={16} color="#f59e0b" />
                                        <Text className="font-medium text-slate-700">Energy</Text>
                                    </View>
                                    <Text className="font-bold text-amber-500">{energy}%</Text>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={100}
                                    step={5}
                                    value={energy}
                                    onValueChange={setEnergy}
                                    minimumTrackTintColor="#f59e0b"
                                    thumbTintColor="#f59e0b"
                                />
                            </View>
                        </CardContent>
                    </Card>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
