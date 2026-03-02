import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Activity, Moon, Smile, Save, Footprints, Zap } from "lucide-react-native";
import { useToast } from "../../components/ui/Toast";
import { logHealth, logMood } from "../../lib/api/auth";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../lib/design/useTheme";

const SEGMENTS = ["Activity", "Sleep", "Mood"];

export default function DailyLogScreen() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [currentSection, setCurrentSection] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form State
    const [steps, setSteps] = useState("8500");
    const [activeMinutes, setActiveMinutes] = useState(30);
    const [sleepHours, setSleepHours] = useState(7.5);
    const [mood, setMood] = useState("good");
    const [energy, setEnergy] = useState(7);

    const handleSave = async () => {
        if (!user) {
            showToast('Please log in first', 'error');
            return;
        }
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const energyScore = Math.min(100, Math.max(0,
                ((sleepHours / 8) * 0.6 + (parseInt(steps) / 10000) * 0.4) * 100
            ));

            await logHealth({
                date: today,
                steps: parseInt(steps) || 0,
                sleepHours,
                energyScore,
            });

            await logMood({
                date: today,
                mood,
                energyLevel: energy,
                notes: 'Daily log entry',
            });

            showToast('Entry saved successfully', 'success');
            setCurrentSection(0);
        } catch (error) {
            console.error(error);
            showToast('Failed to save entry', 'error');
        } finally {
            setLoading(false);
        }
    };

    const moodOptions = [
        { value: 'great', label: 'Great' },
        { value: 'good', label: 'Good' },
        { value: 'okay', label: 'Okay' },
        { value: 'bad', label: 'Bad' },
    ];

    const renderSection = () => {
        switch (currentSection) {
            case 0:
                return (
                    <View style={{ gap: spacing.lg }}>
                        <Card padding="md">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.base }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.health.activity + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Footprints size={18} color={colors.health.activity} />
                                </View>
                                <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                    Steps
                                </Text>
                            </View>
                            <Input
                                placeholder="e.g. 8500"
                                keyboardType="numeric"
                                value={steps}
                                onChangeText={setSteps}
                            />
                        </Card>

                        <Card padding="md">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.health.activity + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={18} color={colors.health.activity} />
                                </View>
                                <Text style={{ flex: 1, fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                    Active Minutes
                                </Text>
                                <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.health.activity }}>
                                    {Math.round(activeMinutes)} min
                                </Text>
                            </View>
                            <Slider
                                minimumValue={0}
                                maximumValue={120}
                                step={5}
                                value={activeMinutes}
                                onValueChange={setActiveMinutes}
                                minimumTrackTintColor={colors.health.activity}
                                maximumTrackTintColor={colors.fill.tertiary}
                                thumbTintColor={colors.health.activity}
                                style={{ marginTop: 8 }}
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>0</Text>
                                <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>60</Text>
                                <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>120 min</Text>
                            </View>
                        </Card>
                    </View>
                );

            case 1:
                return (
                    <Card padding="md">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.health.sleep + '15', alignItems: 'center', justifyContent: 'center' }}>
                                <Moon size={18} color={colors.health.sleep} />
                            </View>
                            <Text style={{ flex: 1, fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                Duration
                            </Text>
                            <Text style={{ fontSize: typo.title2.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.health.sleep }}>
                                {sleepHours.toFixed(1)} hrs
                            </Text>
                        </View>
                        <Slider
                            minimumValue={0}
                            maximumValue={12}
                            step={0.5}
                            value={sleepHours}
                            onValueChange={setSleepHours}
                            minimumTrackTintColor={colors.health.sleep}
                            maximumTrackTintColor={colors.fill.tertiary}
                            thumbTintColor={colors.health.sleep}
                            style={{ marginTop: 8 }}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>0 hrs</Text>
                            <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>6 hrs</Text>
                            <Text style={{ fontSize: typo.caption2.fontSize, fontFamily: 'Inter-Regular', color: colors.text.tertiary }}>12 hrs</Text>
                        </View>

                        <View style={{ marginTop: spacing.lg, padding: spacing.base, backgroundColor: colors.health.sleep + '08', borderRadius: radii.sm }}>
                            <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, lineHeight: 20 }}>
                                {sleepHours >= 7.5 ? 'Great sleep duration! Aim for 7-9 hours.' :
                                 sleepHours >= 6 ? 'Consider getting a bit more rest for optimal recovery.' :
                                 'Sleep under 6 hours impacts energy and mood significantly.'}
                            </Text>
                        </View>
                    </Card>
                );

            case 2:
                return (
                    <View style={{ gap: spacing.lg }}>
                        <Card padding="md">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.base }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.health.mood + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Smile size={18} color={colors.health.mood} />
                                </View>
                                <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                    How are you feeling?
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                {moodOptions.map((m) => (
                                    <Pressable
                                        key={m.value}
                                        onPress={() => setMood(m.value)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 12,
                                            borderRadius: radii.sm,
                                            borderWidth: 2,
                                            borderColor: mood === m.value ? colors.health.mood : colors.separator,
                                            backgroundColor: mood === m.value ? colors.health.mood + '10' : colors.background.secondary,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: typo.footnote.fontSize,
                                            fontFamily: mood === m.value ? 'Inter-SemiBold' : 'Inter-Regular',
                                            fontWeight: mood === m.value ? '600' : '400',
                                            color: mood === m.value ? colors.health.mood : colors.text.secondary,
                                        }}>
                                            {m.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </Card>

                        <Card padding="md">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.health.energy + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={18} color={colors.health.energy} />
                                </View>
                                <Text style={{ flex: 1, fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                    Energy Level
                                </Text>
                                <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.health.energy }}>
                                    {Math.round(energy)}/10
                                </Text>
                            </View>
                            <Slider
                                minimumValue={1}
                                maximumValue={10}
                                step={1}
                                value={energy}
                                onValueChange={setEnergy}
                                minimumTrackTintColor={colors.health.energy}
                                maximumTrackTintColor={colors.fill.tertiary}
                                thumbTintColor={colors.health.energy}
                                style={{ marginTop: 8 }}
                            />
                        </Card>
                    </View>
                );
        }
    };

    return (
        <ScreenLayout>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.sm }}>
                    <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                        Daily Log
                    </Text>
                    <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary, marginTop: 4 }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                </View>

                {/* Segmented Control */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                    <SegmentedControl
                        segments={SEGMENTS}
                        selectedIndex={currentSection}
                        onSelect={setCurrentSection}
                    />
                </View>

                {/* Form Content */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                    {renderSection()}
                </View>

                {/* Save Button */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.xl }}>
                    <Button
                        label={loading ? "Saving..." : (currentSection === SEGMENTS.length - 1 ? "Save Entry" : "Next")}
                        onPress={() => {
                            if (currentSection < SEGMENTS.length - 1) {
                                setCurrentSection(currentSection + 1);
                            } else {
                                handleSave();
                            }
                        }}
                        isLoading={loading}
                        fullWidth
                        icon={currentSection === SEGMENTS.length - 1 ? <Save size={18} color="#FFFFFF" /> : undefined}
                    />
                    {currentSection > 0 && (
                        <Pressable
                            onPress={() => setCurrentSection(currentSection - 1)}
                            style={{ alignItems: 'center', paddingTop: spacing.base }}
                        >
                            <Text style={{ fontSize: typo.subheadline.fontSize, fontFamily: 'Inter-Medium', color: colors.text.secondary }}>
                                Previous
                            </Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>

            {loading && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <ActivityIndicator size="large" color={colors.system.blue} />
                </View>
            )}
        </ScreenLayout>
    );
}
