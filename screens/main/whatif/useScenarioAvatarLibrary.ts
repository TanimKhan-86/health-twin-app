import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api/client";
import {
    hasAllScenarioStates,
    normalizeStateVideos,
    SCENARIO_STATES,
    ScenarioAvatarState,
} from "./scenarioUtils";

interface AvatarLibraryResponse {
    imageUrl?: string | null;
    videoByState?: Record<string, string>;
}

interface AvatarStateResponse {
    state?: string;
    videoUrl?: string;
    imageUrl?: string | null;
    videoByState?: Record<string, string>;
}

export function useScenarioAvatarLibrary() {
    const [avatarLoading, setAvatarLoading] = useState(true);
    const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
    const [avatarVideoByState, setAvatarVideoByState] = useState<Partial<Record<ScenarioAvatarState, string>>>({});

    const reloadAvatarLibrary = useCallback(async () => {
        try {
            setAvatarLoading(true);
            let resolvedImageUrl: string | null = null;
            let resolvedVideos: Partial<Record<ScenarioAvatarState, string>> = {};

            const library = await apiFetch<AvatarLibraryResponse>('/api/avatar/library');
            if (library.success && library.data) {
                resolvedImageUrl = library.data.imageUrl ?? resolvedImageUrl;
                resolvedVideos = { ...resolvedVideos, ...normalizeStateVideos(library.data.videoByState || {}) };
            }

            const fallback = await apiFetch<AvatarStateResponse>('/api/avatar/state');
            if (fallback.success && fallback.data) {
                resolvedImageUrl = fallback.data.imageUrl ?? resolvedImageUrl;
                resolvedVideos = { ...resolvedVideos, ...normalizeStateVideos(fallback.data.videoByState || {}) };
                const state = fallback.data.state as ScenarioAvatarState | undefined;
                const videoUrl = fallback.data.videoUrl;
                if (state && videoUrl) {
                    resolvedVideos[state] = videoUrl;
                }
            }

            if (!hasAllScenarioStates(resolvedVideos)) {
                const missingStates = SCENARIO_STATES.filter((state) => !resolvedVideos[state]);
                const stateFetches = await Promise.all(
                    missingStates.map(async (state) => {
                        const response = await apiFetch<AvatarStateResponse>(
                            `/api/avatar/state?state=${encodeURIComponent(state)}`
                        );
                        if (!response.success || !response.data?.videoUrl) return null;
                        return {
                            state,
                            videoUrl: response.data.videoUrl,
                            imageUrl: response.data.imageUrl ?? null,
                        };
                    })
                );

                for (const result of stateFetches) {
                    if (!result) continue;
                    resolvedVideos[result.state] = result.videoUrl;
                    if (!resolvedImageUrl && result.imageUrl) {
                        resolvedImageUrl = result.imageUrl;
                    }
                }
            }

            setAvatarImageUrl(resolvedImageUrl);
            setAvatarVideoByState(resolvedVideos);
        } catch (e) {
            console.warn('Avatar library load error:', e);
        } finally {
            setAvatarLoading(false);
        }
    }, []);

    useEffect(() => {
        reloadAvatarLibrary();
    }, [reloadAvatarLibrary]);

    return {
        avatarLoading,
        avatarImageUrl,
        avatarVideoByState,
        reloadAvatarLibrary,
    };
}
