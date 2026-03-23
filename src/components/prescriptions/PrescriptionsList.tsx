import React, { useEffect, useMemo, useState } from 'react';
import { listPrescriptions, listPatients, listDoctors } from '../../api';
import { PrescriptionRow, PatientRow, DoctorRow } from '../../types';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

interface Enriched extends PrescriptionRow { patientName?: string; doctorName?: string; }

const PrescriptionsList: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      // Fetch all data in parallel — 3 requests instead of N+1
      const [prescriptions, patients, doctors] = await Promise.all([
        listPrescriptions(searchText),
        listPatients(),
        listDoctors()
      ]);

      // Build lookup maps
      const patientMap: Record<string, PatientRow> = {};
      patients.forEach(p => { patientMap[p.id] = p; });

      const doctorMap: Record<string, DoctorRow> = {};
      doctors.forEach(d => { doctorMap[d.id] = d; });

      let list = prescriptions;

      // For doctor role, filter to their own prescriptions
      if (user?.role === 'doctor' && user?.userId) {
        const doctorMatch = doctors.find(d => {
          const uid = user.userId.toLowerCase().replace(/[^a-z]/g, '');
          const dname = d.name.toLowerCase().replace(/[^a-z]/g, '');
          if (uid.length > 4 && dname.includes(uid)) return true;
          if (dname.length > 4 && uid.includes(dname)) return true;
          const nameWords = d.name.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['dr.', 'dr', 'mr.', 'mr', 'ms.', 'ms', 'mbbs', 'md'].includes(w));
          if (nameWords.length > 0 && nameWords.every(w => uid.includes(w))) return true;
          return false;
        });
        if (doctorMatch) {
          list = list.filter(p => p.doctor_id === doctorMatch.id);
        } else {
          list = [];
        }
      }

      // Enrich with names from lookup maps — no extra API calls
      const enriched: Enriched[] = list.map(r => ({
        ...r,
        patientName: patientMap[r.patient_id]?.name,
        doctorName: doctorMap[r.doctor_id]?.name,
      }));

      setRows(enriched);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user, searchText]);

  const filtered = useMemo(() => {
    const txt = searchText.trim().toLowerCase();
    const date = searchDate;
    return rows.filter(r => {
      const matchesText = !txt || [r.patientName, r.doctorName, r.serial_number, r.diagnosis]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(txt));
      const matchesDate = !date || (new Date(r.created_at).toISOString().slice(0, 10) === date);
      return matchesText && matchesDate;
    });
  }, [rows, searchText, searchDate]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Search (Patient/Doctor/Serial/Diagnosis)</label>
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
          <h2 className="text-xl font-semibold">Prescription History</h2>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>Refresh</button>
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Date/Time</th>
                <th className="py-2 pr-4">Serial No.</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Doctor</th>
                <th className="py-2 pr-4">Visit Type</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{formatDateTime(r.created_at)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.serial_number}</td>
                  <td className="py-2 pr-4">{r.patientName || r.patient_id}</td>
                  <td className="py-2 pr-4">{r.doctorName || r.doctor_id}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${r.visit_type === 'walk-in' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {r.visit_type}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <button className="btn btn-secondary px-3 py-1" onClick={() => {
                      const win = window.open(`${window.location.origin}/print/prescription/${r.id}`, '_blank'); if (win) win.focus();
                    }}>Print</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={6}>{loading ? 'Loading...' : 'No prescriptions found.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionsList;
