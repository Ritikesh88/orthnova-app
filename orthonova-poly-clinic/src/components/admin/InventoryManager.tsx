import React, { useEffect, useMemo, useState } from 'react';
import { createInventoryItem, listInventoryItems, updateInventoryItem, adjustStock } from '../../api';
import { InventoryItemRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

const InventoryManager: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<{ name: string; sku: string; unit: string; cost_price: number; sale_price: number; opening_stock: number; low_stock_threshold: number | null }>({
    name: '', sku: '', unit: 'unit', cost_price: 0, sale_price: 0, opening_stock: 0, low_stock_threshold: null,
  });

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const data = await listInventoryItems(query);
      setItems(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }, [items, query]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    try {
      await createInventoryItem(form);
      setSuccess('Inventory item added');
      setForm({ name: '', sku: '', unit: 'unit', cost_price: 0, sale_price: 0, opening_stock: 0, low_stock_threshold: null });
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

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Add Inventory Item</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">SKU</label>
            <input className="mt-1 w-full" value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Unit</label>
            <input className="mt-1 w-full" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Cost Price</label>
            <input type="number" step="0.01" className="mt-1 w-full" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: Number(e.target.value)}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Sale Price</label>
            <input type="number" step="0.01" className="mt-1 w-full" value={form.sale_price} onChange={e => setForm(f => ({...f, sale_price: Number(e.target.value)}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Opening Stock</label>
            <input type="number" className="mt-1 w-full" value={form.opening_stock} onChange={e => setForm(f => ({...f, opening_stock: Number(e.target.value)}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Low Stock Threshold</label>
            <input type="number" className="mt-1 w-full" value={form.low_stock_threshold ?? 0} onChange={e => setForm(f => ({...f, low_stock_threshold: Number(e.target.value)}))} />
          </div>
          <div className="md:col-span-6 flex items-end justify-end">
            <button className="btn btn-primary" disabled={loading}>Add</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Inventory</h2>
          <div className="flex items-center gap-2">
            <input placeholder="Search by name or SKU" value={query} onChange={e => setQuery(e.target.value)} className="rounded-xl border-gray-300" />
            <button className="btn btn-secondary" onClick={refresh}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">Sale Price</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{i.name}</td>
                  <td className="py-2 pr-4">{i.sku}</td>
                  <td className="py-2 pr-4">{i.unit}</td>
                  <td className="py-2 pr-4">₹{Number(i.sale_price).toFixed(2)}</td>
                  <td className="py-2 pr-4">{i.current_stock}</td>
                  <td className="py-2 pr-4 space-x-2">
                    <button className="btn btn-secondary px-3 py-1" onClick={() => onAdjust(i.id, 1, 'purchase')}>+1</button>
                    <button className="btn btn-secondary px-3 py-1" onClick={() => onAdjust(i.id, -1, 'adjustment')}>-1</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={6}>No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;

