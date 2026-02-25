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

export async function apiFetch<T = unknown>(
    path: string,
    options: ApiOptions = {}
): Promise<ApiResponse<T>> {
    const { auth = false, ...fetchOptions } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

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

        const json: ApiResponse<T> = await response.json();
        return json;
    } catch (error) {
        console.error(`[API] ${path} failed:`, error);
        return {
            success: false,
            error: 'Network error – check your API URL and connection',
        };
    }
}
