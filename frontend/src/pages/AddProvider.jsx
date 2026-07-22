import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function AddProvider() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', category_id: '', phone: '', email: '', website: '',
    address: '', city: '', state: '', zip_code: '', description: '',
    services: '', insurance_accepted: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  function updateField(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.category_id) { setError('Name and category are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Add a Recommendation</h1>
      <p className="text-slate-600 mb-8">Share a service provider you trust with your community</p>

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

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Adding...' : 'Add Recommendation'}
        </button>
      </form>
    </div>
  );
}
