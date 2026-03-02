import React from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../lib/design/useTheme';

interface SegmentedControlProps {
    segments: string[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export function SegmentedControl({ segments, selectedIndex, onSelect }: SegmentedControlProps) {
    const { colors, radii, typography: typo, shadows } = useTheme();

    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: colors.fill.secondary,
            borderRadius: radii.sm,
            padding: 2,
        }}>
            {segments.map((segment, index) => {
                const isSelected = index === selectedIndex;
                return (
                    <Pressable
                        key={segment}
                        onPress={() => onSelect(index)}
                        style={[
                            {
                                flex: 1,
                                paddingVertical: 7,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: radii.sm - 2,
                            },
                            isSelected && {
                                backgroundColor: colors.background.secondary,
                                ...shadows.sm,
                            },
                        ]}
                    >
                        <Text style={{
                            fontSize: typo.footnote.fontSize,
                            lineHeight: typo.footnote.lineHeight,
                            fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular',
                            fontWeight: isSelected ? '600' : '400',
                            color: isSelected ? colors.text.primary : colors.text.secondary,
                        }}>
                            {segment}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
