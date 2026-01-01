import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createMedicineStoreBill, getExpiringItemsWithinMonths, listDoctors, listInventoryItems, searchPatientsByContact } from '../../api';
import { BillItemRow, DoctorRow, InventoryItemRow, PatientRow } from '../../types';
import { formatCurrency } from '../../utils/format';
import { generatePharmacyBillNumber } from '../../utils/idGenerators';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';

const MODES = ['Cash', 'UPI', 'Card'] as const;
type Mode = typeof MODES[number];

interface SelectedItem { 
  item: InventoryItemRow; 
  quantity: number; 
}

const PharmacyBillingPage: React.FC = () => {
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
  const [discount, setDiscount] = useState(0); // percentage discount
  const [mode, setMode] = useState<Mode>('Cash');
  const [txnRef, setTxnRef] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  
  // Consultant (Referred by)
  const [referredBy, setReferredBy] = useState('');
  const [referredByOptions, setReferredByOptions] = useState<DoctorRow[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorRow[]>([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billSaved, setBillSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<string[]>([]);

  useEffect(() => {
    loadInventory();
    loadDoctors();
    checkExpiringItems();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await listInventoryItems();
      setInventory(data);
      checkExpiringItems(data);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const loadDoctors = async () => {
    try {
      const doctors = await listDoctors();
      setAllDoctors(doctors);
      setReferredByOptions(doctors);
    } catch (e: any) {
      console.error('Error loading doctors:', e);
      setMessage(`Error loading doctors: ${e.message}`);
    }
  };

  const handleDoctorSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setReferredBy(value);
    
    if (value.trim() === '') {
      setReferredByOptions(allDoctors);
    } else {
      const filtered = allDoctors.filter(doctor =>
        doctor.name.toLowerCase().includes(value.toLowerCase())
      );
      setReferredByOptions(filtered);
    }
    
    setShowDoctorDropdown(true);
  };

  const selectDoctor = (doctor: DoctorRow) => {
    setReferredBy(doctor.name);
    setShowDoctorDropdown(false);
  };

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target as Node)) {
        setShowDoctorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkExpiringItems = async (items?: InventoryItemRow[]) => {
    try {
      // Use the new API function to get items expiring within 4 months
      const expiringItems = await getExpiringItemsWithinMonths(4);
      
      const alerts = expiringItems.map(item => {
        const expiryDate = new Date(item.expiry_date!);
        const daysToExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return `${item.name} - expires in ${daysToExpiry} days`;
      });
      
      setExpiryAlerts(alerts);
      
      if (alerts.length > 0) {
        setMessage(`Warning: ${alerts.length} items are expiring within 4 months. ${alerts.slice(0, 2).join('; ')}` + (alerts.length > 2 ? '...' : ''));
      }
    } catch (e: any) {
      console.error('Error checking expiry items:', e);
      setMessage(`Error checking expiry items: ${e.message}`);
    }
  };

  const toggleExpiryAlerts = () => {
    if (expiryAlerts.length > 0) {
      setMessage(null);
      setExpiryAlerts([]);
    } else {
      checkExpiringItems();
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
  
  // GST is removed, so gstTotal is always 0
  const gstTotal = 0;
  
  const net = useMemo(() => {
    const discountAmount = (subtotal * discount) / 100;
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discount]);

  const onSave = async (e: React.FormEvent) => {
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

    setSaving(true);
    try {
      // Find the selected doctor by name
      const selectedDoctor = allDoctors.find(doctor => doctor.name === referredBy);
      
      const billInsert = {
        patient_id: isGuest ? null : patientId,
        doctor_id: selectedDoctor?.id || null, // Use doctor ID if a registered doctor is selected
        total_amount: subtotal,
        discount: (subtotal * discount) / 100, // actual discount amount
        net_amount: net,
        status: 'pending', // Draft status
        bill_number: null, // Will be generated when bill is finalized
        mode_of_payment: mode,
        transaction_reference: (mode === 'UPI' || mode === 'Card') ? txnRef : null,
        guest_name: isGuest ? guestName.trim() : null,
        guest_contact: isGuest ? guestContact.trim() : null,
        bill_type: 'pharmacy',
        is_medicine_store_bill: true,
        created_at: new Date().toISOString(),
        referred_by: referredBy || null,

      } as const;

      const itemsInsert: Array<Omit<BillItemRow, 'id'>> = selected.map(s => {
        const itemTotal = Number(s.item.sale_price) * s.quantity;
        
        return {
          bill_id: '',
          inventory_item_id: s.item.id,
          item_name: s.item.name,
          quantity: s.quantity,
          price: Number(s.item.sale_price),
          total: itemTotal,
          batch_number: s.item.batch_number || null,
          expiry_date: s.item.expiry_date || null,

        };
      });

      const inserted = await createMedicineStoreBill(billInsert as any, itemsInsert, user?.userId);
      setMessage('Medicine bill saved as draft successfully');
      setBillSaved(true);
      
      // Optionally, store the draft bill ID for later use
      localStorage.setItem('orthonova_draft_bill_id', inserted.id);
    } catch (e: any) { 
      setMessage(e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setMessage(null);
    
    if (!billSaved) {
      setMessage('Please save the bill first before generating');
      return;
    }
    
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
      const bill_number = await generatePharmacyBillNumber();
      const discountAmount = (subtotal * discount) / 100;
      
      // Find the selected doctor by name
      const selectedDoctor = allDoctors.find(doctor => doctor.name === referredBy);
      
      const billInsert = {
        patient_id: isGuest ? null : patientId,
        doctor_id: selectedDoctor?.id || null, // Use doctor ID if a registered doctor is selected
        total_amount: subtotal,
        discount: discountAmount, // actual discount amount
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

      const itemsInsert: Array<Omit<BillItemRow, 'id'>> = selected.map(s => {
        const itemTotal = Number(s.item.sale_price) * s.quantity;
        
        return {
          bill_id: '',
          inventory_item_id: s.item.id,
          item_name: s.item.name,
          quantity: s.quantity,
          price: Number(s.item.sale_price),
          total: itemTotal,
          batch_number: s.item.batch_number || null,
          expiry_date: s.item.expiry_date || null,

        };
      });

      const inserted = await createMedicineStoreBill(billInsert as any, itemsInsert, user?.userId);
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
      setReferredBy('');
      setBillSaved(false); // Reset the saved state
      
      // Refresh inventory to update stock
      await loadInventory();
    } catch (e: any) { 
      setMessage(e.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleResetForm = () => {
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
    setReferredBy('');
    setMessage(null);
    setBillSaved(false); // Reset the saved state
  };

  // Get available batches for an item
  const getAvailableBatches = (itemId: string) => {
    // In the current implementation, we only have the main inventory item
    // In a real system, you would fetch from stock_purchase_items table
    // to get different batches for the same medicine
    const item = inventory.find(i => i.id === itemId);
    if (!item) return [];
      
    // Return the main inventory item as a single batch
    return [{
      id: item.id,
      batch_number: item.batch_number || 'N/A',
      expiry_date: item.expiry_date,
      available_stock: item.current_stock
    }];
  };
    
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Pharmacy Billing</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Patient Search and Name */}
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
            </div>
              
            {/* Referred Doctor Name */}
            <div className="relative" ref={doctorDropdownRef}>
              <label className="block text-sm font-medium">Referred Doctor Name</label>
              <input 
                type="text" 
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500" 
                value={referredBy} 
                onChange={handleDoctorSearch}
                onFocus={() => setShowDoctorDropdown(true)}
                placeholder="Search doctor name"
              />
              {showDoctorDropdown && referredByOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {referredByOptions.map(doctor => (
                    <div 
                      key={doctor.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => selectDoctor(doctor)}
                    >
                      {doctor.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            
          {/* Patient Guest Toggle */}
          <div className="flex items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
          {/* Medicine Search */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Search Medicines</h3>
              <input 
                placeholder="Search by name, SKU, category, manufacturer" 
                className="rounded-xl border-gray-300" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
              />
            </div>
            {query && (
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 mb-4">
                {filtered.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-500">
                        {i.category} • {i.manufacturer} • {i.unit} • ₹{Number(i.sale_price).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Stock: {i.current_stock} • Batch: {i.batch_number || 'N/A'} • Exp: {i.expiry_date || 'N/A'}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-secondary ml-2" 
                      onClick={() => {
                        addItem(i);
                        setQuery(''); // Clear search after adding
                      }}
                      disabled={i.current_stock <= 0}
                    >
                      {i.current_stock <= 0 ? 'Out of Stock' : 'Add'}
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && <div className="text-sm text-gray-500 p-2">No medicines found.</div>}
              </div>
            )}
          </div>
            
          {/* Selected Items with Batch Selection */}
          <div className="card p-4">
            <h3 className="font-medium mb-2">Selected Items</h3>
            <div className="space-y-2">
              {selected.map(s => {
                const availableBatches = getAvailableBatches(s.item.id);
                return (
                  <div key={s.item.id} className="border border-gray-200 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{s.item.name}</div>
                        <div className="text-xs text-gray-500">
                          ₹{Number(s.item.sale_price).toFixed(2)} × {s.quantity} = ₹{(Number(s.item.sale_price) * s.quantity).toFixed(2)}
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
                        <button 
                          type="button" 
                          className="text-red-600 hover:text-red-800"
                          onClick={() => setSelected(prev => prev.filter(p => p.item.id !== s.item.id))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                      
                    {/* Batch and Expiry Information */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-600">Batch</label>
                        <div className="text-sm">{s.item.batch_number || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Exp. Date</label>
                        <div className="text-sm">{s.item.expiry_date || 'N/A'}</div>
                      </div>
                    </div>
                      

                  </div>
                );
              })}
              {selected.length === 0 && <div className="text-sm text-gray-500">No items added.</div>}
            </div>
              
            <div className="border-t border-gray-100 mt-3 pt-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium"><span>Gross Total</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-₹{((subtotal * discount) / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-semibold"><span>Net Amount</span><span>₹{net.toFixed(2)}</span></div>
            </div>
          </div>
          
          {/* Discount and Payment Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Discount (%)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
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
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}</select>
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



          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={onSave}>Save</button>
            <button className="btn btn-primary" disabled={submitting}>
              Generate Medicine Bill
            </button>
            <button type="button" className="btn btn-outline" onClick={handleResetForm}>Reset</button>
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
            <p className={`text-sm mt-2 ${message.includes('successfully') ? 'text-green-600' : message.includes('Warning') ? 'text-yellow-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          {expiryAlerts.length > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800">Expiring Items (within 4 months):</h4>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc pl-5 space-y-1">
                    {expiryAlerts.map((alert, index) => (
                      <li key={index}>{alert}</li>
                    ))}
                  </ul>
                </div>
                <button 
                  type="button" 
                  className="ml-2 text-yellow-700 hover:text-yellow-900"
                  onClick={toggleExpiryAlerts}
                >
                  Clear
                </button>
              </div>
            </div>
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
                  <div className="text-xs text-gray-500">{p.patient_id} • {p.contact}</div>
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

export default PharmacyBillingPage;