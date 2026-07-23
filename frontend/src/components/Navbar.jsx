import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Heart, LogOut, Users, ChevronDown, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Navbar({ user, community, myCommunities, onSwitchCommunity }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 hidden sm:block">AskNeighbor</span>
        </Link>

        {community && myCommunities.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[140px] truncate">{community.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">My Communities</p>
                {myCommunities.map((m) => (
                  <button
                    key={m.communities.id}
                    onClick={() => { onSwitchCommunity(m.communities); setShowDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${community.id === m.communities.id ? 'text-primary-600 font-medium' : 'text-slate-700'}`}
                  >
                    <span>{m.communities.name}</span>
                    {m.communities.city && <span className="text-xs text-slate-400">{m.communities.city}, {m.communities.state}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctors, handymen, restaurants..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/add" className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </Link>
              <Link to="/favorites" className="p-2 text-slate-500 hover:text-primary-600 transition-colors">
                <Heart className="w-5 h-5" />
              </Link>
              <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
