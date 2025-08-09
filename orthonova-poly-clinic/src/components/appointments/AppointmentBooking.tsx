import React, { useEffect, useMemo, useState } from 'react';
import { createAppointment, listAppointments, listDoctors, searchPatientsByContact } from '../../api';
import { DoctorRow, PatientRow } from '../../types';
import Modal from '../common/Modal';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00

type BookingMode = 'registered' | 'guest';

const AppointmentBooking: React.FC = () => {
  // Doctor
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);

  // Patient
  const [mode, setMode] = useState<BookingMode>('registered');
  const [patientSearch, setPatientSearch] = useState('');
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  // Guest fields
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');

  // Date/Time
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [timeValue, setTimeValue] = useState(''); // HH:MM (24h) for display; combined to datetime
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // For calendar
  const [appointments, setAppointments] = useState([] as Awaited<ReturnType<typeof listAppointments>>);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await listDoctors();
      setDoctors(d);
    })();
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return [];
    return doctors.filter(d => d.name.toLowerCase().includes(q));
  }, [doctorQuery, doctors]);

  const onSelectDoctor = (d: DoctorRow) => { setDoctor(d); setDoctorQuery(d.name); };

  const onSearchPatient = async () => {
    setMessage(null);
    const rows = await searchPatientsByContact(patientSearch);
    if (rows.length === 1) { setPatient(rows[0]); setPatientMatches([]); }
    else if (rows.length > 1) { setPatientMatches(rows); setPatientModalOpen(true); }
    else { setPatient(null); setMessage('No patients found for that contact'); }
  };

  // Load appointments for selected doctor/date for calendar
  useEffect(() => {
    (async () => {
      if (!doctor) { setAppointments([]); return; }
      setLoadingCalendar(true);
      try {
        const list = await listAppointments({ doctor_id: doctor.id });
        setAppointments(list);
      } finally {
        setLoadingCalendar(false);
      }
    })();
  }, [doctor]);

  const slots: { time: string; date: Date }[] = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    const base = new Date(y, (m - 1), d, START_HOUR, 0, 0, 0);
    const arr: { time: string; date: Date }[] = [];
    const end = new Date(y, (m - 1), d, END_HOUR, 0, 0, 0);
    let cur = new Date(base);
    while (cur <= end) {
      arr.push({ time: formatTime(cur), date: new Date(cur) });
      cur = new Date(cur.getTime() + 15 * 60 * 1000);
    }
    return arr;
  }, [date]);

  const bookedTimes = useMemo(() => {
    if (!doctor) return new Set<string>();
    const [y, m, d] = date.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const set = new Set<string>();
    appointments.forEach(a => {
      if (a.doctor_id !== doctor.id) return;
      const dt = new Date(a.appointment_datetime);
      if (dt >= dayStart && dt <= dayEnd) {
        dt.setSeconds(0, 0);
        const minutes = dt.getMinutes();
        const rounded = new Date(dt);
        const roundedMinutes = Math.floor(minutes / 15) * 15;
        rounded.setMinutes(roundedMinutes);
        set.add(formatTime(rounded));
      }
    });
    return set;
  }, [appointments, doctor, date]);

  const onPickSlot = (slotTime: string) => {
    setTimeValue(slotTime);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!doctor) { setMessage('Select doctor'); return; }
    if (!date || !timeValue) { setMessage('Pick date and time'); return; }
    if (mode === 'guest') {
      if (!guestName.trim() || !guestContact.trim()) { setMessage('Enter guest name and contact'); return; }
    } else {
      if (!patient && !patientSearch.trim()) { setMessage('Enter contact and search patient'); return; }
    }
    const [hh, mm] = timeValue.split(':').map(Number);
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    try {
      await createAppointment({
        patient_id: mode === 'guest' ? null : (patient?.id || null),
        doctor_id: doctor.id,
        appointment_datetime: dt.toISOString(),
        status: 'booked',
        notes,
        guest_name: mode === 'guest' ? guestName.trim() : null,
        guest_contact: mode === 'guest' ? guestContact.trim() : null,
      });
      setMessage('Appointment booked');
      setNotes('');
    } catch (e: any) { setMessage(e.message); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left form panel */}
      <div className="md:col-span-1 space-y-4">
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-3">Doctor Name</h2>
          <input className="w-full" placeholder="Type to search doctor by name" value={doctorQuery} onChange={e => setDoctorQuery(e.target.value)} />
          {doctorQuery.trim() && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
              {filteredDoctors.map(d => (
                <div key={d.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${doctor?.id === d.id ? 'bg-brand-50' : ''}`} onClick={() => onSelectDoctor(d)}>
                  {d.name}
                </div>
              ))}
              {filteredDoctors.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No match</div>}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-3">Booking Details</h2>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={mode === 'registered'} onChange={() => setMode('registered')} />
              Appointment
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={mode === 'guest'} onChange={() => setMode('guest')} />
              New Registration
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input className="mt-1 w-full" value={mode === 'guest' ? guestName : (patient?.name || '')} onChange={e => setGuestName(e.target.value)} placeholder="Patient/Guest name" readOnly={mode === 'registered'} />
            </div>
            <div>
              <label className="block text-sm font-medium">Contact</label>
              {mode === 'registered' ? (
                <div className="flex gap-2 mt-1">
                  <input className="flex-1" placeholder="Enter contact number" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                  <button type="button" className="btn btn-secondary" onClick={onSearchPatient}>Search</button>
                </div>
              ) : (
                <input className="mt-1 w-full" value={guestContact} onChange={e => setGuestContact(e.target.value)} placeholder="Guest contact" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input type="date" className="mt-1 w-full" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium">Notes</label>
            <input className="mt-1 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button className="btn btn-primary" onClick={onSubmit as any}>Book</button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </div>
      </div>

      {/* Right calendar panel */}
      <div className="md:col-span-2 space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">DATE</div>
              <div className="text-xl font-semibold">{new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm"><span className="w-3 h-3 inline-block rounded bg-green-200 border border-green-400" /> Available</span>
              <span className="inline-flex items-center gap-1 text-sm"><span className="w-3 h-3 inline-block rounded bg-amber-200 border border-amber-400" /> Booked</span>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 py-2 pr-4">Time</th>
                  <th className="text-left text-gray-500 py-2 pr-4">Slot</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(({ time }) => {
                  const isBooked = bookedTimes.has(time);
                  return (
                    <tr key={time} className="border-t border-gray-100">
                      <td className="py-2 pr-4 font-mono text-gray-600">{time}</td>
                      <td className="py-2 pr-4">
                        <button type="button" onClick={() => !isBooked && onPickSlot(time)} className={`w-full h-8 rounded-md border transition ${isBooked ? 'bg-amber-100 border-amber-300 text-amber-800 cursor-not-allowed' : 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'}`}>
                          {isBooked ? 'Booked' : (timeValue === time ? 'Selected' : 'Available')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={patientModalOpen} title="Select Patient" onClose={() => setPatientModalOpen(false)}>
        <div className="divide-y divide-gray-100">
          {patientMatches.map(p => (
            <div key={p.id} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.age} / {p.gender})</span></div>
                  <div className="text-xs text-gray-500">{p.id} • {p.contact}</div>
                </div>
                <button className="btn btn-secondary" onClick={() => { setPatient(p); setPatientModalOpen(false); setPatientMatches([]); }}>Select</button>
              </div>
            </div>
          ))}
          {patientMatches.length === 0 && <div className="py-4 text-sm text-gray-500">No matches.</div>}
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentBooking;