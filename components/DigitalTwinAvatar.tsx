import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { Video, ResizeMode, InterruptionModeAndroid, InterruptionModeIOS, Audio } from "expo-av";
import { apiFetch } from "../lib/api/client";
import { useAuth } from "../contexts/AuthContext";

export function DigitalTwinAvatar() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Configure Expo AV audio routing so video plays silently
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
        });
    }, []);

    useEffect(() => {
        fetchState();
        // In a real app we might poll this every hour or bind it to a focus event
        const interval = setInterval(fetchState, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchState = async () => {
        try {
            // Don't set loading true on interval updates to avoid flicker
            if (!videoUrl) setLoading(true);
            setError(null);
            const res = await apiFetch<any>('/api/avatar/state');

            if (!res.success) throw new Error(res.error);

            if (res.data.videoUrl !== videoUrl) {
                setVideoUrl(res.data.videoUrl);
            }
        } catch (e: any) {
            if (e.message.includes("No avatar")) {
                setError("setup_required");
            } else {
                setError(e.message);
            }
        } finally {
            if (!videoUrl) setLoading(false);
        }
    };

    if (error === "setup_required" || !videoUrl) {
        return (
            <View className="items-center justify-center p-8">
                <View className="absolute inset-0 items-center justify-center">
                    <View className="h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
                </View>
                <View className="h-40 w-40 items-center justify-center rounded-full bg-gradient-to-tr from-purple-100 to-indigo-50 shadow-lg border-4 border-white/40 border-dashed">
                    <Text className="text-center font-bold text-indigo-400 text-sm px-4">Tap Settings to setup Avatar</Text>
                </View>
            </View>
        );
    }

    return (
        <View className="items-center justify-center p-8">
            {/* Aura Effect */}
            <View className="absolute inset-0 items-center justify-center">
                <View className="h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
            </View>

            <View className="items-center justify-center">
                {/* The dynamic video frame */}
                <View style={{ height: 160, width: 160, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 80, backgroundColor: '#000', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 4, borderColor: '#fff' }}>
                    {Platform.OS === 'web' ? (
                        <video
                            src={videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                        />
                    ) : (
                        <Video
                            key={videoUrl}
                            source={{ uri: videoUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode={ResizeMode.COVER}
                            isMuted={true}
                            shouldPlay={true}
                            isLooping={true}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}
