import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../lib/api.js';
import ProviderCard from '../components/ProviderCard.jsx';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    setLoading(true);
    api.getProviders({ q: query })
      .then((res) => {
        setProviders(res.providers);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Search results for "{query}"</h1>
          <p className="text-sm text-slate-500">{total} {total === 1 ? 'result' : 'results'} found</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg mb-2">No results found for "{query}"</p>
          <p className="text-slate-400">Try a different search term or browse categories from the home page</p>
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
