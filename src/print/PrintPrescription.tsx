import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDoctorById, getPatientById, getPrescriptionById } from '../api';
import { DoctorRow, PatientRow, PrescriptionRow } from '../types';
import { formatDate } from '../utils/format';

const PrintPrescription: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [presc, setPresc] = useState<PrescriptionRow | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const p = await getPrescriptionById(id);
      if (!p) return;
      setPresc(p);
      const [pat, doc] = await Promise.all([getPatientById(p.patient_id), getDoctorById(p.doctor_id)]);
      setPatient(pat); setDoctor(doc);
    })();
  }, [id]);

  if (!presc) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Patient Information Section */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div><strong>Patient ID:</strong> {patient?.patient_id}</div>
            <div><strong>Serial No:</strong> {presc.serial_number}</div>
            <div><strong>Date:</strong> {formatDate(presc.created_at)}</div>
            <div><strong>Name:</strong> {patient?.name}</div>
          </div>
          <div>
            <div><strong>Age/Gender:</strong> {patient?.age} / {patient?.gender}</div>
            <div><strong>Address:</strong> {patient?.address}</div>
            <div><strong>Mobile No:</strong> {patient?.contact}</div>
            <div><strong>Consultant:</strong> {doctor?.name}</div>
          </div>
        </div>
      </div>

      {/* Clinical Measurements Section */}
      <div className="mb-6 p-3 border border-gray-300 rounded">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Weight:</span>
            <div className="w-20 border-b border-gray-400 h-5"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Height:</span>
            <div className="w-20 border-b border-gray-400 h-5"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">BP:</span>
            <div className="w-24 border-b border-gray-400 h-5"></div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium">Others:</span>
            <div className="flex-1 border-b border-gray-400 h-5"></div>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="no-print text-center mt-6">
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" 
          onClick={() => window.print()}
        >
          Print Prescription
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { 
            font-size: 12px;
            margin: 0;
            padding: 0.5in;
          }
          div { 
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

// Updated to fix Vercel build error
export default PrintPrescription;