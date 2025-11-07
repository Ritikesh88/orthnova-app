import React, { useEffect, useMemo, useState } from 'react';
import { getDoctorById, getPatientById, listAppointments } from '../../api';
import { AppointmentRow } from '../../types';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

interface Row extends AppointmentRow { patientName?: string; doctorName?: string; patientContact?: string | null }

const AppointmentsList: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState(() => {
    // Set default to today's date
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        // For receptionist and admin, fetch all appointments
        // For doctor, fetch only their appointments
        const list = await listAppointments(user?.role === 'doctor' ? { doctor_id: user?.userId } : undefined);
        const enriched: Row[] = await Promise.all(list.map(async r => {
          const [p, d] = await Promise.all([
            r.patient_id ? getPatientById(r.patient_id) : Promise.resolve(null),
            getDoctorById(r.doctor_id)
          ]);
          return { ...r, patientName: p?.name || r.guest_name || undefined, doctorName: d?.name, patientContact: r.patient_id ? p?.contact ?? null : (r.guest_contact ?? null) };
        }));
        setRows(enriched);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const txt = searchText.trim().toLowerCase();
    const date = searchDate;
    const filteredRows = rows.filter(r => {
      const matchesText = !txt || [r.patientName, r.doctorName, r.patientContact]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(txt));
      
      // For date matching, we'll use appointment_date field if available, otherwise fall back to created_at
      let appointmentDate = '';
      if (r.appointment_date) {
        // appointment_date is already in YYYY-MM-DD format
        appointmentDate = r.appointment_date;
      } else if (r.created_at) {
        // Extract date from created_at timestamp
        appointmentDate = new Date(r.created_at).toISOString().slice(0,10);
      }
      
      const matchesDate = !date || appointmentDate === date;
      return matchesText && matchesDate;
    });
    
    // Sort by appointment datetime
    return filteredRows.sort((a, b) => {
      // Use appointment_date + created_at time, or just created_at if appointment_date is not available
      let aDateTime, bDateTime;
      
      if (a.appointment_date && a.created_at) {
        // Combine appointment date with time from created_at
        const aTime = new Date(a.created_at).toTimeString().split(' ')[0]; // Get HH:MM:SS
        aDateTime = new Date(`${a.appointment_date}T${aTime}`);
      } else {
        aDateTime = new Date(a.created_at);
      }
      
      if (b.appointment_date && b.created_at) {
        // Combine appointment date with time from created_at
        const bTime = new Date(b.created_at).toTimeString().split(' ')[0]; // Get HH:MM:SS
        bDateTime = new Date(`${b.appointment_date}T${bTime}`);
      } else {
        bDateTime = new Date(b.created_at);
      }
      
      return aDateTime.getTime() - bDateTime.getTime();
    });
  }, [rows, searchText, searchDate]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Search (Patient/Doctor/Contact)</label>
            <input className="mt-1 w-full" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Type to filter" />
          </div>
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input type="date" className="mt-1 w-full" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-secondary" onClick={() => { setSearchText(''); setSearchDate(new Date().toISOString().slice(0, 10)); }} disabled={loading}>Today</button>
            <button className="btn btn-secondary" onClick={() => { setSearchText(''); setSearchDate(''); }} disabled={loading}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Appointment History</h2>
          <div className="text-sm text-gray-600">
            {searchDate && `Showing appointments for ${new Date(searchDate).toLocaleDateString()}`}
          </div>
          <button className="btn btn-secondary" onClick={() => window.location.reload()} disabled={loading}>Refresh</button>
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Appointment Date/Time</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Doctor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{formatDateTime(r.created_at)}</td>
                  <td className="py-2 pr-4">{r.patientName || '-'}</td>
                  <td className="py-2 pr-4">{r.patientContact || '-'}</td>
                  <td className="py-2 pr-4">{r.doctorName || r.doctor_id}</td>
                  <td className="py-2 pr-4 capitalize">{r.status}</td>
                  <td className="py-2 pr-4">{r.notes || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={6}>{loading ? 'Loading...' : 'No appointments found.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsList;