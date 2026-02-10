import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { ArrowLeft, Activity, Moon, Zap, RefreshCw } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";
import { calculatePredictedEnergy, predictMoodState, generatePredictionInsight } from "../../lib/prediction/model";
import { WeeklyAnalytics, generateWeeklyAnalytics } from "../../lib/analytics";
import { DemoDataHelper, getToday, getDaysAgo } from "../../lib/demoData"; // Using demo data for now as placeholder for real service

export default function WhatIfScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);

    // Baselines (from real data)
    const [baselinesteps, setBaselineSteps] = useState(5000);
    const [baselineSleep, setBaselineSleep] = useState(6.5);
    const [baselineEnergy, setBaselineEnergy] = useState(60);

    // Simulation State
    const [simSteps, setSimSteps] = useState(5000);
    const [simSleep, setSimSleep] = useState(6.5);

    // Computed Prediction
    const predictedEnergy = useMemo(() => calculatePredictedEnergy(simSleep, simSteps), [simSleep, simSteps]);
    const predictedMood = useMemo(() => predictMoodState(simSleep, predictedEnergy), [simSleep, predictedEnergy]);

    const energyDiff = predictedEnergy - baselineEnergy;
    const narrative = useMemo(() => generatePredictionInsight(
        baselineEnergy,
        predictedEnergy,
        simSleep - baselineSleep,
        simSteps - baselinesteps
    ), [baselineEnergy, predictedEnergy, simSleep, simSteps]);

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // In a real app, get current user ID. For now using demo/test logic or generic
            // We can fetch analytics for "last 7 days" to get averages
            // Since we might not have a user ID context here, we'll sim a fetch or use defaults if empty
            // For visual impact, let's use the Demo Data's "7 days ago" stats if available, 
            // or just sensible defaults.

            // Simulating fetch delay
            setTimeout(() => {
                setBaselineSteps(6500);
                setBaselineSleep(7.0);
                setBaselineEnergy(calculatePredictedEnergy(7.0, 6500));

                // Init sim values
                setSimSteps(6500);
                setSimSleep(7.0);
                setLoading(false);
            }, 500);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const resetSimulation = () => {
        setSimSteps(baselinesteps);
        setSimSleep(baselineSleep);
    };



    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
                        <ArrowLeft color="white" size={20} />
                        <Text className="text-white font-bold ml-2">Back</Text>
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
                                <Text className="text-white font-bold text-lg">{predictedMood}</Text>
                            </View>
                            <Text className="text-teal-50 text-center mt-4 text-sm px-4">
                                {narrative}
                            </Text>
                        </CardContent>
                    </Card>

                    {/* Controls */}
                    <Card className="bg-white/95 backdrop-blur-sm">
                        <CardContent className="p-6 space-y-6">
                            <View className="flex-row justify-between items-center pb-2 border-b border-gray-100">
                                <Text className="text-slate-500 font-medium">Adjust Habits</Text>
                                <TouchableOpacity onPress={resetSimulation} className="flex-row items-center space-x-1">
                                    <RefreshCw size={14} color="#64748b" />
                                    <Text className="text-slate-500 text-xs">Reset</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Steps Slider */}
                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Activity size={16} color="#3b82f6" />
                                        <Text className="font-medium text-slate-700">Daily Steps</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="font-bold text-blue-600 text-lg">{simSteps}</Text>
                                        <Text className="text-xs text-slate-400">
                                            {simSteps - baselinesteps > 0 ? '+' : ''}{simSteps - baselinesteps} from avg
                                        </Text>
                                    </View>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={20000}
                                    step={500}
                                    value={simSteps}
                                    onValueChange={setSimSteps}
                                    minimumTrackTintColor="#3b82f6"
                                    thumbTintColor="#3b82f6"
                                />
                            </View>

                            {/* Sleep Slider */}
                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Moon size={16} color="#6366f1" />
                                        <Text className="font-medium text-slate-700">Nightly Sleep</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="font-bold text-indigo-600 text-lg">{simSleep.toFixed(1)}h</Text>
                                        <Text className="text-xs text-slate-400">
                                            {simSleep - baselineSleep > 0 ? '+' : ''}{(simSleep - baselineSleep).toFixed(1)}h from avg
                                        </Text>
                                    </View>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={12}
                                    step={0.5}
                                    value={simSleep}
                                    onValueChange={setSimSleep}
                                    minimumTrackTintColor="#6366f1"
                                    thumbTintColor="#6366f1"
                                />
                            </View>

                            {/* Result: Predicted Energy */}
                            <View className="pt-4 border-t border-gray-100">
                                <View className="flex-row justify-between items-center mb-2">
                                    <View className="flex-row items-center space-x-2">
                                        <Zap size={20} color="#f59e0b" />
                                        <Text className="font-bold text-slate-800 text-lg">Predicted Energy</Text>
                                    </View>
                                    <View className="flex-row items-end space-x-2">
                                        <Text className="text-3xl font-bold text-amber-500">{predictedEnergy}</Text>
                                        <Text className={`text-sm mb-1 font-medium ${energyDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            ({energyDiff >= 0 ? '+' : ''}{energyDiff})
                                        </Text>
                                    </View>
                                </View>
                                {/* Progress Bar / Visual Indicator */}
                                <View className="h-3 bg-gray-200 rounded-full overflow-hidden w-full">
                                    <View
                                        className="h-full bg-amber-500 rounded-full"
                                        style={{ width: `${Math.min(predictedEnergy, 100)}%` }}
                                    />
                                </View>
                            </View>
                        </CardContent>
                    </Card>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
