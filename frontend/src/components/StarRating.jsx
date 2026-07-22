import { Star } from 'lucide-react';

export default function StarRating({ rating, size = 16, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star
            size={size}
            className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  );
}
