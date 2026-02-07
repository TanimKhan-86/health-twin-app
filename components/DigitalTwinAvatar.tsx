import React from "react";
import { View } from "react-native";

export function DigitalTwinAvatar() {
    return (
        <View className="items-center justify-center p-8">
            {/* Aura Effect */}
            <View className="absolute inset-0 items-center justify-center">
                <View className="h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
            </View>

            <View className="items-center justify-center">
                {/* Simple geometric representation of the avatar for now */}
                <View className="h-40 w-40 items-center justify-center rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary shadow-lg border-4 border-white/20">
                    <View className="h-32 w-32 rounded-full bg-white/10" />
                </View>
            </View>
        </View>
    );
}
