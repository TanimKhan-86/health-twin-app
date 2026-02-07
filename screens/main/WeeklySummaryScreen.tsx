import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, MessageSquare, CheckCircle } from "lucide-react-native";
import { DigitalTwinAvatar } from "../../components/DigitalTwinAvatar";

export default function WeeklySummaryScreen({ navigation }: any) {
    return (
        <ScreenLayout gradientBackground>
            <View className="flex-1">
                {/* Header */}
                <View className="p-4 pt-2 flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Weekly Report</Text>
                        <Text className="text-teal-200 text-xs">Feb 12 - Feb 18</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <Card className="mb-6 bg-white/95 backdrop-blur-sm border-white/20">
                        <CardHeader>
                            <CardTitle className="text-center text-teal-800">Your Twin's Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="items-center">
                            <View className="transform scale-75 h-40 justify-center">
                                <DigitalTwinAvatar />
                            </View>
                            <View className="bg-teal-50 p-4 rounded-xl border border-teal-100 w-full mt-4">
                                <Text className="text-slate-700 leading-relaxed">
                                    "You've had a strong week! Your activity levels are up 15% compared to last week. Sleep consistency has improved, contributing to higher energy scores. Keep focusing on that hydration!"
                                </Text>
                            </View>
                        </CardContent>
                    </Card>

                    <Text className="text-white font-semibold mb-3 ml-1">Key Highlights</Text>
                    <View className="space-y-3">
                        {[
                            { text: "Reached daily step goal 5/7 days", icon: CheckCircle, color: "#059669", bg: "bg-emerald-100" },
                            { text: "Sleep average increased by 45 mins", icon: Moon, color: "#6366f1", bg: "bg-indigo-100" }, // Icon not imported but generic logic works
                            { text: "Energy levels peaked on Wednesday", icon: Zap, color: "#f59e0b", bg: "bg-amber-100" }
                        ].map((item, i) => ( // Using Zap from generic placeholder logic if needed or just CheckCircle
                            <Card key={i} className="flex-row items-center p-4">
                                <View className={`p-2 rounded-full mr-3 ${item.bg}`}>
                                    <item.icon size={20} color={item.color} />
                                </View>
                                <Text className="text-slate-700 font-medium flex-1">{item.text}</Text>
                            </Card>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}

// Helper icons
import { Moon, Zap } from "lucide-react-native";
