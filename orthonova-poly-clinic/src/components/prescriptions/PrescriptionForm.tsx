import React, { useEffect, useState } from 'react';
import { createPrescription, listDoctors, listPatients } from '../../api';
import { DoctorRow, PatientRow } from '../../types';

const PrescriptionForm: React.FC = () => {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  const [patientId, setPatientId] = useState('');
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
              <label className="block text-sm font-medium">Patient</label>
              <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={doctorId} onChange={e => setDoctorId(e.target.value)} required>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Diagnosis</label>
            <textarea className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter diagnosis" />
          </div>
          <div>
            <label className="block text-sm font-medium">Medicines</label>
            <textarea className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" rows={6} value={medicines} onChange={e => setMedicines(e.target.value)} placeholder="Name - Dosage - Frequency - Duration" />
          </div>
          <div>
            <label className="block text-sm font-medium">Advice</label>
            <textarea className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" rows={3} value={advice} onChange={e => setAdvice(e.target.value)} placeholder="Advice and instructions" />
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
    </div>
  );
};

export default PrescriptionForm;