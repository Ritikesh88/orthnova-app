import React, { useEffect, useState } from 'react';
import { listPatients } from '../../api';
import { PatientRow } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

const PatientsList: React.FC = () => {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await listPatients(debounced);
        setPatients(data);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [debounced]);

  const selectForPrescription = (patientId: string) => {
    localStorage.setItem('orthonova_selected_patient_id', patientId);
    navigate('/prescriptions');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          placeholder="Search patients by name"
          className="w-full md:w-80 rounded-xl border-gray-300 focus:ring-brand-500"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={() => setQ('')}>Clear</button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="card p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Patient ID</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Age</th>
              <th className="py-2 pr-4">Gender</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-2 pr-4 font-mono">{p.patient_id}</td>
                <td className="py-2 pr-4">{p.name}</td>
                <td className="py-2 pr-4">{p.age}</td>
                <td className="py-2 pr-4">{p.gender}</td>
                <td className="py-2 pr-4">{p.contact}</td>
                <td className="py-2 pr-4 space-x-2">
                  <button className="btn btn-secondary px-3 py-1" onClick={() => selectForPrescription(p.id)}>Create Prescription</button>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr><td className="py-4 text-gray-500" colSpan={6}>{loading ? 'Loading...' : 'No patients found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientsList;