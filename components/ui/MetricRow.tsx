import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../lib/design/useTheme';

interface MetricRowProps {
    icon?: React.ReactNode;
    iconColor?: string;
    label: string;
    value: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'stable';
    trendColor?: string;
    showChevron?: boolean;
    showSeparator?: boolean;
    onPress?: () => void;
}

export function MetricRow({
    icon,
    iconColor,
    label,
    value,
    subtitle,
    trend,
    trendColor,
    showChevron = false,
    showSeparator = true,
    onPress,
}: MetricRowProps) {
    const { colors, typography: typo, spacing } = useTheme();

    const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    const defaultTrendColor = trend === 'up' ? colors.system.green : trend === 'down' ? colors.system.red : colors.gray[1];

    const content = (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: spacing.base,
            minHeight: 44,
        }}>
            {/* Icon */}
            {icon && (
                <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: (iconColor || colors.system.blue) + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                }}>
                    {icon}
                </View>
            )}

            {/* Label & subtitle */}
            <View style={{ flex: 1 }}>
                <Text style={{
                    fontSize: typo.body.fontSize,
                    lineHeight: typo.body.lineHeight,
                    fontFamily: 'Inter-Regular',
                    color: colors.text.primary,
                }}>
                    {label}
                </Text>
                {subtitle && (
                    <Text style={{
                        fontSize: typo.caption1.fontSize,
                        lineHeight: typo.caption1.lineHeight,
                        fontFamily: 'Inter-Regular',
                        color: colors.text.secondary,
                        marginTop: 2,
                    }}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* Value + trend */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {trend && (
                    <Text style={{
                        fontSize: typo.footnote.fontSize,
                        fontFamily: 'Inter-Medium',
                        color: trendColor || defaultTrendColor,
                    }}>
                        {trendSymbol}
                    </Text>
                )}
                <Text style={{
                    fontSize: typo.body.fontSize,
                    fontFamily: 'Inter-Medium',
                    color: colors.text.secondary,
                }}>
                    {value}
                </Text>
                {showChevron && (
                    <ChevronRight size={16} color={colors.gray[3]} style={{ marginLeft: 4 }} />
                )}
            </View>
        </View>
    );

    const separator = showSeparator ? (
        <View style={{
            height: 0.5,
            backgroundColor: colors.separatorNonOpaque,
            marginLeft: icon ? 60 : spacing.base,
        }} />
    ) : null;

    if (onPress) {
        return (
            <>
                <Pressable
                    onPress={onPress}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                    {content}
                </Pressable>
                {separator}
            </>
        );
    }

    return (
        <>
            {content}
            {separator}
        </>
    );
}
