import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home as HomeIcon, Plus, X, ExternalLink, MapPin, BedDouble, Bath,
  CalendarDays, ShieldAlert, Clock, RefreshCw, Loader2, Phone,
} from 'lucide-react';
import { api } from '../lib/api.js';

const STATUS_LABEL = {
  active: 'Available',
  rented: 'Rented',
  sold: 'Sold',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

function money(value, type) {
  if (value == null) return null;
  const n = Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return type === 'rent' ? `$${n}/mo` : `$${n}`;
}

function ListingCard({ listing, onUpdate, busyId }) {
  const busy = busyId === listing.id;
  const closed = listing.status !== 'active';
  const price = money(listing.price, listing.listing_type);
  const place = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <article className={`bg-white rounded-2xl border p-5 ${closed ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              listing.listing_type === 'rent'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-teal-50 text-teal-700'
            }`}>
              For {listing.listing_type === 'rent' ? 'Rent' : 'Sale'}
            </span>
            {closed && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-500">
                {STATUS_LABEL[listing.status]}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 truncate">{listing.title}</h3>
        </div>
        {price && <p className="text-lg font-bold text-slate-900 shrink-0">{price}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-3">
        {listing.bedrooms != null && (
          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{listing.bedrooms} bd</span>
        )}
        {listing.bathrooms != null && (
          <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{listing.bathrooms} ba</span>
        )}
        {place && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{place}</span>}
        {listing.available_from && (
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Available {new Date(listing.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {listing.description && (
        <p className="text-sm text-slate-600 mb-3 whitespace-pre-line">{listing.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {listing.external_url && (
          <a
            href={listing.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:text-primary-700"
          >
            View full listing <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {listing.contact_phone && (
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Phone className="w-3.5 h-3.5" />{listing.contact_phone}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Posted by {listing.posted_by_name}
          {listing.status === 'active' && listing.days_left != null && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {listing.days_left === 0 ? 'expires today' : `expires in ${listing.days_left} ${listing.days_left === 1 ? 'day' : 'days'}`}
            </span>
          )}
        </p>

        {listing.is_mine && (
          <div className="flex items-center gap-2">
            {listing.status === 'active' ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => onUpdate(listing.id, { status: listing.listing_type === 'rent' ? 'rented' : 'sold' })}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Mark {listing.listing_type === 'rent' ? 'rented' : 'sold'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => onUpdate(listing.id, { status: 'withdrawn' })}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Withdraw
                </button>
              </>
            ) : (
              <button
                disabled={busy}
                onClick={() => onUpdate(listing.id, { renew: true })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" /> Repost for 30 days
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function FairHousingNotice({ result }) {
  if (!result || result.status === 'ok' || result.status === 'unscreened') return null;
  const blocking = result.status === 'violation';

  return (
    <div className={`rounded-xl border p-4 mb-4 ${blocking ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`flex items-center gap-2 mb-2 ${blocking ? 'text-red-700' : 'text-amber-700'}`}>
        <ShieldAlert className="w-4 h-4" />
        <p className="text-sm font-semibold">
          {blocking ? 'This wording is not allowed in a housing ad' : 'This wording could be read as discriminatory'}
        </p>
      </div>
      <ul className="space-y-1.5 mb-3">
        {(result.issues || []).map((issue, i) => (
          <li key={i} className="text-sm text-slate-700">
            <span className="font-medium">“{issue.phrase}”</span>
            {issue.characteristic && <span className="text-slate-500"> — {issue.characteristic}</span>}
            {issue.why && <p className="text-xs text-slate-500">{issue.why}</p>}
          </li>
        ))}
      </ul>
      {result.suggested_rewrite && (
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-500 mb-1">Suggested wording</p>
          <p className="text-sm text-slate-700">{result.suggested_rewrite}</p>
        </div>
      )}
    </div>
  );
}

export default function Housing({ community }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fairHousing, setFairHousing] = useState(null);
  const [form, setForm] = useState({
    listing_type: 'rent', title: '', description: '', price: '',
    bedrooms: '', bathrooms: '', city: '', state: '', available_from: '',
    external_url: '', contact_phone: '',
  });

  useEffect(() => { load(); }, [community, showClosed]);

  function load() {
    if (!community?.id) { setLoading(false); return; }
    setLoading(true);
    setError('');
    api.getListings({ community_id: community.id, include_closed: showClosed ? 'true' : 'false' })
      .then((res) => { setListings(res.listings || []); setSetupRequired(false); })
      .catch((err) => {
        if (err.body?.setup_required) setSetupRequired(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function onUpdate(id, patch) {
    setBusyId(id);
    try {
      await api.updateListing(id, patch);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Give the listing a title'); return; }
    setSubmitting(true);
    setFormError('');
    setFairHousing(null);
    try {
      const res = await api.createListing({ ...form, community_id: community.id });
      setFairHousing(res.fair_housing?.status === 'caution' ? res.fair_housing : null);
      setShowForm(false);
      setForm({
        listing_type: 'rent', title: '', description: '', price: '',
        bedrooms: '', bathrooms: '', city: '', state: '', available_from: '',
        external_url: '', contact_phone: '',
      });
      load();
    } catch (err) {
      // 422 carries the fair-housing findings that caused the rejection.
      if (err.body?.fair_housing) setFairHousing(err.body.fair_housing);
      else setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';

  if (!community) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">Join a community to see homes for sale or rent.</p>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <HomeIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-700 font-medium mb-1">Housing listings aren’t switched on yet</p>
        <p className="text-sm text-slate-500">Run <code className="px-1.5 py-0.5 bg-slate-100 rounded">listings.sql</code> in the Supabase SQL editor to enable this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Homes</h1>
          <p className="text-slate-600 mt-1">For sale or rent in {community.name}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFairHousing(null); setFormError(''); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Post a home'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-primary-200 p-6 mb-6">
          <FairHousingNotice result={fairHousing} />

          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-2">
              {['rent', 'sale'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, listing_type: t })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.listing_type === t ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  For {t === 'rent' ? 'rent' : 'sale'}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={update('title')} placeholder="e.g., 3BR townhouse near the clubhouse" className={input} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{form.listing_type === 'rent' ? 'Rent / month' : 'Price'}</label>
                <input type="number" value={form.price} onChange={update('price')} placeholder="3200" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bedrooms</label>
                <input type="number" step="0.5" value={form.bedrooms} onChange={update('bedrooms')} placeholder="3" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bathrooms</label>
                <input type="number" step="0.5" value={form.bathrooms} onChange={update('bathrooms')} placeholder="2.5" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Available from</label>
                <input type="date" value={form.available_from} onChange={update('available_from')} className={input} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Details</label>
              <textarea
                value={form.description}
                onChange={update('description')}
                rows={3}
                placeholder="Describe the home and the terms — lease length, deposit, parking, utilities."
                className={`${input} resize-none`}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Link (Zillow, Redfin, …)</label>
                <input type="url" value={form.external_url} onChange={update('external_url')} placeholder="https://zillow.com/..." className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact phone</label>
                <input type="tel" value={form.contact_phone} onChange={update('contact_phone')} placeholder="(732) 555-0100" className={input} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <input type="text" value={form.city} onChange={update('city')} placeholder="Monroe Township" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                <input type="text" value={form.state} onChange={update('state')} placeholder="NJ" maxLength={2} className={input} />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Housing ads are covered by the Fair Housing Act and New Jersey’s Law Against Discrimination.
                Describe <span className="font-medium">the home and the terms</span>, never a preferred kind of tenant or buyer.
                Wording is checked automatically before posting. Listings expire after 30 days.
              </p>
            </div>

            {formError && <p className="text-red-500 text-sm">{formError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking wording…</> : 'Post listing'}
            </button>
          </form>
        </div>
      )}

      {!showForm && fairHousing?.status === 'caution' && (
        <FairHousingNotice result={fairHousing} />
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {listings.filter((l) => l.status === 'active').length} available
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="rounded" />
          Show my past listings
        </label>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <HomeIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-1">No homes listed right now</p>
          <p className="text-sm text-slate-500 mb-5">
            Selling or renting? Neighbors see it here instead of losing it in the group chat.
          </p>
          <button onClick={() => setShowForm(true)} className="text-primary-600 font-medium hover:underline">
            Post the first one
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onUpdate={onUpdate} busyId={busyId} />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-8">
        AskNeighbor hosts these listings but does not verify them.
        Arrange viewings and payments directly, and never send a deposit before seeing a home.
      </p>
    </div>
  );
}
