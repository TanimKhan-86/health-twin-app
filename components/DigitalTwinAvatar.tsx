import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Image, Platform, ActivityIndicator } from "react-native";
import { Video, ResizeMode, InterruptionModeAndroid, InterruptionModeIOS, Audio, AVPlaybackStatus } from "expo-av";
import { apiFetch } from "../lib/api/client";
import { useTheme } from "../lib/design/useTheme";

interface AvatarStatePayload {
    state: string;
    videoUrl?: string;
    imageUrl?: string | null;
    reasoning?: string;
}

interface DigitalTwinAvatarProps {
    /** Diameter of the circular avatar frame */
    size?: number;
    /** Fallback image URI (e.g. user profile photo) */
    fallbackImage?: string;
}

export function DigitalTwinAvatar({ size = 120, fallbackImage }: DigitalTwinAvatarProps) {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [avatarState, setAvatarState] = useState<string | null>(null);
    const [videoFailed, setVideoFailed] = useState(false);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
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

    /** Only allow http(s) and data: URIs */
    const isValidUri = (uri: string | null | undefined): uri is string =>
        !!uri && (uri.startsWith('http') || uri.startsWith('data:'));

    const fetchState = useCallback(async () => {
        try {
            if (!hasLoadedRef.current) setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const res = await apiFetch<AvatarStatePayload>(`/api/avatar/state?date=${encodeURIComponent(today)}`);

            if (res.success && res.data) {
                console.log('[Avatar] API response:', {
                    state: res.data.state,
                    videoUrl: res.data.videoUrl?.substring(0, 80),
                    imageUrl: res.data.imageUrl?.substring(0, 80),
                    isVideoValid: isValidUri(res.data.videoUrl),
                    isImageValid: isValidUri(res.data.imageUrl),
                });
                setAvatarState(res.data.state);
                const img = res.data.imageUrl;
                setImageUrl(isValidUri(img) ? img : null);
                const nextVideo = res.data.videoUrl;
                if (isValidUri(nextVideo)) {
                    setVideoUrl(prev => (prev === nextVideo ? prev : nextVideo));
                    setVideoFailed(false);
                } else {
                    console.warn('[Avatar] Video URL rejected by isValidUri:', nextVideo);
                    setVideoUrl(null);
                }
            }
        } catch (e) {
            console.warn('[Avatar] State fetch error:', e);
        } finally {
            if (!hasLoadedRef.current) {
                setLoading(false);
                hasLoadedRef.current = true;
            }
        }
    }, []);

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 60000);
        return () => clearInterval(interval);
    }, [fetchState]);

    const borderWidth = 3;
    const innerSize = size - borderWidth * 2;
    const borderRadius = size / 2;

    const showVideo = videoUrl && !videoFailed;
    const showImage = !showVideo && (imageUrl || fallbackImage);

    if (videoUrl) {
        console.log('[Avatar] Render state:', { videoUrl: videoUrl.substring(0, 80), videoFailed, showVideo, showImage, platform: Platform.OS });
    }
    const imageUri = imageUrl || fallbackImage;

    if (loading && !videoUrl && !imageUrl && !fallbackImage) {
        return (
            <View style={{
                width: size,
                height: size,
                borderRadius,
                backgroundColor: colors.fill.tertiary,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
        );
    }

    return (
        <View style={{
            width: size,
            height: size,
            borderRadius,
            borderWidth,
            borderColor: '#FFFFFF',
            overflow: 'hidden',
            backgroundColor: colors.fill.tertiary,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {showVideo ? (
                <Video
                    key={videoUrl!}
                    source={{ uri: videoUrl! }}
                    style={{
                        width: innerSize,
                        height: innerSize,
                        ...(Platform.OS === 'web' ? { borderRadius: innerSize / 2 } : {}),
                    }}
                    resizeMode={ResizeMode.COVER}
                    isMuted
                    shouldPlay
                    isLooping
                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                        if (status.isLoaded && !videoFailed) {
                            console.log('[Avatar] Video playing:', { isPlaying: status.isPlaying, positionMillis: status.positionMillis });
                        }
                    }}
                    onLoad={() => {
                        console.log('[Avatar] Video loaded successfully');
                        setVideoFailed(false);
                    }}
                    onError={(error) => {
                        console.error('[Avatar] Video error:', error);
                        setVideoFailed(true);
                    }}
                />
            ) : showImage && imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={{ width: innerSize, height: innerSize }}
                    resizeMode="cover"
                />
            ) : (
                <Text style={{
                    fontSize: size * 0.15,
                    fontFamily: 'Inter-Medium',
                    color: colors.text.tertiary,
                    textAlign: 'center',
                }}>
                    No avatar
                </Text>
            )}
        </View>
    );
}
