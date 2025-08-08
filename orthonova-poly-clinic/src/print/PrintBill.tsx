import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBillById, getDoctorById, getPatientById, listBillItems, listServices } from '../api';
import { BillItemRow, BillRow, DoctorRow, PatientRow, ServiceRow } from '../types';
import { CLINIC_ADDRESS_LINE_1, CLINIC_ADDRESS_LINE_2, CLINIC_CONTACT, CLINIC_NAME, CLINIC_REG_NO } from '../config/clinic';
import { formatCurrency, formatDateTime } from '../utils/format';

const PrintBill: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<BillRow | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);
  const [items, setItems] = useState<BillItemRow[]>([]);
  const [services, setServices] = useState<Record<string, ServiceRow>>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      const b = await getBillById(id);
      if (!b) return;
      setBill(b);
      const [p, d, its, svc] = await Promise.all([
        getPatientById(b.patient_id),
        getDoctorById(b.doctor_id),
        listBillItems(b.id),
        listServices(),
      ]);
      setPatient(p); setDoctor(d); setItems(its);
      const svcMap: Record<string, ServiceRow> = {};
      svc.forEach(s => { svcMap[s.id] = s; });
      setServices(svcMap);
      const printTimer = setTimeout(() => { window.focus(); window.print(); }, 400);
      return () => clearTimeout(printTimer);
    })();
  }, [id]);

  const servicesSubtotal = useMemo(() => items.reduce((sum, it) => sum + Number(it.total), 0), [items]);
  const opdFee = useMemo(() => Number(doctor?.opd_fees || 0), [doctor]);

  if (!bill) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 print:p-0">
      <div className="max-w-3xl mx-auto bg-white p-6 print:p-0">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{CLINIC_NAME}</h1>
          <div className="text-sm">{CLINIC_REG_NO}</div>
          <div className="text-sm">{CLINIC_ADDRESS_LINE_1}</div>
          <div className="text-sm">{CLINIC_ADDRESS_LINE_2}</div>
          <div className="text-sm">{CLINIC_CONTACT}</div>
          <div className="text-xl font-semibold mt-2">INVOICE</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div><span className="font-medium">Order No:</span> {bill.bill_number}</div>
            <div><span className="font-medium">Date:</span> {formatDateTime(bill.created_at)}</div>
            <div><span className="font-medium">Patient Name:</span> {patient?.name}</div>
            <div><span className="font-medium">Age/Gender:</span> {patient?.age} / {patient?.gender}</div>
          </div>
          <div className="space-y-1">
            <div><span className="font-medium">Contact:</span> {patient?.contact}</div>
            <div><span className="font-medium">Address:</span> {patient?.address}</div>
            <div><span className="font-medium">Consultant:</span> {doctor?.name}</div>
          </div>
        </div>

        <div className="mt-4">
          <table className="w-full text-sm border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">Item Name</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Unit Price</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Quantity</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Amount</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Discount</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Final Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1">Consultation Fee</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(opdFee)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">1</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(opdFee)}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(opdFee)}</td>
              </tr>
              {items.map(it => {
                const svc = services[it.service_id];
                const amount = Number(it.total);
                return (
                  <tr key={it.id}>
                    <td className="border border-gray-300 px-2 py-1">{svc?.service_name || it.service_id}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(Number(it.price))}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{it.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(amount)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">-</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div><span className="font-medium">Payment Type:</span> {bill.mode_of_payment}</div>
            {bill.transaction_reference && <div><span className="font-medium">Transaction ID:</span> {bill.transaction_reference}</div>}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="font-medium">Final Amount</span><span>{formatCurrency(opdFee + servicesSubtotal)}</span></div>
            <div className="flex justify-between"><span className="font-medium">Discount</span><span>-{formatCurrency(Number(bill.discount))}</span></div>
            <div className="flex justify-between text-lg font-semibold"><span>Net Amount</span><span>{formatCurrency(bill.net_amount)}</span></div>
          </div>
        </div>

        <div className="mt-8 text-sm">
          <div>{CLINIC_CONTACT}</div>
          <div className="flex justify-between mt-8">
            <div>Prepared by: ____________</div>
            <div>Signature: ____________</div>
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

export default PrintBill;