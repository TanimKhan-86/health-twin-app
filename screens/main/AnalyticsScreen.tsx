import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { ArrowLeft, BarChart2 } from "lucide-react-native";

export default function AnalyticsScreen({ navigation }: any) {
    // Mock data for a simple bar chart
    const weeklyData = [65, 59, 80, 81, 56, 55, 40];
    const max = Math.max(...weeklyData);

    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Analytics Deep Dive</Text>
                        <Text className="text-teal-200 text-xs">Trends & Patterns</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <Card className="mb-6 bg-white/95 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <View className="flex-row items-center space-x-2 mb-6">
                                <BarChart2 color="#0d9488" size={24} />
                                <Text className="text-lg font-bold text-slate-800">Activity Trends</Text>
                            </View>

                            {/* Simple Bar Chart Implementation */}
                            <View className="flex-row items-end justify-between h-40 space-x-2">
                                {weeklyData.map((val, i) => (
                                    <View key={i} className="flex-1 items-center space-y-2">
                                        <View
                                            className="w-full bg-teal-500 rounded-t-lg opacity-80"
                                            style={{ height: `${(val / max) * 100}%` }}
                                        />
                                        <Text className="text-xs text-slate-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
                                    </View>
                                ))}
                            </View>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/95 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <Text className="text-lg font-bold text-slate-800 mb-4">Correlation Analysis</Text>
                            <Text className="text-slate-600 leading-relaxed text-sm">
                                Your sleep quality has a <Text className="font-bold text-teal-600">strong positive correlation</Text> with your energy levels the following day. Days with &gt;7 hours sleep usually result in 20% more physical activity.
                            </Text>
                        </CardContent>
                    </Card>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
