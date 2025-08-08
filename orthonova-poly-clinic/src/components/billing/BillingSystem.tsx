import React, { useEffect, useMemo, useState } from 'react';
import { createBill, listDoctors, listPatients, listServices } from '../../api';
import { BillItemRow, DoctorRow, PatientRow, ServiceRow } from '../../types';
import { formatCurrency, generateBillNumber } from '../../utils/format';

const MODES = ['Cash', 'UPI', 'Card'] as const;

type Mode = typeof MODES[number];

interface SelectedItem { service: ServiceRow; quantity: number; }

const BillingSystem: React.FC = () => {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('Cash');
  const [txnRef, setTxnRef] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, d, s] = await Promise.all([listPatients(), listDoctors(), listServices()]);
      setPatients(p); setDoctors(d); setServices(s);
    })();
  }, []);

  const doctor = useMemo(() => doctors.find(d => d.id === doctorId) || null, [doctors, doctorId]);
  const opdFee = useMemo(() => Number(doctor?.opd_fees || 0), [doctor]);

  const servicesTotal = useMemo(() => items.reduce((sum, it) => sum + Number(it.service.price) * it.quantity, 0), [items]);
  const total = useMemo(() => servicesTotal + opdFee, [servicesTotal, opdFee]);
  const net = useMemo(() => Math.max(0, total - Number(discount || 0)), [total, discount]);

  const addItem = (service: ServiceRow) => {
    setItems(prev => {
      const existing = prev.find(it => it.service.id === service.id);
      if (existing) return prev.map(it => it.service.id === service.id ? { ...it, quantity: it.quantity + 1 } : it);
      return [...prev, { service, quantity: 1 }];
    });
  };

  const updateQty = (serviceId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(it => it.service.id !== serviceId));
    } else {
      setItems(prev => prev.map(it => it.service.id === serviceId ? { ...it, quantity: qty } : it));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!patientId || !doctorId) { setMessage('Select patient and doctor'); return; }
    if ((mode === 'UPI' || mode === 'Card') && !txnRef.trim()) { setMessage('Transaction reference required for UPI/Card'); return; }
    if (items.length === 0 && opdFee === 0) { setMessage('Add at least one service or select a doctor with OPD fee'); return; }

    setSubmitting(true);
    try {
      const bill_number = generateBillNumber();
      const billInsert = {
        patient_id: patientId,
        doctor_id: doctorId,
        total_amount: total,
        discount: Number(discount || 0),
        net_amount: net,
        status,
        bill_number,
        mode_of_payment: mode,
        transaction_reference: (mode === 'UPI' || mode === 'Card') ? txnRef : null,
        created_at: new Date().toISOString(),
      } as const;

      const itemsInsert: Array<Omit<BillItemRow, 'id'>> = items.map(it => ({
        bill_id: '', // will be filled by API after bill insert
        service_id: it.service.id,
        quantity: it.quantity,
        price: Number(it.service.price),
        total: Number(it.service.price) * it.quantity,
      }));

      const inserted = await createBill(billInsert as any, itemsInsert);
      localStorage.setItem('orthonova_last_bill_id', inserted.id);
      setMessage('Bill generated successfully');
      const printUrl = `${window.location.origin}/print/bill/${inserted.id}`;
      const win = window.open(printUrl, '_blank');
      if (win) { win.focus(); }
      // Reset form
      setItems([]); setDiscount(0); setMode('Cash'); setTxnRef(''); setStatus('paid');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Bill</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Patient</label>
              <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={doctorId} onChange={e => setDoctorId(e.target.value)} required>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Consultation Fee: {formatCurrency(opdFee)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Discount (₹)</label>
              <input type="number" step="0.01" className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-medium mb-2">Services</h3>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{s.service_name}</div>
                      <div className="text-xs text-gray-500">{s.service_type} • {formatCurrency(Number(s.price))}</div>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => addItem(s)}>Add</button>
                  </div>
                ))}
                {services.length === 0 && <div className="text-sm text-gray-500 p-2">No services configured.</div>}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="font-medium mb-2">Selected Items</h3>
              <div className="space-y-2">
                {items.map(it => (
                  <div key={it.service.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{it.service.service_name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(Number(it.service.price))}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} className="w-20 rounded-xl border-gray-300" value={it.quantity} onChange={e => updateQty(it.service.id, Number(e.target.value))} />
                      <div className="w-24 text-right">{formatCurrency(Number(it.service.price) * it.quantity)}</div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="text-sm text-gray-500">No items added.</div>}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Consultation Fee</span><span>{formatCurrency(opdFee)}</span></div>
                <div className="flex justify-between"><span>Services Total</span><span>{formatCurrency(servicesTotal)}</span></div>
                <div className="flex justify-between font-medium"><span>Gross Total</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(Number(discount || 0))}</span></div>
                <div className="flex justify-between text-lg font-semibold"><span>Net Amount</span><span>{formatCurrency(net)}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Payment Mode</label>
              <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={mode} onChange={e => setMode(e.target.value as Mode)}>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {(mode === 'UPI' || mode === 'Card') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Transaction Reference</label>
                <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={txnRef} onChange={e => setTxnRef(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={submitting}>Generate Bill</button>
            <button type="button" className="btn btn-secondary" onClick={() => {
              const id = localStorage.getItem('orthonova_last_bill_id');
              if (!id) { setMessage('No recent bill to reprint'); return; }
              const url = `${window.location.origin}/print/bill/${id}`;
              const win = window.open(url, '_blank'); if (win) win.focus();
            }}>Reprint Last</button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default BillingSystem;