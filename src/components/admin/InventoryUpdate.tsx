import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInventoryItems, listRecentStockLedgerEntries, updateStockLedgerEntry, updateInventoryItem, createInventoryItemWithStockTracking } from '../../api';
import { InventoryItemRow, StockLedgerRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Feature flag to toggle Medicine Store UI
const MEDICINE_STORE_ACTIVE = true;

const InventoryUpdate = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [recentUploads, setRecentUploads] = useState<StockLedgerRow[]>([]);
  const [recentUploadsQuery, setRecentUploadsQuery] = useState({
    itemName: '',
    category: '',
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Start of current month
    dateTo: new Date().toISOString().split('T')[0] // Today's date
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for editing stock ledger entries
  const [editingEntry, setEditingEntry] = useState<StockLedgerRow | null>(null);
  const [editForm, setEditForm] = useState({
    batch_number: '',
    expiry_date: '',
    notes: ''
  });

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
      const data = await listInventoryItems();
      setItems(data);
      
      // Also refresh recent uploads
      const uploads = await listRecentStockLedgerEntries();
      setRecentUploads(uploads);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (MEDICINE_STORE_ACTIVE) { refresh(); } }, [refresh]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    try {
      await createInventoryItemWithStockTracking(form, user?.userId);
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


  
  const onEditClick = (upload: StockLedgerWithInventory) => {
    setEditForm({
      batch_number: upload.inventory_items?.batch_number || '',
      expiry_date: upload.inventory_items?.expiry_date || '',
      notes: upload.notes || ''
    });
    setEditingEntry(upload);
  };
  
  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    
    try {
      setError(null);
      // Update the related inventory item with the new batch number and expiry date
      // We need to find the inventory item based on the item_id in the stock ledger entry
      const relatedItem = items.find(item => item.id === editingEntry.item_id);
      if (relatedItem) {
        await updateInventoryItem(relatedItem.id, {
          batch_number: editForm.batch_number,
          expiry_date: editForm.expiry_date
        });
      }
      
      // Update the stock ledger entry with the notes
      await updateStockLedgerEntry(editingEntry.id, {
        notes: editForm.notes
      });
      
      setSuccess('Stock ledger entry updated successfully');
      setEditingEntry(null);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };
  
  const onEditCancel = () => {
    setEditingEntry(null);
    setEditForm({
      batch_number: '',
      expiry_date: '',
      notes: ''
    });
  };

  const categories = [
    'Tablets', 'Syrups', 'Injections', 'Capsules', 'Ointments', 'Creams', 
    'Drops', 'Inhalers', 'Devices', 'Surgical', 'Other'
  ];

  // Define type for stock ledger with joined inventory data
  type StockLedgerWithInventory = StockLedgerRow & {
    inventory_items: InventoryItemRow | null;
  };

  // Filter recent uploads based on criteria
  const filteredRecentUploads = useMemo(() => {
    return (recentUploads as StockLedgerWithInventory[]).filter(upload => {
      // Only show purchase and adjustment entries (positive changes)
      if (upload.change <= 0) return false;
      
      // Filter by item name
      if (recentUploadsQuery.itemName && 
          !upload.inventory_items?.name.toLowerCase().includes(recentUploadsQuery.itemName.toLowerCase())) {
        return false;
      }
      
      // Filter by category
      if (recentUploadsQuery.category && 
          !upload.inventory_items?.category.toLowerCase().includes(recentUploadsQuery.category.toLowerCase())) {
        return false;
      }
      
      // Filter by date range
      if (recentUploadsQuery.dateFrom && new Date(upload.created_at) < new Date(recentUploadsQuery.dateFrom)) {
        return false;
      }
      if (recentUploadsQuery.dateTo && new Date(upload.created_at) > new Date(recentUploadsQuery.dateTo)) {
        return false;
      }
      
      return true;
    });
  }, [recentUploads, recentUploadsQuery]);

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
      {/* Inventory Update Section */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Inventory Update</h2>
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
      
      {/* Recent Inventory Uploads Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Inventory Uploads</h2>
          <div className="flex flex-wrap gap-2">
            <input 
              placeholder="Filter by item name" 
              value={recentUploadsQuery.itemName} 
              onChange={e => setRecentUploadsQuery(prev => ({...prev, itemName: e.target.value}))} 
              className="rounded-md border-gray-300 text-sm" 
            />
            <input 
              placeholder="Filter by category" 
              value={recentUploadsQuery.category} 
              onChange={e => setRecentUploadsQuery(prev => ({...prev, category: e.target.value}))} 
              className="rounded-md border-gray-300 text-sm" 
            />
            <input 
              type="date" 
              value={recentUploadsQuery.dateFrom} 
              onChange={e => setRecentUploadsQuery(prev => ({...prev, dateFrom: e.target.value}))} 
              className="rounded-md border-gray-300 text-sm" 
              placeholder="From"
            />
            <input 
              type="date" 
              value={recentUploadsQuery.dateTo} 
              onChange={e => setRecentUploadsQuery(prev => ({...prev, dateTo: e.target.value}))} 
              className="rounded-md border-gray-300 text-sm" 
              placeholder="To"
            />
            <button 
              className="btn btn-secondary text-sm" 
              onClick={() => setRecentUploadsQuery({itemName: '', category: '', dateFrom: '', dateTo: ''})}
            >
              Clear Filters
            </button>
          </div>
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
                <th className="py-2 pr-4">Sale Price</th>
                <th className="py-2 pr-4">GST Rate</th>
                <th className="py-2 pr-4">Quantity Added</th>
                <th className="py-2 pr-4">Date/Time</th>
                <th className="py-2 pr-4">Batch Number</th>
                <th className="py-2 pr-4">Expiry Date</th>
                <th className="py-2 pr-4">Uploaded By</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecentUploads.map((upload: StockLedgerWithInventory) => (
                <tr key={`${upload.id}-${upload.created_at}`} className="border-t border-gray-100">
                  <td className="py-2 pr-4 font-medium">{upload.inventory_items?.name || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.category || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.manufacturer || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.sku || 'N/A'}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.unit || 'N/A'}</td>
                  <td className="py-2 pr-4">₹{Number(upload.inventory_items?.sale_price || 0).toFixed(2)}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.gst_rate || 0}%</td>
                  <td className="py-2 pr-4">{upload.change}</td>
                  <td className="py-2 pr-4">{new Date(upload.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{upload.inventory_items?.batch_number || 'N/A'}</td>
                  <td className="py-2 pr-4">
                    {upload.inventory_items?.expiry_date ? new Date(upload.inventory_items.expiry_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-2 pr-4">{upload.created_by || 'System'}</td>
                  <td className="py-2 pr-4">
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm" 
                      onClick={() => onEditClick(upload)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecentUploads.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={13}>No recent inventory uploads found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Stock Ledger Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Stock Entry</h3>
            <form onSubmit={onEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item Name</label>
                  <input 
                    type="text" 
                    value={items.find(item => item.id === editingEntry.item_id)?.name || 'N/A'} 
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Number</label>
                  <input 
                    type="text" 
                    value={editForm.batch_number} 
                    onChange={(e) => setEditForm({...editForm, batch_number: e.target.value})} 
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input 
                    type="date" 
                    value={editForm.expiry_date} 
                    onChange={(e) => setEditForm({...editForm, expiry_date: e.target.value})} 
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea 
                    value={editForm.notes} 
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})} 
                    className="w-full p-2 border border-gray-300 rounded"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onEditCancel}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryUpdate;