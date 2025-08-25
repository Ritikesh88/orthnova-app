import React, { useEffect, useState, useMemo } from 'react';
import { getDoctorById, getPatientById, listBills } from '../../api';
import { BillRow } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

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

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await listBills();
        const enriched: EnrichedBill[] = await Promise.all(data.map(async b => {
          const [p, d] = await Promise.all([b.patient_id ? getPatientById(b.patient_id) : Promise.resolve(null as any), getDoctorById(b.doctor_id)]);
          return { ...b, patientName: p?.name || b.guest_name || undefined, doctorName: d?.name };
        }));
        setBills(enriched);
      } catch (e: any) { setError(e.message); }
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
                  <td className="py-2 pr-4 font-mono">{b.bill_number}</td>
                  <td className="py-2 pr-4">{formatDateTime(b.created_at)}</td>
                  <td className="py-2 pr-4">{b.patientName || b.patient_id || 'Guest'}</td>
                  <td className="py-2 pr-4">{b.doctorName || b.doctor_id}</td>
                  <td className="py-2 pr-4">{formatCurrency(b.net_amount)}</td>
                  <td className="py-2 pr-4 capitalize">{b.status}</td>
                  <td className="py-2 pr-4">
                    <button className="btn btn-secondary px-3 py-1" onClick={() => {
                      const win = window.open(`${window.location.origin}/print/bill/${b.id}`, '_blank'); if (win) win.focus();
                    }}>Print</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={7}>No bills found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillHistory;