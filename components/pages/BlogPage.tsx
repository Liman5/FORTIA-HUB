"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { BlogSystem } from "@/components/BlogSystem";

export function BlogPage() {
  const { blogPosts } = useAppStore();

  return <BlogSystem posts={blogPosts} />;
}