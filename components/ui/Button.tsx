import React from "react";
import { Text, Pressable, PressableProps, ActivityIndicator, View } from "react-native";
import { useTheme } from "../../lib/design/useTheme";

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends Omit<PressableProps, 'style'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    label?: string;
    icon?: React.ReactNode;
    isLoading?: boolean;
    fullWidth?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'default',
    label,
    icon,
    isLoading = false,
    fullWidth = false,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const { colors, radii, shadows, typography: typo } = useTheme();

    const getBackgroundColor = () => {
        if (disabled || isLoading) {
            switch (variant) {
                case 'primary': return colors.system.blue + '80';
                case 'destructive': return colors.system.red + '80';
                default: return 'transparent';
            }
        }
        switch (variant) {
            case 'primary': return colors.system.blue;
            case 'secondary': return colors.fill.secondary;
            case 'destructive': return colors.system.red;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'primary': return '#FFFFFF';
            case 'destructive': return '#FFFFFF';
            case 'secondary': return colors.system.blue;
            case 'outline': return colors.system.blue;
            case 'ghost': return colors.system.blue;
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') return colors.separator;
        return 'transparent';
    };

    const getHeight = () => {
        switch (size) {
            case 'sm': return 36;
            case 'lg': return 50;
            case 'icon': return 44;
            case 'default': return 44;
        }
    };

    const getPaddingHorizontal = () => {
        switch (size) {
            case 'sm': return 16;
            case 'lg': return 32;
            case 'icon': return 0;
            case 'default': return 20;
        }
    };

    return (
        <Pressable
            disabled={disabled || isLoading}
            style={({ pressed }) => [
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: getHeight(),
                    paddingHorizontal: getPaddingHorizontal(),
                    backgroundColor: getBackgroundColor(),
                    borderRadius: size === 'icon' ? radii.md : radii.full,
                    borderWidth: variant === 'outline' ? 1 : 0,
                    borderColor: getBorderColor(),
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    width: size === 'icon' ? 44 : fullWidth ? '100%' : undefined,
                    minWidth: 44,
                },
                variant === 'primary' && !disabled ? shadows.sm : {},
            ]}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
                <>
                    {icon && <View style={{ marginRight: label ? 8 : 0 }}>{icon}</View>}
                    {label && (
                        <Text style={{
                            color: getTextColor(),
                            fontSize: typo.headline.fontSize,
                            lineHeight: typo.headline.lineHeight,
                            fontFamily: 'Inter-SemiBold',
                            fontWeight: '600',
                        }}>
                            {label}
                        </Text>
                    )}
                    {children}
                </>
            )}
        </Pressable>
    );
}
