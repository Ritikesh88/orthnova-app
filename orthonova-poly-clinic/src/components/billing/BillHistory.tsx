import React, { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await listBills();
        // Enrich with names (best-effort)
        const enriched: EnrichedBill[] = await Promise.all(data.map(async b => {
          const [p, d] = await Promise.all([getPatientById(b.patient_id), getDoctorById(b.doctor_id)]);
          return { ...b, patientName: p?.name, doctorName: d?.name };
        }));
        setBills(enriched);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-6">
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
              {bills.map(b => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4 font-mono">{b.bill_number}</td>
                  <td className="py-2 pr-4">{formatDateTime(b.created_at)}</td>
                  <td className="py-2 pr-4">{b.patientName || b.patient_id}</td>
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
              {bills.length === 0 && (
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