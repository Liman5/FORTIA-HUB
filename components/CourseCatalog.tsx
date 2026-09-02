"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Course, CartItem } from '@/lib/types';
import { OptimizedImage } from './OptimizedImage';
import { 
  BookOpen, 
  Clock, 
  Users, 
  ShoppingCart, 
  Play, 
  Filter,
  Search,
  Star,
  Sparkles,
  RotateCcw,
  BarChart3
} from 'lucide-react';

interface CourseCatalogProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onAddToCart: (item: CartItem) => void;
  onRateCourse?: (courseId: string, rating: number) => void;
  searchQuery: string;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  onSelectCourse,
  onAddToCart,
  onRateCourse,
  searchQuery
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Toutes les Formations', icon: BookOpen },
    { id: 'ai', label: 'Intelligence Artificielle' },
    { id: 'crypto', label: 'Cryptomonnaie' },
    { id: 'blockchain', label: 'Blockchain & Web3' },
    { id: 'canva', label: 'Canva & Design' },
    { id: 'capcut', label: 'CapCut & Vidéo' },
    { id: 'marketing', label: 'Marketing Digital' },
    { id: 'entrepreneurship', label: 'Entrepreneuriat' },
    { id: 'dev_web', label: 'Développement Web' },
    { id: 'dev_mobile', label: 'Développement Mobile' },
    { id: 'infographie', label: 'Infographie' },
    { id: 'secretariat', label: 'Secrétariat Bureautique' },
    { id: 'informatique', label: 'Informatique de Base' }
  ];

  // Filter courses based on category, level and search - Memoized for performance
  const filteredCourses = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (courses || []).filter((course) => {
      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
      const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
      const matchesSearch = 
        !q ||
        (course.title && course.title.toLowerCase().includes(q)) ||
        (course.description && course.description.toLowerCase().includes(q)) ||
        (course.categoryLabel && course.categoryLabel.toLowerCase().includes(q));

      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [courses, selectedCategory, selectedLevel, searchQuery]);

  const hasActiveFilters = selectedCategory !== 'all' || selectedLevel !== 'all' || searchQuery;

  const handleReset = () => {
    setSelectedCategory('all');
    setSelectedLevel('all');
  };

  return (
    <section className="py-8 bg-[#021231] min-h-[600px] relative overflow-x-clip" id="courses-section">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.03)_0%,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 relative z-10">
        
        {/* Section Header - Supprimé : Programmes Académiques, Catalogue, Description */}
        {/* Level Filter Déplacé sous les catégories */}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-px-4">
          {categories.map((cat, i) => {
            const isActive = selectedCategory === cat.id;
            const CatIcon = cat.icon || null;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap snap-start shrink-0 transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] shadow-lg shadow-[#D69E25]/20'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="category-active"
                    className="absolute inset-0 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {CatIcon && <CatIcon className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />}
                {cat.label}
              </motion.button>
            );
          })}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            {filteredCourses.length} formation{filteredCourses.length > 1 ? "s" : ""} trouvée{filteredCourses.length > 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[#D69E25] hover:text-amber-300 font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Aucune formation ne correspond à votre recherche</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Essayez de réinitialiser vos filtres ou de modifier les mots-clés dans la barre de recherche.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
            >
              Réinitialiser les Filtres
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {filteredCourses.map((course, index) => {
              return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                whileHover={{ y: -8, scale: 1.01 }}
                className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(214,158,37,0.1)] hover:border-[#D69E25]/40 transition-all duration-500 flex flex-col overflow-hidden"
              >
                {/* Top border gradient on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

                {/* Course Image Header */}
                <div className="relative h-36 sm:h-40 lg:h-44 overflow-hidden bg-[#021231]">
                  <OptimizedImage
                    src={course.image}
                    alt={course.title}
                    fallbackCategory={course.categoryLabel}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-[#021231]/30 to-transparent" />

                  {/* Category Badge */}
                  <span className="absolute top-2 left-2 bg-[#021231]/85 backdrop-blur-md text-[#D69E25] border border-[#D69E25]/40 text-[8px] sm:text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-lg whitespace-nowrap">
                    {course.categoryLabel}
                  </span>

                  {/* Gold Badge if applicable */}
                  {course.badge && (
                    <span className="absolute top-2 right-2 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-md shadow-md flex items-center gap-0.5">
                      {course.badge}
                    </span>
                  )}

                  {/* Level badge bottom-left */}
                  <span className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-lg">
                    {course.level}
                  </span>

                  {/* Play Overlay Button */}
                  <button
                    onClick={() => onSelectCourse(course)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-[#021231]/50 backdrop-blur-[2px]"
                    title="Aperçu de la formation"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D69E25] to-[#AB6F10] text-[#021231] flex items-center justify-center shadow-2xl shadow-[#D69E25]/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </button>
                </div>

                {/* Course Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    {/* Rating (étoiles cliquables) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= Math.round(course.rating || 0);
                          return (
                            <button
                              key={star}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRateCourse?.(course.id, star);
                              }}
                              title={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
                              className="transition hover:scale-125"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  filled
                                    ? "text-[#D69E25] fill-[#D69E25] drop-shadow-[0_0_4px_rgba(214,158,37,0.4)]"
                                    : "text-slate-600"
                                }`}
                              />
                            </button>
                          );
                        })}
                        <span className="text-slate-400 text-[11px] font-medium ml-1">
                          {course.rating} ({course.reviewsCount || 0})
                        </span>
                      </div>
                      <BarChart3 className="w-4 h-4 text-slate-500" />
                    </div>

                  {/* Course Title */}
                  <h3 
                    onClick={() => onSelectCourse(course)}
                    className="font-extrabold text-white text-sm sm:text-base group-hover:text-[#D69E25] transition-colors line-clamp-2 cursor-pointer leading-snug"
                  >
                    {course.title}
                  </h3>

                    {/* Description */}
                    <p className="text-slate-400 text-[11px] sm:text-xs line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Course Instructor & Stats */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const avatarSrc = course.instructor?.avatar || (course as any).instructorAvatar;
                          const instructorLabel = course.instructor?.name || (course as any).instructorName || "Formateur FORTIA HUB";
                          const initial = instructorLabel.trim().charAt(0).toUpperCase() || "F";
                          return avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={instructorLabel}
                              className="w-7 h-7 rounded-full object-cover border border-[#D69E25]/50"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D69E25]/20 to-[#AB6F10]/20 text-[#D69E25] border border-[#D69E25]/40 flex items-center justify-center text-[10px] font-black shrink-0">
                              {initial}
                            </span>
                          );
                        })()}
                        <span className="font-semibold text-slate-300 text-[11px] truncate max-w-[120px]">
                          {course.instructor?.name || (course as any).instructorName || "Formateur FORTIA HUB"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#D69E25]" />
                          {course.durationHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#D69E25]" />
                          {course.studentsCount}
                        </span>
                      </div>
                    </div>

                    {/* Footer Price & Buttons */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg sm:text-xl font-black text-white">
                            ${course.price}
                          </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                          ≈ {(course.price * 600).toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => onAddToCart({
                            id: course.id,
                            type: 'course',
                            title: course.title,
                            price: course.price,
                            image: course.image,
                            categoryLabel: course.categoryLabel
                          })}
                          className="shop-cart-btn p-2 rounded-xl border border-[#D69E25]/70"
                          title="Ajouter au Panier"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        <button
                          onClick={() => onSelectCourse(course)}
                          className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-extrabold text-[10px] sm:text-xs hover:brightness-110 active:scale-95 transition-all duration-300 shadow-lg shadow-[#D69E25]/20 flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">Suivre</span>
                          <span className="sm:hidden">Voir</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}