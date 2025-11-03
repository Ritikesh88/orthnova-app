import React, { useEffect, useState } from 'react';
import { createDoctor, listDoctors } from '../../api';
import { DoctorRow } from '../../types';
import { generateDoctorId } from '../../utils/idGenerators';

const DoctorRegistration: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<{ name: string; contact: string; registration_number: string; opd_fees: number }>({ name: '', contact: '', registration_number: '', opd_fees: 0 });

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const data = await listDoctors();
      setDoctors(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!form.name || !form.registration_number) { setError('Name and registration number are required'); return; }
    const doctor_id = generateDoctorId(form.registration_number, form.name);
    try {
      await createDoctor({ doctor_id, name: form.name, contact: form.contact, registration_number: form.registration_number, opd_fees: Number(form.opd_fees) });
      setSuccess(`Doctor registered with ID ${doctor_id}`);
      setForm({ name: '', contact: '', registration_number: '', opd_fees: 0 });
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Register Doctor</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Contact</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Registration Number</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.registration_number} onChange={e => setForm(f => ({...f, registration_number: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">OPD Fees (₹)</label>
            <input type="number" step="0.01" className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.opd_fees} onChange={e => setForm(f => ({...f, opd_fees: Number(e.target.value)}))} />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" disabled={loading}>Register</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Doctors</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Reg No</th>
                <th className="py-2 pr-4">OPD Fees</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(d => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{d.doctor_id}</td>
                  <td className="py-2 pr-4">{d.name}</td>
                  <td className="py-2 pr-4">{d.contact}</td>
                  <td className="py-2 pr-4">{d.registration_number}</td>
                  <td className="py-2 pr-4">₹{Number(d.opd_fees).toFixed(2)}</td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={5}>No doctors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegistration;