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
        console.log("ScreenLayout: Rendering Gradient Background (Light Theme)");
        return (
            <LinearGradient
                // Purple (Primary) -> Light Purple -> White
                colors={["#8b5cf6", "#e9d5ff", "#ffffff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
                className="flex-1"
            >
                <StatusBar style="dark" />
                <SafeAreaView className={cn("flex-1", className)} {...props}>
                    {children}
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <View className={cn("flex-1 bg-white dark:bg-slate-950", className)} {...props}>
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1">
                {children}
            </SafeAreaView>
        </View>
    );
}
