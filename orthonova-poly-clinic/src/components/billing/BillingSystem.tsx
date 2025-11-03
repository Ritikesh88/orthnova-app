import React, { useEffect, useMemo, useState } from 'react';
import { createBill, listDoctors, listServices, searchPatientsByContact } from '../../api';
import { BillItemRow, DoctorRow, PatientRow, ServiceRow } from '../../types';
import { formatCurrency, generateBillNumber } from '../../utils/format';
import Modal from '../common/Modal';

const MODES = ['Cash', 'UPI', 'Card'] as const;

type Mode = typeof MODES[number];

interface SelectedItem { service: ServiceRow; quantity: number; }

const BillingSystem: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);

  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  // Guest/non-registered patient support
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');

  const [doctorQuery, setDoctorQuery] = useState('');
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
      const [d, s] = await Promise.all([listDoctors(), listServices()]);
      setDoctors(d); setServices(s);
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

  const onSearchPatient = async () => {
    setMessage(null);
    if (isGuest) return; // skip search in guest mode
    const rows = await searchPatientsByContact(patientSearch);
    if (rows.length === 1) {
      setPatientId(rows[0].id);
      setSelectedPatient(rows[0]);
      setPatientMatches([]);
    } else if (rows.length > 1) {
      setPatientMatches(rows);
      setPatientModalOpen(true);
    } else {
      setSelectedPatient(null);
      setPatientId('');
      setMessage('No patients found for that contact');
    }
  };

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return [];
    return doctors.filter(d => d.name.toLowerCase().includes(q));
  }, [doctorQuery, doctors]);

  const onSelectDoctor = (d: DoctorRow) => {
    setDoctorId(d.id);
    setDoctorQuery(d.name);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if ((!patientId && !isGuest) || !doctorId) { setMessage('Select patient and doctor'); return; }
    if (isGuest && (!guestName.trim() || !guestContact.trim())) { setMessage('Enter guest name and contact'); return; }
    if ((mode === 'UPI' || mode === 'Card') && !txnRef.trim()) { setMessage('Transaction reference required for UPI/Card'); return; }
    if (items.length === 0 && opdFee === 0) { setMessage('Add at least one service or select a doctor with OPD fee'); return; }

    setSubmitting(true);
    try {
      const bill_number = generateBillNumber();
      const billInsert = {
        patient_id: isGuest ? null : patientId,
        doctor_id: doctorId,
        total_amount: total,
        discount: Number(discount || 0),
        net_amount: net,
        status,
        bill_number,
        mode_of_payment: mode,
        transaction_reference: (mode === 'UPI' || mode === 'Card') ? txnRef : null,
        guest_name: isGuest ? guestName.trim() : null,
        guest_contact: isGuest ? guestContact.trim() : null,
        bill_type: 'services',
        created_at: new Date().toISOString(),
      } as const;

      const itemsInsert: Array<Omit<BillItemRow, 'id'>> = items.map(it => ({
        bill_id: '',
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
              <label className="block text-sm font-medium">Patient Contact</label>
              <div className="flex gap-2 mt-1">
                <input
                  placeholder="Enter contact number"
                  className="flex-1 rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  disabled={isGuest}
                />
                <button type="button" className="btn btn-secondary" onClick={onSearchPatient} disabled={isGuest}>Search</button>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-gray-600">Patient Name</label>
                <input className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50" value={selectedPatient?.name || ''} readOnly placeholder="No patient selected" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input id="guest-toggle" type="checkbox" checked={isGuest} onChange={e => { setIsGuest(e.target.checked); if (e.target.checked) { setSelectedPatient(null); setPatientId(''); } }} />
                <label htmlFor="guest-toggle" className="text-sm">Bill for non-registered patient</label>
              </div>
              {isGuest && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="block text-sm font-medium">Guest Name</label>
                    <input className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" value={guestName} onChange={e => setGuestName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Guest Contact</label>
                    <input className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" value={guestContact} onChange={e => setGuestContact(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <input
                placeholder="Type to search doctor by name"
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={doctorQuery}
                onChange={e => setDoctorQuery(e.target.value)}
              />
              {doctorQuery.trim().length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {filteredDoctors.map(d => (
                    <div key={d.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${doctorId === d.id ? 'bg-brand-50' : ''}`} onClick={() => onSelectDoctor(d)}>
                      {d.name}
                    </div>
                  ))}
                  {filteredDoctors.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No match</div>}
                </div>
              )}
              {doctor && <p className="text-xs text-gray-500 mt-1">Consultation Fee: {formatCurrency(opdFee)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Discount (₹)</label>
              <input type="number" step="0.01" className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
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
                      <input type="number" min={0} className="w-20 rounded-xl border border-gray-300 bg-white" value={it.quantity} onChange={e => updateQty(it.service.id, Number(e.target.value))} />
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
              <select className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" value={mode} onChange={e => setMode(e.target.value as Mode)}>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {(mode === 'UPI' || mode === 'Card') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Transaction Reference</label>
                <input className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" value={txnRef} onChange={e => setTxnRef(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" value={status} onChange={e => setStatus(e.target.value as any)}>
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

      <Modal open={patientModalOpen} title="Select Patient" onClose={() => setPatientModalOpen(false)}>
        <div className="divide-y divide-gray-100">
          {patientMatches.map(p => (
            <div key={p.id} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.age} / {p.gender})</span></div>
                  <div className="text-xs text-gray-500">{p.patient_id} • {p.contact}</div>
                </div>
                <button className="btn btn-secondary" onClick={() => { setPatientId(p.id); setSelectedPatient(p); setPatientModalOpen(false); setPatientMatches([]); }}>Select</button>
              </div>
            </div>
          ))}
          {patientMatches.length === 0 && <div className="py-4 text-sm text-gray-500">No matches.</div>}
        </div>
      </Modal>
    </div>
  );
};

export default BillingSystem;