import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Sparkles, FileText, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';

export default function AddProvider({ community }) {
  const [searchParams] = useSearchParams();
  const preselectedCategory = searchParams.get('category') || '';
  const [categories, setCategories] = useState([]);
  const [mode, setMode] = useState('form');
  const [whatsappText, setWhatsappText] = useState('');
  const [chatExportText, setChatExportText] = useState('');
  const [parsedProviders, setParsedProviders] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [form, setForm] = useState({
    name: '', category_id: '', phone: '', email: '', website: '',
    address: '', city: '', state: '', zip_code: '', description: '',
    services: '', insurance_accepted: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats);
      if (preselectedCategory) {
        const match = cats.find((c) => c.slug === preselectedCategory);
        if (match) setForm((f) => ({ ...f, category_id: match.id }));
      }
    }).catch(console.error);
  }, []);

  function updateField(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function categoryIdByName(name) {
    if (!name) return '';
    const cat = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return cat?.id || '';
  }

  async function parseWhatsAppMessage() {
    if (!whatsappText.trim()) return;
    setParsing(true);
    setParseError('');
    setParsedProviders([]);
    try {
      const result = await api.parseMessage(whatsappText);
      const providers = result.providers.filter((p) => !p.error);
      if (providers.length === 0) {
        setParseError("Couldn't find a recommendation in that message. Try pasting a message that mentions a specific service provider.");
        return;
      }
      setParsedProviders(providers);
      if (providers.length === 1) {
        applyParsedProvider(providers[0]);
      }
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function parseChatExport() {
    if (!chatExportText.trim()) return;
    setParsing(true);
    setParseError('');
    setParsedProviders([]);
    try {
      const result = await api.parseChatExport(chatExportText);
      if (result.providers.length === 0) {
        setParseError('No recommendations found in the chat export.');
        return;
      }
      setParsedProviders(result.providers);
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function applyParsedProvider(p) {
    setForm({
      name: p.name || '',
      category_id: categoryIdByName(p.category),
      phone: p.phone || '',
      email: p.email || '',
      website: p.website || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      zip_code: p.zip_code || '',
      description: p.description || '',
      services: (p.services || []).join(', '),
      insurance_accepted: (p.insurance_accepted || []).join(', ')
    });
    setMode('form');
    setParsedProviders([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.category_id) { setError('Name and category are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        community_id: community?.id || null,
        services: form.services ? form.services.split(',').map((s) => s.trim()).filter(Boolean) : [],
        insurance_accepted: form.insurance_accepted ? form.insurance_accepted.split(',').map((s) => s.trim()).filter(Boolean) : []
      };
      const provider = await api.createProvider(payload);
      navigate(`/provider/${provider.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';
  const tabClass = (active) => `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Add a Recommendation</h1>
      <p className="text-slate-600 mb-6">Share a service provider you trust with your community</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setMode('form')} className={tabClass(mode === 'form')}>
          <FileText className="w-4 h-4" /> Manual Entry
        </button>
        <button onClick={() => setMode('paste')} className={tabClass(mode === 'paste')}>
          <MessageSquare className="w-4 h-4" /> Paste WhatsApp Message
        </button>
        <button onClick={() => setMode('export')} className={tabClass(mode === 'export')}>
          <Sparkles className="w-4 h-4" /> Import Chat Export
        </button>
      </div>

      {mode === 'paste' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Paste a WhatsApp Message</h2>
          <p className="text-sm text-slate-500 mb-4">
            Paste a message from your WhatsApp group that recommends a service provider.
            AI will extract the details automatically.
          </p>
          <textarea
            value={whatsappText}
            onChange={(e) => setWhatsappText(e.target.value)}
            placeholder={'Example:\n"Can anyone recommend a good pediatrician? Try Dr. Priya Sharma at 732-555-0101, she\'s on Main St in Monroe. Accepts Aetna. She\'s amazing with kids — very patient and thorough."'}
            rows={5}
            className={`${inputClass} resize-none mb-4`}
          />
          <button
            onClick={parseWhatsAppMessage}
            disabled={parsing || !whatsappText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</> : <><Sparkles className="w-4 h-4" /> Extract with AI</>}
          </button>
          {parseError && <p className="text-red-500 text-sm mt-3">{parseError}</p>}
        </div>
      )}

      {mode === 'export' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Import WhatsApp Chat Export</h2>
          <p className="text-sm text-slate-500 mb-2">
            Export your WhatsApp group chat and paste the text here.
            AI will find all recommendations in the conversation.
          </p>
          <p className="text-xs text-slate-400 mb-4">
            How to export: WhatsApp group → tap group name → Export Chat → Without Media → Copy/paste the text here
          </p>
          <textarea
            value={chatExportText}
            onChange={(e) => setChatExportText(e.target.value)}
            placeholder="Paste your WhatsApp chat export text here..."
            rows={8}
            className={`${inputClass} resize-none mb-4 font-mono text-xs`}
          />
          <button
            onClick={parseChatExport}
            disabled={parsing || !chatExportText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing chat...</> : <><Sparkles className="w-4 h-4" /> Extract All Recommendations</>}
          </button>
          {parseError && <p className="text-red-500 text-sm mt-3">{parseError}</p>}
        </div>
      )}

      {parsedProviders.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Found {parsedProviders.length} Recommendations
          </h2>
          <div className="space-y-3">
            {parsedProviders.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900">{p.name || 'Unknown Provider'}</p>
                  <p className="text-sm text-slate-500">
                    {p.category}{p.phone ? ` · ${p.phone}` : ''}{p.city ? ` · ${p.city}` : ''}
                  </p>
                  {p.confidence && (
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${p.confidence === 'high' ? 'bg-green-100 text-green-700' : p.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {p.confidence} confidence
                    </span>
                  )}
                </div>
                <button
                  onClick={() => applyParsedProvider(p)}
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors shrink-0"
                >
                  Use This
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(mode === 'form' || parsedProviders.length === 0) && mode !== 'export' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business / Provider Name *</label>
              <input type="text" value={form.name} onChange={updateField('name')} placeholder="e.g., Dr. John Smith" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select value={form.category_id} onChange={updateField('category_id')} className={inputClass}>
                <option value="">Select a category</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={updateField('description')} placeholder="What makes this provider great?" rows={3} className={`${inputClass} resize-none`} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={updateField('phone')} placeholder="(555) 123-4567" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={updateField('email')} placeholder="provider@email.com" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input type="url" value={form.website} onChange={updateField('website')} placeholder="https://..." className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" value={form.address} onChange={updateField('address')} placeholder="123 Main Street" className={inputClass} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input type="text" value={form.city} onChange={updateField('city')} placeholder="Monroe Township" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input type="text" value={form.state} onChange={updateField('state')} placeholder="NJ" maxLength={2} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
              <input type="text" value={form.zip_code} onChange={updateField('zip_code')} placeholder="08831" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Services (comma-separated)</label>
            <input type="text" value={form.services} onChange={updateField('services')} placeholder="Plumbing, Electrical, Painting" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Accepted (comma-separated)</label>
            <input type="text" value={form.insurance_accepted} onChange={updateField('insurance_accepted')} placeholder="Aetna, BlueCross, UnitedHealth" className={inputClass} />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">
                I confirm that the information I'm sharing is publicly available business/professional contact information, or I have the provider's permission to share it.
                Providers can <a href="/privacy" className="text-primary-600 underline">request removal</a> at any time.
              </span>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !form.consent}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Adding...' : 'Add Recommendation'}
          </button>
        </form>
      )}
    </div>
  );
}
