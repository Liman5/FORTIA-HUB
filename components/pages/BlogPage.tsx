"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { BlogSystem } from "@/components/BlogSystem";

export function BlogPage() {
  const { blogPosts, platformLoaded } = useAppStore();

  if (!platformLoaded) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  return <BlogSystem posts={blogPosts} />;
}