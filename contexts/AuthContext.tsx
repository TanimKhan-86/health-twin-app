import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, removeToken, setToken } from '../lib/api/client';
import { apiFetch } from '../lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    age?: number;
    heightCm?: number;
    weightKg?: number;
    profileImage?: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<AuthUser | null>;
    register: (
        name: string,
        email: string,
        password: string,
        profile?: { age?: number; heightCm?: number; weightKg?: number; profileImage?: string }
    ) => Promise<AuthUser | null>;
    logout: () => Promise<void>;
}


// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
interface AuthProviderProps { children: ReactNode; }

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ─── Auto-login on app start ────────────────────────────────────────────────
    useEffect(() => {
        async function restoreSession() {
            try {
                const storedToken = await getToken();
                if (!storedToken) return;

                // Validate token is still good by calling health or a /me endpoint
                // We decode the JWT payload to get user info (no extra endpoint needed)
                const payload = decodeJwt(storedToken);
                if (!payload || isExpired(payload)) {
                    console.log('[Auth] Token expired, clearing session');
                    await removeToken();
                    await AsyncStorage.multiRemove(['USER_ID', 'USER_NAME', 'USER_EMAIL', 'USER_PROFILE_IMAGE']);
                    return;
                }

                // Restore user from AsyncStorage (cached on login/register)
                const [id, name, email, profileImage] = await AsyncStorage.multiGet(
                    ['USER_ID', 'USER_NAME', 'USER_EMAIL', 'USER_PROFILE_IMAGE']
                ).then(entries => entries.map(([, v]) => v ?? ''));

                if (id && name && email) {
                    setUser({ id, name, email, profileImage: profileImage || undefined });
                    setTokenState(storedToken);
                    console.log(`[Auth] Session restored: ${name}`);
                } else {
                    // Cached info missing, force re-login
                    await removeToken();
                }
            } catch (e) {
                console.warn('[Auth] Session restore error:', e);
            } finally {
                setIsLoading(false);
            }
        }
        restoreSession();
    }, []);

    // ─── Register ───────────────────────────────────────────────────────────────
    const register = async (
        name: string,
        email: string,
        password: string,
        profile?: { age?: number; heightCm?: number; weightKg?: number; profileImage?: string }
    ): Promise<AuthUser | null> => {
        const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, ...profile }),
        });
        if (res.success && res.data) {
            await persistSession(res.data.token, res.data.user);
            return res.data.user;
        }
        console.error('[Auth] Register failed:', res.error, res.details);
        return null;
    };


    // ─── Login ──────────────────────────────────────────────────────────────────
    const login = async (email: string, password: string): Promise<AuthUser | null> => {
        const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (res.success && res.data) {
            await persistSession(res.data.token, res.data.user);
            return res.data.user;
        }
        console.error('[Auth] Login failed:', res.error);
        return null;
    };

    // ─── Logout ─────────────────────────────────────────────────────────────────
    const logout = async (): Promise<void> => {
        await removeToken();
        await AsyncStorage.multiRemove(['USER_ID', 'USER_NAME', 'USER_EMAIL', 'USER_PROFILE_IMAGE']);
        setUser(null);
        setTokenState(null);
        console.log('[Auth] Logged out');
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────────
    async function persistSession(jwtToken: string, authUser: AuthUser) {
        await setToken(jwtToken);
        await AsyncStorage.multiSet([
            ['USER_ID', authUser.id],
            ['USER_NAME', authUser.name],
            ['USER_EMAIL', authUser.email],
            ['USER_PROFILE_IMAGE', authUser.profileImage ?? ''],
        ]);
        setUser(authUser);
        setTokenState(jwtToken);
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── JWT Helpers (client-side decode – no library needed) ─────────────────────
function decodeJwt(token: string): { userId: string; exp: number } | null {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded;
    } catch {
        return null;
    }
}

function isExpired(payload: { exp: number }): boolean {
    return payload.exp * 1000 < Date.now();
}
