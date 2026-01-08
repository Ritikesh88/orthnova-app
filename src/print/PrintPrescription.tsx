import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDoctorById, getPatientById, getPrescriptionById } from '../api';
import { DoctorRow, PatientRow, PrescriptionRow } from '../types';
import { DOCTOR_NAME, DOCTOR_QUALIFICATION, DOCTOR_REG_NUMBER, DOCTOR_INFO_LINE, CLINIC_NAME, CLINIC_ADDRESS_LINE_1, CLINIC_CONTACT, CLINIC_EMAIL, CLINIC_CONTACT_EMAIL_LINE, CLINIC_ADDRESS_FORMATTED } from '../config/clinic';

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

  if (!presc) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 print:p-0">
      <div className="max-w-3xl mx-auto bg-white p-6 print:p-0" style={{ marginTop: '0.75in' }}>
        <div className="border-2 border-gray-700 rounded-md p-4">


          <table className="w-full border-b border-gray-800 mb-2">
            <tbody>
              <tr>
                <td className="text-left align-top w-1/2 pb-2">
                  <h1 className="text-lg font-bold">{DOCTOR_NAME}</h1>
                  <div className="text-xs">{DOCTOR_INFO_LINE}</div>
                  <div className="text-xs mt-1">{CLINIC_NAME}</div>
                </td>
                <td className="border-l border-gray-800 text-left align-top w-1/2 pl-2 pb-2">
                  <div className="text-xs">{CLINIC_ADDRESS_FORMATTED}</div>
                  <div className="text-xs">Email: {CLINIC_EMAIL}</div>
                  <div className="text-xs">{CLINIC_CONTACT}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-0.5 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div><span className="font-medium">Patient ID:</span> {patient?.patient_id}</div>
              <div><span className="font-medium">Serial No:</span> {presc.serial_number}</div>
              <div><span className="font-medium">Date:</span> {formatDate(presc.created_at)}</div>
              <div><span className="font-medium">Name:</span> {patient?.name}</div>
            </div>
            <div className="space-y-1">
              <div><span className="font-medium">Age/Gender:</span> {patient?.age} / {patient?.gender}</div>
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