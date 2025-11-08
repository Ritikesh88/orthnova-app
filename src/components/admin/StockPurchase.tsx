import React, { useEffect, useState } from 'react';
import { listInventoryItems, adjustStock } from '../../api';
import { InventoryItemRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PurchaseItem {
  inventory_item_id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  expiry_date: string;
  batch_number: string;
  total: number;
}

interface PurchaseForm {
  supplier_name: string;
  supplier_contact: string;
  invoice_number: string;
  invoice_date: string;
  notes: string;
  items: PurchaseItem[];
}

const StockPurchase: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState<PurchaseForm>({
    supplier_name: '',
    supplier_contact: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await listInventoryItems();
      setInventory(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItem = (item: InventoryItemRow) => {
    const existingItem = form.items.find(i => i.inventory_item_id === item.id);
    if (existingItem) {
      setForm(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.inventory_item_id === item.id 
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.cost_price }
            : i
        )
      }));
    } else {
      const newItem: PurchaseItem = {
        inventory_item_id: item.id,
        item_name: item.name,
        quantity: 1,
        cost_price: item.cost_price,
        expiry_date: '',
        batch_number: '',
        total: item.cost_price
      };
      setForm(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'cost_price') {
            updatedItem.total = updatedItem.quantity * updatedItem.cost_price;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = form.items.reduce((sum, item) => sum + item.total, 0);
    const gst = subtotal * 0.18; // Assuming 18% GST
    const net = subtotal + gst;
    return { subtotal, gst, net };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.items.length === 0) {
      setError('Add at least one item to purchase');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Add stock for each item
      for (const item of form.items) {
        await adjustStock(
          item.inventory_item_id,
          item.quantity,
          'purchase',
          {
            notes: `Purchase from ${form.supplier_name} - Invoice: ${form.invoice_number}`,
            created_by: user?.userId || null
          }
        );
      }

      setSuccess('Stock purchase completed successfully');
      
      // Reset form
      setForm({
        supplier_name: '',
        supplier_contact: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
      });

      // Refresh inventory
      await loadInventory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, gst, net } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Stock Purchase</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Supplier Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Supplier Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={form.supplier_name}
                onChange={e => setForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Supplier Contact</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={form.supplier_contact}
                onChange={e => setForm(prev => ({ ...prev, supplier_contact: e.target.value }))}
                placeholder="Phone or Email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Invoice Number</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={form.invoice_number}
                onChange={e => setForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Invoice Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={form.invoice_date}
                onChange={e => setForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
              rows={3}
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this purchase..."
            />
          </div>

          {/* Item Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Available Items</h3>
                <input
                  placeholder="Search items..."
                  className="rounded-xl border-gray-300"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {filteredInventory.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.category} • {item.manufacturer} • SKU: {item.sku}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cost: ₹{Number(item.cost_price).toFixed(2)} • Current Stock: {item.current_stock}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary ml-2"
                      onClick={() => addItem(item)}
                    >
                      Add
                    </button>
                  </div>
                ))}
                {filteredInventory.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">No items found.</div>
                )}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-medium mb-2">Purchase Items</h3>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{item.item_name}</div>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => removeItem(index)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <label className="block text-xs text-gray-600">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded border border-gray-300 p-1"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Cost Price</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full rounded border border-gray-300 p-1"
                          value={item.cost_price}
                          onChange={e => updateItem(index, 'cost_price', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Expiry Date</label>
                        <input
                          type="date"
                          className="w-full rounded border border-gray-300 p-1"
                          value={item.expiry_date}
                          onChange={e => updateItem(index, 'expiry_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Batch Number</label>
                        <input
                          className="w-full rounded border border-gray-300 p-1"
                          value={item.batch_number}
                          onChange={e => updateItem(index, 'batch_number', e.target.value)}
                          placeholder="BATCH001"
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm font-medium mt-2">
                      Total: ₹{item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
                {form.items.length === 0 && (
                  <div className="text-sm text-gray-500">No items added.</div>
                )}
              </div>

              {form.items.length > 0 && (
                <div className="border-t border-gray-100 mt-3 pt-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Net Total</span>
                    <span>₹{net.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="btn btn-primary" 
              disabled={loading || form.items.length === 0}
            >
              {loading ? 'Processing...' : 'Complete Purchase'}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        </form>
      </div>
    </div>
  );
};

export default StockPurchase;
