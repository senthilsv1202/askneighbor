import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, Plus, MessageSquare, Sparkles, Loader2, X, ChevronDown } from 'lucide-react';
import { api } from '../lib/api.js';
import ProviderCard from '../components/ProviderCard.jsx';

export default function CategoryPage({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('rating');
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState('form');
  const [whatsappText, setWhatsappText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', website: '',
    address: '', city: '', state: '', zip_code: '', description: '',
    services: '', insurance_accepted: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.getCategory(slug).then(setCategory).catch(console.error);
  }, [slug]);

  useEffect(() => {
    loadProviders();
  }, [slug, sort]);

  function loadProviders() {
    setLoading(true);
    api.getProviders({ category: slug, sort })
      .then((res) => {
        setProviders(res.providers);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function updateField(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function parseWhatsApp() {
    if (!whatsappText.trim()) return;
    setParsing(true);
    setParseError('');
    try {
      const result = await api.parseMessage(whatsappText);
      const p = result.providers.find((pr) => !pr.error);
      if (!p) {
        setParseError("Couldn't find a recommendation in that message.");
        return;
      }
      setForm({
        name: p.name || '',
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
      setAddMode('form');
      setWhatsappText('');
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { setFormError('Provider name is required'); return; }
    if (!category) return;
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        category_id: category.id,
        services: form.services ? form.services.split(',').map((s) => s.trim()).filter(Boolean) : [],
        insurance_accepted: form.insurance_accepted ? form.insurance_accepted.split(',').map((s) => s.trim()).filter(Boolean) : []
      };
      const provider = await api.createProvider(payload);
      setShowAddForm(false);
      setForm({ name: '', phone: '', email: '', website: '', address: '', city: '', state: '', zip_code: '', description: '', services: '', insurance_accepted: '' });
      navigate(`/provider/${provider.id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">{category?.name || slug}</span>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{category?.name}</h1>
          {category?.description && (
            <p className="text-slate-600 mt-1">{category.description}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">{total} {total === 1 ? 'provider' : 'providers'} found</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="rating">Top Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Recommend'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border-2 border-primary-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Recommend a {category?.name} Provider
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Know a great provider? Add them to help your community.
          </p>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setAddMode('form')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${addMode === 'form' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Plus className="w-3.5 h-3.5" /> Manual
            </button>
            <button
              onClick={() => setAddMode('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${addMode === 'paste' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Paste WhatsApp
            </button>
          </div>

          {addMode === 'paste' && (
            <div className="mb-5">
              <textarea
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                placeholder={'Paste a WhatsApp message like:\n"Dr. Sharma on Main St is great for kids, 732-555-0101, accepts Aetna"'}
                rows={3}
                className={`${inputClass} resize-none mb-3`}
              />
              <button
                onClick={parseWhatsApp}
                disabled={parsing || !whatsappText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</> : <><Sparkles className="w-4 h-4" /> Extract with AI</>}
              </button>
              {parseError && <p className="text-red-500 text-sm mt-2">{parseError}</p>}
            </div>
          )}

          {(addMode === 'form' || form.name) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Provider Name *</label>
                  <input type="text" value={form.name} onChange={updateField('name')} placeholder="e.g., Dr. John Smith" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={updateField('phone')} placeholder="(555) 123-4567" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Why do you recommend them?</label>
                <textarea value={form.description} onChange={updateField('description')} placeholder="What makes this provider great?" rows={2} className={`${inputClass} resize-none`} />
              </div>

              <details className="group">
                <summary className="flex items-center gap-1 text-sm text-primary-600 font-medium cursor-pointer hover:text-primary-700">
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  More details (address, email, services, insurance)
                </summary>
                <div className="mt-3 space-y-3 pl-1">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={updateField('email')} placeholder="provider@email.com" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                      <input type="url" value={form.website} onChange={updateField('website')} placeholder="https://..." className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                    <input type="text" value={form.address} onChange={updateField('address')} placeholder="123 Main Street" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                      <input type="text" value={form.city} onChange={updateField('city')} placeholder="Monroe Twp" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                      <input type="text" value={form.state} onChange={updateField('state')} placeholder="NJ" maxLength={2} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">ZIP</label>
                      <input type="text" value={form.zip_code} onChange={updateField('zip_code')} placeholder="08831" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Services (comma-separated)</label>
                    <input type="text" value={form.services} onChange={updateField('services')} placeholder="Plumbing, Electrical" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Insurance Accepted (comma-separated)</label>
                    <input type="text" value={form.insurance_accepted} onChange={updateField('insurance_accepted')} placeholder="Aetna, BlueCross" className={inputClass} />
                  </div>
                </div>
              </details>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Adding...' : `Add to ${category?.name || 'Category'}`}
              </button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg mb-2">No providers yet in this category</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-primary-600 font-medium hover:underline"
          >
            Be the first to recommend one
          </button>
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
