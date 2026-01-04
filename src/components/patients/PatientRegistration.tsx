import React, { useState } from 'react';
import { createPatient, checkPatientExists } from '../../api';
import { PatientRow } from '../../types';
import { generatePatientId } from '../../utils/idGenerators';

interface PatientRegistrationProps {
  onPatientCreated?: (patient: PatientRow) => void;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onPatientCreated }) => {
  const [form, setForm] = useState<{ name: string; age: number; gender: 'Male' | 'Female' | 'Other'; contact: string; address: string }>({
    name: '', age: 0, gender: 'Male', contact: '', address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);



  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!form.name || !form.contact || form.age <= 0) {
      setError('Name, Contact and Age are required');
      return;
    }
    
    setLoading(true);
    
    // Check if a patient with the same name and contact already exists
    try {
      const existingPatient = await checkPatientExists(form.name, form.contact);
      if (existingPatient) {
        setError(`Patient with name "${form.name}" and contact "${form.contact}" already exists with ID ${existingPatient.patient_id}. Please use the existing record or update the information.`);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error checking for existing patient:', err);
      // Continue with registration even if there's an error in checking
      // This prevents registration from being blocked by check function issues
    }
    
    const patient_id = await generatePatientId();
    
    try {
      const createdPatient = await createPatient({
        id: crypto.randomUUID(),
        patient_id,
        name: form.name,
        age: form.age,
        gender: form.gender,
        contact: form.contact,
        address: form.address
      });
      
      setSuccess(`Patient registered with ID ${patient_id}`);
      setLastId(patient_id);
      
      // Emit the created patient to parent component if callback provided
      if (onPatientCreated) {
        onPatientCreated(createdPatient);
      }
      
      // Reset form
      setForm({ name: '', age: 0, gender: 'Male', contact: '', address: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Register Patient</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Age</label>
            <input type="number" min="0" max="150" className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.age} onChange={e => setForm(f => ({...f, age: parseInt(e.target.value) || 0}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Gender</label>
            <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value as any}))}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Contact</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} required />
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm font-medium">Address</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} />
          </div>
          <div className="md:col-span-6 flex items-end justify-end gap-2">
            <button className="btn btn-primary" disabled={loading}>Register</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        {lastId && <p className="text-sm text-gray-700 mt-2">Last registered ID: <span className="font-mono">{lastId}</span></p>}
      </div>
    </div>
  );
};

export default PatientRegistration;