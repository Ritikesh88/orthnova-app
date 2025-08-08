import React, { useEffect, useState } from 'react';
import { getDoctorById, getPatientById, listAppointments } from '../../api';
import { AppointmentRow } from '../../types';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

interface Row extends AppointmentRow { patientName?: string; doctorName?: string; }

const AppointmentsList: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const list = await listAppointments(user?.role === 'doctor' ? { doctor_id: user?.userId } : undefined);
        const enriched: Row[] = await Promise.all(list.map(async r => {
          const [p, d] = await Promise.all([
            r.patient_id ? getPatientById(r.patient_id) : Promise.resolve(null),
            getDoctorById(r.doctor_id)
          ]);
          return { ...r, patientName: p?.name || r.guest_name || undefined, doctorName: d?.name };
        }));
        setRows(enriched);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [user]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Appointments</h2>
        <button className="btn btn-secondary" onClick={() => window.location.reload()} disabled={loading}>Refresh</button>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Date/Time</th>
              <th className="py-2 pr-4">Patient</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Doctor</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-2 pr-4">{formatDateTime(r.appointment_datetime)}</td>
                <td className="py-2 pr-4">{r.patientName || '-'}</td>
                <td className="py-2 pr-4">{r.patient_id ? '' : (r.guest_contact || '-')}</td>
                <td className="py-2 pr-4">{r.doctorName || r.doctor_id}</td>
                <td className="py-2 pr-4 capitalize">{r.status}</td>
                <td className="py-2 pr-4">{r.notes || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-4 text-gray-500" colSpan={6}>{loading ? 'Loading...' : 'No appointments found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppointmentsList;