import { supabase } from './supabase.js';

const API = import.meta.env.VITE_API_URL || '';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...await authHeaders(), ...options.headers };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getCategories: () => request('/api/categories'),
  getCategory: (slug) => request(`/api/categories/${slug}`),
  getProviders: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/providers?${qs}`);
  },
  getProvider: (id) => request(`/api/providers/${id}`),
  createProvider: (data) => request('/api/providers', { method: 'POST', body: JSON.stringify(data) }),
  getReviews: (providerId) => request(`/api/reviews/provider/${providerId}`),
  createReview: (data) => request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  getFavorites: () => request('/api/favorites'),
  addFavorite: (provider_id) => request('/api/favorites', { method: 'POST', body: JSON.stringify({ provider_id }) }),
  removeFavorite: (providerId) => request(`/api/favorites/${providerId}`, { method: 'DELETE' }),
};
