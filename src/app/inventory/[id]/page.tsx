"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }

      const { data } = await supabase
        .from("items")
        .select(`*, category:categories(*), location:locations(*), assigned_user:profiles!items_assigned_to_fkey(*)`)
        .eq("id", params.id as string)
        .single();

      if (!data) { router.push("/inventory"); return; }

      const { data: activity } = await supabase
        .from("activity_log")
        .select(`*, user:profiles(full_name, email)`)
        .eq("item_id", params.id as string)
        .order("created_at", { ascending: false }).limit(20);

      setItem({ ...data, activity: activity || [] } as ItemDetail);
      setLoading(false);
    }
    loadItem();
  }, [params.id, router]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function formatAction(action: string) {
    return action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  }

  function statusStyle(status: string) {
    const map: Record<string, string> = {
      in_stock: "bg-primary-fixed/60 text-primary",
      low_stock: "bg-warning-container text-on-warning-container",
      out_of_stock: "bg-error-container text-on-error-container",
      on_order: "bg-tertiary-container text-tertiary",
      retired: "bg-surface-container text-on-surface-subtle",
    };
    return map[status] || "bg-surface-container text-on-surface-muted";
  }

  if (loading || !item) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-high border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-background px-10 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/inventory")}
          className="mb-6 flex items-center gap-1.5 text-[13px] text-on-surface-muted transition hover:text-on-surface"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Inventory
        </button>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-hero)] text-[2rem] font-bold tracking-tight text-on-surface">{item.name}</h1>
            <p className="mt-1 font-mono text-[13px] text-on-surface-subtle">{item.barcode}</p>
          </div>
          <span className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${statusStyle(item.status)}`}>
            {item.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left — Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo */}
            <div className="rounded-xl bg-surface-card p-6" style={{ boxShadow: "var(--shadow-ambient)" }}>
              {item.photo_url ? (
                <img src={item.photo_url} alt={item.name} className="h-64 w-full rounded-lg object-contain bg-surface-low" />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg bg-surface-low">
                  <div className="text-center">
                    <svg className="mx-auto h-10 w-10 text-on-surface-subtle" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-[12px] text-on-surface-subtle">No photo yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="rounded-xl bg-surface-card p-6" style={{ boxShadow: "var(--shadow-ambient)" }}>
              <h2 className="mb-5 font-[family-name:var(--font-hero)] text-lg font-semibold text-on-surface">Details</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <DetailField label="Description" value={item.description || "\u2014"} span={2} />
                <DetailField label="Category" value={item.category?.name || "\u2014"} color={item.category?.color} />
                <DetailField label="Location" value={item.location ? `${item.location.name}${item.location.zone ? ` \u2014 ${item.location.zone}` : ''}` : "\u2014"} />
                <DetailField label="Quantity" value={`${item.quantity} ${item.unit}`} highlight={item.quantity <= item.min_quantity} />
                <DetailField label="Min Quantity" value={`${item.min_quantity} ${item.unit}`} />
                <DetailField label="Vendor" value={item.vendor || "\u2014"} />
                <DetailField label="Vendor SKU" value={item.vendor_sku || "\u2014"} />
                <DetailField label="Purchase Date" value={formatDate(item.purchase_date)} />
                <DetailField label="Purchase Price" value={item.purchase_price ? `$${item.purchase_price}` : "\u2014"} />
                <DetailField label="Warranty Expires" value={formatDate(item.warranty_expiration)} />
                <DetailField label="Expiration Date" value={formatDate(item.expiration_date)} />
                {item.assigned_user && <DetailField label="Assigned To" value={item.assigned_user.full_name} span={2} />}
                {item.notes && <DetailField label="Notes" value={item.notes} span={2} />}
              </div>
            </div>
          </div>

          {/* Right — Activity */}
          <div>
            <div className="rounded-xl bg-surface-card p-6" style={{ boxShadow: "var(--shadow-ambient)" }}>
              <h2 className="mb-5 font-[family-name:var(--font-hero)] text-lg font-semibold text-on-surface">Activity</h2>
              {item.activity.length === 0 ? (
                <p className="text-[13px] text-on-surface-subtle">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {item.activity.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-container" />
                      <div className="text-[13px]">
                        <div>
                          <span className="font-medium text-on-surface">{log.user?.full_name || "System"}</span>{" "}
                          <span className="text-on-surface-muted">{formatAction(log.action)}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-on-surface-subtle">{formatDateTime(log.created_at)}</div>
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

function DetailField({ label, value, span, color, highlight }: {
  label: string; value: string; span?: number; color?: string; highlight?: boolean;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">{label}</dt>
      <dd className={`mt-1 flex items-center gap-2 text-[13px] ${highlight ? "font-semibold text-on-error-container" : "text-on-surface-variant"}`}>
        {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
        {value}
      </dd>
    </div>
  );
}
