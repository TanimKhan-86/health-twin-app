import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getHealthHistory, getMoodHistory } from "../../../lib/api/auth";
import { HealthEntry, MoodEntry } from "./analyticsUtils";

export function useAnalyticsHistoryData(limit = 60) {
    const [loading, setLoading] = useState(true);
    const [allHealth, setAllHealth] = useState<HealthEntry[]>([]);
    const [allMood, setAllMood] = useState<MoodEntry[]>([]);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [health, mood] = await Promise.all([
                getHealthHistory(limit),
                getMoodHistory(limit),
            ]);
            setAllHealth(health as HealthEntry[]);
            setAllMood(mood as MoodEntry[]);
        } catch (e) {
            console.error("Analytics load", e);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useFocusEffect(
        useCallback(() => {
            reload();
        }, [reload])
    );

    return {
        loading,
        allHealth,
        allMood,
        reload,
    };
}
