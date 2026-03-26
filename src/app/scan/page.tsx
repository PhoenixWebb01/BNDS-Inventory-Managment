"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import type { Item, Category, Location, Profile, ActivityLog } from "@/types/database";

interface ScannedItem extends Item {
  category: Category | null;
  location: Location | null;
  assigned_user: Profile | null;
  activity: (ActivityLog & { user: Pick<Profile, "full_name" | "email"> | null })[];
}

export default function ScanPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth");
    });
    inputRef.current?.focus();
  }, [router]);

  async function lookupBarcode(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setScannedItem(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error: fetchError } = await supabase
      .from("items")
      .select(`*, category:categories(*), location:locations(*), assigned_user:profiles!items_assigned_to_fkey(*)`)
      .eq("barcode", code.trim())
      .single();

    if (fetchError || !data) {
      setError(`No item found with barcode: ${code}`);
      setLoading(false);
      return;
    }

    await supabase.from("activity_log").insert({
      item_id: data.id, user_id: session.user.id, action: "scanned", details: { barcode: code },
    });

    const { data: activity } = await supabase
      .from("activity_log")
      .select(`*, user:profiles(full_name, email)`)
      .eq("item_id", data.id)
      .order("created_at", { ascending: false }).limit(10);

    setScannedItem({ ...data, activity: activity || [] } as ScannedItem);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") lookupBarcode(manualCode);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function statusStyle(status: string) {
    const map: Record<string, string> = {
      in_stock: "bg-primary-fixed/60 text-primary",
      low_stock: "bg-warning-container text-on-warning-container",
      out_of_stock: "bg-error-container text-on-error-container",
    };
    return map[status] || "bg-surface-container text-on-surface-muted";
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-background px-10 py-8">
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-hero)] text-[2rem] font-bold tracking-tight text-on-surface">
            Scan Barcode
          </h1>
          <p className="mt-1 text-sm text-on-surface-muted">
            Scan an item&apos;s barcode or type it manually to instantly view details.
          </p>
        </div>

        {/* Scanner Input — editorial, centered */}
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl bg-surface-card p-8" style={{ boxShadow: "var(--shadow-ambient)" }}>
            {/* Camera placeholder */}
            <div className="mb-6 flex items-center justify-center rounded-xl bg-surface-low py-10">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container">
                  <svg className="h-7 w-7 text-on-surface-subtle" fill="none" stroke="currentColor" strokeWidth={1.3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-on-surface-muted">Camera scanner coming in Phase 3</p>
                <p className="mt-0.5 text-[11px] text-on-surface-subtle">Use manual entry or a USB scanner below</p>
              </div>
            </div>

            {/* Input */}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-clinical flex-1 rounded-lg px-4 py-3 text-center font-mono text-base tracking-widest"
                placeholder="BDX-PH-00001"
                autoFocus
              />
              <button
                onClick={() => lookupBarcode(manualCode)}
                disabled={loading || !manualCode.trim()}
                className="gradient-primary rounded-lg px-6 py-3 text-[13px] font-semibold text-on-primary transition-all hover:opacity-90 disabled:opacity-40"
              >
                {loading ? "..." : "Look Up"}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-on-surface-subtle">
              USB scanners type the code and press Enter automatically.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl bg-error-container p-5 text-center">
            <p className="text-[13px] font-semibold text-on-error-container">{error}</p>
            <p className="mt-0.5 text-[12px] text-on-error-container/70">Check the barcode and try again.</p>
          </div>
        )}

        {/* Scanned Result */}
        {scannedItem && (
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="overflow-hidden rounded-2xl bg-surface-card" style={{ boxShadow: "var(--shadow-float)" }}>
              {/* Gradient Header */}
              <div className="gradient-primary px-8 py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-[family-name:var(--font-hero)] text-xl font-bold text-on-primary">{scannedItem.name}</h2>
                    <p className="mt-1 font-mono text-[13px] text-on-primary/70">{scannedItem.barcode}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyle(scannedItem.status)}`}>
                    {scannedItem.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <InfoCard label="Category" value={scannedItem.category?.name || "\u2014"} />
                  <InfoCard label="Location" value={scannedItem.location?.name || "\u2014"} />
                  <InfoCard label="Quantity" value={`${scannedItem.quantity} ${scannedItem.unit}`}
                    highlight={scannedItem.quantity <= scannedItem.min_quantity} />
                  <InfoCard label="Vendor" value={scannedItem.vendor || "\u2014"} />
                  <InfoCard label="Purchase Date" value={formatDate(scannedItem.purchase_date)} />
                  <InfoCard label="Expiration" value={formatDate(scannedItem.expiration_date)} />
                </div>

                {scannedItem.description && (
                  <div className="mt-5 rounded-lg bg-surface-low px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Description</p>
                    <p className="mt-1 text-[13px] text-on-surface-variant">{scannedItem.description}</p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => router.push(`/inventory/${scannedItem.id}`)}
                    className="gradient-primary rounded-lg px-5 py-2.5 text-[13px] font-semibold text-on-primary transition hover:opacity-90"
                  >
                    View Full Details
                  </button>
                  <button
                    onClick={() => { setScannedItem(null); setManualCode(""); inputRef.current?.focus(); }}
                    className="rounded-lg bg-surface-container px-5 py-2.5 text-[13px] font-medium text-on-surface-variant transition hover:bg-surface-high"
                  >
                    Scan Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? "bg-error-container/40" : "bg-surface-low"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">{label}</p>
      <p className={`mt-1 text-[13px] font-medium ${highlight ? "text-on-error-container" : "text-on-surface-variant"}`}>{value}</p>
    </div>
  );
}
