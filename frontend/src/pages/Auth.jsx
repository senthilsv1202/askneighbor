import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Ticket, CheckCircle, XCircle } from 'lucide-react';
import { supabase, isDemoMode } from '../lib/supabase.js';
import { api } from '../lib/api.js';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('invite') || '';

  const [step, setStep] = useState(initialCode ? 'invite' : 'invite');
  const [isSignUp, setIsSignUp] = useState(true);
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [communityInfo, setCommunityInfo] = useState(null);
  const [inviteValid, setInviteValid] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function validateInvite() {
    if (!inviteCode.trim()) { setInviteError('Please enter an invite code'); return; }
    setLoading(true);
    setInviteError('');
    try {
      const result = await api.validateInvite(inviteCode);
      if (result.valid) {
        setInviteValid(true);
        setCommunityInfo(result.community);
        setStep('auth');
      } else {
        setInviteValid(false);
        setInviteError(result.reason || 'Invalid invite code. Ask a community member for a valid code.');
      }
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isDemoMode) {
      setError('Demo mode — connect Supabase to enable authentication');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { data, error: authError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
      if (authError) { setError(authError.message); setLoading(false); return; }

      if (data.user && inviteCode) {
        try {
          await api.joinCommunity(inviteCode);
        } catch (_) {}
      }
      setMessage('Check your email to confirm your account!');
    } else {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }

      if (data.user && inviteCode) {
        try {
          await api.joinCommunity(inviteCode);
        } catch (_) {}
      }
      navigate('/');
    }
    setLoading(false);
  }

  const inputClass = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {step === 'invite' ? 'Join Your Community' : isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-slate-500 mt-1">
          {step === 'invite'
            ? 'Enter the invite code shared by a community member'
            : isSignUp ? 'Create an account to share recommendations' : 'Sign in to your account'}
        </p>
      </div>

      {step === 'invite' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Ticket className="w-4 h-4 inline mr-1" />
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteValid(null); setInviteError(''); }}
              placeholder="e.g., A1B2C3D4"
              className={`${inputClass} text-center text-lg tracking-widest font-mono ${inviteValid === true ? 'border-green-400 ring-2 ring-green-200' : inviteValid === false ? 'border-red-400 ring-2 ring-red-200' : ''}`}
              maxLength={12}
            />
          </div>

          {inviteValid && communityInfo && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>Valid invite for <strong>{communityInfo.name}</strong>{communityInfo.city ? ` — ${communityInfo.city}, ${communityInfo.state}` : ''}</span>
            </div>
          )}

          {inviteError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <button
            onClick={validateInvite}
            disabled={loading || !inviteCode.trim()}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Validating...' : 'Validate & Continue'}
          </button>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">Already have an account?</p>
            <button
              onClick={() => { setStep('auth'); setIsSignUp(false); }}
              className="text-primary-600 font-medium text-sm hover:underline"
            >
              Sign in without invite code
            </button>
          </div>

          {isDemoMode && (
            <p className="text-xs text-center text-slate-400 mt-2">
              Demo mode: try code <span className="font-mono font-bold">DEMO1234</span>
            </p>
          )}
        </div>
      )}

      {step === 'auth' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {communityInfo && (
            <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-primary-700 text-sm mb-2">
              <Users className="w-4 h-4 shrink-0" />
              <span>Joining <strong>{communityInfo.name}</strong></span>
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }} className="text-primary-600 font-medium ml-1 hover:underline">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          {!communityInfo && (
            <button
              type="button"
              onClick={() => setStep('invite')}
              className="w-full text-center text-sm text-slate-400 hover:text-primary-600"
            >
              Have an invite code? Enter it here
            </button>
          )}
        </form>
      )}
    </div>
  );
}
