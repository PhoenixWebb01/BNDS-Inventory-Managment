"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import type { Item, Category, Location } from "@/types/database";

interface ItemWithRelations extends Item {
  category: Category | null;
  location: Location | null;
}

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadData(); }, [filterCategory, filterStatus]);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/auth"); return; }

    const { data: cats } = await supabase.from("categories").select("*").order("name");
    setCategories(cats || []);

    let query = supabase
      .from("items")
      .select(`*, category:categories(*), location:locations(*)`)
      .order("created_at", { ascending: false });

    if (filterCategory) query = query.eq("category_id", filterCategory);
    if (filterStatus) query = query.eq("status", filterStatus);

    const { data } = await query;
    setItems((data as ItemWithRelations[]) || []);
    setLoading(false);
  }

  const filteredItems = items.filter((item) =>
    !search ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.barcode.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      in_stock: "bg-primary-fixed/60 text-primary",
      low_stock: "bg-warning-container text-on-warning-container",
      out_of_stock: "bg-error-container text-on-error-container",
      on_order: "bg-tertiary-container text-tertiary",
      retired: "bg-surface-container text-on-surface-subtle",
      disposed: "bg-surface-container text-on-surface-subtle",
    };
    return styles[status] || "bg-surface-container text-on-surface-muted";
  }

  function formatStatus(status: string) {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (loading) {
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
        {/* Page Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-hero)] text-[2rem] font-bold tracking-tight text-on-surface">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-on-surface-muted">
              {items.length} total items across {categories.length} categories
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="gradient-primary rounded-lg px-5 py-2.5 text-[13px] font-semibold text-on-primary transition-all hover:opacity-90"
            style={{ boxShadow: "var(--shadow-ambient)" }}
          >
            + Add Item
          </button>
        </div>

        {/* Search & Filters — clinical input style */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-subtle" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, barcode, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-clinical w-full rounded-lg py-2.5 pl-10 pr-4 text-[13px] text-on-surface placeholder:text-on-surface-subtle"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-clinical rounded-lg px-3 py-2.5 text-[13px] text-on-surface-variant"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-clinical rounded-lg px-3 py-2.5 text-[13px] text-on-surface-variant"
          >
            <option value="">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="on_order">On Order</option>
          </select>
        </div>

        {/* Items Table — No-Divider Rule, tonal rows */}
        <div className="rounded-xl bg-surface-card" style={{ boxShadow: "var(--shadow-ambient)" }}>
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 bg-surface-high px-6 py-3">
            <div className="col-span-4 text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-muted">Item</div>
            <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-muted">Barcode</div>
            <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-muted">Category</div>
            <div className="col-span-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-muted">Location</div>
            <div className="col-span-1 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-muted">Qty</div>
            <div className="col-span-2 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-on-surface-muted">Status</div>
          </div>

          {/* Data Rows — gap-based separation, no lines */}
          <div className="p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-low">
                  <svg className="h-6 w-6 text-on-surface-subtle" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-on-surface-muted">
                  {items.length === 0 ? "No items yet" : "No items match your search"}
                </p>
                <p className="mt-1 text-[12px] text-on-surface-subtle">
                  {items.length === 0 ? 'Click "+ Add Item" to get started.' : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 items-center rounded-lg px-4 py-3 cursor-pointer transition-colors hover:bg-surface-low"
                  onClick={() => router.push(`/inventory/${item.id}`)}
                >
                  {/* Item */}
                  <div className="col-span-4 flex items-center gap-3">
                    {item.photo_url ? (
                      <img src={item.photo_url} alt={item.name} className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-low">
                        <svg className="h-4 w-4 text-on-surface-subtle" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <div className="text-[13px] font-medium text-on-surface">{item.name}</div>
                      {item.description && (
                        <div className="mt-0.5 max-w-xs truncate text-[11px] text-on-surface-subtle">{item.description}</div>
                      )}
                    </div>
                  </div>
                  {/* Barcode */}
                  <div className="col-span-2 font-mono text-[12px] text-on-surface-muted">{item.barcode}</div>
                  {/* Category */}
                  <div className="col-span-2">
                    {item.category && (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.category.color }} />
                        {item.category.name}
                      </span>
                    )}
                  </div>
                  {/* Location */}
                  <div className="col-span-1 text-[12px] text-on-surface-muted">
                    {item.location?.name || "\u2014"}
                  </div>
                  {/* Qty — right-aligned per design rules */}
                  <div className="col-span-1 text-right text-[13px] font-semibold text-on-surface">
                    {item.quantity}
                  </div>
                  {/* Status */}
                  <div className="col-span-2 text-right">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddModal && (
          <AddItemModal
            categories={categories}
            onClose={() => setShowAddModal(false)}
            onSaved={() => { setShowAddModal(false); loadData(); }}
          />
        )}
      </main>
    </div>
  );
}

// ===== ADD ITEM MODAL — Glassmorphism overlay =====
function AddItemModal({
  categories, onClose, onSaved,
}: {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", description: "", category_id: "",
    quantity: 0, min_quantity: 0, unit: "each", vendor: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let barcode = "";
    if (form.category_id) {
      const cat = categories.find((c) => c.id === form.category_id);
      if (cat) {
        const { data } = await supabase.rpc("generate_barcode", { prefix: cat.prefix });
        barcode = data as string;
      }
    }

    const { error: insertError } = await supabase.from("items").insert({
      ...form, barcode, category_id: form.category_id || null, created_by: session.user.id,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20">
      {/* Glass modal */}
      <div
        className="glass w-full max-w-lg rounded-2xl p-8"
        style={{ boxShadow: "var(--shadow-float)", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-hero)] text-xl font-semibold text-on-surface">Add New Item</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-muted transition hover:bg-surface-container">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Item Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-clinical w-full rounded-lg px-4 py-2.5 text-[13px]" placeholder="e.g., 1mL Syringes (Box of 100)" required />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-clinical w-full rounded-lg px-4 py-2.5 text-[13px]" placeholder="Optional description..." rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Category *</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="input-clinical w-full rounded-lg px-3 py-2.5 text-[13px]" required>
                <option value="">Select...</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="input-clinical w-full rounded-lg px-3 py-2.5 text-[13px]">
                <option value="each">Each</option>
                <option value="box">Box</option>
                <option value="case">Case</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Quantity</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                className="input-clinical w-full rounded-lg px-4 py-2.5 text-[13px]" min={0} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Min Qty (Reorder)</label>
              <input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: parseInt(e.target.value) || 0 })}
                className="input-clinical w-full rounded-lg px-4 py-2.5 text-[13px]" min={0} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">Vendor</label>
            <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="input-clinical w-full rounded-lg px-4 py-2.5 text-[13px]" placeholder="e.g., McKesson, CDW" />
          </div>

          {error && (
            <div className="rounded-lg bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg bg-surface-container px-5 py-2.5 text-[13px] font-medium text-on-surface-variant transition hover:bg-surface-high">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="gradient-primary rounded-lg px-5 py-2.5 text-[13px] font-semibold text-on-primary transition-all hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
