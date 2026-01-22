import React, { useState, useEffect, useCallback } from 'react';
import { PatientRow } from '../../types';
import { getPatientById, updatePatient } from '../../api';

interface PatientEditProps {
  patientId: string;
  onPatientUpdated?: (patient: PatientRow) => void;
  onCancel?: () => void;
}

const PatientEdit: React.FC<PatientEditProps> = ({ patientId, onPatientUpdated, onCancel }) => {
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    age: 0,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    contact: '',
    address: ''
  });

  const loadPatient = useCallback(async () => {
    try {
      setLoading(true);
      const patientData = await getPatientById(patientId);
      if (patientData) {
        setPatient(patientData);
        setForm({
          name: patientData.name || '',
          age: patientData.age || 0,
          gender: patientData.gender || 'Male',
          contact: patientData.contact || '',
          address: patientData.address || ''
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const updatedPatient = await updatePatient(patientId, form);
      setPatient(updatedPatient);
      setSuccess('Patient updated successfully');
      if (onPatientUpdated) {
        onPatientUpdated(updatedPatient);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-4">Loading patient details...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!patient) return <div className="p-4">Patient not found.</div>;

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Edit Patient Details</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Name</label>
          <input 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
            value={form.name} 
            onChange={e => setForm(f => ({...f, name: e.target.value}))} 
            required 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium">Age</label>
          <input 
            type="number" 
            min="0" 
            max="150" 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
            value={form.age} 
            onChange={e => setForm(f => ({...f, age: parseInt(e.target.value) || 0}))} 
            required 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium">Gender</label>
          <select 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
            value={form.gender} 
            onChange={e => setForm(f => ({...f, gender: e.target.value as any}))}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div className="md:col-span-3">
          <label className="block text-sm font-medium">Contact</label>
          <input 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
            value={form.contact} 
            onChange={e => setForm(f => ({...f, contact: e.target.value}))} 
            required 
          />
        </div>
        
        <div className="md:col-span-6">
          <label className="block text-sm font-medium">Address</label>
          <textarea 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
            rows={3}
            value={form.address} 
            onChange={e => setForm(f => ({...f, address: e.target.value}))} 
          />
        </div>
        
        <div className="md:col-span-6 flex items-end justify-end gap-2 mt-4">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="btn btn-primary"
          >
            Update Patient
          </button>
        </div>
      </form>
      
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
    </div>
  );
};

export default PatientEdit;