import React, { useEffect, useState, useMemo } from 'react';
import { getDoctorById, getPatientById, listBills, listBillItems, getBillById } from '../../api';
import { BillRow, BillItemRow } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import Modal from '../common/Modal';

interface EnrichedBill extends BillRow {
  patientName?: string;
  doctorName?: string;
}

const BillHistory: React.FC = () => {
  const [bills, setBills] = useState<EnrichedBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const [selectedBill, setSelectedBill] = useState<EnrichedBill | null>(null);
  const [billItems, setBillItems] = useState<BillItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await listBills();
        if (!data || data.length === 0) {
          setBills([]);
          return;
        }
        const enriched: EnrichedBill[] = await Promise.all(data.map(async b => {
          const [p, d] = await Promise.all([
            b.patient_id ? getPatientById(b.patient_id).catch(() => null) : Promise.resolve(null), 
            b.doctor_id ? getDoctorById(b.doctor_id).catch(() => null) : Promise.resolve(null)
          ]);
          return { ...b, patientName: p?.name || b.guest_name || undefined, doctorName: d?.name };
        }));
        setBills(enriched);
      } catch (e: any) { 
        console.error('Error loading bills:', e);
        setError(e.message || 'Failed to load bills. Please check your database permissions.'); 
      }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const txt = searchText.trim().toLowerCase();
    const date = searchDate;
    return bills.filter(b => {
      const matchesText = !txt || [b.patientName, b.doctorName, b.bill_number]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(txt));
      const matchesDate = !date || (new Date(b.created_at).toISOString().slice(0,10) === date);
      return matchesText && matchesDate;
    });
  }, [bills, searchText, searchDate]);

  const handleViewDetails = async (bill: EnrichedBill) => {
    setSelectedBill(bill);
    setBillItems([]);
    setLoadingItems(true);
    try {
      const items = await listBillItems(bill.id);
      setBillItems(items);
    } catch (e: any) {
      console.error('Error loading bill items:', e);
      setError(e.message || 'Failed to load bill items');
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Search (Patient/Doctor/Bill No)</label>
            <input className="mt-1 w-full" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Type to filter" />
          </div>
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input type="date" className="mt-1 w-full" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn btn-secondary" onClick={() => { setSearchText(''); setSearchDate(''); }} disabled={loading}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Bill History</h2>
          <button className="btn btn-secondary" onClick={() => window.location.reload()} disabled={loading}>Refresh</button>
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Bill No</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Doctor</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleViewDetails(b)}
                      className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      title="Click to view item details"
                    >
                      {b.bill_number}
                    </button>
                  </td>
                  <td className="py-2 pr-4">{formatDateTime(b.created_at)}</td>
                  <td className="py-2 pr-4">{b.patientName || b.patient_id || 'Guest'}</td>
                  <td className="py-2 pr-4">{b.doctorName || b.doctor_id}</td>
                  <td className="py-2 pr-4">{formatCurrency(b.net_amount)}</td>
                  <td className="py-2 pr-4 capitalize">{b.status}</td>
                  <td className="py-2 pr-4">
                    <button className="btn btn-secondary px-3 py-1" onClick={async () => {
                      // Determine the bill type to use the correct print route
                      try {
                        const bill = await getBillById(b.id);
                        const printRoute = bill?.bill_type === 'pharmacy' ? 'pharmacy-bill' : 'bill';
                        const url = `${window.location.origin}/print/${printRoute}/${b.id}`;
                        const win = window.open(url, '_blank'); if (win) win.focus();
                      } catch (error) {
                        // Fallback to default bill route if fetch fails
                        const url = `${window.location.origin}/print/bill/${b.id}`;
                        const win = window.open(url, '_blank'); if (win) win.focus();
                      }
                    }}>Print</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td className="py-4 text-gray-500" colSpan={7}>
                  {bills.length === 0 
                    ? (error ? 'Error loading bills. ' + error : 'No bills found.') 
                    : 'No bills match your search criteria.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedBill}
        title={`Invoice Details - ${selectedBill?.bill_number || ''}`}
        onClose={() => {
          setSelectedBill(null);
          setBillItems([]);
        }}
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDateTime(selectedBill.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{selectedBill.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient</p>
                <p className="font-medium">{selectedBill.patientName || selectedBill.guest_name || selectedBill.patient_id || 'Guest'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Doctor</p>
                <p className="font-medium">{selectedBill.doctorName || selectedBill.doctor_id || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Items</h4>
              {loadingItems ? (
                <p className="text-gray-500">Loading items...</p>
              ) : billItems.length === 0 ? (
                <p className="text-gray-500">No items found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-4">Item Name</th>
                        <th className="py-2 pr-4 text-right">Quantity</th>
                        <th className="py-2 pr-4 text-right">Unit Price</th>
                        <th className="py-2 pr-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4">{item.item_name || 'N/A'}</td>
                          <td className="py-2 pr-4 text-right">{item.quantity}</td>
                          <td className="py-2 pr-4 text-right">{formatCurrency(item.price)}</td>
                          <td className="py-2 pr-4 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={3} className="py-2 pr-4 text-right font-semibold">Subtotal:</td>
                        <td className="py-2 pr-4 text-right font-semibold">
                          {formatCurrency(billItems.reduce((sum, item) => sum + Number(item.total), 0))}
                        </td>
                      </tr>
                      {selectedBill.discount && Number(selectedBill.discount) > 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 pr-4 text-right">Discount:</td>
                          <td className="py-2 pr-4 text-right text-red-600">
                            -{formatCurrency(selectedBill.discount)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-300">
                        <td colSpan={3} className="py-2 pr-4 text-right font-bold text-lg">Net Amount:</td>
                        <td className="py-2 pr-4 text-right font-bold text-lg">
                          {formatCurrency(selectedBill.net_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillHistory;