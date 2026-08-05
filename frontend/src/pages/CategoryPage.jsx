import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, Plus, MessageSquare, Sparkles, Loader2, X, ChevronDown, ImageIcon, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import ProviderCard from '../components/ProviderCard.jsx';
import { downscaleToBase64 } from '../lib/image.js';

const UNGROUPED = 'Other';

// Broad categories like "Home Services" mix plumbers, electricians and appliance
// repair into one list. Providers already carry a services[] array, so it doubles
// as a sub-grouping without needing subcategories in the schema.
//
// Only the first service is used: a provider listing both "Plumbing" and
// "Electrical" appears once under Plumbing rather than being duplicated down the
// page, which reads as two separate businesses.
function groupBySpecialty(providers) {
  const buckets = new Map();

  for (const provider of providers) {
    const primary = (provider.services || []).find((s) => s && s.trim());
    const label = primary ? primary.trim() : UNGROUPED;
    // Group case-insensitively so "plumbing" and "Plumbing" do not split apart,
    // but display the first spelling actually entered.
    const key = label.toLowerCase();
    if (!buckets.has(key)) buckets.set(key, { label, providers: [] });
    buckets.get(key).providers.push(provider);
  }

  return [...buckets.values()].sort((a, b) => {
    // Unlabelled providers sink to the bottom; otherwise biggest group first.
    if (a.label === UNGROUPED) return 1;
    if (b.label === UNGROUPED) return -1;
    if (b.providers.length !== a.providers.length) {
      return b.providers.length - a.providers.length;
    }
    return a.label.localeCompare(b.label);
  });
}

export default function CategoryPage({ user, community }) {
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
  const [missing, setMissing] = useState([]);
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
  }, [slug, sort, community]);

  function loadProviders() {
    setLoading(true);
    const params = { category: slug, sort };
    if (community?.id) { params.community_id = community.id; params.nearby = 'true'; }
    api.getProviders(params)
      .then((res) => {
        setProviders(res.providers);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function updateField(field) {
    return (e) => {
      const value = field === 'phone' ? formatPhone(e.target.value) : e.target.value;
      setForm({ ...form, [field]: value });
    };
  }

  async function parseScreenshot(file) {
    if (!file) return;
    setParsing(true);
    setParseError('');
    setMissing([]);
    try {
      const { base64, media_type } = await downscaleToBase64(file);
      const { provider: p } = await api.parseImage(base64, media_type);
      setForm({
        name: p.name || '',
        phone: p.phone || '',
        email: p.email || '',
        website: p.website || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zip_code: p.zip_code || '',
        description: (p.description || '') + (p.recommended_by ? ` Recommended by ${p.recommended_by}.` : ''),
        services: (p.services || []).join(', '),
        insurance_accepted: (p.insurance_accepted || []).join(', '),
      });
      // A shared contact card shows a name but hides the number, so say plainly
      // what still needs typing rather than letting it be saved half-empty.
      setMissing(Array.isArray(p.missing) ? p.missing : []);
      setAddMode('form');
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
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
        insurance_accepted: form.insurance_accepted ? form.insurance_accepted.split(',').map((s) => s.trim()).filter(Boolean) : [],
        // This quick form only adds businesses. Neighbours need the consent step,
        // which lives on the full Add page.
        is_neighbor: false,
        listing_consent: true
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

  const groups = groupBySpecialty(providers);
  const namedGroups = groups.filter((g) => g.label !== UNGROUPED);
  // Needs at least two named specialties to be worth splitting up. One named
  // group plus an "Other" pile is noise, not structure — it just relabels a list.
  const showGroups = namedGroups.length >= 2;

  // Suggest specialties already in use here, so entries cluster into existing
  // groups instead of each person inventing a slightly different label.
  const existingSpecialties = namedGroups
    .slice(0, 3)
    .map((g) => g.label);
  const specialtyPlaceholder = existingSpecialties.length
    ? `e.g., ${existingSpecialties.join(', ')}`
    : 'e.g., Plumbing, Electrical';

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
            <label
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${addMode === 'image' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Screenshot
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { setAddMode('image'); parseScreenshot(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
          </div>

          {parsing && addMode === 'image' && (
            <p className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Reading the screenshot…
            </p>
          )}

          {missing.length > 0 && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Read from the image. Still needs you: <span className="font-medium">{missing.join(', ')}</span>.
                A shared contact card hides the number — tap it in WhatsApp to see it.
              </p>
            </div>
          )}

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

              {/* Promoted out of "More details": this field decides which
                  sub-heading the provider is listed under, so burying it meant
                  new entries defaulted to "Other". */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Specialty
                  <span className="font-normal text-slate-400"> — groups them on this page</span>
                </label>
                <input
                  type="text"
                  value={form.services}
                  onChange={updateField('services')}
                  placeholder={specialtyPlaceholder}
                  className={inputClass}
                />
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
      ) : showGroups ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-lg font-bold text-slate-900">{group.label}</h2>
                <span className="text-sm text-slate-400">
                  {group.providers.length}
                </span>
              </div>
              <div className="grid gap-4">
                {group.providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </section>
          ))}
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
