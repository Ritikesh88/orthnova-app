import React, { useEffect, useState } from 'react';
import { listInventoryItems, updateInventoryItem, adjustStock } from '../../api';
import { InventoryItemRow, StockLedgerRow } from '../../types';
import { useAuth } from '../../context/AuthContext';

const StockManagement: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<InventoryItemRow>>({});
  const [adjustmentData, setAdjustmentData] = useState<Record<string, { change: number; reason: string; notes: string }>>({});

  useEffect(() => {
    if (user?.role !== 'admin') {
      setError('Access denied. Only admins can manage stock.');
      return;
    }
    
    refreshInventory();
  }, [user]);

  const refreshInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInventoryItems();
      setInventory(data);
      
      // Initialize adjustment data
      const initialAdjustmentData: Record<string, { change: number; reason: string; notes: string }> = {};
      data.forEach(item => {
        initialAdjustmentData[item.id] = { change: 0, reason: 'adjustment', notes: '' };
      });
      setAdjustmentData(initialAdjustmentData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: InventoryItemRow) => {
    setEditingId(item.id);
    setEditValues({
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      sale_price: item.sale_price,
      cost_price: item.cost_price,
      low_stock_threshold: item.low_stock_threshold,
      expiry_date: item.expiry_date,
      batch_number: item.batch_number,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateInventoryItem(id, editValues);
      setSuccess('Item updated successfully');
      setEditingId(null);
      setEditValues({});
      await refreshInventory();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAdjustStock = async (id: string) => {
    const adjustment = adjustmentData[id];
    if (!adjustment || adjustment.change === 0) {
      setError('Please enter a non-zero stock change amount');
      return;
    }

    try {
      await adjustStock(id, adjustment.change, adjustment.reason as StockLedgerRow['reason'], {
        notes: adjustment.notes,
        created_by: user?.userId || null
      });
      setSuccess(`Stock adjusted by ${adjustment.change} units`);
      await refreshInventory();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Stock Management</h2>
          <p className="text-red-600">Access denied. Only admins can manage stock.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Stock Management</h2>
          <button className="btn btn-secondary" onClick={refreshInventory} disabled={loading}>
            Refresh
          </button>
        </div>
        
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Manufacturer</th>
                <th className="py-2 pr-4">Current Stock</th>
                <th className="py-2 pr-4">Threshold</th>
                <th className="py-2 pr-4">Sale Price</th>
                <th className="py-2 pr-4">Expiry Date</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editValues.name || ''}
                        onChange={e => setEditValues({...editValues, name: e.target.value})}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editValues.category || ''}
                        onChange={e => setEditValues({...editValues, category: e.target.value})}
                      />
                    ) : (
                      item.category
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editValues.manufacturer || ''}
                        onChange={e => setEditValues({...editValues, manufacturer: e.target.value})}
                      />
                    ) : (
                      item.manufacturer
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{item.current_stock}</span>
                      <input
                        type="number"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                        value={adjustmentData[item.id]?.change || 0}
                        onChange={e => setAdjustmentData({
                          ...adjustmentData,
                          [item.id]: {
                            ...adjustmentData[item.id],
                            change: Number(e.target.value)
                          }
                        })}
                        placeholder="Change"
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editValues.low_stock_threshold || ''}
                        onChange={e => setEditValues({...editValues, low_stock_threshold: Number(e.target.value)})}
                      />
                    ) : (
                      item.low_stock_threshold
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editValues.sale_price || ''}
                        onChange={e => setEditValues({...editValues, sale_price: Number(e.target.value)})}
                      />
                    ) : (
                      `₹${item.sale_price}`
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingId === item.id ? (
                      <input
                        type="date"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        value={editValues.expiry_date || ''}
                        onChange={e => setEditValues({...editValues, expiry_date: e.target.value})}
                      />
                    ) : (
                      item.expiry_date || '-'
                    )}
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    {editingId === item.id ? (
                      <>
                        <button 
                          className="btn btn-primary text-xs px-2 py-1"
                          onClick={() => handleSaveEdit(item.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-secondary text-xs px-2 py-1"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn btn-secondary text-xs px-2 py-1"
                        onClick={() => handleEditClick(item)}
                      >
                        Edit
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary text-xs px-2 py-1"
                      onClick={() => handleAdjustStock(item.id)}
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={8}>
                    {loading ? 'Loading...' : 'No inventory items found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockManagement;