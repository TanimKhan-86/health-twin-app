import { View, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { cn } from "../lib/utils";

interface ScreenLayoutProps extends ViewProps {
    gradientBackground?: boolean;
}

export function ScreenLayout({
    children,
    className,
    gradientBackground = true,
    ...props
}: ScreenLayoutProps) {
    if (gradientBackground) {
        return (
            <LinearGradient
                // Figma-matched: soft lavender → light purple → near-white
                colors={["#c4b5fd", "#ddd6fe", "#f5f3ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ flex: 1 }}
            >
                <StatusBar style="dark" />
                <SafeAreaView className={cn("flex-1", className)} {...props}>
                    {children}
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <View className={cn("flex-1 bg-violet-50", className)} {...props}>
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1">
                {children}
            </SafeAreaView>
        </View>
    );
}
