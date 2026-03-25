"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import type { Item, Category, Location, Profile, ActivityLog } from "@/types/database";

interface ItemDetail extends Item {
  category: Category | null;
  location: Location | null;
  assigned_user: Profile | null;
  activity: (ActivityLog & { user: Pick<Profile, "full_name" | "email"> | null })[];
}

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }

      const { data } = await supabase
        .from("items")
        .select(`
          *,
          category:categories(*),
          location:locations(*),
          assigned_user:profiles!items_assigned_to_fkey(*)
        `)
        .eq("id", params.id as string)
        .single();

      if (!data) { router.push("/inventory"); return; }

      // Fetch activity
      const { data: activity } = await supabase
        .from("activity_log")
        .select(`*, user:profiles(full_name, email)`)
        .eq("item_id", params.id as string)
        .order("created_at", { ascending: false })
        .limit(20);

      setItem({ ...data, activity: activity || [] } as ItemDetail);
      setLoading(false);
    }
    loadItem();
  }, [params.id, router]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
  }

  function formatAction(action: string) {
    return action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  }

  function statusColor(status: string) {
    const map: Record<string, string> = {
      in_stock: "bg-green-100 text-green-700",
      low_stock: "bg-yellow-100 text-yellow-700",
      out_of_stock: "bg-red-100 text-red-700",
      on_order: "bg-blue-100 text-blue-700",
      retired: "bg-gray-200 text-gray-500",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  }

  if (loading || !item) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-500">Loading item...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        {/* Back Button & Header */}
        <button
          onClick={() => router.push("/inventory")}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Inventory
        </button>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{item.name}</h1>
            <p className="mt-1 font-mono text-sm text-gray-500">{item.barcode}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor(item.status)}`}>
            {item.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Item Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              {item.photo_url ? (
                <img src={item.photo_url} alt={item.name} className="h-64 w-full rounded-lg object-contain bg-gray-50" />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 text-gray-300">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm">No photo yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Description" value={item.description || "—"} span={2} />
                <DetailField label="Category" value={item.category?.name || "—"} />
                <DetailField label="Location" value={item.location ? `${item.location.name}${item.location.zone ? ` (${item.location.zone})` : ''}` : "—"} />
                <DetailField label="Quantity" value={`${item.quantity} ${item.unit}`} />
                <DetailField label="Min Quantity (Reorder)" value={`${item.min_quantity} ${item.unit}`} />
                <DetailField label="Vendor" value={item.vendor || "—"} />
                <DetailField label="Vendor SKU" value={item.vendor_sku || "—"} />
                <DetailField label="Purchase Date" value={formatDate(item.purchase_date)} />
                <DetailField label="Purchase Price" value={item.purchase_price ? `$${item.purchase_price}` : "—"} />
                <DetailField label="Warranty Expires" value={formatDate(item.warranty_expiration)} />
                <DetailField label="Expiration Date" value={formatDate(item.expiration_date)} />
                {item.assigned_user && (
                  <DetailField label="Assigned To" value={item.assigned_user.full_name} span={2} />
                )}
                {item.notes && <DetailField label="Notes" value={item.notes} span={2} />}
              </div>
            </div>
          </div>

          {/* Right Column - Activity Log */}
          <div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Activity History</h2>
              {item.activity.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {item.activity.map((log) => (
                    <div key={log.id} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      <div className="text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            {log.user?.full_name || "System"}
                          </span>{" "}
                          <span className="text-gray-500">{formatAction(log.action)}</span>
                        </div>
                        <div className="text-xs text-gray-400">{formatDateTime(log.created_at)}</div>
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

function DetailField({ label, value, span }: { label: string; value: string; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-700">{value}</dd>
    </div>
  );
}
