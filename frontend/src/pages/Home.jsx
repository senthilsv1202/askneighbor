import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Users, Star, Shield, MapPin, ArrowRight, PlusCircle, X, MessageSquare, Heart, Sparkles, HelpCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import CategoryCard from '../components/CategoryCard.jsx';
import ActivityFeed from '../components/ActivityFeed.jsx';

export default function Home({ user, community }) {
  const [categories, setCategories] = useState([]);
  const [nearbyCommunities, setNearbyCommunities] = useState([]);
  const [activity, setActivity] = useState(null);
  const [query, setQuery] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem('askneighbor_guide_seen');
    if (!seen) setShowGuide(true);
  }, []);

  // Counts are only meaningful once scoped to a community, so refetch when it resolves.
  useEffect(() => {
    api.getCategories(community?.id ? { community_id: community.id } : undefined)
      .then(setCategories)
      .catch(console.error);
  }, [community]);

  useEffect(() => {
    if (user && community) {
      api.getNearbyCommunities().then(setNearbyCommunities).catch(() => {});
      api.getCommunityActivity(community.id).then(setActivity).catch(() => {});
    }
  }, [user, community]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function dismissGuide() {
    setShowGuide(false);
    localStorage.setItem('askneighbor_guide_seen', 'true');
  }

  return (
    <div>
      {showGuide && (
        <section className="mb-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white relative">
          <button onClick={dismissGuide} className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold">Welcome to AskNeighbor!</h2>
          </div>
          <p className="text-white/90 text-sm mb-4">
            Your private community directory for trusted local recommendations. Here's how it works:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-4 h-4" />
                <span className="font-semibold text-sm">Search</span>
              </div>
              <p className="text-xs text-white/80">Find doctors, handymen, restaurants by name, category, or location</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <PlusCircle className="w-4 h-4" />
                <span className="font-semibold text-sm">Recommend</span>
              </div>
              <p className="text-xs text-white/80">Add a provider you trust — or paste a WhatsApp message and AI fills the details</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4" />
                <span className="font-semibold text-sm">Rate & Review</span>
              </div>
              <p className="text-xs text-white/80">Share your experience so neighbors can make informed decisions</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4" />
                <span className="font-semibold text-sm">Save Favorites</span>
              </div>
              <p className="text-xs text-white/80">Bookmark providers for quick access anytime you need them</p>
            </div>
          </div>
          <p className="text-xs text-white/60 mt-3 text-center">This guide shows once. Click the <HelpCircle className="w-3 h-3 inline" /> icon anytime to see it again.</p>
        </section>
      )}

      {user && (
        <section className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {community && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-primary-700">{community.name}</span>
              {community.city && <span className="text-xs text-slate-500">— {community.city}, {community.state}</span>}
            </div>
          )}
          <Link
            to="/create-community"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-primary-300 rounded-xl text-primary-600 hover:bg-primary-50 hover:border-primary-400 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Create New Community</span>
            <span className="text-xs text-slate-400 hidden sm:inline">— start a directory for your neighborhood</span>
          </Link>
          {!showGuide && (
            <button onClick={() => setShowGuide(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-slate-400 hover:text-primary-600 transition-colors" title="How to use AskNeighbor">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs">Help</span>
            </button>
          )}
        </section>
      )}

      <section className="text-center py-8">
        {/* Visitors get the question they already recognise from the group chat.
            Members are past being sold to, so they get a prompt to act on instead,
            personalised to the community they are actually browsing. */}
        {/* text-3xl on phones: the copy runs to four lines at 36px, pushing the
            search box (the actual CTA) below the fold. Desktop keeps text-5xl. */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-4">
          {user ? (
            <>
              What do you need today?<br />
              <span className="text-primary-600">
                {community?.name ? `${community.name} has answers.` : 'Your neighbors have answers.'}
              </span>
            </>
          ) : (
            <>
              Who&rsquo;s good around here?<br />
              <span className="text-primary-600">Your neighbors already answered.</span>
            </>
          )}
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          {user
            ? 'Ask in your own words — every answer comes from a neighbor who’s been there.'
            : 'The pediatrician, the handyman who actually shows up, the CPA who knows H-1B taxes — your community has recommended them all, and AskNeighbor keeps them searchable.'}
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-3">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'a pediatrician who takes Aetna and is good with newborns'"
              className="w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            />
          </div>
        </form>
        <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
          <Sparkles className="w-4 h-4 text-primary-500" />
          AI reads your neighbors&rsquo; reviews to answer — not the whole internet.
        </p>
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

      <ActivityFeed events={activity?.events} newThisWeek={activity?.new_this_week} />

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
