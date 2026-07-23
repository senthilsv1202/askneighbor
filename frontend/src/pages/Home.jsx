import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Star, Shield, MapPin, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import CategoryCard from '../components/CategoryCard.jsx';

export default function Home({ user, community }) {
  const [categories, setCategories] = useState([]);
  const [nearbyCommunities, setNearbyCommunities] = useState([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (user && community) {
      api.getNearbyCommunities().then(setNearbyCommunities).catch(() => {});
    }
  }, [user, community]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div>
      <section className="text-center py-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
          Find Trusted Local<br />
          <span className="text-primary-600">Recommendations</span>
        </h1>
        {community ? (
          <div className="flex items-center justify-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-primary-500" />
            <span className="text-lg text-slate-600">{community.name}</span>
            {community.city && <span className="text-slate-400">— {community.city}, {community.state}</span>}
          </div>
        ) : (
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Your community's go-to directory for doctors, handymen, restaurants, and more.
            Real recommendations from real neighbors.
          </p>
        )}

        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'pediatrician near Monroe Township' or 'plumber'..."
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            />
          </div>
        </form>
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Browse by Category</h2>
          <span className="text-sm text-slate-500">{categories.length} categories</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {nearbyCommunities.length > 0 && (
        <section className="mb-12 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Nearby Communities</h2>
          <p className="text-sm text-slate-500 mb-4">Browse recommendations from communities near you</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nearbyCommunities.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.city}{c.state ? `, ${c.state}` : ''}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-3 gap-6 py-12 border-t border-slate-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Community Driven</h3>
          <p className="text-sm text-slate-500">Real recommendations from your neighbors, not anonymous reviews</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Trusted Ratings</h3>
          <p className="text-sm text-slate-500">Every review comes from a verified community member</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Quality First</h3>
          <p className="text-sm text-slate-500">No paid placements — rankings are based purely on community feedback</p>
        </div>
      </section>
    </div>
  );
}
