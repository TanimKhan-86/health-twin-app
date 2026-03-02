import React from "react";
import { TextInput, TextInputProps, View, Text } from "react-native";
import { useTheme } from "../../lib/design/useTheme";

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
    const { colors, radii, typography: typo } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            {label && (
                <Text style={{
                    fontSize: typo.subheadline.fontSize,
                    lineHeight: typo.subheadline.lineHeight,
                    fontFamily: 'Inter-Medium',
                    color: colors.text.secondary,
                }}>
                    {label}
                </Text>
            )}
            <TextInput
                placeholderTextColor={colors.text.quaternary}
                style={[
                    {
                        height: 44,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: error ? colors.system.red : colors.separator,
                        backgroundColor: colors.background.secondary,
                        paddingHorizontal: 12,
                        fontSize: typo.body.fontSize,
                        fontFamily: 'Inter-Regular',
                        color: colors.text.primary,
                    },
                    style,
                ]}
                {...props}
            />
            {error && (
                <Text style={{
                    fontSize: typo.caption1.fontSize,
                    fontFamily: 'Inter-Regular',
                    color: colors.system.red,
                }}>
                    {error}
                </Text>
            )}
        </View>
    );
}
