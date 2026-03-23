import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInventoryItems, listRecentStockLedgerEntries, updateStockLedgerEntry, updateInventoryItem, createInventoryItemWithStockTracking, adjustStock } from '../../api';
import { InventoryItemRow, StockLedgerRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

const MEDICINE_STORE_ACTIVE = true;

// Type for stock ledger with joined inventory data
type StockLedgerWithInventory = StockLedgerRow & {
  inventory_items: InventoryItemRow | null;
};

const InventoryUpdate = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [recentUploads, setRecentUploads] = useState<StockLedgerRow[]>([]);
  const [recentUploadsQuery, setRecentUploadsQuery] = useState({
    itemName: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<StockLedgerWithInventory | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', sku: '', unit: 'unit', cost_price: 0, sale_price: 0,
    gst_rate: 18, category: 'Tablets', manufacturer: '',
    batch_number: '', expiry_date: '', hsn_code: '',
    low_stock_threshold: 0, quantity: 0, notes: ''
  });

  // Add form state
  const [form, setForm] = useState({
    name: '', sku: '', unit: 'unit', cost_price: 0, sale_price: 0,
    opening_stock: 0, low_stock_threshold: null as number | null,
    category: 'Tablets', manufacturer: '', expiry_date: '',
    batch_number: '', hsn_code: '', gst_rate: 18,
  });

  const categories = [
    'Tablets', 'Syrups', 'Injections', 'Capsules', 'Ointments', 'Creams',
    'Drops', 'Inhalers', 'Devices', 'Surgical', 'Other'
  ];

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [data, uploads] = await Promise.all([
        listInventoryItems(),
        listRecentStockLedgerEntries()
      ]);
      setItems(data);
      setRecentUploads(uploads);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (MEDICINE_STORE_ACTIVE) { refresh(); } }, [refresh]);

  const resetAddForm = () => setForm({
    name: '', sku: '', unit: 'unit', cost_price: 0, sale_price: 0,
    opening_stock: 0, low_stock_threshold: null,
    category: 'Tablets', manufacturer: '', expiry_date: '',
    batch_number: '', hsn_code: '', gst_rate: 18,
  });

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    try {
      await createInventoryItemWithStockTracking(form, user?.userId);
      setSuccess('Inventory item added successfully');
      resetAddForm();
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  // --- Edit handlers ---
  const onEditClick = (upload: StockLedgerWithInventory) => {
    const inv = upload.inventory_items;
    setEditForm({
      name: inv?.name || '', sku: inv?.sku || '', unit: inv?.unit || 'unit',
      cost_price: inv?.cost_price || 0, sale_price: inv?.sale_price || 0,
      gst_rate: inv?.gst_rate || 18, category: inv?.category || 'Tablets',
      manufacturer: inv?.manufacturer || '',
      batch_number: inv?.batch_number || '', expiry_date: inv?.expiry_date || '',
      hsn_code: inv?.hsn_code || '', low_stock_threshold: inv?.low_stock_threshold || 0,
      quantity: upload.change, notes: upload.notes || ''
    });
    setEditingEntry(upload);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    try {
      setError(null); setSuccess(null);
      const relatedItem = items.find(item => item.id === editingEntry.item_id);
      if (!relatedItem) { setError('Inventory item not found'); return; }

      const originalQty = editingEntry.change;
      const newQty = editForm.quantity;
      const qtyDifference = newQty - originalQty;

      await updateInventoryItem(relatedItem.id, {
        name: editForm.name, sku: editForm.sku, unit: editForm.unit,
        cost_price: editForm.cost_price, sale_price: editForm.sale_price,
        gst_rate: editForm.gst_rate, category: editForm.category,
        manufacturer: editForm.manufacturer,
        batch_number: editForm.batch_number || null,
        expiry_date: editForm.expiry_date || null,
        hsn_code: editForm.hsn_code || null,
        low_stock_threshold: editForm.low_stock_threshold,
      }, user?.userId);

      if (qtyDifference !== 0) {
        await adjustStock(relatedItem.id, qtyDifference, 'correction', {
          notes: `Stock corrected: original entry was ${originalQty}, corrected to ${newQty} (diff: ${qtyDifference > 0 ? '+' : ''}${qtyDifference})`,
          created_by: user?.userId || null,
        });
      }

      await updateStockLedgerEntry(editingEntry.id, {
        notes: editForm.notes || `Edited by ${user?.userId || 'admin'} on ${new Date().toLocaleDateString()}`
      });

      setSuccess(`Item updated successfully${qtyDifference !== 0 ? `. Stock adjusted by ${qtyDifference > 0 ? '+' : ''}${qtyDifference} units.` : ''}`);
      setEditingEntry(null);
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  const onEditCancel = () => setEditingEntry(null);

  // Filter recent uploads
  const filteredRecentUploads = useMemo(() => {
    return (recentUploads as StockLedgerWithInventory[]).filter(upload => {
      if (upload.change <= 0) return false;
      if (recentUploadsQuery.itemName &&
          !upload.inventory_items?.name?.toLowerCase().includes(recentUploadsQuery.itemName.toLowerCase())) return false;
      if (recentUploadsQuery.category &&
          !upload.inventory_items?.category?.toLowerCase().includes(recentUploadsQuery.category.toLowerCase())) return false;
      if (recentUploadsQuery.dateFrom) {
        if (new Date(upload.created_at) < new Date(recentUploadsQuery.dateFrom + 'T00:00:00')) return false;
      }
      if (recentUploadsQuery.dateTo) {
        if (new Date(upload.created_at) > new Date(recentUploadsQuery.dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [recentUploads, recentUploadsQuery]);

  if (!MEDICINE_STORE_ACTIVE) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-2">Medicine Store (Inactive)</h2>
        <p className="text-sm text-gray-600">This module is currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Add New Medicine Form ===== */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Medicine / Stock</h2>
        <form onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Medicine Name</label>
              <input className="mt-1 w-full" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">SKU</label>
              <input className="mt-1 w-full" value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Category</label>
              <select className="mt-1 w-full" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Manufacturer</label>
              <input className="mt-1 w-full" value={form.manufacturer} onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Unit</label>
              <input className="mt-1 w-full" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} placeholder="e.g., tablet, bottle" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Cost Price (₹)</label>
              <input type="number" step="0.01" className="mt-1 w-full" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: Number(e.target.value)}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Sale Price (₹)</label>
              <input type="number" step="0.01" className="mt-1 w-full" value={form.sale_price} onChange={e => setForm(f => ({...f, sale_price: Number(e.target.value)}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">GST Rate (%)</label>
              <input type="number" step="0.01" className="mt-1 w-full" value={form.gst_rate} onChange={e => setForm(f => ({...f, gst_rate: Number(e.target.value)}))} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium">Opening Stock</label>
              <input type="number" className="mt-1 w-full" value={form.opening_stock} onChange={e => setForm(f => ({...f, opening_stock: Number(e.target.value)}))} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Low Stock Threshold</label>
              <input type="number" className="mt-1 w-full" value={form.low_stock_threshold ?? 0} onChange={e => setForm(f => ({...f, low_stock_threshold: Number(e.target.value)}))} />
            </div>
            <div>
              <label className="block text-sm font-medium">HSN Code</label>
              <input className="mt-1 w-full" value={form.hsn_code} onChange={e => setForm(f => ({...f, hsn_code: e.target.value}))} placeholder="e.g., 3004" />
            </div>
            <div>
              <label className="block text-sm font-medium">Batch Number</label>
              <input className="mt-1 w-full" value={form.batch_number} onChange={e => setForm(f => ({...f, batch_number: e.target.value}))} placeholder="e.g., BATCH001" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Expiry Date</label>
            <input type="date" className="mt-1 w-full" value={form.expiry_date} onChange={e => setForm(f => ({...f, expiry_date: e.target.value}))} />
          </div>
          <div className="flex items-end justify-end">
            <button className="btn btn-primary" disabled={loading}>Add Medicine</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      {/* ===== Recent Inventory Uploads ===== */}
      <div className="card p-6">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Inventory Uploads</h2>
            <button className="btn btn-secondary text-sm" onClick={refresh} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input placeholder="Filter by item name" value={recentUploadsQuery.itemName} onChange={e => setRecentUploadsQuery(p => ({...p, itemName: e.target.value}))} className="rounded-md border-gray-300 text-sm" />
            <input placeholder="Filter by category" value={recentUploadsQuery.category} onChange={e => setRecentUploadsQuery(p => ({...p, category: e.target.value}))} className="rounded-md border-gray-300 text-sm" />
            <input type="date" value={recentUploadsQuery.dateFrom} onChange={e => setRecentUploadsQuery(p => ({...p, dateFrom: e.target.value}))} className="rounded-md border-gray-300 text-sm" />
            <input type="date" value={recentUploadsQuery.dateTo} onChange={e => setRecentUploadsQuery(p => ({...p, dateTo: e.target.value}))} className="rounded-md border-gray-300 text-sm" />
            <button className="btn btn-secondary text-sm" onClick={() => setRecentUploadsQuery({itemName: '', category: '', dateFrom: '', dateTo: ''})}>Clear Filters</button>
          </div>
          <p className="text-xs text-gray-500">Showing {filteredRecentUploads.length} entries. Click Edit to correct any wrong data — stock will auto-adjust.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Item Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Manufacturer</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">Cost Price</th>
                <th className="py-2 pr-4">Sale Price</th>
                <th className="py-2 pr-4">GST</th>
                <th className="py-2 pr-4">Qty Added</th>
                <th className="py-2 pr-4">Date/Time</th>
                <th className="py-2 pr-4">Batch No.</th>
                <th className="py-2 pr-4">Expiry</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecentUploads.map((upload: StockLedgerWithInventory) => (
                <tr key={upload.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">{upload.inventory_items?.name || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.category || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.manufacturer || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.sku || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.unit || 'N/A'}</td>
                  <td className="py-2 pr-4">₹{Number(upload.inventory_items?.cost_price || 0).toFixed(2)}</td>
                  <td className="py-2 pr-4">₹{Number(upload.inventory_items?.sale_price || 0).toFixed(2)}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.gst_rate || 0}%</td>
                  <td className="py-2 pr-4 font-semibold">{upload.change}</td>
                  <td className="py-2 pr-4 text-xs">{new Date(upload.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.batch_number || '-'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.expiry_date ? new Date(upload.inventory_items.expiry_date).toLocaleDateString() : '-'}</td>
                  <td className="py-2 pr-4">
                    <button className="btn btn-secondary px-3 py-1 text-xs" onClick={() => onEditClick(upload)}>Edit</button>
                  </td>
                </tr>
              ))}
              {filteredRecentUploads.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={13}>{loading ? 'Loading...' : 'No recent inventory uploads found.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Edit Stock Entry Modal ===== */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Edit Stock Entry</h3>
                <p className="text-sm text-gray-500">Current stock: <strong>{items.find(i => i.id === editingEntry.item_id)?.current_stock ?? '?'}</strong></p>
              </div>
              <button type="button" onClick={onEditCancel} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {editForm.quantity !== editingEntry.change && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${editForm.quantity > editingEntry.change ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                Quantity changed from <strong>{editingEntry.change}</strong> → <strong>{editForm.quantity}</strong>.
                Stock will be <strong>{editForm.quantity > editingEntry.change ? 'increased' : 'decreased'}</strong> by <strong>{Math.abs(editForm.quantity - editingEntry.change)}</strong> units on save.
              </div>
            )}

            <form onSubmit={onEditSubmit} className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium">Quantity Added</label>
                  <input type="number" min="0" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.quantity} onChange={e => setEditForm(f => ({...f, quantity: Number(e.target.value)}))} required />
                  <p className="text-xs text-gray-500 mt-1">Original: {editingEntry.change}</p>
                </div>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Expiry Date</label>
                  <input type="date" className="mt-1 w-full rounded-xl border-gray-300" value={editForm.expiry_date} onChange={e => setEditForm(f => ({...f, expiry_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Notes</label>
                  <input className="mt-1 w-full rounded-xl border-gray-300" value={editForm.notes} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} placeholder="Reason for edit" />
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

export default InventoryUpdate;
