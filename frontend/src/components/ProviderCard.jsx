import { Link } from 'react-router-dom';
import { MapPin, Phone, MessageSquare, User } from 'lucide-react';
import StarRating from './StarRating.jsx';

export default function ProviderCard({ provider }) {
  const category = provider.categories;

  return (
    <Link
      to={`/provider/${provider.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-primary-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
            {provider.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {category && (
              <span className="inline-block px-2.5 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                {category.name}
              </span>
            )}
            {/* A neighbour offering a skill reads very differently from a
                business, so it is worth calling out rather than blending in. */}
            {provider.is_neighbor && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                <User className="w-3 h-3" /> Neighbor
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="flex items-center gap-1">
            <StarRating rating={Math.round(provider.avg_rating)} size={14} />
            <span className="text-sm font-semibold text-slate-700 ml-1">{Number(provider.avg_rating).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <MessageSquare className="w-3 h-3" />
            <span>{provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'}</span>
          </div>
        </div>
      </div>

      {provider.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{provider.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        {provider.city && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {provider.city}{provider.state ? `, ${provider.state}` : ''}
          </span>
        )}
        {provider.phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {provider.phone}
          </span>
        )}
      </div>
    </Link>
  );
}
