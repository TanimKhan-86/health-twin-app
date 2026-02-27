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

        console.log('[AuthContext] Raw Register Response:', JSON.stringify(res));

        if (res.success && res.data) {
            await persistSession(res.data.token, res.data.user);
            return res.data.user;
        }

        // Sometimes the backend sends token at root level due to client.ts spread
        const rawRes = res as any;
        if (res.success && rawRes.token && rawRes.user) {
            await persistSession(rawRes.token, rawRes.user);
            return rawRes.user;
        }

        console.error('[AuthContext] Register failed. Success:', res.success, 'Error:', res.error);
        return null;
    };


    // ─── Login ──────────────────────────────────────────────────────────────────
    const login = async (email: string, password: string): Promise<AuthUser | null> => {
        console.log(`[AuthContext] Sending Login... Email: '${email}'`);
        const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        console.log('[AuthContext] Raw Login Response:', JSON.stringify(res));

        if (res.success && res.data) {
            await persistSession(res.data.token, res.data.user);
            return res.data.user;
        }

        // Fallback for flat structure
        const rawRes = res as any;
        if (res.success && rawRes.token && rawRes.user) {
            await persistSession(rawRes.token, rawRes.user);
            return rawRes.user;
        }

        console.error('[AuthContext] Login failed. Success:', res.success, 'Error:', res.error);
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

// ─── JWT Helpers (client-side decode – works in React Native without atob) ──────
function decodeJwt(token: string): { userId: string; exp: number } | null {
    try {
        const base64Url = token.split('.')[1];
        // Pad base64 to a multiple of 4 chars, replace URL-safe chars
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const padded = pad ? base64 + '='.repeat(4 - pad) : base64;

        // Use Buffer in Node/RN, fall back to atob in browser
        let jsonStr: string;
        if (typeof Buffer !== 'undefined') {
            jsonStr = Buffer.from(padded, 'base64').toString('utf8');
        } else {
            jsonStr = decodeURIComponent(
                atob(padded)
                    .split('')
                    .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                    .join('')
            );
        }
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
}

function isExpired(payload: { exp: number }): boolean {
    return payload.exp * 1000 < Date.now();
}
