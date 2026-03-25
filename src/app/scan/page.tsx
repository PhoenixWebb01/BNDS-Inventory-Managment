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
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth");
    });
    // Focus the input so USB barcode scanners work immediately
    inputRef.current?.focus();
  }, [router]);

  async function lookupBarcode(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setScannedItem(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Look up the item by barcode
    const { data, error: fetchError } = await supabase
      .from("items")
      .select(`
        *,
        category:categories(*),
        location:locations(*),
        assigned_user:profiles!items_assigned_to_fkey(*)
      `)
      .eq("barcode", code.trim())
      .single();

    if (fetchError || !data) {
      setError(`No item found with barcode: ${code}`);
      setLoading(false);
      return;
    }

    // Log the scan
    await supabase.from("activity_log").insert({
      item_id: data.id,
      user_id: session.user.id,
      action: "scanned",
      details: { barcode: code },
    });

    // Fetch recent activity
    const { data: activity } = await supabase
      .from("activity_log")
      .select(`*, user:profiles(full_name, email)`)
      .eq("item_id", data.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setScannedItem({ ...data, activity: activity || [] } as ScannedItem);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      lookupBarcode(manualCode);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  function statusColor(status: string) {
    const map: Record<string, string> = {
      in_stock: "bg-green-100 text-green-700 border-green-200",
      low_stock: "bg-yellow-100 text-yellow-700 border-yellow-200",
      out_of_stock: "bg-red-100 text-red-700 border-red-200",
      on_order: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return map[status] || "bg-gray-100 text-gray-600 border-gray-200";
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Scan Barcode</h1>
          <p className="text-gray-500">
            Scan an item&apos;s barcode or enter it manually to view details.
          </p>
        </div>

        {/* Scanner Input Area */}
        <div className="mb-8 rounded-xl bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-lg">
            {/* Camera Scanner Placeholder */}
            {cameraActive ? (
              <div className="mb-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-12 text-center">
                <svg className="mx-auto h-16 w-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p className="mt-4 text-blue-600 font-medium">Camera scanner will be enabled in Phase 3</p>
                <p className="mt-1 text-sm text-blue-400">For now, use the manual entry or a USB scanner below</p>
                <button
                  onClick={() => setCameraActive(false)}
                  className="mt-4 text-sm text-blue-500 underline hover:text-blue-700"
                >
                  Close camera
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCameraActive(true)}
                className="mb-6 w-full rounded-xl border-2 border-dashed border-gray-300 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
              >
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="mt-2 font-medium text-gray-500">Tap to open camera scanner</p>
              </button>
            )}

            {/* Manual Entry / USB Scanner Input */}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-wider focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="BDX-PH-00001"
                autoFocus
              />
              <button
                onClick={() => lookupBarcode(manualCode)}
                disabled={loading || !manualCode.trim()}
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "..." : "Look Up"}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-gray-400">
              USB barcode scanners will type the code and press Enter automatically.
              You can also type a barcode manually.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-600">{error}</p>
            <p className="mt-1 text-sm text-red-400">Check the barcode and try again.</p>
          </div>
        )}

        {/* Scanned Item Result */}
        {scannedItem && (
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            {/* Item Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{scannedItem.name}</h2>
                  <p className="mt-1 font-mono text-sm text-blue-200">{scannedItem.barcode}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-medium ${statusColor(scannedItem.status)}`}>
                  {scannedItem.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Photo */}
                <div className="lg:col-span-1">
                  {scannedItem.photo_url ? (
                    <img src={scannedItem.photo_url} alt={scannedItem.name} className="w-full rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                      <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Key Details */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoCard label="Category" value={scannedItem.category?.name || "—"} />
                  <InfoCard label="Location" value={scannedItem.location?.name || "—"} />
                  <InfoCard label="Quantity" value={`${scannedItem.quantity} ${scannedItem.unit}`}
                    highlight={scannedItem.quantity <= scannedItem.min_quantity} />
                  <InfoCard label="Vendor" value={scannedItem.vendor || "—"} />
                  <InfoCard label="Purchase Date" value={formatDate(scannedItem.purchase_date)} />
                  <InfoCard label="Expiration" value={formatDate(scannedItem.expiration_date)} />
                </div>
              </div>

              {scannedItem.description && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase text-gray-400">Description</p>
                  <p className="mt-1 text-sm text-gray-700">{scannedItem.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push(`/inventory/${scannedItem.id}`)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Full Details
                </button>
                <button
                  onClick={() => { setScannedItem(null); setManualCode(""); inputRef.current?.focus(); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Scan Another
                </button>
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
    <div className={`rounded-lg p-3 ${highlight ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
      <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${highlight ? "text-red-600" : "text-gray-700"}`}>{value}</p>
    </div>
  );
}
