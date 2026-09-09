import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle } from 'lucide-react';
import { supabase, isDemoMode } from '../lib/supabase.js';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isDemoMode) return;
    // Following the emailed link puts supabase-js into a recovery session. It may
    // already have been established before this component mounted, so check for an
    // existing session as well as listening for the event — relying on the event
    // alone leaves the page stuck on "Checking your link".
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Those two passwords do not match.'); return; }
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setDone(true);
    setSaving(false);
    setTimeout(() => navigate('/'), 1800);
  }

  const inputClass = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500';

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Password updated</h1>
        <p className="text-slate-500">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
        <p className="text-slate-500 mt-1">You’ll be signed in straight after.</p>
      </div>

      {!ready ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <p className="text-slate-600 mb-2">Checking your link…</p>
          <p className="text-sm text-slate-500">
            If this doesn’t move, the link may have expired. Reset links are valid for one hour —
            <button onClick={() => navigate('/auth')} className="text-primary-600 hover:underline ml-1">
              request a fresh one
            </button>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} minLength={6} required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} minLength={6} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}
    </div>
  );
}
