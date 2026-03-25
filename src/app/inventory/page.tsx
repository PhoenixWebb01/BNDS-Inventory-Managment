"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  useEffect(() => {
    loadData();
  }, [filterCategory, filterStatus]);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/auth"); return; }

    // Load categories for filter dropdown
    const { data: cats } = await supabase.from("categories").select("*").order("name");
    setCategories(cats || []);

    // Load items with relations
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

  // Client-side search filter
  const filteredItems = items.filter((item) =>
    !search ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.barcode.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      in_stock: "bg-green-100 text-green-700",
      low_stock: "bg-yellow-100 text-yellow-700",
      out_of_stock: "bg-red-100 text-red-700",
      on_order: "bg-blue-100 text-blue-700",
      retired: "bg-gray-100 text-gray-500",
      disposed: "bg-gray-100 text-gray-400",
    };
    return styles[status] || "bg-gray-100 text-gray-600";
  }

  function formatStatus(status: string) {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-500">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
            <p className="text-gray-500">{items.length} total items</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name, barcode, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-64 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="on_order">On Order</option>
          </select>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Barcode</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {items.length === 0
                      ? 'No items yet. Click "+ Add Item" to get started!'
                      : "No items match your search."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition hover:bg-blue-50"
                    onClick={() => router.push(`/inventory/${item.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-600">{item.barcode}</td>
                    <td className="px-6 py-4">
                      {item.category && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.category.color }} />
                          {item.category.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.location?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

// ===== ADD ITEM MODAL =====
function AddItemModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    quantity: 0,
    min_quantity: 0,
    unit: "each",
    vendor: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Look up category prefix to generate barcode
    let barcode = "";
    if (form.category_id) {
      const cat = categories.find((c) => c.id === form.category_id);
      if (cat) {
        const { data } = await supabase.rpc("generate_barcode", { prefix: cat.prefix });
        barcode = data as string;
      }
    }

    const { error: insertError } = await supabase.from("items").insert({
      ...form,
      barcode,
      category_id: form.category_id || null,
      created_by: session.user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    // Log creation
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Add New Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g., 1mL Syringes (Box of 100)"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="each">Each</option>
                <option value="box">Box</option>
                <option value="case">Case</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Min Quantity (Reorder Alert)</label>
              <input
                type="number"
                value={form.min_quantity}
                onChange={(e) => setForm({ ...form, min_quantity: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vendor</label>
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g., McKesson, CDW"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
