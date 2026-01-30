import React, { useState, useEffect } from 'react';
import { getBillsByDate, getBillsByMonth, getBillsByDateRange, SalesSummary, BillDetail, getLowStockItems, getExpiringItems, LowStockItem } from '../../api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import * as XLSX from 'xlsx'; // Using type assertion for utils to avoid TypeScript issues
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItemRow } from '../../types';

type ReportTab = 'sales' | 'inventory';

const PharmacyReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'bill'>('day');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'both'>('paid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salesData, setSalesData] = useState<SalesSummary[]>([]);
  const [billData, setBillData] = useState<BillDetail[]>([]);
  
  // Inventory states
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<InventoryItemRow[]>([]);
  const [inventoryView, setInventoryView] = useState<'low-stock' | 'expiring'>('low-stock');
  
  // Deep dive states
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [deepDiveData, setDeepDiveData] = useState<BillDetail[]>([]);
  const [deepDiveTitle, setDeepDiveTitle] = useState('');

  // Set default dates (today and 30 days ago)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'sales') {
        // Get all bills and filter by payment status
        let allBills = await getBillsByDateRange(startDate, endDate);
        
        // Filter by payment status
        if (paymentStatus !== 'both') {
          allBills = allBills.filter(bill => bill.status === paymentStatus);
        }
        
        if (groupBy === 'bill') {
          // For bill-level view, just set the individual bills
          setBillData(allBills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setSalesData([]); // Clear aggregated data
        } else {
          // Group bills by date/month as needed
          const grouped: Record<string, SalesSummary> = {};
          
          allBills.forEach(bill => {
            const date = new Date(bill.created_at);
            let key: string;
            
            if (groupBy === 'month') {
              key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else {
              key = date.toISOString().split('T')[0];
            }

            if (!grouped[key]) {
              grouped[key] = {
                date: key,
                total_bills: 0,
                total_amount: 0,
                total_discount: 0,
                net_amount: 0,
              };
            }

            grouped[key].total_bills += 1;
            grouped[key].total_amount += Number(bill.total_amount || 0);
            grouped[key].total_discount += Number(bill.discount || 0);
            grouped[key].net_amount += Number(bill.net_amount || 0);
          });

          setSalesData(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
          setBillData([]); // Clear bill-level data
        }
      } else if (activeTab === 'inventory') {
        // Fetch inventory data
        const lowStockData = await getLowStockItems();
        const expiringData = await getExpiringItems(30); // Items expiring within 30 days
        
        setLowStockItems(lowStockData);
        setExpiringItems(expiringData);
      }
    } catch (e: any) {
      console.error('Error fetching reports:', e);
      setError(e.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupBy, startDate, endDate]);

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - days);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(pastDate.toISOString().split('T')[0]);
  };

  const getTotalSummary = () => {
    if (activeTab === 'sales') {
      return {
        total_bills: salesData.reduce((sum, d) => sum + d.total_bills, 0),
        total_amount: salesData.reduce((sum, d) => sum + d.total_amount, 0),
        total_discount: salesData.reduce((sum, d) => sum + d.total_discount, 0),
        net_amount: salesData.reduce((sum, d) => sum + d.net_amount, 0),
      };
    }
    return null;
  };

  const summary = getTotalSummary();

  // Export to Excel
  const exportToExcel = () => {
    let data: any[] = [];
    let sheetName = '';

    if (activeTab === 'sales') {
      if (groupBy === 'bill') {
        sheetName = 'Bill Details';
        data = billData.map(bill => ({
          'Bill Number': bill.bill_number,
          'Date': formatDateTime(bill.created_at),
          'Patient': bill.patient_name || bill.guest_name || 'N/A',
          'Total Amount': bill.total_amount,
          'Discount': bill.discount,
          'Net Amount': bill.net_amount,
          'Status': bill.status,
          'Payment Mode': bill.mode_of_payment,
        }));
      } else {
        sheetName = 'Sales Summary';
        data = salesData.map(row => ({
          Date: groupBy === 'month' 
            ? new Date(row.date + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
            : formatDate(row.date),
          'Total Bills': row.total_bills,
          'Total Amount': row.total_amount,
          'Discount': row.total_discount,
          'Net Amount': row.net_amount,
        }));
      }
    } else if (activeTab === 'inventory') {
      if (inventoryView === 'low-stock') {
        sheetName = 'Low Stock Items';
        data = lowStockItems.map(item => ({
          'Medicine Name': item.name,
          'Category': item.category,
          'Current Stock': item.current_stock,
          'Low Stock Threshold': item.low_stock_threshold,
          'Manufacturer': item.manufacturer,
        }));
      } else {
        sheetName = 'Expiring Items';
        data = expiringItems.map(item => ({
          'Medicine Name': item.name,
          'SKU': item.sku,
          'Category': item.category,
          'Current Stock': item.current_stock,
          'Expiry Date': item.expiry_date,
          'Batch Number': item.batch_number,
          'Manufacturer': item.manufacturer,
        }));
      }
    }

    const worksheet = (XLSX as any).utils.json_to_sheet(data);
    const workbook = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Complete Billing Data to Excel
  const exportCompleteBillingDataToExcel = async () => {
    setLoading(true);
    try {
      // Fetch all bills in the selected date range
      const allBills = await getBillsByDateRange(startDate, endDate);
      
      // Export to Excel
      const data = allBills.map((bill: BillDetail) => ({
        'Bill Number': bill.bill_number,
        'Date': formatDateTime(bill.created_at),
        'Patient': bill.patient_name || bill.guest_name || 'N/A',
        'Total Amount': bill.total_amount,
        'Discount': bill.discount,
        'Net Amount': bill.net_amount,
        'Payment Mode': bill.mode_of_payment,
        'Status': bill.status,
      }));

      const worksheet = (XLSX as any).utils.json_to_sheet(data);
      const workbook = (XLSX as any).utils.book_new();
      (XLSX as any).utils.book_append_sheet(workbook, worksheet, 'Complete Billing Data');
      XLSX.writeFile(workbook, `Complete_Billing_Data_${startDate}_to_${endDate}.xlsx`);
    } catch (e: any) {
      console.error('Error exporting complete billing data:', e);
      setError(e.message || 'Failed to export complete billing data');
    } finally {
      setLoading(false);
    }
  };

  // Export Complete Billing Data to PDF
  const exportCompleteBillingDataToPDF = async () => {
    setLoading(true);
    try {
      // Fetch all bills in the selected date range
      const allBills = await getBillsByDateRange(startDate, endDate);
      
      // Export to PDF
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('Complete Billing Data', 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
      
      const headers = [['Bill #', 'Date', 'Patient', 'Total', 'Discount', 'Net', 'Payment', 'Status']];
      const data = allBills.map((bill: BillDetail) => [
        bill.bill_number,
        formatDateTime(bill.created_at),
        bill.patient_name || bill.guest_name || 'N/A',
        formatCurrency(bill.total_amount),
        formatCurrency(bill.discount),
        formatCurrency(bill.net_amount),
        bill.mode_of_payment,
        bill.status,
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], halign: 'center' },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 30 },
          2: { halign: 'left', cellWidth: 30 },
          3: { halign: 'right', cellWidth: 22 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'center', cellWidth: 20 },
          7: { halign: 'center', cellWidth: 18 },
        },
      });

      doc.save(`Complete_Billing_Data_${startDate}_to_${endDate}.pdf`);
    } catch (e: any) {
      console.error('Error exporting complete billing data to PDF:', e);
      setError(e.message || 'Failed to export complete billing data to PDF');
    } finally {
      setLoading(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let title = '';
    let headers: any[] = [];
    let data: any[][] = [];

    if (activeTab === 'sales') {
      if (groupBy === 'bill') {
        title = 'Bill Details Report';
        headers = [['Bill Number', 'Date', 'Patient', 'Total Amount', 'Discount', 'Net Amount', 'Status', 'Payment Mode']];
        data = billData.map(bill => [
          bill.bill_number,
          formatDateTime(bill.created_at),
          bill.patient_name || bill.guest_name || 'N/A',
          formatCurrency(bill.total_amount),
          formatCurrency(bill.discount),
          formatCurrency(bill.net_amount),
          bill.status,
          bill.mode_of_payment,
        ]);
      } else {
        title = 'Sales Summary Report';
        headers = [['Date', 'Bills', 'Total Amount', 'Discount', 'Net Amount']];
        data = salesData.map(row => [
          groupBy === 'month' 
            ? new Date(row.date + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
            : formatDate(row.date),
          row.total_bills.toString(),
          formatCurrency(row.total_amount),
          formatCurrency(row.total_discount),
          formatCurrency(row.net_amount),
        ]);
      }
    } else if (activeTab === 'inventory') {
      if (inventoryView === 'low-stock') {
        title = 'Low Stock Items Report';
        headers = [['Medicine Name', 'Category', 'Current Stock', 'Threshold', 'Manufacturer']];
        data = lowStockItems.map(item => [
          item.name,
          item.category,
          item.current_stock.toString(),
          item.low_stock_threshold?.toString() || 'N/A',
          item.manufacturer,
        ]);
      } else {
        title = 'Expiring Items Report';
        headers = [['Medicine Name', 'SKU', 'Category', 'Current Stock', 'Expiry Date', 'Batch Number', 'Manufacturer']];
        data = expiringItems.map(item => [
          item.name,
          item.sku,
          item.category,
          item.current_stock.toString(),
          item.expiry_date || 'N/A',
          item.batch_number || 'N/A',
          item.manufacturer,
        ]);
      }
    }

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    if (activeTab === 'sales') {
      doc.setFontSize(10);
      doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
    }

    autoTable(doc, {
      head: headers,
      body: data,
      startY: activeTab === 'sales' ? 28 : 22,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      styles: { fontSize: 9 },
      columnStyles: activeTab === 'sales' ? {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      } : activeTab === 'inventory' && inventoryView === 'low-stock' ? {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'left' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'left' },
      } : {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'left' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'left' },
        6: { halign: 'left' },
      },
    });

    doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Deep dive handlers
  const handleDateClick = async (date: string) => {
    setLoading(true);
    try {
      let bills: BillDetail[];
      if (groupBy === 'month') {
        const [year, month] = date.split('-').map(Number);
        bills = await getBillsByMonth(year, month);
        setDeepDiveTitle(`Bills for ${new Date(year, month - 1).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}`);
      } else {
        bills = await getBillsByDate(date);
        setDeepDiveTitle(`Bills for ${formatDate(date)}`);
      }
      setDeepDiveData(bills);
      setShowDeepDive(true);
    } catch (e: any) {
      console.error('Error fetching bills:', e);
      setError(e.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  // Export deep dive data
  const exportDeepDiveToExcel = () => {
    const data = deepDiveData.map(bill => ({
      'Bill Number': bill.bill_number,
      'Date': formatDateTime(bill.created_at),
      'Patient': bill.patient_name || bill.guest_name || 'N/A',
      'Total Amount': bill.total_amount,
      'Discount': bill.discount,
      'Net Amount': bill.net_amount,
      'Payment Mode': bill.mode_of_payment,
      'Status': bill.status,
    }));

    const worksheet = (XLSX as any).utils.json_to_sheet(data);
    const workbook = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(workbook, worksheet, 'Bill Details');
    XLSX.writeFile(workbook, `${deepDiveTitle.replace(/ /g, '_')}.xlsx`);
  };

  const exportDeepDiveToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(deepDiveTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

    const headers = [['Bill #', 'Date', 'Patient', 'Total', 'Discount', 'Net', 'Status']];
    const data = deepDiveData.map(bill => [
      bill.bill_number,
      formatDateTime(bill.created_at),
      bill.patient_name || bill.guest_name || 'N/A',
      formatCurrency(bill.total_amount),
      formatCurrency(bill.discount),
      formatCurrency(bill.net_amount),
      bill.status,
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 20 },
        1: { halign: 'left', cellWidth: 30 },
        2: { halign: 'left', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 18 },
      },
    });

    doc.save(`${deepDiveTitle.replace(/ /g, '_')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Deep Dive Modal */}
      {showDeepDive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{deepDiveTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportDeepDiveToExcel}
                  className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                  title="Export to Excel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={exportDeepDiveToPDF}
                  className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                  title="Export to PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => setShowDeepDive(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold ml-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {deepDiveData.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Bill Number</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Patient</th>
                      <th className="py-2 pr-4 text-right w-24">Total</th>
                      <th className="py-2 pr-4 text-right w-24">Discount</th>
                      <th className="py-2 pr-4 text-right w-24">Net Amount</th>
                      <th className="py-2 pr-4">Payment</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deepDiveData.map((bill) => (
                      <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{bill.bill_number}</td>
                        <td className="py-2 pr-4">{formatDateTime(bill.created_at)}</td>
                        <td className="py-2 pr-4">{bill.patient_name || bill.guest_name || 'N/A'}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(bill.total_amount)}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(bill.discount)}</td>
                        <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(bill.net_amount)}</td>
                        <td className="py-2 pr-4">
                          <span className="text-xs">{bill.mode_of_payment}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                            bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold border-t-2">
                      <td colSpan={3} className="py-2 pr-4 text-right">Total:</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(deepDiveData.reduce((sum, b) => sum + b.total_amount, 0))}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-600">
                        {formatCurrency(deepDiveData.reduce((sum, b) => sum + b.discount, 0))}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(deepDiveData.reduce((sum, b) => sum + b.net_amount, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-8">No bills found</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-xl font-semibold mb-4">Pharmacy Reports</h2>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'sales'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Summary
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'inventory'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Reports
          </button>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              className="w-full"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              className="w-full"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          {activeTab === 'sales' && (
            <div>
              <label className="block text-sm font-medium mb-1">Group By</label>
              <select
                className="w-full"
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as 'day' | 'month' | 'bill')}
              >
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
                <option value="bill">Bill Level</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status</label>
            <select
              className="w-full"
              value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as 'paid' | 'pending' | 'both')}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={fetchReports} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Quick Select */}
        <div className="flex gap-2 mb-4">
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => handleQuickSelect(7)}>
            Last 7 Days
          </button>
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => handleQuickSelect(30)}>
            Last 30 Days
          </button>
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => handleQuickSelect(90)}>
            Last 90 Days
          </button>
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(firstDay.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
          }}>
            This Month
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && !loading && activeTab === 'sales' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Bills</p>
            <p className="text-2xl font-bold">{summary.total_bills}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Discount</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_discount ?? 0)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Net Amount</p>
            <p className="text-2xl font-bold text-brand-600">{formatCurrency(summary.net_amount ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Report Tables */}
      <div className="card p-6">
        {/* Export Buttons */}
        {!loading && activeTab === 'sales' && salesData.length > 0 && (
          <div className="mb-4 flex gap-2 justify-end">
            <div className="relative group">
              <button
                className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Complete Billing Data
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block z-10">
                <button
                  onClick={exportCompleteBillingDataToExcel}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Excel
                </button>
                <button
                  onClick={exportCompleteBillingDataToPDF}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  PDF
                </button>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Summary to Excel
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export Summary to PDF
            </button>
          </div>
        )}

        {/* Inventory View Toggle */}
        {activeTab === 'inventory' && !loading && (
          <div className="mb-4 flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg ${
                inventoryView === 'low-stock'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setInventoryView('low-stock')}
            >
              Low Stock Items
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                inventoryView === 'expiring'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setInventoryView('expiring')}
            >
              Expiring Items
            </button>
            <div className="ml-auto">
              <button
                onClick={exportToExcel}
                className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>
              <button
                onClick={exportToPDF}
                className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2 ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export to PDF
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading report data...</p>
          </div>
        ) : activeTab === 'sales' && billData.length > 0 && groupBy === 'bill' ? (
          <div className="overflow-x-auto">
            {/* Export Buttons for Bill Level */}
            <div className="mb-4 flex gap-2 justify-end">
              <button
                onClick={exportToExcel}
                className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>
              <button
                onClick={exportToPDF}
                className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export to PDF
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Bill Number</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4 text-right">Total Amount</th>
                  <th className="py-2 pr-4 text-right">Discount</th>
                  <th className="py-2 pr-4 text-right">Net Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Payment Mode</th>
                </tr>
              </thead>
              <tbody>
                {billData.map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{bill.bill_number}</td>
                    <td className="py-2 pr-4">{formatDateTime(bill.created_at)}</td>
                    <td className="py-2 pr-4">{bill.patient_name || bill.guest_name || 'N/A'}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(bill.total_amount)}</td>
                    <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(bill.discount)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(bill.net_amount)}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                        bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{bill.mode_of_payment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'sales' && salesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4 text-right">Bills</th>
                  <th className="py-2 pr-4 text-right">Total Amount</th>
                  <th className="py-2 pr-4 text-right">Discount</th>
                  <th className="py-2 pr-4 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => handleDateClick(row.date)}
                        className="text-brand-600 hover:text-brand-800 hover:underline font-medium cursor-pointer"
                      >
                        {groupBy === 'month' 
                          ? new Date(row.date + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
                          : formatDate(row.date)}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-right">{row.total_bills}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(row.total_amount)}</td>
                    <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(row.total_discount)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(row.net_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'inventory' ? (
          <div>
            {inventoryView === 'low-stock' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Medicine Name</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Current Stock</th>
                      <th className="py-2 pr-4">Low Stock Threshold</th>
                      <th className="py-2 pr-4">Manufacturer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length > 0 ? (
                      lowStockItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-4 font-medium">{item.name}</td>
                          <td className="py-2 pr-4">{item.category}</td>
                          <td className="py-2 pr-4">{item.current_stock}</td>
                          <td className="py-2 pr-4">{item.low_stock_threshold}</td>
                          <td className="py-2 pr-4">{item.manufacturer}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">
                          No low stock items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Medicine Name</th>
                      <th className="py-2 pr-4">SKU</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Current Stock</th>
                      <th className="py-2 pr-4">Expiry Date</th>
                      <th className="py-2 pr-4">Batch Number</th>
                      <th className="py-2 pr-4">Manufacturer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringItems.length > 0 ? (
                      expiringItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-4 font-medium">{item.name}</td>
                          <td className="py-2 pr-4">{item.sku}</td>
                          <td className="py-2 pr-4">{item.category}</td>
                          <td className="py-2 pr-4">{item.current_stock}</td>
                          <td className="py-2 pr-4">
                            <span className="text-red-600 font-medium">
                              {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{item.batch_number || 'N/A'}</td>
                          <td className="py-2 pr-4">{item.manufacturer}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-gray-500">
                          No expiring items found within the next 30 days
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {startDate && endDate ? 'No data found for the selected period' : 'Please select a date range'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyReports;