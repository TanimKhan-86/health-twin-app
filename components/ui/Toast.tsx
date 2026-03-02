import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { Check, X, Bell, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../lib/design/useTheme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastConfig {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const { colors, mode } = useTheme();
    const [toast, setToast] = useState<ToastConfig | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        setToast({ id: Date.now().toString(), message, type });
    }, []);

    const hideToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
        ]).start(() => setToast(null));
    }, [fadeAnim, slideAnim]);

    useEffect(() => {
        if (toast) {
            fadeAnim.setValue(0);
            slideAnim.setValue(-100);

            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(slideAnim, {
                    toValue: Platform.OS === 'web' ? 40 : 60,
                    friction: 6,
                    useNativeDriver: true
                }),
            ]).start();

            const timer = setTimeout(hideToast, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, hideToast, fadeAnim, slideAnim]);

    const getIcon = (type: ToastType) => {
        const iconProps = { size: 18 };
        switch (type) {
            case 'success': return <Check {...iconProps} color={colors.system.green} />;
            case 'error': return <X {...iconProps} color={colors.system.red} />;
            case 'warning': return <AlertTriangle {...iconProps} color={colors.system.orange} />;
            default: return <Bell {...iconProps} color={colors.system.blue} />;
        }
    };

    const bgColor = mode === 'dark' ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.88)';
    const textColor = mode === 'dark' ? '#000000' : '#FFFFFF';

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        zIndex: 9999,
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                    pointerEvents="none"
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 9999,
                            backgroundColor: bgColor,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                            elevation: 10,
                        }}
                    >
                        {getIcon(toast.type)}
                        <Text style={{
                            color: textColor,
                            fontSize: 15,
                            fontFamily: 'Inter-Medium',
                            fontWeight: '500',
                        }}>
                            {toast.message}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};
