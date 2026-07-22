import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Heart, LogOut, Users } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Navbar({ user }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

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
