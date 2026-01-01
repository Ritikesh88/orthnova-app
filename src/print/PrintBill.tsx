import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBillById, getDoctorById, getPatientById, listBillItems, listServices } from '../api';
import { BillItemRow, BillRow, DoctorRow, PatientRow, ServiceRow } from '../types';
import { CLINIC_ADDRESS_LINE_1, CLINIC_CONTACT, CLINIC_EMAIL, CLINIC_NAME, CLINIC_REG_NO } from '../config/clinic';
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
        b.patient_id ? getPatientById(b.patient_id) : Promise.resolve(null),
        b.doctor_id ? getDoctorById(b.doctor_id) : Promise.resolve(null),
        listBillItems(b.id),
        listServices(),
      ]);
      setPatient(p); setDoctor(d); setItems(its);
      const svcMap: Record<string, ServiceRow> = {};
      svc.forEach(s => { svcMap[s.id] = s; });
      setServices(svcMap);

    })();
  }, [id]);

  const servicesSubtotal = useMemo(() => items.reduce((sum, it) => sum + Number(it.total), 0), [items]);
  const opdFee = useMemo(() => Number(doctor?.opd_fees || 0), [doctor]);

  if (!bill) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 print:p-0">
      <div className="max-w-3xl mx-auto bg-white p-4 print:p-0 text-xs">
        <div className="text-center">
          <h1 className="text-lg font-bold">{CLINIC_NAME}</h1>
          <div className="text-xs">{CLINIC_REG_NO}</div>
          <div className="text-xs">{CLINIC_ADDRESS_LINE_1}</div>
          <div className="text-xs">Email: {CLINIC_EMAIL}</div>
          <div className="text-xs">{CLINIC_CONTACT}</div>
          <div className="text-lg font-semibold mt-1">BILL</div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-0.5">
            <div><span className="font-medium">Bill No:</span> {bill.bill_number}</div>
            <div><span className="font-medium">Date:</span> {formatDateTime(bill.created_at)}</div>
            <div><span className="font-medium">Patient Name:</span> {patient?.name || bill.guest_name || '-'}</div>
            <div><span className="font-medium">Age/Gender:</span> {patient ? `${patient.age} / ${patient.gender}` : '-'}</div>
          </div>
          <div className="space-y-0.5">
            <div><span className="font-medium">Contact:</span> {patient?.contact || bill.guest_contact || '-'}</div>
            <div><span className="font-medium">Address:</span> {patient?.address || '-'}</div>
            {bill.bill_type === 'pharmacy' ? (
              <div><span className="font-medium">Referred By:</span> {bill.referred_by || '-'}</div>
            ) : (
              <div><span className="font-medium">Consultant:</span> {doctor?.name}</div>
            )}
          </div>
        </div>

        <div className="mt-2">
          <table className="w-full text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-1 py-0.5 text-left">Item Name</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Unit Price</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Qty</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Batch</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Exp. Date</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Amount</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Disc</th>
                <th className="border border-gray-300 px-1 py-0.5 text-right">Final</th>
              </tr>
            </thead>
            <tbody>
              {bill.bill_type !== 'pharmacy' && opdFee > 0 && (
                <tr>
                  <td className="border border-gray-300 px-1 py-0.5">Consultation Fee</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">{formatCurrency(opdFee)}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">1</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">-</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">-</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">{formatCurrency(opdFee)}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">-</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-right">{formatCurrency(opdFee)}</td>
                </tr>
              )}
              {items.map(it => {
                const svc = it.service_id ? services[it.service_id] : undefined;
                const displayName = svc?.service_name || it.item_name || it.inventory_item_id || it.service_id || 'Item';
                const amount = Number(it.total);
                return (
                  <tr key={it.id}>
                    <td className="border border-gray-300 px-1 py-0.5">{displayName}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">{formatCurrency(Number(it.price))}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">{it.quantity}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">{it.batch_number || 'N/A'}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">{it.expiry_date || 'N/A'}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">{formatCurrency(amount)}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">-</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-right">{formatCurrency(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-0.5">
            <div><span className="font-medium">Payment Type:</span> {bill.mode_of_payment}</div>
            {bill.transaction_reference && <div><span className="font-medium">Transaction ID:</span> {bill.transaction_reference}</div>}
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="font-medium">Final Amount</span><span>{formatCurrency((bill.bill_type !== 'pharmacy' ? opdFee : 0) + servicesSubtotal)}</span></div>
            {Number(bill.discount) > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Discount</span>
                <span>-{formatCurrency(Number(bill.discount))}
                  {bill.total_amount > 0 ? ` (${((Number(bill.discount) / Number(bill.total_amount)) * 100).toFixed(2)}%)` : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold"><span>Net Amount</span><span>{formatCurrency(bill.net_amount)}</span></div>
          </div>
        </div>

        <div className="mt-4 text-xs">
          <div>{CLINIC_CONTACT}</div>
          <div className="flex justify-between mt-4">
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