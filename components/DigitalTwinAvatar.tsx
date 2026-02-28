import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, ActivityIndicator, Platform, Image } from "react-native";
import { Video, ResizeMode, InterruptionModeAndroid, InterruptionModeIOS, Audio } from "expo-av";
import { apiFetch } from "../lib/api/client";

interface AvatarStatePayload {
    state: string;
    videoUrl?: string;
    imageUrl?: string | null;
    reasoning?: string;
}

export function DigitalTwinAvatar() {
    const [loading, setLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [videoFailed, setVideoFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        // Audio API is native-only — skip on web to prevent crash
        if (Platform.OS !== 'web') {
            Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: false,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                playThroughEarpieceAndroid: false,
            });
        }
    }, []);

    const fetchState = useCallback(async () => {
        try {
            if (!hasLoadedRef.current) setLoading(true);
            setError(null);
            const res = await apiFetch<AvatarStatePayload>('/api/avatar/state');

            if (!res.success) throw new Error(res.error);
            const nextImage = res.data?.imageUrl ?? null;
            const nextVideo = res.data?.videoUrl ?? null;
            setImageUrl(nextImage);

            if (nextVideo) {
                setVideoUrl(prev => (prev === nextVideo ? prev : nextVideo));
                setVideoFailed(false);
                return;
            }

            setVideoUrl(null);
            if (!nextImage) {
                throw new Error('No avatar media available yet');
            }
        } catch (e: any) {
            const message = e?.message || 'Failed to load avatar';
            if (message.includes("No avatar")) {
                setError("setup_required");
            } else {
                setError(message);
            }
        } finally {
            if (!hasLoadedRef.current) {
                setLoading(false);
                hasLoadedRef.current = true;
            }
        }
    }, []);

    useEffect(() => {
        fetchState();
        // Poll every minute to react to changing health/mood state.
        const interval = setInterval(fetchState, 60000);
        return () => clearInterval(interval);
    }, [fetchState]);

    if (loading && !videoUrl && !imageUrl) {
        return (
            <View className="items-center justify-center p-8">
                <ActivityIndicator size="small" color="#7c3aed" />
            </View>
        );
    }

    if (error === "setup_required" && !videoUrl && !imageUrl) {
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
                <View style={{ height: 160, width: 160, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 80, backgroundColor: '#ede9fe', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 4, borderColor: '#fff' }}>
                    {videoUrl && !videoFailed ? (Platform.OS === 'web' ? (
                        <video
                            src={videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            onError={() => setVideoFailed(true)}
                            onLoadedData={() => setVideoFailed(false)}
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
                            onLoad={() => setVideoFailed(false)}
                            onError={() => setVideoFailed(true)}
                        />
                    )) : imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <Text className="text-indigo-400 text-xs font-semibold px-4 text-center">Avatar loading...</Text>
                    )}
                </View>
            </View>
        </View>
    );
}
