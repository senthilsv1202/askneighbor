import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, MapPin, X, Images, Users } from 'lucide-react';
import { api } from '../lib/api.js';

function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// Viewable without an account, on purpose: someone tapping this from a group
// chat should see the photos immediately, not a password form for an account
// they set up months ago and cannot recover.
export default function PublicAlbum() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api.getAlbum(token)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Images className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-1">Album not available</h1>
        <p className="text-slate-500">This link may have been turned off, or it isn’t quite right.</p>
      </div>
    );
  }

  const { album, photos } = data;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">{album.title}</h1>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-2">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />{prettyDate(album.event_date)}
          </span>
          {album.location && (
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{album.location}</span>
          )}
          <span className="flex items-center gap-1"><Images className="w-4 h-4" />{album.photo_count} photos</span>
        </div>
        {album.description && <p className="text-slate-600 mt-3">{album.description}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No photos in this album yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
            >
              <img src={photo.url} alt={photo.caption || ''} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* The only pitch on the page, and it sits at the bottom. Someone who came
          for the photos should get the photos first. */}
      <div className="mt-12 pt-8 border-t border-slate-200 text-center">
        <div className="w-11 h-11 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-white" />
        </div>
        <p className="text-slate-700 font-medium mb-1">These photos live on AskNeighbor</p>
        <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
          Your community keeps its photos and trusted recommendations here, so they don’t vanish into the group chat.
        </p>
        <Link to="/" className="text-primary-600 font-medium hover:underline">
          Have a look
        </Link>
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.caption || ''}
            className="max-w-4xl w-full max-h-[85vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
