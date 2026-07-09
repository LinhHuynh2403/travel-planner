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

// Every rate limiter on the backend already sends a specific, user-readable
// message in its JSON body (e.g. "Rate limit reached for AI features. Try
// again in a bit.") — surface that instead of a generic "couldn't connect"
// text that hides what actually happened (rate limited vs. a real outage).
export async function friendlyErrorMessage(response: Response): Promise<string> {
    try {
        const data = await response.json();
        if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    } catch (e) {
        // response body wasn't JSON — fall through to the generic message
    }
    return "Sorry, I couldn't connect just now — try again in a moment.";
}