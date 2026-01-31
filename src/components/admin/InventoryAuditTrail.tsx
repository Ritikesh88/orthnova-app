import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInventoryAuditTrail, InventoryAuditTrailRow } from '../../api';
import { formatCurrency, formatDateTime } from '../../utils/format';

const InventoryAuditTrail: React.FC = () => {
  const { user } = useAuth();
  const [auditData, setAuditData] = useState<InventoryAuditTrailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    itemName: '',
    category: '',
    actionType: ''
  });

  const categories = [
    'Tablets', 'Syrups', 'Injections', 'Capsules', 'Ointments', 
    'Creams', 'Drops', 'Inhalers', 'Devices', 'Surgical', 'Other'
  ];

  const actionTypes = [
    'ADD_ITEM', 'UPDATE_STOCK', 'PURCHASE', 'ADJUSTMENT', 'CORRECTION'
  ];

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getInventoryAuditTrail(
        filters.startDate,
        filters.endDate,
        filters.itemName,
        filters.category,
        filters.actionType
      );
      setAuditData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const exportToExcel = () => {
    const data = auditData.map(record => ({
      'Item Name': record.item_name,
      'Category': record.category,
      'Manufacturer': record.manufacturer,
      'SKU': record.sku,
      'Unit': record.unit,
      'Sale Price': record.sale_price,
      'GST Rate': `${record.gst_rate}%`,
      'Quantity Added': record.quantity_added,
      'Date/Time': formatDateTime(record.date_time),
      'Batch Number': record.batch_number || 'N/A',
      'Expiry Date': record.expiry_date || 'N/A',
      'Uploaded By': record.uploaded_by || 'System',
      'Action Type': record.action_type,
      'Previous Stock': record.previous_stock,
      'New Stock': record.new_stock,
      'Notes': record.notes || 'N/A'
    }));

    // Create worksheet
    const worksheet = (window as any).XLSX.utils.json_to_sheet(data);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Audit Trail');
    
    // Export
    (window as any).XLSX.writeFile(workbook, `Inventory_Audit_Trail_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const { jsPDF } = window as any;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Inventory Audit Trail Report', 14, 15);
    
    // Subtitle with filters
    doc.setFontSize(10);
    const filterText = [
      filters.startDate ? `From: ${filters.startDate}` : '',
      filters.endDate ? `To: ${filters.endDate}` : '',
      filters.itemName ? `Item: ${filters.itemName}` : '',
      filters.category ? `Category: ${filters.category}` : '',
      filters.actionType ? `Action: ${filters.actionType}` : ''
    ].filter(Boolean).join(' | ');
    
    if (filterText) {
      doc.text(filterText, 14, 22);
    }
    
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 29);
    
    // Table data
    const headers = [
      ['Item Name', 'Category', 'Quantity Added', 'Date/Time', 'Action', 'Previous Stock', 'New Stock']
    ];
    
    const data = auditData.map(record => [
      record.item_name,
      record.category,
      record.quantity_added.toString(),
      formatDateTime(record.date_time),
      record.action_type,
      record.previous_stock.toString(),
      record.new_stock.toString()
    ]);
    
    // Add table
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Save
    doc.save(`Inventory_Audit_Trail_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!user) {
    return <div className="p-6">Please login to view inventory audit trail.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Inventory Audit Trail</h2>
        <p className="text-gray-600 mb-6">
          Track all inventory updates with detailed information including who made the changes and when.
        </p>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              className="w-full"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              className="w-full"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              type="text"
              className="w-full"
              placeholder="Search item name"
              value={filters.itemName}
              onChange={(e) => handleFilterChange('itemName', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Action Type</label>
            <select
              className="w-full"
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{action.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={exportToExcel}
            disabled={loading || auditData.length === 0}
            className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
          
          <button
            onClick={exportToPDF}
            disabled={loading || auditData.length === 0}
            className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export to PDF
          </button>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Summary */}
        {auditData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{auditData.length}</div>
              <div className="text-sm text-blue-800">Total Records</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {auditData.filter(r => r.action_type === 'ADD_ITEM').length}
              </div>
              <div className="text-sm text-green-800">Items Added</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {auditData.filter(r => r.action_type === 'PURCHASE').length}
              </div>
              <div className="text-sm text-purple-800">Purchases</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {auditData.reduce((sum, r) => sum + r.quantity_added, 0)}
              </div>
              <div className="text-sm text-orange-800">Total Qty Added</div>
            </div>
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading audit trail...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Error: {error}</p>
          </div>
        ) : auditData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Item Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Manufacturer</th>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4 text-right">Sale Price</th>
                  <th className="py-2 pr-4 text-right">GST %</th>
                  <th className="py-2 pr-4 text-right">Qty Added</th>
                  <th className="py-2 pr-4">Date/Time</th>
                  <th className="py-2 pr-4">Batch #</th>
                  <th className="py-2 pr-4">Expiry Date</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4 text-right">Prev Stock</th>
                  <th className="py-2 pr-4 text-right">New Stock</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {auditData.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{record.item_name}</td>
                    <td className="py-2 pr-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {record.category}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{record.manufacturer}</td>
                    <td className="py-2 pr-4 text-gray-600">{record.sku}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(record.sale_price)}</td>
                    <td className="py-2 pr-4 text-right">{record.gst_rate}%</td>
                    <td className="py-2 pr-4 text-right font-semibold text-green-600">
                      +{record.quantity_added}
                    </td>
                    <td className="py-2 pr-4">{formatDateTime(record.date_time)}</td>
                    <td className="py-2 pr-4">{record.batch_number || 'N/A'}</td>
                    <td className="py-2 pr-4">{record.expiry_date || 'N/A'}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.action_type === 'ADD_ITEM' ? 'bg-blue-100 text-blue-800' :
                        record.action_type === 'PURCHASE' ? 'bg-green-100 text-green-800' :
                        record.action_type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' :
                        record.action_type === 'CORRECTION' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.action_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right">{record.previous_stock}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{record.new_stock}</td>
                    <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">
                      {record.notes || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAuditTrail;