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
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    categories: 0,
  });
  const [categories, setCategories] = useState<(Category & { item_count: number })[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityWithRelations[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setUserProfile(profile);

      // Load item counts
      const { count: totalItems } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true });

      const { count: lowStock } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("status", "low_stock");

      const { count: outOfStock } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("status", "out_of_stock");

      // Load categories with item counts
      const { data: cats } = await supabase
        .from("categories")
        .select("*");

      const categoriesWithCounts: (Category & { item_count: number })[] = [];
      if (cats) {
        for (const cat of cats) {
          const { count } = await supabase
            .from("items")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id);
          categoriesWithCounts.push({ ...cat, item_count: count || 0 } as Category & { item_count: number });
        }
      }

      // Load recent activity
      const { data: activity } = await supabase
        .from("activity_log")
        .select(`
          *,
          user:profiles(full_name, email),
          item:items(name, barcode)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      setStats({
        totalItems: totalItems || 0,
        lowStock: lowStock || 0,
        outOfStock: outOfStock || 0,
        categories: cats?.length || 0,
      });
      setCategories(categoriesWithCounts);
      setRecentActivity((activity as ActivityWithRelations[]) || []);
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Items", value: stats.totalItems, color: "bg-blue-500", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { label: "Low Stock", value: stats.lowStock, color: "bg-yellow-500", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" },
    { label: "Out of Stock", value: stats.outOfStock, color: "bg-red-500", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    { label: "Categories", value: stats.categories, color: "bg-green-500", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
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

      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back, {userProfile?.full_name || "Team Member"}
          </h1>
          <p className="text-gray-500">
            Here&apos;s what&apos;s happening with your inventory today.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-lg p-3`}>
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Categories Breakdown */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Inventory by Category
            </h2>
            {categories.length === 0 ? (
              <p className="text-gray-400 text-sm">No items added yet. Start by adding inventory!</p>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    </div>
                    <span className="rounded-full bg-gray-200 px-3 py-0.5 text-sm font-medium text-gray-600">
                      {cat.item_count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-gray-400 text-sm">No activity yet. Scan or add an item to get started!</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400" />
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-700">
                        {log.user?.full_name || "System"}
                      </span>{" "}
                      <span className="text-gray-500">{formatAction(log.action)}</span>{" "}
                      <span className="font-medium text-gray-700">
                        {log.item?.name || "Unknown"}
                      </span>
                      <div className="text-xs text-gray-400">{timeAgo(log.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
