import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api.js';
import ProviderCard from '../components/ProviderCard.jsx';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('rating');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategory(slug).then(setCategory).catch(console.error);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    api.getProviders({ category: slug, sort })
      .then((res) => {
        setProviders(res.providers);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, sort]);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">{category?.name || slug}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{category?.name}</h1>
          {category?.description && (
            <p className="text-slate-600 mt-1">{category.description}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">{total} {total === 1 ? 'provider' : 'providers'} found</p>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="rating">Top Rated</option>
            <option value="reviews">Most Reviews</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg mb-2">No providers yet in this category</p>
          <Link to="/add" className="text-primary-600 font-medium hover:underline">
            Be the first to add one
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  );
}
