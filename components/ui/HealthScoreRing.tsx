import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, getScoreColor, getScoreLabel } from '../../lib/design/useTheme';

interface HealthScoreRingProps {
    score: number;        // 0-100
    size?: number;        // diameter
    strokeWidth?: number;
    color?: string;       // override auto color
    label?: string;
    showLabel?: boolean;
    animated?: boolean;
    /** Custom content to render in the center (replaces default score text) */
    children?: React.ReactNode;
}

export function HealthScoreRing({
    score,
    size = 160,
    strokeWidth = 12,
    color,
    label,
    showLabel = true,
    animated = true,
    children,
}: HealthScoreRingProps) {
    const { mode, colors, typography: typo } = useTheme();
    const animatedValue = useRef(new Animated.Value(0)).current;

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedScore = Math.max(0, Math.min(100, score));
    const scoreColor = color || getScoreColor(clampedScore, mode);
    const scoreLabel = label || getScoreLabel(clampedScore);

    useEffect(() => {
        if (animated) {
            animatedValue.setValue(0);
            Animated.timing(animatedValue, {
                toValue: clampedScore,
                duration: 1000,
                useNativeDriver: false,
            }).start();
        } else {
            animatedValue.setValue(clampedScore);
        }
    }, [clampedScore, animated]);

    const strokeDashoffset = circumference - (circumference * clampedScore) / 100;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Background ring */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={scoreColor + '20'}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress ring */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={scoreColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </Svg>
            {/* Center content */}
            <View style={{
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {children ?? (
                    <>
                        <Text style={{
                            fontSize: size * 0.22,
                            lineHeight: size * 0.26,
                            fontFamily: 'Inter-Bold',
                            fontWeight: '700',
                            color: colors.text.primary,
                        }}>
                            {Math.round(clampedScore)}
                        </Text>
                        {showLabel && (
                            <Text style={{
                                fontSize: typo.caption1.fontSize,
                                lineHeight: typo.caption1.lineHeight,
                                fontFamily: 'Inter-Medium',
                                color: scoreColor,
                                marginTop: 2,
                            }}>
                                {scoreLabel}
                            </Text>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}
