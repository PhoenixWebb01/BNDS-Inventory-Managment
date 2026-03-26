"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import type { Category, Item, ActivityLog, Profile } from "@/types/database";

interface DashboardStats {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  categories: number;
}

interface ActivityWithRelations extends ActivityLog {
  user: Pick<Profile, "full_name" | "email"> | null;
  item: Pick<Item, "name" | "barcode"> | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0, lowStock: 0, outOfStock: 0, categories: 0,
  });
  const [categories, setCategories] = useState<(Category & { item_count: number })[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityWithRelations[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();
      setUserProfile(profile);

      const { count: totalItems } = await supabase
        .from("items").select("*", { count: "exact", head: true });
      const { count: lowStock } = await supabase
        .from("items").select("*", { count: "exact", head: true }).eq("status", "low_stock");
      const { count: outOfStock } = await supabase
        .from("items").select("*", { count: "exact", head: true }).eq("status", "out_of_stock");

      const { data: cats } = await supabase.from("categories").select("*");
      const categoriesWithCounts: (Category & { item_count: number })[] = [];
      if (cats) {
        for (const cat of cats) {
          const { count } = await supabase
            .from("items").select("*", { count: "exact", head: true }).eq("category_id", cat.id);
          categoriesWithCounts.push({ ...cat, item_count: count || 0 } as Category & { item_count: number });
        }
      }

      const { data: activity } = await supabase
        .from("activity_log")
        .select(`*, user:profiles(full_name, email), item:items(name, barcode)`)
        .order("created_at", { ascending: false }).limit(10);

      setStats({
        totalItems: totalItems || 0, lowStock: lowStock || 0,
        outOfStock: outOfStock || 0, categories: cats?.length || 0,
      });
      setCategories(categoriesWithCounts);
      setRecentActivity((activity as ActivityWithRelations[]) || []);
      setLoading(false);
    }
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-surface-high border-t-primary" />
          <p className="text-sm text-on-surface-muted font-[family-name:var(--font-body)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Items", value: stats.totalItems, accent: "bg-primary-fixed", textAccent: "text-primary",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { label: "Low Stock", value: stats.lowStock, accent: "bg-warning-container", textAccent: "text-on-warning-container",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" },
    { label: "Out of Stock", value: stats.outOfStock, accent: "bg-error-container", textAccent: "text-on-error-container",
      icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    { label: "Categories", value: stats.categories, accent: "bg-tertiary-container", textAccent: "text-tertiary",
      icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  ];

  function formatAction(action: string) {
    return action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-background px-10 py-8">
        {/* Editorial Header */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-hero)] text-[2rem] font-bold tracking-tight text-on-surface">
            Inventory Overview
          </h1>
          <p className="mt-1 text-sm text-on-surface-muted">
            Welcome back, {userProfile?.full_name || "Team Member"}. Here&apos;s your current stock snapshot.
          </p>
        </div>

        {/* Stat Cards — tonal lift, no borders */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-surface-card p-6"
              style={{ boxShadow: "var(--shadow-ambient)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">
                    {stat.label}
                  </p>
                  <p className={`mt-2 font-[family-name:var(--font-hero)] text-3xl font-bold ${stat.textAccent}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.accent} rounded-xl p-3`}>
                  <svg className={`h-5 w-5 ${stat.textAccent}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Categories — left column, wider */}
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-surface-card p-6" style={{ boxShadow: "var(--shadow-ambient)" }}>
              <h2 className="mb-5 font-[family-name:var(--font-hero)] text-lg font-semibold text-on-surface">
                Inventory by Category
              </h2>
              {categories.length === 0 ? (
                <p className="text-sm text-on-surface-subtle">No items added yet.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg bg-surface-low px-4 py-3 transition-colors hover:bg-surface-container"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[13px] font-medium text-on-surface-variant">
                          {cat.name}
                        </span>
                      </div>
                      <span className="rounded-full bg-surface-container px-3 py-0.5 text-[12px] font-semibold text-on-surface-muted">
                        {cat.item_count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity — right column */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-surface-card p-6" style={{ boxShadow: "var(--shadow-ambient)" }}>
              <h2 className="mb-5 font-[family-name:var(--font-hero)] text-lg font-semibold text-on-surface">
                Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-low">
                    <svg className="h-5 w-5 text-on-surface-subtle" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-on-surface-subtle">No activity yet.</p>
                  <p className="mt-0.5 text-[12px] text-on-surface-subtle">Scan or add an item to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-container" />
                      <div className="flex-1 text-[13px]">
                        <span className="font-medium text-on-surface">
                          {log.user?.full_name || "System"}
                        </span>{" "}
                        <span className="text-on-surface-muted">{formatAction(log.action)}</span>{" "}
                        <span className="font-medium text-on-surface">
                          {log.item?.name || "Unknown"}
                        </span>
                        <div className="mt-0.5 text-[11px] text-on-surface-subtle">{timeAgo(log.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
