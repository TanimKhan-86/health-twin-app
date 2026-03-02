import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/design/useTheme';

interface SectionHeaderProps {
    title: string;
    action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
    const { colors, typography: typo, spacing } = useTheme();

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.base,
            paddingTop: spacing.xl,
            paddingBottom: spacing.sm,
        }}>
            <Text style={{
                fontSize: typo.footnote.fontSize,
                lineHeight: typo.footnote.lineHeight,
                fontFamily: 'Inter-Regular',
                color: colors.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
            }}>
                {title}
            </Text>
            {action}
        </View>
    );
}
