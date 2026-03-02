import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, getScoreColor } from '../../lib/design/useTheme';
import { HealthScoreRing } from './HealthScoreRing';
import { Card } from './Card';

interface ScoreCardProps {
    score: number;
    title: string;
    subtitle?: string;
    ringSize?: number;
    color?: string;
}

export function ScoreCard({ score, title, subtitle, ringSize = 100, color }: ScoreCardProps) {
    const { colors, mode, typography: typo } = useTheme();
    const scoreColor = color || getScoreColor(score, mode);

    return (
        <Card padding="md" style={{ alignItems: 'center', gap: 8 }}>
            <HealthScoreRing
                score={score}
                size={ringSize}
                strokeWidth={8}
                color={scoreColor}
                showLabel={false}
            />
            <Text style={{
                fontSize: typo.headline.fontSize,
                lineHeight: typo.headline.lineHeight,
                fontFamily: 'Inter-SemiBold',
                color: colors.text.primary,
                textAlign: 'center',
            }}>
                {title}
            </Text>
            {subtitle && (
                <Text style={{
                    fontSize: typo.caption1.fontSize,
                    fontFamily: 'Inter-Regular',
                    color: colors.text.secondary,
                    textAlign: 'center',
                }}>
                    {subtitle}
                </Text>
            )}
        </Card>
    );
}
