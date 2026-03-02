import { View, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../lib/design/useTheme";

interface ScreenLayoutProps extends ViewProps {
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenLayout({
    children,
    style,
    edges = ['top', 'left', 'right'],
    ...props
}: ScreenLayoutProps) {
    const { mode, colors } = useTheme();

    return (
        <View style={[{ flex: 1, backgroundColor: colors.background.primary }, style]} {...props}>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <SafeAreaView style={{ flex: 1 }} edges={edges}>
                {children}
            </SafeAreaView>
        </View>
    );
}
