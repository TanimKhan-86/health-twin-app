import React from "react";
import { View, ViewProps } from "react-native";
import { useTheme } from "../../lib/design/useTheme";

interface CardProps extends Omit<ViewProps, 'style'> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    style?: ViewProps['style'];
}

export function Card({ padding = 'md', style, children, ...props }: CardProps) {
    const { colors, radii, shadows } = useTheme();

    const getPadding = () => {
        switch (padding) {
            case 'none': return 0;
            case 'sm': return 12;
            case 'md': return 16;
            case 'lg': return 20;
        }
    };

    return (
        <View
            style={[
                {
                    backgroundColor: colors.background.secondary,
                    borderRadius: radii.md,
                    padding: getPadding(),
                },
                shadows.sm,
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}
