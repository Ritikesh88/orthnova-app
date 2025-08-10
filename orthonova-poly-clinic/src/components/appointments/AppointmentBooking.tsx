import React, { useEffect, useMemo, useState } from 'react';
import { createAppointment, listAppointments, listDoctors, listServices, searchPatientsByContact } from '../../api';
import { DoctorRow, PatientRow, ServiceRow } from '../../types';
import Modal from '../common/Modal';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const START_HOUR = 8;
const END_HOUR = 20;

type BookingMode = 'registered' | 'guest';

const AppointmentBooking: React.FC = () => {
  // Data
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);

  // Filters at top
  const [filterDate, setFilterDate] = useState(toDateInputValue(new Date()));
  const [filterDoctorQuery, setFilterDoctorQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState<DoctorRow | null>(null);

  // Booking doctor (same as filter selection)
  const doctor = filterDoctor;

  // Patient
  const [mode, setMode] = useState<BookingMode>('registered');
  const [patientSearch, setPatientSearch] = useState('');
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  // Guest
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');

  // Booking date/time
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [timeValue, setTimeValue] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Calendar
  const [appointments, setAppointments] = useState([] as Awaited<ReturnType<typeof listAppointments>>);

  // Selected service (dropdown)
  const [serviceQuery, setServiceQuery] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([listDoctors(), listServices()]);
      setDoctors(d); setServices(s);
      setFilterDate(toDateInputValue(new Date()));
    })();
  }, []);

  // filter doctors for dropdown
  const filteredDoctors = useMemo(() => {
    const q = filterDoctorQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(d => d.name.toLowerCase().includes(q));
  }, [filterDoctorQuery, doctors]);

  // filter services for dropdown
  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => s.service_name.toLowerCase().includes(q) || s.service_type.toLowerCase().includes(q));
  }, [serviceQuery, services]);

  const onSearchPatient = async () => {
    setMessage(null);
    const rows = await searchPatientsByContact(patientSearch);
    if (rows.length === 1) { setPatient(rows[0]); setPatientMatches([]); }
    else if (rows.length > 1) { setPatientMatches(rows); setPatientModalOpen(true); }
    else { setPatient(null); setMessage('No patients found for that contact'); }
  };

  // Load appointments when doctor changes
  useEffect(() => {
    (async () => {
      if (!doctor) { setAppointments([]); return; }
      const list = await listAppointments({ doctor_id: doctor.id });
      setAppointments(list);
    })();
  }, [doctor]);

  // Slots for chosen booking date
  const slots: { time: string; date: Date }[] = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    const base = new Date(y, (m - 1), d, START_HOUR, 0, 0, 0);
    const arr: { time: string; date: Date }[] = [];
    const end = new Date(y, (m - 1), d, END_HOUR, 0, 0, 0);
    let cur = new Date(base);
    while (cur <= end) { arr.push({ time: formatTime(cur), date: new Date(cur) }); cur = new Date(cur.getTime() + 15 * 60 * 1000); }
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
        dt.setSeconds(0, 0); const minutes = dt.getMinutes(); const rounded = new Date(dt);
        const roundedMinutes = Math.floor(minutes / 15) * 15; rounded.setMinutes(roundedMinutes);
        set.add(formatTime(rounded));
      }
    });
    return set;
  }, [appointments, doctor, date]);

  const onPickSlot = (slotTime: string) => { setTimeValue(slotTime); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!doctor) { setMessage('Select doctor'); return; }
    if (!date || !timeValue) { setMessage('Pick date and time'); return; }
    if (mode === 'guest') { if (!guestName.trim() || !guestContact.trim()) { setMessage('Enter guest name and contact'); return; } }
    else { if (!patient && !patientSearch.trim()) { setMessage('Enter contact and search patient'); return; } }
    const [hh, mm] = timeValue.split(':').map(Number); const [y, m, d] = date.split('-').map(Number);
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
      setMessage('Appointment booked'); setNotes('');
    } catch (e: any) { setMessage(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Top filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input type="date" className="mt-1 w-full" value={filterDate} onChange={e => { setFilterDate(e.target.value); setDate(e.target.value); }} />
          </div>
          <div>
            <label className="block text-sm font-medium">Doctor Name</label>
            <input className="mt-1 w-full" placeholder="Search doctor" value={filterDoctorQuery} onChange={e => setFilterDoctorQuery(e.target.value)} />
            {filterDoctorQuery.trim() && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                {filteredDoctors.map(d => (
                  <div key={d.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${doctor?.id === d.id ? 'bg-brand-50' : ''}`} onClick={() => setFilterDoctor(d)}>
                    {d.name}
                  </div>
                ))}
                {filteredDoctors.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No match</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left form panel */}
        <div className="md:col-span-1 space-y-4">
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

        {/* Right calendar panel - scrollable box with same vertical alignment */}
        <div className="md:col-span-2 flex flex-col gap-4">
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
          <div className="card p-5 max-h-[620px] overflow-y-auto">
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