import { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, X, MapPin, Clock, Images, Upload, Loader2,
  ArrowLeft, Trash2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { downscaleToBase64, PHOTO_OPTS } from '../lib/image.js';

function prettyDate(iso) {
  // Parse as local rather than UTC: a plain YYYY-MM-DD run through Date() is
  // treated as midnight UTC and can display as the previous day.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function EventRow({ event, onOpen }) {
  return (
    <button
      onClick={() => onOpen(event.id)}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-primary-200 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />{prettyDate(event.event_date)}
            </span>
            {event.start_time && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{event.start_time}</span>
            )}
            {event.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
            )}
          </div>
          {event.description && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{event.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {event.photo_count > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
              <Images className="w-3.5 h-3.5" />{event.photo_count}
            </span>
          ) : (
            <span className="text-xs text-slate-400">No photos yet</span>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3">Posted by {event.created_by_name}</p>
    </button>
  );
}

function EventDetail({ eventId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => { load(); }, [eventId]);

  function load() {
    setLoading(true);
    api.getEvent(eventId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function upload(files) {
    const list = [...files];
    if (list.length === 0) return;
    setError('');
    setUploading(list.length);
    let failed = 0;
    // Sequential rather than parallel: phone uploads on mobile data are the slow
    // part, and a burst of large requests is more likely to fail partway.
    for (const file of list) {
      try {
        const { base64, media_type } = await downscaleToBase64(file, PHOTO_OPTS);
        await api.uploadEventPhoto(eventId, base64, media_type);
      } catch {
        failed += 1;
      }
      setUploading((n) => n - 1);
    }
    if (failed) setError(`${failed} photo${failed === 1 ? '' : 's'} could not be uploaded.`);
    load();
  }

  async function removePhoto(photoId) {
    try {
      await api.deleteEventPhoto(eventId, photoId);
      setLightbox(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data?.event) {
    return <p className="text-slate-500">{error || 'Event not found.'}</p>;
  }

  const { event, photos } = data;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> All events
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-2">
          <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />{prettyDate(event.event_date)}</span>
          {event.start_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.start_time}</span>}
          {event.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</span>}
        </div>
        {event.description && <p className="text-slate-600 mt-3 whitespace-pre-line">{event.description}</p>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-900">
          Photos {photos.length > 0 && <span className="text-slate-400 font-normal">{photos.length}</span>}
        </h2>
        <label className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" /> Add photos
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {uploading > 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading {uploading} photo{uploading === 1 ? '' : 's'}…
        </p>
      )}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {photos.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-slate-200">
          <Images className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-1">No photos yet</p>
          <p className="text-sm text-slate-500">
            {event.is_past
              ? 'Add yours — they stay here for good, unlike in the group chat.'
              : 'Photos can be added during or after the event.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
            >
              <img src={photo.url} alt={photo.caption || 'Event photo'} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="w-full max-h-[80vh] object-contain rounded-xl" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-white/70">Added by {lightbox.uploaded_by_name}</p>
              <button onClick={() => removePhoto(lightbox.id)} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-red-400">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Events({ community }) {
  const [openId, setOpenId] = useState(null);
  const [data, setData] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', event_date: '', start_time: '', location: '', description: '' });

  useEffect(() => { if (!openId) load(); }, [community, openId]);

  function load() {
    if (!community?.id) { setLoading(false); return; }
    setLoading(true);
    setError('');
    api.getEvents(community.id)
      .then((res) => { setData(res); setSetupRequired(false); })
      .catch((err) => {
        if (err.body?.setup_required) setSetupRequired(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) { setError('Title and date are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.createEvent({ ...form, community_id: community.id });
      setForm({ title: '', event_date: '', start_time: '', location: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  if (!community) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">Join a community to see its events.</p>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-700 font-medium mb-1">Events aren’t switched on yet</p>
        <p className="text-sm text-slate-500">
          Run <code className="px-1.5 py-0.5 bg-slate-100 rounded">events.sql</code> in the Supabase SQL editor to enable this page.
        </p>
      </div>
    );
  }

  if (openId) return <EventDetail eventId={openId} onBack={() => setOpenId(null)} />;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-600 mt-1">What’s on in {community.name}, and photos from what’s been</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border-2 border-primary-200 p-6 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">What’s happening? *</label>
            <input type="text" value={form.title} onChange={update('title')} placeholder="e.g., Diwali Celebration" className={input} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
              <input type="date" value={form.event_date} onChange={update('event_date')} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
              <input type="text" value={form.start_time} onChange={update('start_time')} placeholder="6:00 PM" className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Where</label>
              <input type="text" value={form.location} onChange={update('location')} placeholder="Clubhouse" className={input} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Details</label>
            <textarea value={form.description} onChange={update('description')} rows={2} placeholder="What to bring, who to contact, anything else." className={`${input} resize-none`} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Adding…' : 'Add event'}
          </button>
        </form>
      )}

      {error && !showForm && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.upcoming.length === 0 && data.past.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-1">No events yet</p>
          <p className="text-sm text-slate-500 mb-5">
            Trick or treat, Diwali, the summer carnival — add one and the photos stay here for good.
          </p>
          <button onClick={() => setShowForm(true)} className="text-primary-600 font-medium hover:underline">
            Add the first event
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {data.upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Coming up</h2>
              <div className="grid gap-4">
                {data.upcoming.map((e) => <EventRow key={e.id} event={e} onOpen={setOpenId} />)}
              </div>
            </section>
          )}
          {data.past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Past events</h2>
              <div className="grid gap-4">
                {data.past.map((e) => <EventRow key={e.id} event={e} onOpen={setOpenId} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
