import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../lib/api.js';
import ProviderCard from '../components/ProviderCard.jsx';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFavorites()
      .then((data) => setFavorites(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold text-slate-900">My Favorites</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg mb-2">No favorites yet</p>
          <p className="text-slate-400">Browse providers and tap the heart icon to save them here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {favorites.map((fav) => (
            <ProviderCard key={fav.id} provider={fav.providers} />
          ))}
        </div>
      )}
    </div>
  );
}
