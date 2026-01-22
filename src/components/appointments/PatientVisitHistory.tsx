import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { getDoctorById, getPatientById, listAppointments, listDoctors, listPrescriptions, updateAppointment } from '../../api';
import { DoctorRow } from '../../types';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

interface VisitRow {
  id: string;
  type: 'appointment' | 'walk-in';
  patientName?: string;
  patientContact?: string | null;
  doctorName?: string;
  status: string;
  created_at: string;
  appointment_datetime?: string;
  notes?: string;
  patient_id?: string | null;
  doctor_id: string;
}

const PatientVisitHistory: React.FC = () => {
  const { user } = useAuth();
  const [visitRows, setVisitRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState(() => {
    // Set default to today's date
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  
  const handleAppointmentAction = async (appointmentId: string, action: string) => {
    try {
      let status: 'completed' | 'cancelled' | 'booked' | undefined;
      switch (action) {
        case 'attended':
          status = 'completed';
          break;
        case 'cancel':
          status = 'cancelled';
          break;
        case 'reschedule':
          // For reschedule, we would typically open a modal or redirect to booking page
          alert('Reschedule functionality would be implemented here');
          return;
        default:
          return;
      }
      
      await updateAppointment(appointmentId, { status });
      
      // Refresh the visit list
      await loadVisits();
    } catch (e: any) {
      setError(e.message || 'Failed to update appointment');
    }
  };
  
  const handleReprint = (visit: VisitRow) => {
    if (visit.type === 'walk-in') {
      // Open prescription for printing
      const printUrl = `${window.location.origin}/print/prescription/${visit.id}`;
      const win = window.open(printUrl, '_blank');
      if (win) win.focus();
    } else {
      // For appointments, we might want to show a different print option
      alert('Print functionality for appointments would be implemented here');
    }
  };

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load appointments
      let appointmentFilters: { doctor_id?: string; appointment_date_exact?: string } = {};
      if (user?.role === 'doctor' && user?.userId) {
        // Find the doctor ID based on the user ID
        const doctorMatch = doctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        if (doctorMatch) {
          appointmentFilters.doctor_id = doctorMatch.id;
        } else {
          // If no matching doctor found, the doctor won't see any appointments
          appointmentFilters.doctor_id = 'non-existent-id';
        }
      }
      if (searchDate) {
        appointmentFilters = { ...appointmentFilters, appointment_date_exact: searchDate };
      }
      const appointments = await listAppointments(appointmentFilters);

      // Load prescriptions
      let prescriptions = await listPrescriptions(searchText);
      // Filter prescriptions by date if searchDate is provided
      if (searchDate) {
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        prescriptions = prescriptions.filter(p => {
          const prescDate = new Date(p.created_at);
          return prescDate >= startOfDay && prescDate <= endOfDay;
        });
      }

      // For doctor role, filter prescriptions to only show their own
      if (user?.role === 'doctor' && user?.userId) {
        const doctorMatch = doctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch) {
          // Filter prescriptions to only show those created by this doctor
          prescriptions = prescriptions.filter(p => p.doctor_id === doctorMatch.id);
        } else {
          // If no matching doctor found, show no prescriptions
          prescriptions = [];
        }
      }

      // Combine appointments and prescriptions into a single list
      const appointmentVisits: VisitRow[] = [];
      for (const a of appointments) {
        try {
          const patientPromise = a.patient_id ? getPatientById(a.patient_id) : Promise.resolve(null);
          const [p, d] = await Promise.all([
            patientPromise,
            getDoctorById(a.doctor_id)
          ]);
          appointmentVisits.push({
            id: a.id,
            type: 'appointment',
            patientName: p?.name || a.guest_name || undefined,
            patientContact: a.patient_id ? (p?.contact || null) : (a.guest_contact || null),
            doctorName: d?.name,
            status: a.status,
            created_at: a.created_at,
            appointment_datetime: a.appointment_datetime,
            notes: a.notes || undefined,
            patient_id: a.patient_id,
            doctor_id: a.doctor_id
          });
        } catch (error) {
          console.error('Error processing appointment:', error);
        }
      }

      const walkinVisits: VisitRow[] = await Promise.all(prescriptions.map(async p => {
        const [pat, doc] = await Promise.all([
          getPatientById(p.patient_id),
          getDoctorById(p.doctor_id)
        ]);
        return {
          id: p.id,
          type: 'walk-in',
          patientName: pat?.name,
          patientContact: pat?.contact || null,
          doctorName: doc?.name,
          status: 'completed', // All prescriptions are considered completed visits
          created_at: p.created_at,
          notes: `Prescription: ${p.diagnosis || 'Visit'}`,
          patient_id: p.patient_id,
          doctor_id: p.doctor_id
        };
      }));

      // Combine and sort by date/time
      const allVisits = [...appointmentVisits, ...walkinVisits];
      setVisitRows(allVisits);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, doctors, searchDate, searchText]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const doctorList = await listDoctors();
        setDoctors(doctorList);
      } catch (err: any) {
        setError(err.message);
      }
    };
    
    loadDoctors();
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const filtered = useMemo(() => {
    const txt = searchText.trim().toLowerCase();
    const date = searchDate;
    const filteredRows = visitRows.filter(r => {
      const matchesText = !txt || [r.patientName, r.doctorName, r.patientContact]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(txt));
      
      // For date matching, extract date from created_at timestamp
      const visitDate = new Date(r.created_at).toISOString().slice(0,10);
      const matchesDate = !date || visitDate === date;
      return matchesText && matchesDate;
    });
    
    // Sort by appointment datetime or created_at
    return filteredRows.sort((a, b) => {
      const aDateTime = new Date(a.appointment_datetime || a.created_at);
      const bDateTime = new Date(b.appointment_datetime || b.created_at);
      return bDateTime.getTime() - aDateTime.getTime(); // Descending order (newest first)
    });
  }, [visitRows, searchText, searchDate]);

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
          <h2 className="text-xl font-semibold">Patient Visit History</h2>
          <div className="text-sm text-gray-600">
            {searchDate && `Showing visits for ${new Date(searchDate).toLocaleDateString()}`}
          </div>
          <button className="btn btn-secondary" onClick={() => window.location.reload()} disabled={loading}>Refresh</button>
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Date/Time</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Doctor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Notes</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      r.type === 'walk-in' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {r.type === 'walk-in' ? 'Walk-in' : 'Appointment'}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{formatDateTime(r.appointment_datetime || r.created_at)}</td>
                  <td className="py-2 pr-4">{r.patientName || '-'}</td>
                  <td className="py-2 pr-4">{r.patientContact || '-'}</td>
                  <td className="py-2 pr-4">{r.doctorName || r.doctor_id}</td>
                  <td className="py-2 pr-4 capitalize">{r.status}</td>
                  <td className="py-2 pr-4">{r.notes || '-'}</td>
                  <td className="py-2 pr-4">
                    {r.type === 'appointment' && r.status === 'booked' && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleAppointmentAction(r.id, 'attended')}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          Attended
                        </button>
                        <button 
                          onClick={() => handleAppointmentAction(r.id, 'reschedule')}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Reschedule
                        </button>
                        <button 
                          onClick={() => handleAppointmentAction(r.id, 'cancel')}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {r.type === 'walk-in' && (
                      <button 
                        onClick={() => handleReprint(r)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Reprint
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={8}>{loading ? 'Loading...' : 'No visits found.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientVisitHistory;