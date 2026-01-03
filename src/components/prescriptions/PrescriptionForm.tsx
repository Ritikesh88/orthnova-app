import React, { useEffect, useMemo, useState } from 'react';
import { createPrescription, listDoctors, listPatients, searchPatientsByContact, listPrescriptions, listAppointments } from '../../api';
import { DoctorRow, PatientRow, PrescriptionRow, AppointmentRow } from '../../types';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

const PrescriptionForm: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorId, setDoctorId] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [previousVisits, setPreviousVisits] = useState<{ prescription: PrescriptionRow; appointment?: AppointmentRow }[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const refreshDoctors = async () => {
    try {
      const data = await listDoctors();
      setDoctors(data);
    } catch (e: any) {
      console.error('Error refreshing doctors:', e);
    }
  };

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([listPatients(), listDoctors()]);
      setDoctors(d);
      
      // For doctor role, automatically select their own doctor record
      if (user?.role === 'doctor' && user?.userId) {
        const doctorMatch = d.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch) {
          setDoctorId(doctorMatch.id);
          setDoctorQuery(doctorMatch.name);
        }
      }
      
      const sel = localStorage.getItem('orthonova_selected_patient_id');
      if (sel) {
        const found = p.find(pt => pt.id === sel);
        if (found) {
          setPatientId(sel);
          setSelectedPatient(found);
        }
        localStorage.removeItem('orthonova_selected_patient_id');
      }
    })();
  }, [user]);

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return [];
    return doctors.filter(d => d.name.toLowerCase().includes(q));
  }, [doctorQuery, doctors]);

  const onSelectDoctor = (d: DoctorRow) => {
    setDoctorId(d.id);
    setDoctorQuery(d.name);
  };

  const onSearchPatient = async () => {
    setMessage(null);
    const rows = await searchPatientsByContact(patientSearch);
    if (rows.length === 1) {
      setPatientId(rows[0].id);
      setSelectedPatient(rows[0]);
      setPatientMatches([]);
      await loadPreviousVisits(rows[0].id);
    } else if (rows.length > 1) {
      setPatientMatches(rows);
      setPatientModalOpen(true);
    } else {
      setSelectedPatient(null);
      setPatientId('');
      setPreviousVisits([]);
      setMessage('No patients found for that contact');
    }
  };

  const loadPreviousVisits = async (patId: string) => {
    setLoadingVisits(true);
    try {
      const [prescriptions, appointments] = await Promise.all([
        listPrescriptions(),
        listAppointments({ patient_id: patId })
      ]);
      
      const patientPrescriptions = prescriptions.filter(p => p.patient_id === patId);
      const visits = patientPrescriptions.map(prescription => {
        const appointment = appointments.find(a => 
          a.patient_id === patId && 
          a.doctor_id === prescription.doctor_id &&
          new Date(a.created_at).toDateString() === new Date(prescription.created_at).toDateString()
        );
        return { prescription, appointment };
      }).slice(0, 5); // Show last 5 visits
      
      setPreviousVisits(visits);
    } catch (e: any) {
      console.error('Error loading previous visits:', e);
    } finally {
      setLoadingVisits(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!patientId || !doctorId) { setMessage('Select patient and doctor'); return; }
    setLoading(true);
    try {
      const { id } = await createPrescription({ patient_id: patientId, doctor_id: doctorId, diagnosis: '', medicines: '', advice: '' });
      localStorage.setItem('orthonova_last_prescription_id', id);
      setMessage('Prescription generated');
      const win = window.open(`${window.location.origin}/print/prescription/${id}`, '_blank');
      if (win) win.focus();
    } catch (e: any) { setMessage(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Prescription</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Patient Contact</label>
              <div className="flex gap-2 mt-1">
                <input
                  placeholder="Enter contact number"
                  className="flex-1 rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={onSearchPatient}>Search</button>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-gray-600">Patient Name</label>
                <input className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50" value={selectedPatient?.name || ''} readOnly placeholder="No patient selected" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Doctor</label>
                <button 
                  type="button" 
                  className="text-xs text-brand-600 hover:text-brand-800"
                  onClick={refreshDoctors}
                >
                  Refresh List
                </button>
              </div>
              <input
                placeholder="Type to search doctor by name"
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={doctorQuery}
                onChange={e => { setDoctorQuery(e.target.value); setDoctorId(''); }}
              />
              {doctorQuery.trim().length > 0 && !doctorId && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {filteredDoctors.map(d => (
                    <div key={d.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${doctorId === d.id ? 'bg-brand-50' : ''}`} onClick={() => onSelectDoctor(d)}>
                      {d.name}
                    </div>
                  ))}
                  {filteredDoctors.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No match</div>}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={loading}>Generate</button>
            <button type="button" className="btn btn-secondary" onClick={() => {
              const id = localStorage.getItem('orthonova_last_prescription_id');
              if (!id) { setMessage('No recent prescription to reprint'); return; }
              const win = window.open(`${window.location.origin}/print/prescription/${id}`, '_blank'); if (win) win.focus();
            }}>Reprint Last</button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>

      {selectedPatient && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Previous Visit Details</h3>
          {loadingVisits ? (
            <p className="text-sm text-gray-500">Loading previous visits...</p>
          ) : previousVisits.length > 0 ? (
            <div className="space-y-3">
              {previousVisits.map((visit, idx) => (
                <div key={visit.prescription.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Visit #{previousVisits.length - idx}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(visit.prescription.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {visit.appointment && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        visit.appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        visit.appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {visit.appointment.status}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {visit.prescription.diagnosis && (
                      <div>
                        <span className="font-medium text-gray-600">Diagnosis: </span>
                        <span className="text-gray-800">{visit.prescription.diagnosis}</span>
                      </div>
                    )}
                    {visit.prescription.medicines && (
                      <div>
                        <span className="font-medium text-gray-600">Medicines: </span>
                        <span className="text-gray-800">{visit.prescription.medicines}</span>
                      </div>
                    )}
                    {visit.prescription.advice && (
                      <div>
                        <span className="font-medium text-gray-600">Advice: </span>
                        <span className="text-gray-800">{visit.prescription.advice}</span>
                      </div>
                    )}
                    {visit.appointment?.notes && (
                      <div>
                        <span className="font-medium text-gray-600">Notes: </span>
                        <span className="text-gray-800">{visit.appointment.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No previous visits found for this patient.</p>
          )}
        </div>
      )}

      <Modal open={patientModalOpen} title="Select Patient" onClose={() => setPatientModalOpen(false)}>
        <div className="divide-y divide-gray-100">
          {patientMatches.map(p => (
            <div key={p.id} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.age} / {p.gender})</span></div>
                  <div className="text-xs text-gray-500">{p.patient_id} • {p.contact}</div>
                </div>
                <button className="btn btn-secondary" onClick={async () => { 
                  setPatientId(p.id); 
                  setSelectedPatient(p); 
                  setPatientModalOpen(false); 
                  setPatientMatches([]);
                  await loadPreviousVisits(p.id);
                }}>Select</button>
              </div>
            </div>
          ))}
          {patientMatches.length === 0 && <div className="py-4 text-sm text-gray-500">No matches.</div>}
        </div>
      </Modal>
    </div>
  );
};

export default PrescriptionForm;