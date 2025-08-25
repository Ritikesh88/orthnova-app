import React, { useEffect, useMemo, useState } from 'react';
import { listDoctors, listInventoryItems, createBill } from '../../api';
import { BillItemRow, DoctorRow, InventoryItemRow } from '../../types';
import { formatCurrency, generateBillNumber } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

interface SelectedMed { item: InventoryItemRow; quantity: number; }

const PhysicianDispense: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorId, setDoctorId] = useState('');

  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedMed[]>([]);
  const [discount, setDiscount] = useState(0);
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [txnRef, setTxnRef] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, inv] = await Promise.all([listDoctors(), listInventoryItems()]);
      setDoctors(d); setInventory(inv);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }, [inventory, query]);

  const addMed = (item: InventoryItemRow) => {
    setSelected(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setSelected(prev => prev.filter(p => p.item.id !== id));
    else setSelected(prev => prev.map(p => p.item.id === id ? { ...p, quantity: qty } : p));
  };

  const subtotal = useMemo(() => selected.reduce((s, p) => s + Number(p.item.sale_price) * p.quantity, 0), [selected]);
  const net = useMemo(() => Math.max(0, subtotal - Number(discount || 0)), [subtotal, discount]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    if (!doctorId) { setMessage('Select doctor'); return; }
    if (selected.length === 0) { setMessage('Add at least one medicine'); return; }
    if ((mode === 'UPI' || mode === 'Card') && !txnRef.trim()) { setMessage('Transaction reference required for UPI/Card'); return; }
    setSubmitting(true);
    try {
      const bill_number = generateBillNumber();
      const billInsert = {
        patient_id: null,
        doctor_id: doctorId,
        total_amount: subtotal,
        discount: Number(discount || 0),
        net_amount: net,
        status: 'paid',
        bill_number,
        mode_of_payment: mode,
        transaction_reference: (mode === 'UPI' || mode === 'Card') ? txnRef : null,
        guest_name: null,
        guest_contact: null,
        bill_type: 'pharmacy',
        created_at: new Date().toISOString(),
      } as const;
      const itemsInsert: Array<Omit<BillItemRow, 'id'>> = selected.map(s => ({
        bill_id: '',
        inventory_item_id: s.item.id,
        item_name: s.item.name,
        quantity: s.quantity,
        price: Number(s.item.sale_price),
        total: Number(s.item.sale_price) * s.quantity,
      }));
      const inserted = await createBill(billInsert as any, itemsInsert);
      localStorage.setItem('orthonova_last_bill_id', inserted.id);
      setMessage('Dispense bill generated');
      const url = `${window.location.origin}/print/bill/${inserted.id}`;
      const win = window.open(url, '_blank'); if (win) win.focus();
      setSelected([]); setDiscount(0); setMode('Cash'); setTxnRef('');
    } catch (e: any) { setMessage(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Physician Dispense</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <select className="mt-1 w-full" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Discount (₹)</label>
              <input type="number" step="0.01" className="mt-1 w-full" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Payment Mode</label>
              <select className="mt-1 w-full" value={mode} onChange={e => setMode(e.target.value as any)}>
                <option>Cash</option><option>UPI</option><option>Card</option>
              </select>
            </div>
          </div>
          {(mode === 'UPI' || mode === 'Card') && (
            <div>
              <label className="block text-sm font-medium">Transaction Reference</label>
              <input className="mt-1 w-full" value={txnRef} onChange={e => setTxnRef(e.target.value)} required />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Medicines</h3>
                <input placeholder="Search by name or SKU" className="rounded-xl border-gray-300" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {filtered.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-500">{i.unit} • {formatCurrency(Number(i.sale_price))} • Stock: {i.current_stock}</div>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => addMed(i)} disabled={i.current_stock <= 0}>Add</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="font-medium mb-2">Selected</h3>
              <div className="space-y-2">
                {selected.map(s => (
                  <div key={s.item.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.item.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(Number(s.item.sale_price))}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} className="w-20 rounded-xl border border-gray-300" value={s.quantity} onChange={e => updateQty(s.item.id, Number(e.target.value))} />
                      <div className="w-24 text-right">{formatCurrency(Number(s.item.sale_price) * s.quantity)}</div>
                    </div>
                  </div>
                ))}
                {selected.length === 0 && <div className="text-sm text-gray-500">No items added.</div>}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(Number(discount || 0))}</span></div>
                <div className="flex justify-between text-lg font-semibold"><span>Net</span><span>{formatCurrency(net)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={submitting}>Generate Dispense Bill</button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default PhysicianDispense;

