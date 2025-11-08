import { useCallback, useEffect, useMemo, useState } from 'react';
import { createInventoryItem, listInventoryItems, adjustStock } from '../../api';
import { InventoryItemRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Feature flag to toggle Medicine Store UI
const MEDICINE_STORE_ACTIVE = false;

const InventoryManager = () => {
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

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listInventoryItems(query);
      setItems(data);
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
          <h2 className="text-xl font-semibold">Medicine Store Inventory</h2>
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
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i: InventoryItemRow) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-500">
                        {i.batch_number && `Batch: ${i.batch_number}`}
                        {i.expiry_date && ` • Exp: ${new Date(i.expiry_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-4">{i.category}</td>
                  <td className="py-2 pr-4">{i.manufacturer}</td>
                  <td className="py-2 pr-4">{i.sku}</td>
                  <td className="py-2 pr-4">{i.unit}</td>
                  <td className="py-2 pr-4">₹{Number(i.sale_price).toFixed(2)}</td>
                  <td className="py-2 pr-4">{i.gst_rate || 0}%</td>
                  <td className="py-2 pr-4">
                    <span className={i.current_stock <= (i.low_stock_threshold || 0) ? 'text-red-600 font-medium' : ''}>
                      {i.current_stock}
                    </span>
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    <button 
                      className="btn btn-secondary px-3 py-1" 
                      onClick={() => onAdjust(i.id, 1, 'purchase')}
                      title="Add stock"
                    >
                      +1
                    </button>
                    <button 
                      className="btn btn-secondary px-3 py-1" 
                      onClick={() => onAdjust(i.id, -1, 'adjustment')}
                      title="Reduce stock"
                    >
                      -1
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={9}>No items found.</td></tr>
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

export default InventoryManager;

