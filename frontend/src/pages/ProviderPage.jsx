import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, MapPin, Phone, Globe, Mail, Heart, Clock, Shield, Flag, Pencil, X, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import StarRating from '../components/StarRating.jsx';

export default function ProviderPage({ user }) {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showRemovalForm, setShowRemovalForm] = useState(false);
  const [removalForm, setRemovalForm] = useState({ reason: '', requester_name: '', requester_email: '' });
  const [removalSubmitted, setRemovalSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getProvider(id)
      .then(setProvider)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user) {
      api.getFavorites()
        .then((favs) => setIsFavorite(favs.some((f) => f.provider_id === id)))
        .catch(() => {});
    }
  }, [user, id]);

  async function toggleFavorite() {
    if (!user) return;
    if (isFavorite) {
      await api.removeFavorite(id);
      setIsFavorite(false);
    } else {
      await api.addFavorite(id);
      setIsFavorite(true);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!reviewForm.rating) { setError('Please select a rating'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.createReview({ provider_id: id, ...reviewForm });
      const updated = await api.getProvider(id);
      setProvider(updated);
      setReviewForm({ rating: 0, title: '', body: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isOwner = user && provider?.added_by === user.id;

  function startEditing() {
    setEditForm({
      name: provider.name || '',
      phone: provider.phone || '',
      email: provider.email || '',
      website: provider.website || '',
      address: provider.address || '',
      city: provider.city || '',
      state: provider.state || '',
      zip_code: provider.zip_code || '',
      description: provider.description || '',
      services: (provider.services || []).join(', '),
      insurance_accepted: (provider.insurance_accepted || []).join(', '),
    });
    setEditing(true);
    setEditError('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      await api.updateProvider(id, {
        ...editForm,
        services: editForm.services ? editForm.services.split(',').map(s => s.trim()).filter(Boolean) : [],
        insurance_accepted: editForm.insurance_accepted ? editForm.insurance_accepted.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      const updated = await api.getProvider(id);
      setProvider(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return <div className="text-center py-20 text-slate-500">Provider not found</div>;
  }

  const category = provider.categories;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        {category && (
          <>
            <Link to={`/category/${category.slug}`} className="hover:text-primary-600">{category.name}</Link>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        <span className="text-slate-900 font-medium">{provider.name}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{provider.name}</h1>
            {category && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary-50 text-primary-700 text-sm font-medium rounded-full">
                {category.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && !editing && (
              <button onClick={startEditing} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            {user && (
              <button onClick={toggleFavorite} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <StarRating rating={Math.round(provider.avg_rating)} size={20} />
          <span className="text-xl font-bold text-slate-800">{Number(provider.avg_rating).toFixed(1)}</span>
          <span className="text-slate-500">({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})</span>
          {provider.is_verified && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <Shield className="w-4 h-4" /> Verified
            </span>
          )}
        </div>

        {provider.description && !editing && <p className="text-slate-600 mb-6">{provider.description}</p>}

        {editing && (
          <form onSubmit={saveEdit} className="mb-6 space-y-4 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800">Edit Provider</h3>
              <button type="button" onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                <input type="url" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
              <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                <input type="text" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} maxLength={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ZIP</label>
                <input type="text" value={editForm.zip_code} onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Services (comma-separated)</label>
              <input type="text" value={editForm.services} onChange={(e) => setEditForm({ ...editForm, services: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Insurance Accepted (comma-separated)</label>
              <input type="text" value={editForm.insurance_accepted} onChange={(e) => setEditForm({ ...editForm, insurance_accepted: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {editError && <p className="text-red-500 text-sm">{editError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {!editing && <div className="grid sm:grid-cols-2 gap-4">
          {provider.phone && (
            <a href={`tel:${provider.phone}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors">
              <Phone className="w-5 h-5 text-primary-600" />
              <span className="text-slate-700">{provider.phone}</span>
            </a>
          )}
          {provider.email && (
            <a href={`mailto:${provider.email}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors">
              <Mail className="w-5 h-5 text-primary-600" />
              <span className="text-slate-700">{provider.email}</span>
            </a>
          )}
          {provider.website && (
            <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-primary-50 transition-colors">
              <Globe className="w-5 h-5 text-primary-600" />
              <span className="text-slate-700 truncate">{provider.website}</span>
            </a>
          )}
          {provider.address && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-5 h-5 text-primary-600 shrink-0" />
              <span className="text-slate-700">{provider.address}{provider.city ? `, ${provider.city}` : ''}{provider.state ? `, ${provider.state}` : ''} {provider.zip_code}</span>
            </div>
          )}
        </div>

        }

        {!editing && provider.services?.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-800 mb-2">Services</h3>
            <div className="flex flex-wrap gap-2">
              {provider.services.map((s) => (
                <span key={s} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {provider.insurance_accepted?.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-slate-800 mb-2">Insurance Accepted</h3>
            <div className="flex flex-wrap gap-2">
              {provider.insurance_accepted.map((ins) => (
                <span key={ins} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">{ins}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Reviews ({provider.review_count})
        </h2>

        {provider.reviews?.length > 0 ? (
          <div className="space-y-4">
            {provider.reviews.map((review) => (
              <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-semibold text-primary-700">
                    {review.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{review.profiles?.full_name || 'Community Member'}</p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size={12} />
                      <span className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {review.title && <p className="font-medium text-slate-800 mb-1">{review.title}</p>}
                {review.body && <p className="text-sm text-slate-600">{review.body}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No reviews yet. Be the first to share your experience!</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Are you this provider?{' '}
            <button onClick={() => setShowRemovalForm(!showRemovalForm)} className="text-primary-600 hover:underline">
              <Flag className="w-3 h-3 inline" /> Request Removal
            </button>
          </p>
          <a href="/privacy" className="text-xs text-slate-400 hover:text-primary-600">Privacy Policy</a>
        </div>
        {showRemovalForm && !removalSubmitted && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const API = import.meta.env.VITE_API_URL || '';
                await fetch(`${API}/api/providers/${id}/removal-request`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(removalForm),
                });
                setRemovalSubmitted(true);
              } catch (_) {}
            }}
            className="mt-4 space-y-3"
          >
            <p className="text-sm text-slate-600">If you are this provider and want your listing removed, please fill out this form. We'll process your request within 48 hours.</p>
            <input type="text" placeholder="Your name" value={removalForm.requester_name} onChange={(e) => setRemovalForm({ ...removalForm, requester_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="email" placeholder="Your email (required)" value={removalForm.requester_email} onChange={(e) => setRemovalForm({ ...removalForm, requester_email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            <textarea placeholder="Reason for removal" value={removalForm.reason} onChange={(e) => setRemovalForm({ ...removalForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" rows={2} required />
            <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Submit Removal Request
            </button>
          </form>
        )}
        {removalSubmitted && (
          <p className="mt-3 text-sm text-green-600">Removal request submitted. We'll process it within 48 hours.</p>
        )}
      </div>

      {user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Write a Review</h2>
          <form onSubmit={submitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your Rating</label>
              <StarRating rating={reviewForm.rating} size={28} interactive onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                placeholder="Summarize your experience"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Review</label>
              <textarea
                value={reviewForm.body}
                onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                placeholder="Share details about your experience..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
