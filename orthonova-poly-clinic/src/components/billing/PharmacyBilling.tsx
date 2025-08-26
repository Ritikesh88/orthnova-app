import React, { useEffect, useMemo, useState } from 'react';
import { createBill, listInventoryItems, searchPatientsByContact } from '../../api';
import { BillItemRow, InventoryItemRow, PatientRow } from '../../types';
import { formatCurrency, generateBillNumber } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';

const MODES = ['Cash', 'UPI', 'Card'] as const;
type Mode = typeof MODES[number];

interface SelectedItem { 
  item: InventoryItemRow; 
  quantity: number; 
}

const PharmacyBilling: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  
  // Patient/guest management
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [patientMatches, setPatientMatches] = useState<PatientRow[]>([]);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  
  // Billing details
  const [discount, setDiscount] = useState(0);
  const [mode, setMode] = useState<Mode>('Cash');
  const [txnRef, setTxnRef] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await listInventoryItems();
      setInventory(data);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.manufacturer.toLowerCase().includes(q)
    );
  }, [inventory, query]);

  const addItem = (item: InventoryItemRow) => {
    if (item.current_stock <= 0) {
      setMessage('Item is out of stock');
      return;
    }
    
    setSelected(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > item.current_stock) {
          setMessage(`Only ${item.current_stock} items available in stock`);
          return prev;
        }
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: newQty } : p);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    const item = selected.find(s => s.item.id === id);
    if (!item) return;
    
    if (qty <= 0) {
      setSelected(prev => prev.filter(p => p.item.id !== id));
    } else if (qty > item.item.current_stock) {
      setMessage(`Only ${item.item.current_stock} items available in stock`);
    } else {
      setSelected(prev => prev.map(p => p.item.id === id ? { ...p, quantity: qty } : p));
    }
  };

  const onSearchPatient = async () => {
    setMessage(null);
    if (isGuest) return;
    
    try {
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
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const subtotal = useMemo(() => 
    selected.reduce((s, p) => s + Number(p.item.sale_price) * p.quantity, 0), 
    [selected]
  );
  
  const gstTotal = useMemo(() => 
    selected.reduce((s, p) => s + (Number(p.item.sale_price) * p.quantity * Number(p.item.gst_rate || 0) / 100), 0), 
    [selected]
  );
  
  const net = useMemo(() => 
    Math.max(0, subtotal + gstTotal - Number(discount || 0)), 
    [subtotal, gstTotal, discount]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setMessage(null);
    
    if ((!patientId && !isGuest) || selected.length === 0) { 
      setMessage('Select patient/guest and add at least one medicine'); 
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

    setSubmitting(true);
    try {
      const bill_number = generateBillNumber();
      const billInsert = {
        patient_id: isGuest ? null : patientId,
        doctor_id: null, // No doctor for medicine store bills
        total_amount: subtotal + gstTotal,
        discount: Number(discount || 0),
        net_amount: net,
        status,
        bill_number,
        mode_of_payment: mode,
        transaction_reference: (mode === 'UPI' || mode === 'Card') ? txnRef : null,
        guest_name: isGuest ? guestName.trim() : null,
        guest_contact: isGuest ? guestContact.trim() : null,
        bill_type: 'pharmacy',
        is_medicine_store_bill: true,
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
      setMessage('Medicine bill generated successfully');
      
      // Open print window
      const url = `${window.location.origin}/print/bill/${inserted.id}`;
      const win = window.open(url, '_blank'); 
      if (win) win.focus();
      
      // Reset form
      setSelected([]); 
      setDiscount(0); 
      setMode('Cash'); 
      setTxnRef(''); 
      setStatus('paid');
      setPatientId('');
      setSelectedPatient(null);
      setIsGuest(false);
      setGuestName('');
      setGuestContact('');
      setPatientSearch('');
      
      // Refresh inventory to update stock
      await loadInventory();
    } catch (e: any) { 
      setMessage(e.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Medicine Store Billing</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Patient/Guest Selection */}
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
                <button type="button" className="btn btn-secondary" onClick={onSearchPatient} disabled={isGuest}>
                  Search
                </button>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-gray-600">Patient Name</label>
                <input 
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50" 
                  value={selectedPatient?.name || ''} 
                  readOnly 
                  placeholder="No patient selected" 
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input 
                  id="guest-toggle" 
                  type="checkbox" 
                  checked={isGuest} 
                  onChange={e => { 
                    setIsGuest(e.target.checked); 
                    if (e.target.checked) { 
                      setSelectedPatient(null); 
                      setPatientId(''); 
                    } 
                  }} 
                />
                <label htmlFor="guest-toggle" className="text-sm">Bill for non-registered customer</label>
              </div>
              {isGuest && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="block text-sm font-medium">Customer Name</label>
                    <input 
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                      value={guestName} 
                      onChange={e => setGuestName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Customer Contact</label>
                    <input 
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                      value={guestContact} 
                      onChange={e => setGuestContact(e.target.value)} 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Discount (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                  value={discount} 
                  onChange={e => setDiscount(Number(e.target.value))} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Payment Mode</label>
                <select 
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                  value={mode} 
                  onChange={e => setMode(e.target.value as Mode)}
                >
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Status</label>
                <select 
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>

          {(mode === 'UPI' || mode === 'Card') && (
            <div>
              <label className="block text-sm font-medium">Transaction Reference</label>
              <input 
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                value={txnRef} 
                onChange={e => setTxnRef(e.target.value)} 
                required 
              />
            </div>
          )}

          {/* Medicine Selection and Billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Medicines</h3>
                <input 
                  placeholder="Search by name, SKU, category, manufacturer" 
                  className="rounded-xl border-gray-300" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {filtered.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-500">
                        {i.category} • {i.manufacturer} • {i.unit} • ₹{Number(i.sale_price).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Stock: {i.current_stock} • GST: {i.gst_rate || 0}%
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-secondary ml-2" 
                      onClick={() => addItem(i)} 
                      disabled={i.current_stock <= 0}
                    >
                      {i.current_stock <= 0 ? 'Out of Stock' : 'Add'}
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && <div className="text-sm text-gray-500 p-2">No medicines found.</div>}
              </div>
            </div>
            
            <div className="card p-4">
              <h3 className="font-medium mb-2">Selected Items</h3>
              <div className="space-y-2">
                {selected.map(s => (
                  <div key={s.item.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{s.item.name}</div>
                      <div className="text-xs text-gray-500">
                        ₹{Number(s.item.sale_price).toFixed(2)} × {s.quantity} = ₹{(Number(s.item.sale_price) * s.quantity).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        GST: ₹{((Number(s.item.sale_price) * s.quantity * Number(s.item.gst_rate || 0)) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min={0} 
                        max={s.item.current_stock}
                        className="w-20 rounded-xl border border-gray-300" 
                        value={s.quantity} 
                        onChange={e => updateQty(s.item.id, Number(e.target.value))} 
                      />
                      <div className="w-24 text-right">
                        ₹{((Number(s.item.sale_price) * s.quantity) + ((Number(s.item.sale_price) * s.quantity * Number(s.item.gst_rate || 0)) / 100)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                {selected.length === 0 && <div className="text-sm text-gray-500">No items added.</div>}
              </div>
              
              <div className="border-t border-gray-100 mt-3 pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>GST</span><span>₹{gstTotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium"><span>Gross Total</span><span>₹{(subtotal + gstTotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-₹{Number(discount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-semibold"><span>Net Amount</span><span>₹{net.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={submitting}>
              Generate Medicine Bill
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                const id = localStorage.getItem('orthonova_last_bill_id');
                if (!id) { 
                  setMessage('No recent bill to reprint'); 
                  return; 
                }
                const url = `${window.location.origin}/print/bill/${id}`;
                const win = window.open(url, '_blank'); 
                if (win) win.focus();
              }}
            >
              Reprint Last
            </button>
          </div>
          
          {message && (
            <p className={`text-sm mt-2 ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </form>
      </div>

      {/* Patient Selection Modal */}
      <Modal open={patientModalOpen} title="Select Patient" onClose={() => setPatientModalOpen(false)}>
        <div className="divide-y divide-gray-100">
          {patientMatches.map(p => (
            <div key={p.id} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {p.name} <span className="text-xs text-gray-500">({p.age} / {p.gender})</span>
                  </div>
                  <div className="text-xs text-gray-500">{p.id} • {p.contact}</div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { 
                    setPatientId(p.id); 
                    setSelectedPatient(p); 
                    setPatientModalOpen(false); 
                    setPatientMatches([]); 
                  }}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
          {patientMatches.length === 0 && <div className="py-4 text-sm text-gray-500">No matches.</div>}
        </div>
      </Modal>
    </div>
  );
};

export default PharmacyBilling;
