import React, { useEffect, useMemo, useState } from 'react';
import { createPatient, createAppointment, createBill, recordPayment, listDoctors, listServices, searchPatientsByContact } from '../../api';
import { BillItemRow, DoctorRow, PatientRow, ServiceRow } from '../../types';
import { formatCurrency, generateBillNumber } from '../../utils/format';
import { calculateAge, generatePatientId } from '../../utils/idGenerators';
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
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [items, setItems] = useState<SelectedItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('Cash');
  const [txnRef, setTxnRef] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshDoctors = async () => {
    try {
      const data = await listDoctors();
      setDoctors(data);
    } catch (e: any) {
      console.error('Error refreshing doctors:', e);
    }
  };

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
  const discountAmount = useMemo(() => (total * Number(discountPercent || 0)) / 100, [total, discountPercent]);
  const net = useMemo(() => Math.max(0, total - discountAmount), [total, discountAmount]);

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

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return [];
    return services.filter(s => 
      s.service_name.toLowerCase().includes(q) || 
      s.service_type.toLowerCase().includes(q)
    ).slice(0, 10); // Limit to 10 results
  }, [serviceSearch, services]);

  const onSelectDoctor = (d: DoctorRow) => {
    setDoctorId(d.id);
    setDoctorQuery(d.name);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if ((!patientId && !isGuest) || !doctorId) {
      setMessage('Select patient and doctor');
      return;
    }
    if (isGuest && (!guestName.trim() || !guestContact.trim())) {
      setMessage('Enter guest name and contact');
      return;
    }
    if ((mode === 'UPI' || mode === 'Card') && !txnRef.trim()) {
      setMessage('Transaction reference required for UPI/Card');
      return;
    }
    if (items.length === 0 && opdFee === 0) {
      setMessage('Add at least one service or select a doctor with OPD fee');
      return;
    }

    setSubmitting(true);
    try {
      let finalPatientId = patientId;

      // Step 1: Create guest patient if needed
      if (isGuest && guestName.trim() && guestContact.trim()) {
        const patient_id = generatePatientId(guestContact.trim(), guestName.trim());
        const age = 0; // Guest patients don't have DOB, default to 0
        const createdPatient = await createPatient({
          id: crypto.randomUUID(),
          patient_id,
          name: guestName.trim(),
          dob: new Date().toISOString().split('T')[0], // Default to today
          gender: 'Other',
          contact: guestContact.trim(),
          address: '',
          age,
        });
        finalPatientId = createdPatient.id;
      }

      // Step 2: Create appointment if needed
      let finalAppointmentId = appointmentId;
      if (!finalAppointmentId && finalPatientId && doctorId) {
        const appointment = await createAppointment({
          patient_id: finalPatientId,
          doctor_id: doctorId,
          appointment_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
          status: 'completed',
        });
        finalAppointmentId = appointment.id;
        setAppointmentId(finalAppointmentId);
      }

      // Step 3: Create bill
      const bill_number = generateBillNumber();
      const billPayload = {
        patient_id: finalPatientId,
        doctor_id: doctorId,
        total_amount: total,
        discount: discountAmount,
        net_amount: net,
        status,
        bill_number,
        mode_of_payment: mode,
        transaction_reference: (mode === 'UPI' || mode === 'Card') ? txnRef : null,
        guest_name: isGuest ? guestName.trim() : null,
        guest_contact: isGuest ? guestContact.trim() : null,
        bill_type: 'services' as const,
      };

      const itemsInsert: Array<Omit<BillItemRow, 'id'>> = items.map(it => ({
        bill_id: '',
        service_id: it.service.id,
        quantity: it.quantity,
        price: Number(it.service.price),
        total: Number(it.service.price) * it.quantity,
      }));

      const inserted = await createBill(billPayload as any, itemsInsert);

      // Step 4: Record payment if status is paid or partial
      if (status === 'paid' && net > 0) {
        await recordPayment(
          inserted.id,
          net,
          mode,
          (mode === 'UPI' || mode === 'Card') ? txnRef : null
        );
      } else if (status === 'partial' && net > 0) {
        // For partial payments, you could add a payment amount field
        // For now, we'll record it as paid to update the status
        await recordPayment(
          inserted.id,
          net * 0.5, // Example: 50% payment
          mode,
          (mode === 'UPI' || mode === 'Card') ? txnRef : null
        );
      }

      localStorage.setItem('orthonova_last_bill_id', inserted.id);
      setMessage('Bill generated successfully');
      
      // Open print window
      const printUrl = `${window.location.origin}/print/bill/${inserted.id}`;
      const win = window.open(printUrl, '_blank');
      if (win) {
        win.focus();
      }
      
      // Reset form
      setItems([]);
      setDiscountPercent(0);
      setMode('Cash');
      setTxnRef('');
      setStatus('paid');
      setAppointmentId(null);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Doctor</label>
                <button 
                  type="button" 
                  className="text-xs text-brand-600 hover:text-brand-800"
                  onClick={refreshDoctors}
                >
                  Refresh List
                </button>
              </div>
              <input
                placeholder="Type to search doctor by name"
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                value={doctorQuery}
                onChange={e => { setDoctorQuery(e.target.value); setDoctorId(''); }}
              />
              {doctorQuery.trim().length > 0 && !doctorId && (
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
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="card p-4">
              <h3 className="font-medium mb-3">Search Services</h3>
              <input
                type="text"
                placeholder="Type service name or type to search..."
                className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500 mb-2"
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
              />
              {serviceSearch.trim().length > 0 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                  {filteredServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div>
                        <div className="font-medium">{s.service_name}</div>
                        <div className="text-xs text-gray-500">{s.service_type} • {formatCurrency(Number(s.price))}</div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => {
                          addItem(s);
                          setServiceSearch('');
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                  {filteredServices.length === 0 && (
                    <div className="text-sm text-gray-500 p-3">No services found matching "{serviceSearch}"</div>
                  )}
                </div>
              )}
              {serviceSearch.trim().length === 0 && (
                <p className="text-sm text-gray-500 text-center py-3">Start typing to search for services</p>
              )}
            </div>

            <div className="card p-4">
              <h3 className="font-medium mb-3">Selected Services & Fees</h3>
              <div className="space-y-3">
                {items.map(it => (
                  <div key={it.service.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{it.service.service_name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(Number(it.service.price))}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} className="w-20 rounded-xl border border-gray-300 bg-white text-center" value={it.quantity} onChange={e => updateQty(it.service.id, Number(e.target.value))} />
                      <div className="w-24 text-right">{formatCurrency(Number(it.service.price) * it.quantity)}</div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="text-sm text-gray-500 text-center py-3">No services added yet</div>}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Consultation Fee</span><span>{formatCurrency(opdFee)}</span></div>
                <div className="flex justify-between"><span>Services Total</span><span>{formatCurrency(servicesTotal)}</span></div>
                <div className="flex justify-between font-medium"><span>Gross Total</span><span>{formatCurrency(total)}</span></div>
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Discount (%)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    max="100"
                    className="w-32 rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500 text-sm text-right" 
                    value={discountPercent} 
                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))} 
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between text-red-600"><span>Discount Applied ({discountPercent}%)</span><span>-{formatCurrency(discountAmount)}</span></div>
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2 mt-2"><span>Net Amount</span><span>{formatCurrency(net)}</span></div>
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