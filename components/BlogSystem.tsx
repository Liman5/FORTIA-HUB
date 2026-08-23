"use client";

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BlogPost } from '../types';
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  ArrowRight,
  X,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface BlogSystemProps {
  posts: BlogPost[];
}

export const BlogSystem: React.FC<BlogSystemProps> = ({ posts }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const categories = [
    { id: 'all', label: 'Tous les articles' },
    { id: 'Intelligence Artificielle', label: 'Intelligence Artificielle' },
    { id: 'Cryptomonnaie', label: 'Cryptomonnaie & Web3' },
    { id: 'Marketing Digital', label: 'Marketing Digital' },
    { id: 'Entrepreneuriat', label: 'Entrepreneuriat' }
  ];

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const hasActiveFilters = searchQuery || selectedCategory !== 'all';

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <section className="py-12 bg-[#021231] min-h-[600px] relative overflow-hidden" id="blog-section">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.04)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/[0.04] backdrop-blur-xl border border-[#D69E25]/30 rounded-3xl p-8 sm:p-12 overflow-hidden"
        >
          {/* Glow effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#D69E25]/5 blur-3xl" />

          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 text-xs font-bold text-[#D69E25] shadow-[0_0_20px_rgba(214,158,37,0.1)]">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Blog & Analyses de l'Écosystème</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Le Journal{" "}
              <span className="animated-gradient-text inline-block">FORTIA HUB</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Dossiers stratégiques, décryptages IA, tutoriels Web3, conseils marketing et retours d'expérience pour faire décoller vos projets.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400 pt-2">
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-[#D69E25]/20 rounded-full px-3 py-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#D69E25]" />
                {posts.length} Articles
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-emerald-400/20 rounded-full px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Analyses exclusives
              </span>
            </div>
          </div>
        </motion.div>

        {/* Search & Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-[#D69E25]/10 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white/5 border border-white/15 rounded-xl overflow-hidden focus-within:border-[#D69E25]/60 transition-all duration-300">
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un article, mot-clé (ChatGPT, USDT, Canva)..."
                className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-white/10 scrollbar-none snap-x snap-mandatory scroll-px-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap snap-start shrink-0 transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold shadow-lg shadow-[#D69E25]/20'
                      : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            {filteredPosts.length} article{filteredPosts.length > 1 ? "s" : ""} trouvé{filteredPosts.length > 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[#D69E25] hover:text-amber-300 font-semibold transition-colors"
            >
              <Search className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Articles Grid */}
        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Aucun article ne correspond à votre recherche</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Essayez de réinitialiser vos filtres ou de modifier les mots-clés.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
            >
              Réinitialiser les Filtres
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl hover:border-[#D69E25]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(214,158,37,0.1)] transition-all duration-500 flex flex-col overflow-hidden"
              >
                {/* Top border gradient on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

                <div className="relative h-48 overflow-hidden bg-[#021231]">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-[#021231]/30 to-transparent" />
                  <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#021231]/80 backdrop-blur-md text-[#D69E25] border border-[#D69E25]/40 text-[10px] font-bold">
                    {post.category}
                  </span>
                </div>

                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#D69E25]" />
                      <span>{post.date}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#D69E25]" />
                      <span>{post.readTime}</span>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white group-hover:text-[#D69E25] transition leading-snug">
                    {post.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {post.tags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold hover:border-[#D69E25]/40 hover:text-[#D69E25] transition-colors">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Author & Read Action */}
                <div className="p-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full object-cover border border-[#D69E25]/40" />
                    <div>
                      <div className="text-xs font-bold text-white">{post.author.name}</div>
                      <div className="text-[10px] text-slate-400">{post.author.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPost(post)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] hover:brightness-110 text-[#021231] font-bold text-xs transition-all duration-300 active:scale-95 shadow-lg shadow-[#D69E25]/20"
                  >
                    <span>Lire l'article</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Selected Post Modal */}
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] border border-[#D69E25]/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 space-y-6 shadow-2xl shadow-[#D69E25]/10"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <span className="px-3 py-1.5 rounded-full bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] text-[10px] font-bold inline-block">
                  {selectedPost.category}
                </span>

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  {selectedPost.title}
                </h1>

                <div className="flex items-center gap-4 text-xs text-slate-400 border-y border-white/10 py-3">
                  <div className="flex items-center gap-2">
                    <img src={selectedPost.author.avatar} alt={selectedPost.author.name} className="w-7 h-7 rounded-full object-cover border border-[#D69E25]/40" />
                    <span className="font-bold text-white">{selectedPost.author.name}</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <span>{selectedPost.date}</span>
                  <span className="text-slate-600">•</span>
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#021231]/60 to-transparent" />
              </div>

              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line space-y-4">
                {selectedPost.content}
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {selectedPost.tags.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold">
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-xs hover:bg-white/10 hover:text-white transition"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};