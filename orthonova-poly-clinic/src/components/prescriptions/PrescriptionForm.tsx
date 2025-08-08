import React, { useEffect, useMemo, useState } from 'react';
import { createPrescription, listDoctors, listPatients, searchPatientsByContact } from '../../api';
import { DoctorRow, PatientRow } from '../../types';
import Modal from '../common/Modal';

const PrescriptionForm: React.FC = () => {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorId, setDoctorId] = useState('');

  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState('');
  const [advice, setAdvice] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([listPatients(), listDoctors()]);
      setPatients(p); setDoctors(d);
      const sel = localStorage.getItem('orthonova_selected_patient_id');
      if (sel && p.some(pt => pt.id === sel)) {
        setPatientId(sel);
        localStorage.removeItem('orthonova_selected_patient_id');
      }
    })();
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(d => d.name.toLowerCase().includes(q));
  }, [doctorQuery, doctors]);

  const onSearchPatient = async () => {
    setMessage(null);
    const rows = await searchPatientsByContact(patientSearch);
    if (rows.length === 1) {
      setPatientId(rows[0].id);
      setPatientMatches([]);
    } else if (rows.length > 1) {
      setPatientMatches(rows);
      setPatientModalOpen(true);
    } else {
      setMessage('No patients found for that contact');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!patientId || !doctorId) { setMessage('Select patient and doctor'); return; }
    if (!diagnosis && !medicines && !advice) { setMessage('Enter at least one section'); return; }
    setLoading(true);
    try {
      const { id } = await createPrescription({ patient_id: patientId, doctor_id: doctorId, diagnosis, medicines, advice });
      localStorage.setItem('orthonova_last_prescription_id', id);
      setMessage('Prescription generated');
      const win = window.open(`${window.location.origin}/print/prescription/${id}`, '_blank');
      if (win) win.focus();
      setDiagnosis(''); setMedicines(''); setAdvice('');
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
              {patientId && <div className="text-xs text-green-700 mt-1">Selected Patient ID: <span className="font-mono">{patientId}</span></div>}
            </div>
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <input
                placeholder="Type to search doctor by name"
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={doctorQuery}
                onChange={e => setDoctorQuery(e.target.value)}
              />
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                {filteredDoctors.map(d => (
                  <div key={d.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${doctorId === d.id ? 'bg-brand-50' : ''}`} onClick={() => setDoctorId(d.id)}>
                    {d.name}
                  </div>
                ))}
                {filteredDoctors.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No match</div>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Diagnosis</label>
            <textarea className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter diagnosis" />
          </div>
          <div>
            <label className="block text-sm font-medium">Medicines</label>
            <textarea className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" rows={6} value={medicines} onChange={e => setMedicines(e.target.value)} placeholder="Name - Dosage - Frequency - Duration" />
          </div>
          <div>
            <label className="block text-sm font-medium">Advice</label>
            <textarea className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" rows={3} value={advice} onChange={e => setAdvice(e.target.value)} placeholder="Advice and instructions" />
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
                  <div className="text-xs text-gray-500">{p.id} • {p.contact}</div>
                </div>
                <button className="btn btn-secondary" onClick={() => { setPatientId(p.id); setPatientModalOpen(false); setPatientMatches([]); }}>Select</button>
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