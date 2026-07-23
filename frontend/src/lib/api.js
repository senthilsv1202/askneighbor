import { supabase, isDemoMode } from './supabase.js';
import { demoApi } from './demo-data.js';

const API = import.meta.env.VITE_API_URL || '';

async function authHeaders() {
  if (!supabase) return {};
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

const liveApi = {
  getCategories: () => request('/api/categories'),
  getCategory: (slug) => request(`/api/categories/${slug}`),
  getProviders: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/providers?${qs}`);
  },
  getProvider: (id) => request(`/api/providers/${id}`),
  createProvider: (data) => request('/api/providers', { method: 'POST', body: JSON.stringify(data) }),
  updateProvider: (id, data) => request(`/api/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getReviews: (providerId) => request(`/api/reviews/provider/${providerId}`),
  createReview: (data) => request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  getFavorites: () => request('/api/favorites'),
  addFavorite: (provider_id) => request('/api/favorites', { method: 'POST', body: JSON.stringify({ provider_id }) }),
  removeFavorite: (providerId) => request(`/api/favorites/${providerId}`, { method: 'DELETE' }),
  validateInvite: (code) => request('/api/invites/validate', { method: 'POST', body: JSON.stringify({ code }) }),
  joinCommunity: (code) => request('/api/invites/join', { method: 'POST', body: JSON.stringify({ code }) }),
  createCommunity: (data) => request('/api/communities', { method: 'POST', body: JSON.stringify(data) }),
  getMyCommunities: () => request('/api/communities/my'),
  generateInvite: (data) => request('/api/invites/generate', { method: 'POST', body: JSON.stringify(data) }),
  getNearbyCommunities: () => request('/api/communities/nearby'),
  getCommunityMembers: (id) => request(`/api/communities/${id}/members`),
  parseMessage: (message) => request('/api/parse/message', { method: 'POST', body: JSON.stringify({ message }) }),
  parseChatExport: (text) => request('/api/parse/chat-export', { method: 'POST', body: JSON.stringify({ text }) }),
};

export const api = isDemoMode ? demoApi : liveApi;
