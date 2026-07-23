import { Link } from 'react-router-dom';
import { Shield, Trash2, Lock, Eye, Users } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Privacy & Data Policy</h1>
          <p className="text-slate-500">How AskNeighbor handles your data</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900">Private & Invite-Only</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            AskNeighbor is a private, invite-only community. Provider information is only visible
            to registered and authenticated community members. The general public cannot browse,
            search, or access any provider details without signing in with a valid invite code.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900">What Data We Store</h2>
          </div>
          <ul className="text-slate-600 text-sm space-y-2 leading-relaxed">
            <li><strong>Provider information:</strong> Business name, phone, email, address, services, and descriptions shared by community members. This is publicly available professional/business contact information.</li>
            <li><strong>User accounts:</strong> Your name and email address for authentication purposes only.</li>
            <li><strong>Reviews:</strong> Ratings and review text you choose to write.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900">Consent & Responsibility</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            When adding a provider, community members confirm that they are sharing publicly available
            business/professional contact information, or that they have the provider's permission to share it.
            We do not collect personal home phone numbers or private residential addresses.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Right to Removal</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Any service provider listed on AskNeighbor can request removal of their information at any time.
            Every provider listing includes a "Request Removal" link. We will process removal requests
            within 48 hours. No questions asked.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            If you are a provider and would like your information removed, you can:
          </p>
          <ul className="text-slate-600 text-sm mt-2 space-y-1 list-disc list-inside">
            <li>Click "Request Removal" on your listing page</li>
            <li>Or email us with the provider name and we'll remove it promptly</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-slate-900">Data Security</h2>
          </div>
          <ul className="text-slate-600 text-sm space-y-2 leading-relaxed">
            <li><strong>Contact info is masked</strong> in search results and listings. Full details are only visible on individual provider pages to authenticated members.</li>
            <li><strong>Rate limiting</strong> is enforced to prevent automated scraping.</li>
            <li><strong>Authentication required</strong> for all data access — no anonymous browsing.</li>
            <li><strong>Data is stored securely</strong> on encrypted, managed database infrastructure.</li>
          </ul>
        </section>
      </div>

      <div className="text-center mt-8 text-sm text-slate-400">
        <p>Last updated: July 2026</p>
        <Link to="/" className="text-primary-600 hover:underline mt-1 inline-block">Back to Home</Link>
      </div>
    </div>
  );
}
