import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../lib/design/useTheme';

interface ListItemProps {
    icon?: React.ReactNode;
    iconBackgroundColor?: string;
    title: string;
    subtitle?: string;
    value?: string;
    showChevron?: boolean;
    showSeparator?: boolean;
    destructive?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    onPress?: () => void;
}

export function ListItem({
    icon,
    iconBackgroundColor,
    title,
    subtitle,
    value,
    showChevron = true,
    showSeparator = true,
    destructive = false,
    switchValue,
    onSwitchChange,
    onPress,
}: ListItemProps) {
    const { colors, typography: typo, spacing } = useTheme();

    const titleColor = destructive ? colors.system.red : colors.text.primary;

    const content = (
        <View>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: spacing.base,
                minHeight: 44,
            }}>
                {/* Icon */}
                {icon && (
                    <View style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        backgroundColor: iconBackgroundColor || colors.system.blue,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}>
                        {icon}
                    </View>
                )}

                {/* Title & subtitle */}
                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontSize: typo.body.fontSize,
                        lineHeight: typo.body.lineHeight,
                        fontFamily: 'Inter-Regular',
                        color: titleColor,
                    }}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={{
                            fontSize: typo.caption1.fontSize,
                            fontFamily: 'Inter-Regular',
                            color: colors.text.secondary,
                            marginTop: 1,
                        }}>
                            {subtitle}
                        </Text>
                    )}
                </View>

                {/* Right accessory */}
                {switchValue !== undefined && onSwitchChange ? (
                    <Switch
                        value={switchValue}
                        onValueChange={onSwitchChange}
                        trackColor={{
                            false: colors.fill.secondary,
                            true: colors.system.green,
                        }}
                        thumbColor="#FFFFFF"
                    />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {value && (
                            <Text style={{
                                fontSize: typo.body.fontSize,
                                fontFamily: 'Inter-Regular',
                                color: colors.text.secondary,
                            }}>
                                {value}
                            </Text>
                        )}
                        {showChevron && !destructive && (
                            <ChevronRight size={16} color={colors.gray[3]} />
                        )}
                    </View>
                )}
            </View>
            {/* Separator */}
            {showSeparator && (
                <View style={{
                    height: 0.5,
                    backgroundColor: colors.separatorNonOpaque,
                    marginLeft: icon ? 58 : spacing.base,
                }} />
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.fill.tertiary : 'transparent',
                })}
            >
                {content}
            </Pressable>
        );
    }

    return content;
}
