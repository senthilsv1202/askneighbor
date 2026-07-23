import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Copy, Check } from 'lucide-react';
import { api } from '../lib/api.js';

export default function CreateCommunity() {
  const [form, setForm] = useState({ name: '', description: '', city: '', state: '', zip_code: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  function updateField(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { setError('Community name is required'); return; }
    if (!form.city || !form.state) { setError('City and state are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const community = await api.createCommunity(form);
      setCreated(community);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(created.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyShareMessage() {
    const msg = `Join our community on AskNeighbor — a private recommendation directory for trusted local providers (doctors, handymen, restaurants, and more).

Step 1 → Open: ${window.location.origin}
Step 2 → Enter invite code: ${created.invite_code}
Step 3 → Sign up and start browsing or adding recommendations!`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';

  if (created) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Community Created!</h1>
          <p className="text-slate-500 mt-1">{created.name} is ready to go</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Your Invite Code</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-primary-50 border-2 border-primary-200 rounded-xl text-center text-2xl font-bold tracking-widest text-primary-700 font-mono">
                {created.invite_code}
              </div>
              <button onClick={copyInviteCode} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Share with your community</p>
            <p className="text-sm text-slate-500 mb-3">
              Share this invite code in your WhatsApp group, neighborhood chat, or with friends.
              Anyone with this code can join and start adding recommendations.
            </p>
            <button onClick={copyShareMessage}
              className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors text-sm">
              {copied ? 'Copied!' : 'Copy Share Message for WhatsApp'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button onClick={() => { window.location.reload(); }}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm">
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create a Community</h1>
        <p className="text-slate-500 mt-1">Start a recommendation directory for your neighborhood or group</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Community Name *</label>
          <input type="text" value={form.name} onChange={updateField('name')} placeholder="e.g., Edison Indian Community" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea value={form.description} onChange={updateField('description')}
            placeholder="What is this community about? Who is it for?"
            rows={3} className={`${inputClass} resize-none`} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
            <input type="text" value={form.city} onChange={updateField('city')} placeholder="Edison" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
            <input type="text" value={form.state} onChange={updateField('state')} placeholder="NJ" maxLength={2} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
            <input type="text" value={form.zip_code} onChange={updateField('zip_code')} placeholder="08817" className={inputClass} />
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-1">What happens next?</p>
          <ul className="space-y-1 list-disc list-inside text-slate-500">
            <li>You'll become the admin of this community</li>
            <li>You'll get an invite code to share with members</li>
            <li>Members can browse your community's recommendations and nearby communities</li>
          </ul>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {submitting ? 'Creating...' : 'Create Community'}
        </button>
      </form>
    </div>
  );
}
