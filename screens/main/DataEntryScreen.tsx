import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { ScreenLayout } from "../../components/ScreenLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Activity, Moon, Smile, ArrowLeft, Save, Calendar, Footprints, Zap } from "lucide-react-native";
import { logHealth, logMood } from "../../lib/api/auth";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { useTheme } from "../../lib/design/useTheme";

const SEGMENTS = ["Activity", "Sleep", "Wellness"];

export default function DataEntryScreen({ navigation }: any) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { colors, typography: typo, spacing, radii } = useTheme();
    const [currentSection, setCurrentSection] = useState(0);
    const [saving, setSaving] = useState(false);

    // Form State
    const [steps, setSteps] = useState("");
    const [activeMinutes, setActiveMinutes] = useState(30);
    const [sleepHours, setSleepHours] = useState(7);
    const [sleepQuality, setSleepQuality] = useState("");
    const [mood, setMood] = useState("");
    const [energy, setEnergy] = useState(5);

    const handleNext = async () => {
        if (currentSection < SEGMENTS.length - 1) {
            setCurrentSection(currentSection + 1);
        } else {
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
                    showToast('Vitals saved successfully', 'success');
                    setTimeout(() => navigation.goBack(), 600);
                } else {
                    showToast('Save failed — check connection', 'error');
                }
            } catch (e) {
                console.error('Save error:', e);
                showToast('Error saving data', 'error');
            } finally {
                setSaving(false);
            }
        }
    };

    const qualityOptions = ["Excellent", "Good", "Fair", "Poor"];
    const moodOptions = [
        { value: 'happy', label: 'Happy', color: colors.system.green },
        { value: 'okay', label: 'Okay', color: colors.system.orange },
        { value: 'sad', label: 'Sad', color: colors.system.red },
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
                        </Card>
                    </View>
                );

            case 1:
                return (
                    <View style={{ gap: spacing.lg }}>
                        <Card padding="md">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.health.sleep + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Moon size={18} color={colors.health.sleep} />
                                </View>
                                <Text style={{ flex: 1, fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary }}>
                                    Duration
                                </Text>
                                <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.health.sleep }}>
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
                        </Card>

                        <Card padding="md">
                            <Text style={{ fontSize: typo.headline.fontSize, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: colors.text.primary, marginBottom: spacing.base }}>
                                Sleep Quality
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                {qualityOptions.map((q) => (
                                    <Pressable
                                        key={q}
                                        onPress={() => setSleepQuality(q)}
                                        style={{
                                            paddingHorizontal: 16, paddingVertical: 10,
                                            borderRadius: radii.full,
                                            borderWidth: 1.5,
                                            borderColor: sleepQuality === q ? colors.health.sleep : colors.separator,
                                            backgroundColor: sleepQuality === q ? colors.health.sleep + '10' : colors.background.secondary,
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: typo.footnote.fontSize,
                                            fontFamily: sleepQuality === q ? 'Inter-SemiBold' : 'Inter-Regular',
                                            fontWeight: sleepQuality === q ? '600' : '400',
                                            color: sleepQuality === q ? colors.health.sleep : colors.text.secondary,
                                        }}>
                                            {q}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </Card>
                    </View>
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
                                            flex: 1, paddingVertical: 14,
                                            borderRadius: radii.sm,
                                            borderWidth: 2,
                                            borderColor: mood === m.value ? m.color : colors.separator,
                                            backgroundColor: mood === m.value ? m.color + '10' : colors.background.secondary,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: typo.footnote.fontSize,
                                            fontFamily: mood === m.value ? 'Inter-SemiBold' : 'Inter-Regular',
                                            fontWeight: mood === m.value ? '600' : '400',
                                            color: mood === m.value ? m.color : colors.text.secondary,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: 12 }}>
                    <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                        <ArrowLeft size={24} color={colors.brand.primary} />
                    </Pressable>
                    <View>
                        <Text style={{ fontSize: typo.largeTitle.fontSize, lineHeight: typo.largeTitle.lineHeight, fontFamily: 'Inter-Bold', fontWeight: '700', color: colors.text.primary }}>
                            Log Entry
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Calendar size={12} color={colors.text.secondary} />
                            <Text style={{ fontSize: typo.caption1.fontSize, fontFamily: 'Inter-Regular', color: colors.text.secondary }}>
                                {new Date().toDateString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Segmented Control */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                    <SegmentedControl
                        segments={SEGMENTS}
                        selectedIndex={currentSection}
                        onSelect={setCurrentSection}
                    />
                </View>

                {/* Form */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
                    {renderSection()}
                </View>

                {/* Actions */}
                <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.xl }}>
                    <Button
                        label={saving ? "Saving..." : (currentSection === SEGMENTS.length - 1 ? "Save Entry" : "Next")}
                        onPress={handleNext}
                        isLoading={saving}
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

            {saving && (
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
