import { Link } from 'react-router-dom';
import { PlusCircle, Star } from 'lucide-react';

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ActivityFeed({ events, newThisWeek }) {
  if (!events || events.length === 0) return null;

  return (
    <section className="mb-12 bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Latest in your community</h2>
          <p className="text-sm text-slate-500">
            {newThisWeek > 0
              ? `${newThisWeek} new ${newThisWeek === 1 ? 'recommendation' : 'recommendations'} this week`
              : 'Recent contributions from your neighbors'}
          </p>
        </div>
        <Link
          to="/add"
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <PlusCircle className="w-4 h-4" />
          Add yours
        </Link>
      </div>

      <ul className="divide-y divide-slate-100">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              to={`/provider/${event.provider_id}`}
              className="flex items-start gap-3 py-3 group"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  event.type === 'review' ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-600'
                }`}
              >
                {event.type === 'review' ? <Star className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{event.actor}</span>
                  {event.type === 'review' ? ' reviewed ' : ' recommended '}
                  <span className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                    {event.provider_name}
                  </span>
                  {event.type === 'recommendation' && event.category && (
                    <span className="text-slate-500"> in {event.category}</span>
                  )}
                </p>
                {event.type === 'review' && event.title && (
                  <p className="text-xs text-slate-500 truncate">
                    {'★'.repeat(event.rating)} “{event.title}”
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-400 shrink-0">{timeAgo(event.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
