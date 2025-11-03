import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalesSummary, getDoctorSalesReport, getServiceSalesReport, getBillsByDate, getBillsByMonth, getBillsByDoctor, SalesSummary, DoctorSalesReport, ServiceSalesReport, BillDetail } from '../../api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportTab = 'sales' | 'doctor' | 'service';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salesData, setSalesData] = useState<SalesSummary[]>([]);
  const [doctorData, setDoctorData] = useState<DoctorSalesReport[]>([]);
  const [serviceData, setServiceData] = useState<ServiceSalesReport[]>([]);

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
        const data = await getSalesSummary(startDate, endDate, groupBy);
        setSalesData(data);
      } else if (activeTab === 'doctor') {
        const data = await getDoctorSalesReport(startDate, endDate);
        setDoctorData(data);
      } else if (activeTab === 'service') {
        const data = await getServiceSalesReport(startDate, endDate);
        setServiceData(data);
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
  }, [activeTab, groupBy]);

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
    } else if (activeTab === 'doctor') {
      return {
        total_bills: doctorData.reduce((sum, d) => sum + d.total_bills, 0),
        total_amount: doctorData.reduce((sum, d) => sum + d.total_amount, 0),
        total_discount: doctorData.reduce((sum, d) => sum + d.total_discount, 0),
        net_amount: doctorData.reduce((sum, d) => sum + d.net_amount, 0),
      };
    } else if (activeTab === 'service') {
      return {
        total_quantity: serviceData.reduce((sum, d) => sum + d.total_quantity, 0),
        total_amount: serviceData.reduce((sum, d) => sum + d.total_amount, 0),
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
    } else if (activeTab === 'doctor') {
      sheetName = 'Doctor Sales';
      data = doctorData.map(row => ({
        'Doctor Name': row.doctor_name,
        'Total Bills': row.total_bills,
        'Total Amount': row.total_amount,
        'Discount': row.total_discount,
        'Net Amount': row.net_amount,
      }));
    } else if (activeTab === 'service') {
      sheetName = 'Service Sales';
      data = serviceData.map(row => ({
        'Service Name': row.service_name,
        'Total Quantity': row.total_quantity,
        'Total Sales': row.total_amount,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}_${startDate}_to_${endDate}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let title = '';
    let headers: any[] = [];
    let data: any[][] = [];

    if (activeTab === 'sales') {
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
    } else if (activeTab === 'doctor') {
      title = 'Doctor Sales Report';
      headers = [['Doctor Name', 'Bills', 'Total Amount', 'Discount', 'Net Amount']];
      data = doctorData.map(row => [
        row.doctor_name,
        row.total_bills.toString(),
        formatCurrency(row.total_amount),
        formatCurrency(row.total_discount),
        formatCurrency(row.net_amount),
      ]);
    } else if (activeTab === 'service') {
      title = 'Service Sales Report';
      headers = [['Service Name', 'Quantity', 'Total Sales']];
      data = serviceData.map(row => [
        row.service_name,
        row.total_quantity.toString(),
        formatCurrency(row.total_amount),
      ]);
    }

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${title.replace(/ /g, '_')}_${startDate}_to_${endDate}.pdf`);
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

  const handleDoctorClick = async (doctorId: string, doctorName: string) => {
    setLoading(true);
    try {
      const bills = await getBillsByDoctor(doctorId, startDate, endDate);
      setDeepDiveData(bills);
      setDeepDiveTitle(`Bills by ${doctorName}`);
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
      'Doctor': bill.doctor_name || 'N/A',
      'Total Amount': bill.total_amount,
      'Discount': bill.discount,
      'Net Amount': bill.net_amount,
      'Payment Mode': bill.mode_of_payment,
      'Status': bill.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bill Details');
    XLSX.writeFile(workbook, `${deepDiveTitle.replace(/ /g, '_')}.xlsx`);
  };

  const exportDeepDiveToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(deepDiveTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

    const headers = [['Bill #', 'Date', 'Patient', 'Doctor', 'Total', 'Discount', 'Net', 'Status']];
    const data = deepDiveData.map(bill => [
      bill.bill_number,
      formatDateTime(bill.created_at),
      bill.patient_name || bill.guest_name || 'N/A',
      bill.doctor_name || 'N/A',
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
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });

    doc.save(`${deepDiveTitle.replace(/ /g, '_')}.pdf`);
  };

  const handleViewBill = (billId: string) => {
    // Navigate to bill history page
    navigate('/billing/history');
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
                      <th className="py-2 pr-4">Doctor</th>
                      <th className="py-2 pr-4 text-right">Total</th>
                      <th className="py-2 pr-4 text-right">Discount</th>
                      <th className="py-2 pr-4 text-right">Net Amount</th>
                      <th className="py-2 pr-4">Payment</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deepDiveData.map((bill) => (
                      <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => handleViewBill(bill.id)}
                            className="text-brand-600 hover:text-brand-800 hover:underline font-medium cursor-pointer"
                          >
                            {bill.bill_number}
                          </button>
                        </td>
                        <td className="py-2 pr-4">{formatDateTime(bill.created_at)}</td>
                        <td className="py-2 pr-4">{bill.patient_name || bill.guest_name || 'N/A'}</td>
                        <td className="py-2 pr-4">{bill.doctor_name || 'N/A'}</td>
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
                      <td colSpan={4} className="py-2 pr-4 text-right">Total:</td>
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
        <h2 className="text-xl font-semibold mb-4">Reports</h2>
        
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
              activeTab === 'doctor'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('doctor')}
          >
            Doctor Sales
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'service'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('service')}
          >
            Service Sales
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
                onChange={e => setGroupBy(e.target.value as 'day' | 'month')}
              >
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          )}
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
      {summary && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {activeTab === 'service' ? (
            <>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Quantity</p>
                <p className="text-2xl font-bold">{summary.total_quantity}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</p>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Report Tables */}
      <div className="card p-6">
        {/* Export Buttons */}
        {!loading && ((activeTab === 'sales' && salesData.length > 0) || (activeTab === 'doctor' && doctorData.length > 0) || (activeTab === 'service' && serviceData.length > 0)) && (
          <div className="mb-4 flex gap-2 justify-end">
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
              className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export to PDF
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading report data...</p>
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
        ) : activeTab === 'doctor' && doctorData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Doctor Name</th>
                  <th className="py-2 pr-4 text-right">Total Bills</th>
                  <th className="py-2 pr-4 text-right">Total Amount</th>
                  <th className="py-2 pr-4 text-right">Discount</th>
                  <th className="py-2 pr-4 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {doctorData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => handleDoctorClick(row.doctor_id, row.doctor_name)}
                        className="text-brand-600 hover:text-brand-800 hover:underline font-medium cursor-pointer"
                      >
                        {row.doctor_name}
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
        ) : activeTab === 'service' && serviceData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Service Name</th>
                  <th className="py-2 pr-4 text-right">Total Quantity</th>
                  <th className="py-2 pr-4 text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {serviceData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{row.service_name}</td>
                    <td className="py-2 pr-4 text-right">{row.total_quantity}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default Reports;

