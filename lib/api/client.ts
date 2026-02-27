import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_API_URL in your .env file:
//   LAN (Expo Go on phone):  http://192.168.x.x:4000
//   Android emulator:        http://10.0.2.2:4000
//   ngrok:                   https://xxxx.ngrok.io
//   Web (localhost):         http://localhost:4000
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'auth_token';

// ─── Token Helpers ────────────────────────────────────────────────────────────
export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── Core Fetch Wrapper ────────────────────────────────────────────────────────
interface ApiOptions extends RequestInit {
    auth?: boolean; // Set to true to include Authorization header
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    details?: { field: string; message: string }[];
    count?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

export async function apiFetch<T = unknown>(
    path: string,
    options: ApiOptions = {}
): Promise<ApiResponse<T>> {
    const { auth = false, ...fetchOptions } = options;
    const incomingHeaders = (fetchOptions.headers as Record<string, string> | undefined) ?? {};
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    const hasContentType = Object.keys(incomingHeaders).some(k => k.toLowerCase() === 'content-type');
    const headers: Record<string, string> = { ...incomingHeaders };
    if (!isFormData && !hasContentType) {
        headers['Content-Type'] = 'application/json';
    }

    // Always attach JWT if one is stored (protected routes need it, public routes ignore it)
    const token = await getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${path}`, {
            ...fetchOptions,
            headers,
        });

        let json: unknown;
        try {
            json = await response.json();
        } catch {
            return {
                success: false,
                error: `Server returned ${response.status}: ${response.statusText}`,
            };
        }

        if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            let details: { field: string; message: string }[] | undefined;
            if (isObject(json)) {
                if (typeof json.error === 'string') {
                    errorMessage = json.error;
                }
                if (Array.isArray(json.details)) {
                    details = json.details as { field: string; message: string }[];
                }
            }
            return {
                success: false,
                error: errorMessage,
                details,
            };
        }

        // Normalize wrapped payloads: { success, data, error }
        if (isObject(json) && hasOwn(json, 'success') && typeof json.success === 'boolean') {
            if (!json.success) {
                return {
                    success: false,
                    error: typeof json.error === 'string' ? json.error : 'Request failed',
                    details: Array.isArray(json.details) ? (json.details as { field: string; message: string }[]) : undefined,
                };
            }
            if (hasOwn(json, 'data')) {
                return { success: true, data: json.data as T };
            }
            return { success: true };
        }

        // Raw payloads (for routes that return objects directly)
        return { success: true, data: json as T };
    } catch (error: any) {
        console.error(`[API] ${path} crashed with:`, error?.message || error);
        return {
            success: false,
            error: error?.message || 'Network error – check your API URL and connection',
        };
    }
}
