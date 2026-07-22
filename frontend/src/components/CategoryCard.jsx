import { Link } from 'react-router-dom';
import {
  Stethoscope, Wrench, Car, GraduationCap, Baby, Utensils,
  Scale, Sparkles, Home, PawPrint, SprayCan, Monitor, Folder
} from 'lucide-react';

const iconMap = {
  stethoscope: Stethoscope,
  wrench: Wrench,
  car: Car,
  'graduation-cap': GraduationCap,
  baby: Baby,
  utensils: Utensils,
  scale: Scale,
  sparkles: Sparkles,
  home: Home,
  'paw-print': PawPrint,
  'spray-can': SprayCan,
  monitor: Monitor,
  folder: Folder,
};

const colorMap = {
  stethoscope: 'bg-red-50 text-red-600',
  wrench: 'bg-orange-50 text-orange-600',
  car: 'bg-blue-50 text-blue-600',
  'graduation-cap': 'bg-purple-50 text-purple-600',
  baby: 'bg-pink-50 text-pink-600',
  utensils: 'bg-yellow-50 text-yellow-600',
  scale: 'bg-indigo-50 text-indigo-600',
  sparkles: 'bg-fuchsia-50 text-fuchsia-600',
  home: 'bg-green-50 text-green-600',
  'paw-print': 'bg-amber-50 text-amber-700',
  'spray-can': 'bg-cyan-50 text-cyan-600',
  monitor: 'bg-slate-100 text-slate-600',
};

export default function CategoryCard({ category }) {
  const Icon = iconMap[category.icon] || Folder;
  const colors = colorMap[category.icon] || 'bg-slate-100 text-slate-600';

  return (
    <Link
      to={`/category/${category.slug}`}
      className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:border-primary-200 transition-all group"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors} group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-slate-800">{category.name}</h3>
        {category.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{category.description}</p>
        )}
      </div>
    </Link>
  );
}
