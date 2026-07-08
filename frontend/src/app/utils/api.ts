// frontend/src/utils/api.ts
// Central fetch helper for JourZy's backend API.
//
// Attaches the logged-in user's Supabase access token as a Bearer token so the
// backend can verify identity server-side. The backend derives the user id
// from this token — never send userId in bodies or query strings anymore.

import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
        },
    });
}