import React, { useEffect, useMemo, useState } from 'react';
import { createAppointment, listDoctors, searchPatientsByContact } from '../../api';
import { DoctorRow, PatientRow } from '../../types';
import Modal from '../common/Modal';

const AppointmentBooking: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);

  const [datetime, setDatetime] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!patient || !doctor) { setMessage('Select patient and doctor'); return; }
    if (!datetime) { setMessage('Select date/time'); return; }
    try {
      await createAppointment({ patient_id: patient.id, doctor_id: doctor.id, appointment_datetime: new Date(datetime).toISOString(), status: 'booked', notes });
      setMessage('Appointment booked');
      setDatetime(''); setNotes('');
    } catch (e: any) { setMessage(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Book Appointment</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Patient Contact</label>
              <div className="flex gap-2 mt-1">
                <input className="flex-1" placeholder="Enter contact number" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={onSearchPatient}>Search</button>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-gray-600">Patient Name</label>
                <input className="mt-1 w-full bg-gray-50" value={patient?.name || ''} readOnly placeholder="No patient selected" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <input className="mt-1 w-full" placeholder="Type to search doctor by name" value={doctorQuery} onChange={e => setDoctorQuery(e.target.value)} />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Date/Time</label>
              <input type="datetime-local" className="mt-1 w-full" value={datetime} onChange={e => setDatetime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <input className="mt-1 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary">Book</button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
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