import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInventoryItems, adjustStock, updateInventoryItem } from '../../api';
import { InventoryItemRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Feature flag to toggle Medicine Store UI
const MEDICINE_STORE_ACTIVE = true;

const StockDetails = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<InventoryItemRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', sku: '', unit: 'unit', cost_price: 0, sale_price: 0,
    gst_rate: 18, category: 'Tablets', manufacturer: '',
    batch_number: '', expiry_date: '', hsn_code: '',
    low_stock_threshold: 0, stock_adjustment: 0,
    adjustment_reason: 'correction' as 'purchase' | 'adjustment' | 'correction',
    notes: ''
  });

  const categories = [
    'Tablets', 'Syrups', 'Injections', 'Capsules', 'Ointments', 'Creams',
    'Drops', 'Inhalers', 'Devices', 'Surgical', 'Other'
  ];

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

  const onAdjust = async (id: string, delta: number, reason: 'purchase' | 'adjustment' | 'correction') => {
    setError(null); setSuccess(null);
    try {
      await adjustStock(id, delta, reason, { created_by: user?.userId || null, notes: reason });
      setSuccess('Stock updated');
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  const onEditClick = (item: InventoryItemRow) => {
    setEditForm({
      name: item.name, sku: item.sku, unit: item.unit,
      cost_price: item.cost_price, sale_price: item.sale_price,
      gst_rate: item.gst_rate, category: item.category,
      manufacturer: item.manufacturer,
      batch_number: item.batch_number || '',
      expiry_date: item.expiry_date || '',
      hsn_code: item.hsn_code || '',
      low_stock_threshold: item.low_stock_threshold || 0,
      stock_adjustment: 0,
      adjustment_reason: 'correction',
      notes: ''
    });
    setEditingItem(item);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setError(null); setSuccess(null);

      // 1. Update item details
      await updateInventoryItem(editingItem.id, {
        name: editForm.name, sku: editForm.sku, unit: editForm.unit,
        cost_price: editForm.cost_price, sale_price: editForm.sale_price,
        gst_rate: editForm.gst_rate, category: editForm.category,
        manufacturer: editForm.manufacturer,
        batch_number: editForm.batch_number || null,
        expiry_date: editForm.expiry_date || null,
        hsn_code: editForm.hsn_code || null,
        low_stock_threshold: editForm.low_stock_threshold,
      }, user?.userId);

      // 2. If stock adjustment is non-zero, apply it
      if (editForm.stock_adjustment !== 0) {
        await adjustStock(
          editingItem.id,
          editForm.stock_adjustment,
          editForm.adjustment_reason,
          {
            notes: editForm.notes || `Stock ${editForm.adjustment_reason}: ${editForm.stock_adjustment > 0 ? '+' : ''}${editForm.stock_adjustment} units`,
            created_by: user?.userId || null,
          }
        );
      }

      setSuccess(`Item updated successfully${editForm.stock_adjustment !== 0 ? `. Stock adjusted by ${editForm.stock_adjustment > 0 ? '+' : ''}${editForm.stock_adjustment} units.` : ''}`);
      setEditingItem(null);
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  const onEditCancel = () => {
    setEditingItem(null);
  };

  if (!MEDICINE_STORE_ACTIVE) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-2">Medicine Store (Inactive)</h2>
        <p className="text-sm text-gray-600">This module is currently disabled. All code is preserved and can be re-enabled later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Stock Details</h2>
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
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}
        {loading && <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">Loading...</div>}
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
                      className="btn btn-secondary px-3 py-1 text-xs"
                      onClick={() => onEditClick(i)}
                    >
                      Edit
                    </button>
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Edit Item</h3>
                <p className="text-sm text-gray-500">Current stock: <strong>{editingItem.current_stock}</strong> {editingItem.unit}(s)</p>
              </div>
              <button type="button" onClick={onEditCancel} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Stock adjustment warning */}
            {editForm.stock_adjustment !== 0 && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${editForm.stock_adjustment > 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                Stock will be <strong>{editForm.stock_adjustment > 0 ? 'increased' : 'decreased'}</strong> by <strong>{Math.abs(editForm.stock_adjustment)}</strong> units.
                New stock: <strong>{editingItem.current_stock + editForm.stock_adjustment}</strong>
              </div>
            )}

            <form onSubmit={onEditSubmit} className="space-y-4">
              {/* Name & SKU */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Medicine Name</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium">SKU</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.sku} onChange={e => setEditForm(f => ({...f, sku: e.target.value}))} required />
                </div>
              </div>

              {/* Category, Manufacturer, Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Category</label>
                  <select className="mt-1 w-full rounded-xl border-gray-300" value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value}))}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Manufacturer</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.manufacturer} onChange={e => setEditForm(f => ({...f, manufacturer: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium">Unit</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.unit} onChange={e => setEditForm(f => ({...f, unit: e.target.value}))} required />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Cost Price (₹)</label>
                  <input type="number" step="0.01" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.cost_price} onChange={e => setEditForm(f => ({...f, cost_price: Number(e.target.value)}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium">Sale Price (₹)</label>
                  <input type="number" step="0.01" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.sale_price} onChange={e => setEditForm(f => ({...f, sale_price: Number(e.target.value)}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium">GST Rate (%)</label>
                  <input type="number" step="0.01" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.gst_rate} onChange={e => setEditForm(f => ({...f, gst_rate: Number(e.target.value)}))} required />
                </div>
              </div>

              {/* Identifiers */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium">Low Stock Threshold</label>
                  <input type="number" min="0" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.low_stock_threshold} onChange={e => setEditForm(f => ({...f, low_stock_threshold: Number(e.target.value)}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">HSN Code</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.hsn_code} onChange={e => setEditForm(f => ({...f, hsn_code: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Batch Number</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.batch_number} onChange={e => setEditForm(f => ({...f, batch_number: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Expiry Date</label>
                  <input type="date" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.expiry_date} onChange={e => setEditForm(f => ({...f, expiry_date: e.target.value}))} />
                </div>
              </div>

              {/* Stock Adjustment Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Stock Adjustment (optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Adjust By</label>
                    <input type="number" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.stock_adjustment} onChange={e => setEditForm(f => ({...f, stock_adjustment: Number(e.target.value)}))} placeholder="e.g. +10 or -5" />
                    <p className="text-xs text-gray-500 mt-1">Use positive to add, negative to reduce</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Reason</label>
                    <select className="mt-1 w-full rounded-xl border-gray-300" value={editForm.adjustment_reason} onChange={e => setEditForm(f => ({...f, adjustment_reason: e.target.value as any}))}>
                      <option value="correction">Correction</option>
                      <option value="purchase">Purchase</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Notes</label>
                    <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.notes} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} placeholder="Reason for change" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" className="btn btn-secondary" onClick={onEditCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDetails;