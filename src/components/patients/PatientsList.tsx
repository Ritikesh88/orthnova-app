import React, { useEffect, useState } from 'react';
import { listPatients, deletePatient } from '../../api';
import { PatientRow } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import PatientEdit from './PatientEdit';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

const PatientsList: React.FC = () => {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
              <th className="py-2 pr-4">Address</th>
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
                <td className="py-2 pr-4 truncate max-w-xs">{p.address}</td>
                <td className="py-2 pr-4 space-x-2">
                  <button className="btn btn-secondary px-3 py-1" onClick={() => selectForPrescription(p.id)}>Create Prescription</button>
                  <button className="btn btn-outline px-3 py-1" onClick={() => {
                    setEditingPatientId(p.id);
                    setPatientModalOpen(true);
                  }}>Edit</button>
                  {isAdmin && (
                    <button 
                      className="btn bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1"
                      onClick={() => {
                        setDeletingPatientId(p.id);
                        setDeleteModalOpen(true);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr><td className="py-4 text-gray-500" colSpan={7}>{loading ? 'Loading...' : 'No patients found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Patient Edit Modal */}
      {editingPatientId && (
        <Modal open={patientModalOpen} title="Edit Patient" onClose={() => setPatientModalOpen(false)}>
          <PatientEdit
            patientId={editingPatientId}
            onPatientUpdated={() => {
              setPatientModalOpen(false);
              // Refresh the patient list
              (async () => {
                setLoading(true);
                setError(null);
                try {
                  const data = await listPatients(debounced);
                  setPatients(data);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              })();
            }}
            onCancel={() => setPatientModalOpen(false)}
          />
        </Modal>
      )}
      
      {/* Delete Patient Confirmation Modal */}
      {deleteModalOpen && deletingPatientId && (
        <Modal open={deleteModalOpen} title="Confirm Delete" onClose={() => {
          setDeleteModalOpen(false);
          setDeletingPatientId(null);
        }}>
          <div className="p-4">
            <p className="mb-4 text-gray-700">Are you sure you want to delete this patient? This will permanently remove the patient and all related records including appointments, prescriptions, bills, and pathology reports.</p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletingPatientId(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn bg-red-500 text-white hover:bg-red-600"
                onClick={async () => {
                  if (deletingPatientId) {
                    try {
                      await deletePatient(deletingPatientId);
                      setError(null);
                      // Refresh the patient list
                      setLoading(true);
                      try {
                        const data = await listPatients(debounced);
                        setPatients(data);
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setLoading(false);
                      }
                      setDeleteModalOpen(false);
                      setDeletingPatientId(null);
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PatientsList;