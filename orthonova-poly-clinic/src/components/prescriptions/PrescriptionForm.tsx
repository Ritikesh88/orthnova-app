import React, { useEffect, useMemo, useState } from 'react';
import { createPrescription, listDoctors, listPatients, searchPatientsByContact } from '../../api';
import { DoctorRow, PatientRow } from '../../types';
import Modal from '../common/Modal';

const PrescriptionForm: React.FC = () => {
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

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([listPatients(), listDoctors()]);
      setDoctors(d);
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
  }, []);

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
    } else if (rows.length > 1) {
      setPatientMatches(rows);
      setPatientModalOpen(true);
    } else {
      setSelectedPatient(null);
      setPatientId('');
      setMessage('No patients found for that contact');
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
              <label className="block text-sm font-medium">Doctor</label>
              <input
                placeholder="Type to search doctor by name"
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={doctorQuery}
                onChange={e => setDoctorQuery(e.target.value)}
              />
              {doctorQuery.trim().length > 0 && (
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

      <Modal open={patientModalOpen} title="Select Patient" onClose={() => setPatientModalOpen(false)}>
        <div className="divide-y divide-gray-100">
          {patientMatches.map(p => (
            <div key={p.id} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.age} / {p.gender})</span></div>
                  <div className="text-xs text-gray-500">{p.patient_id} • {p.contact}</div>
                </div>
                <button className="btn btn-secondary" onClick={() => { setPatientId(p.id); setSelectedPatient(p); setPatientModalOpen(false); setPatientMatches([]); }}>Select</button>
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