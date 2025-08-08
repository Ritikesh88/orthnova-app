import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDoctorById, getPatientById, getPrescriptionById } from '../api';
import { DoctorRow, PatientRow, PrescriptionRow } from '../types';
import { CLINIC_ADDRESS_LINE_1, CLINIC_ADDRESS_LINE_2, CLINIC_CONTACT, CLINIC_NAME } from '../config/clinic';
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
      const t = setTimeout(() => { window.focus(); window.print(); }, 400);
      return () => clearTimeout(t);
    })();
  }, [id]);

  if (!presc) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 print:p-0">
      <div className="max-w-3xl mx-auto bg-white p-6 print:p-0">
        <div className="border-2 border-gray-700 rounded-md p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{CLINIC_NAME}</h1>
            <div className="text-sm">{CLINIC_ADDRESS_LINE_1}</div>
            <div className="text-sm">{CLINIC_ADDRESS_LINE_2}</div>
            <div className="text-sm">{CLINIC_CONTACT}</div>
            <div className="text-xl font-semibold mt-2">PRESCRIPTION</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div><span className="font-medium">Patient ID:</span> {patient?.id}</div>
              <div><span className="font-medium">Date:</span> {formatDate(presc.created_at)}</div>
              <div><span className="font-medium">Name:</span> {patient?.name}</div>
              <div><span className="font-medium">Age/Gender:</span> {patient?.age} / {patient?.gender}</div>
            </div>
            <div className="space-y-1">
              <div><span className="font-medium">Address:</span> {patient?.address}</div>
              <div><span className="font-medium">Mobile No:</span> {patient?.contact}</div>
              <div><span className="font-medium">Consultant:</span> {doctor?.name}</div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-sm border-2 border-gray-700 rounded-md p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium w-14">Weight:</span>
              <div className="w-20 border-b border-gray-400 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium w-14">Height:</span>
              <div className="w-20 border-b border-gray-400 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium w-10">BP:</span>
              <div className="w-24 border-b border-gray-400 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium w-16">Others:</span>
              <div className="flex-1 border-b border-gray-400 h-5" />
            </div>
          </div>
        </div>

        <div className="mt-4 no-print">
          <button className="btn btn-primary" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default PrintPrescription;