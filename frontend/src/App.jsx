import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, isDemoMode } from './lib/supabase.js';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import ProviderPage from './pages/ProviderPage.jsx';
import AddProvider from './pages/AddProvider.jsx';
import SearchResults from './pages/SearchResults.jsx';
import Auth from './pages/Auth.jsx';
import Favorites from './pages/Favorites.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />
      {isDemoMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          Running in demo mode with sample data. Connect Supabase to enable sign-in, reviews, and favorites.
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<CategoryPage user={user} />} />
          <Route path="/provider/:id" element={<ProviderPage user={user} />} />
          <Route path="/add" element={user ? <AddProvider /> : <Auth />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/favorites" element={user ? <Favorites /> : <Auth />} />
        </Routes>
      </main>
    </div>
  );
}
