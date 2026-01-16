import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createInventoryItem, listInventoryItems, adjustStock, updateInventoryItem } from '../../api';
import { InventoryItemRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Feature flag to toggle Medicine Store UI
const MEDICINE_STORE_ACTIVE = true;

const PharmacyInventoryRecent: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    sku: string;
    unit: string;
    cost_price: number;
    sale_price: number;
    opening_stock: number;
    low_stock_threshold: number | null;
    category: string;
    manufacturer: string;
    expiry_date: string;
    batch_number: string;
    hsn_code: string;
    gst_rate: number;
  }>({
    name: '', 
    sku: '', 
    unit: 'unit', 
    cost_price: 0, 
    sale_price: 0, 
    opening_stock: 0, 
    low_stock_threshold: null,
    category: 'Tablets',
    manufacturer: '',
    expiry_date: '',
    batch_number: '',
    hsn_code: '',
    gst_rate: 18,
  });

  // State for editing functionality
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItemRow>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listInventoryItems(query);
      // Sort by created_at to show most recent entries first
      const sortedData = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(sortedData);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { if (MEDICINE_STORE_ACTIVE) { refresh(); } }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i: InventoryItemRow) => 
      i.name.toLowerCase().includes(q) || 
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.manufacturer.toLowerCase().includes(q)
    );
  }, [items, query]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    try {
      await createInventoryItem(form);
      setSuccess('Inventory item added');
      setForm({
        name: '', 
        sku: '', 
        unit: 'unit', 
        cost_price: 0, 
        sale_price: 0, 
        opening_stock: 0, 
        low_stock_threshold: null,
        category: 'Tablets',
        manufacturer: '',
        expiry_date: '',
        batch_number: '',
        hsn_code: '',
        gst_rate: 18,
      });
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  const onAdjust = async (id: string, delta: number, reason: 'purchase' | 'adjustment' | 'correction') => {
    setError(null); setSuccess(null);
    try {
      await adjustStock(id, delta, reason, { created_by: user?.userId || null, notes: reason });
      setSuccess('Stock updated');
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  // Start editing an item
  const startEditing = (item: InventoryItemRow) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      cost_price: item.cost_price,
      sale_price: item.sale_price,
      low_stock_threshold: item.low_stock_threshold,
      category: item.category,
      manufacturer: item.manufacturer,
      expiry_date: item.expiry_date || '',
      batch_number: item.batch_number || '',
      hsn_code: item.hsn_code || '',
      gst_rate: item.gst_rate,
    });
  };

  // Save edited item
  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    
    try {
      await updateInventoryItem(editingId, editForm);
      setSuccess('Inventory item updated successfully');
      setEditingId(null);
      setEditForm({});
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const categories = [
    'Tablets', 'Syrups', 'Injections', 'Capsules', 'Ointments', 'Creams', 
    'Drops', 'Inhalers', 'Devices', 'Surgical', 'Other'
  ];

  return (
    <div className="space-y-6">
      {!MEDICINE_STORE_ACTIVE ? (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-2">Medicine Store (Inactive)</h2>
          <p className="text-sm text-gray-600">This module is currently disabled. All code is preserved and can be re-enabled later.</p>
        </div>
      ) : (
      <>
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Add Medicine Store Item</h2>
        <form onSubmit={onAdd} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Medicine Name</label>
              <input 
                className="mt-1 w-full" 
                value={form.name} 
                onChange={e => setForm(f => ({...f, name: e.target.value}))} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium">SKU</label>
              <input 
                className="mt-1 w-full" 
                value={form.sku} 
                onChange={e => setForm(f => ({...f, sku: e.target.value}))} 
                required
              />
            </div>
          </div>

          {/* Category and Manufacturer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Category</label>
              <select 
                className="mt-1 w-full" 
                value={form.category} 
                onChange={e => setForm(f => ({...f, category: e.target.value}))}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Manufacturer</label>
              <input 
                className="mt-1 w-full" 
                value={form.manufacturer} 
                onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Unit</label>
              <input 
                className="mt-1 w-full" 
                value={form.unit} 
                onChange={e => setForm(f => ({...f, unit: e.target.value}))} 
                placeholder="e.g., tablet, bottle, unit"
                required
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Cost Price (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                className="mt-1 w-full" 
                value={form.cost_price} 
                onChange={e => setForm(f => ({...f, cost_price: Number(e.target.value)}))} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Sale Price (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                className="mt-1 w-full" 
                value={form.sale_price} 
                onChange={e => setForm(f => ({...f, sale_price: Number(e.target.value)}))} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">GST Rate (%)</label>
              <input 
                type="number" 
                step="0.01" 
                className="mt-1 w-full" 
                value={form.gst_rate} 
                onChange={e => setForm(f => ({...f, gst_rate: Number(e.target.value)}))} 
                required
              />
            </div>
          </div>

          {/* Stock and HSN */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium">Opening Stock</label>
              <input 
                type="number" 
                className="mt-1 w-full" 
                value={form.opening_stock} 
                onChange={e => setForm(f => ({...f, opening_stock: Number(e.target.value)}))} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Low Stock Threshold</label>
              <input 
                type="number" 
                className="mt-1 w-full" 
                value={form.low_stock_threshold ?? 0} 
                onChange={e => setForm(f => ({...f, low_stock_threshold: Number(e.target.value)}))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium">HSN Code</label>
              <input 
                className="mt-1 w-full" 
                value={form.hsn_code} 
                onChange={e => setForm(f => ({...f, hsn_code: e.target.value}))} 
                placeholder="e.g., 3004"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Batch Number</label>
              <input 
                className="mt-1 w-full" 
                value={form.batch_number} 
                onChange={e => setForm(f => ({...f, batch_number: e.target.value}))} 
                placeholder="e.g., BATCH001"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium">Expiry Date</label>
            <input 
              type="date" 
              className="mt-1 w-full" 
              value={form.expiry_date} 
              onChange={e => setForm(f => ({...f, expiry_date: e.target.value}))} 
            />
          </div>

          <div className="flex items-end justify-end">
            <button className="btn btn-primary" disabled={loading}>Add Medicine</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Medicine Store Inventory (Most Recent First)</h2>
          <div className="flex items-center gap-2">
            <input 
              placeholder="Search by name, SKU, category, manufacturer" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              className="rounded-xl border-gray-300" 
            />
            <button className="btn btn-secondary" onClick={refresh}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Manufacturer</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">Sale Price</th>
                <th className="py-2 pr-4">GST</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Added Date</th>
                <th className="py-2 pr-4">Expiry Date</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i: InventoryItemRow) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{i.name}</div>
                        <div className="text-xs text-gray-500">
                          {i.batch_number && `Batch: ${i.batch_number}`}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.category || ''}
                        onChange={e => setEditForm({...editForm, category: e.target.value})}
                      />
                    ) : (
                      i.category
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.manufacturer || ''}
                        onChange={e => setEditForm({...editForm, manufacturer: e.target.value})}
                      />
                    ) : (
                      i.manufacturer
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.sku || ''}
                        onChange={e => setEditForm({...editForm, sku: e.target.value})}
                      />
                    ) : (
                      i.sku
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.unit || ''}
                        onChange={e => setEditForm({...editForm, unit: e.target.value})}
                      />
                    ) : (
                      i.unit
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.sale_price || ''}
                        onChange={e => setEditForm({...editForm, sale_price: Number(e.target.value)})}
                      />
                    ) : (
                      `₹${Number(i.sale_price).toFixed(2)}`
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.gst_rate || ''}
                        onChange={e => setEditForm({...editForm, gst_rate: Number(e.target.value)})}
                      />
                    ) : (
                      `${i.gst_rate || 0}%`
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={i.current_stock <= (i.low_stock_threshold || 0) ? 'text-red-600 font-medium' : ''}>
                      {i.current_stock}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {new Date(i.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === i.id ? (
                      <input
                        type="date"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editForm.expiry_date || ''}
                        onChange={e => setEditForm({...editForm, expiry_date: e.target.value})}
                      />
                    ) : (
                      i.expiry_date ? new Date(i.expiry_date).toLocaleDateString() : '-'
                    )}
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    {editingId === i.id ? (
                      <>
                        <button 
                          className="btn btn-primary px-3 py-1 text-sm" 
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-secondary px-3 py-1 text-sm" 
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-secondary px-3 py-1 text-sm" 
                          onClick={() => startEditing(i)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary px-3 py-1 text-sm" 
                          onClick={() => onAdjust(i.id, 1, 'purchase')}
                          title="Add stock"
                        >
                          +1
                        </button>
                        <button 
                          className="btn btn-secondary px-3 py-1 text-sm" 
                          onClick={() => onAdjust(i.id, -1, 'adjustment')}
                          title="Reduce stock"
                        >
                          -1
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={11}>No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default PharmacyInventoryRecent;