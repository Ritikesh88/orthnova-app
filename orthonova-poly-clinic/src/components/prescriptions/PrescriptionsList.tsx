import React, { useEffect, useState } from 'react';
import { getDoctorById, getPatientById, listPrescriptions } from '../../api';
import { PrescriptionRow } from '../../types';
import { formatDateTime } from '../../utils/format';

interface Enriched extends PrescriptionRow { patientName?: string; doctorName?: string; }

const PrescriptionsList: React.FC = () => {
  const [rows, setRows] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const list = await listPrescriptions();
        const enriched: Enriched[] = await Promise.all(list.map(async r => {
          const [p, d] = await Promise.all([getPatientById(r.patient_id), getDoctorById(r.doctor_id)]);
          return { ...r, patientName: p?.name, doctorName: d?.name };
        }));
        setRows(enriched);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Prescriptions</h2>
        <button className="btn btn-secondary" onClick={() => window.location.reload()} disabled={loading}>Refresh</button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="card p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Patient</th>
              <th className="py-2 pr-4">Doctor</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-2 pr-4">{formatDateTime(r.created_at)}</td>
                <td className="py-2 pr-4">{r.patientName || r.patient_id}</td>
                <td className="py-2 pr-4">{r.doctorName || r.doctor_id}</td>
                <td className="py-2 pr-4">
                  <button className="btn btn-secondary px-3 py-1" onClick={() => {
                    const win = window.open(`${window.location.origin}/print/prescription/${r.id}`, '_blank'); if (win) win.focus();
                  }}>Print</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-4 text-gray-500" colSpan={4}>{loading ? 'Loading...' : 'No prescriptions found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrescriptionsList;