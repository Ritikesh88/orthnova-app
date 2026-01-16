import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInventoryItems, adjustStock } from '../../api';
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
    </div>
  );
};

export default StockDetails;