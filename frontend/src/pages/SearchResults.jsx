import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Sparkles, AlertCircle, PlusCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import ProviderCard from '../components/ProviderCard.jsx';

export default function SearchResults({ community, user }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [providers, setProviders] = useState([]);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    setAi(null);

    const body = { q: query };
    if (community?.id) { body.community_id = community.id; body.nearby = 'true'; }

    api.aiSearch(body)
      .then((res) => {
        setProviders(res.providers || []);
        setAi(res.ai || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query, community?.id]);

  const matchById = new Map((ai?.matches || []).map((m) => [m.id, m]));
  const topMatches = providers.filter((p) => matchById.has(p.id));
  const otherResults = providers.filter((p) => !matchById.has(p.id));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">“{query}”</h1>
          <p className="text-sm text-slate-500">
            {providers.length} {providers.length === 1 ? 'result' : 'results'} from your community
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Reading your neighbors' recommendations…</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">
            {user ? 'Something went wrong with that search.' : 'Sign in to search your community directory.'}
          </p>
          {!user && (
            <Link to="/auth" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in or join with an invite code
            </Link>
          )}
        </div>
      ) : (
        <>
          {ai && (ai.answer || ai.gap) && (
            <section className="mb-8 bg-white rounded-2xl border-2 border-primary-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h2 className="font-bold text-slate-900">What your neighbors say</h2>
              </div>

              {ai.answer && <p className="text-slate-700 leading-relaxed mb-4">{ai.answer}</p>}

              {ai.gap && (
                <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  {ai.gap}
                </p>
              )}

              {topMatches.length > 0 && (
                <div className="grid gap-3">
                  {topMatches.map((provider, i) => {
                    const match = matchById.get(provider.id);
                    return (
                      <div key={provider.id} className="flex gap-3">
                        <div className="w-7 h-7 shrink-0 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <ProviderCard provider={provider} />
                          <p className="text-sm text-slate-600 mt-2 pl-1">{match.why}</p>
                          {match.caveat && (
                            <p className="text-sm text-amber-700 mt-1 pl-1">Worth knowing: {match.caveat}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {otherResults.length > 0 && (
            <section>
              {topMatches.length > 0 && (
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Other results
                </h2>
              )}
              <div className="grid gap-4">
                {otherResults.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </section>
          )}

          {providers.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-600 text-lg mb-2">
                No one has recommended anyone for “{query}” yet.
              </p>
              <p className="text-slate-500 mb-5">
                Your community's directory only knows what neighbors have added.
              </p>
              <Link
                to="/add"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Be the first to add one
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
