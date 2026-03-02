import React from 'react';
import { Pressable, PressableProps, Animated } from 'react-native';

interface AnimatedPressableProps extends PressableProps {
    scaleValue?: number;
}

export function AnimatedPressable({
    children,
    scaleValue = 0.97,
    style,
    ...props
}: AnimatedPressableProps) {
    const scale = React.useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
        Animated.spring(scale, {
            toValue: scaleValue,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    return (
        <Pressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            {...props}
        >
            <Animated.View style={[{ transform: [{ scale }] }, style as any]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}
