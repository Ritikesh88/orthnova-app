import { supabase } from '../lib/supabaseClient';
import {
  BillItemRow,
  BillRow,
  DoctorRow,
  InventoryItemRow,
  PatientRow,
  PrescriptionRow,
  ServiceRow,
  StockLedgerRow,
  UserRow,
  AppointmentRow,
} from '../types';

async function throwIfError<T>(res: { data: T | null; error: any }) {
  if (res.error) throw new Error(res.error.message || 'Unknown Supabase error');
  return res.data as T;
}

// Users
export async function listUsers(): Promise<UserRow[]> {
  const res = await supabase.from('users').select('*').order('created_at', { ascending: false });
  return throwIfError<UserRow[]>(res);
}
export async function addUser(user: { user_id: string; password: string; role: UserRow['role'] }): Promise<UserRow> {
  const res = await supabase.from('users').insert(user).select('*').single();
  return throwIfError<UserRow>(res);
}
export async function updateUser(user_id: string, updates: Partial<Pick<UserRow, 'password' | 'role'>>): Promise<UserRow> {
  const res = await supabase.from('users').update(updates).eq('user_id', user_id).select('*').single();
  return throwIfError<UserRow>(res);
}
export async function deleteUser(user_id: string): Promise<void> {
  const res = await supabase.from('users').delete().eq('user_id', user_id);
  await throwIfError(res as any);
}

// Patients
export async function createPatient(row: Omit<PatientRow, 'created_at'>): Promise<PatientRow> {
  const res = await supabase.from('patients').insert(row).select('*').single();
  return throwIfError<PatientRow>(res);
}
export async function listPatients(query?: string): Promise<PatientRow[]> {/** keep name search */
  let q = supabase.from('patients').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.ilike('name', like);
  }
  const res = await q;
  return throwIfError<PatientRow[]>(res);
}
export async function getPatientById(id: string): Promise<PatientRow | null> {
  const res = await supabase.from('patients').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}
export async function searchPatientsByContact(contact: string): Promise<PatientRow[]> {
  const clean = (contact || '').replace(/\D/g, '');
  if (!clean) return [];
  const res = await supabase.from('patients').select('*').ilike('contact', `%${clean}%`).order('created_at', { ascending: false });
  return throwIfError<PatientRow[]>(res);
}

// Doctors
export async function createDoctor(row: Omit<DoctorRow, 'created_at'>): Promise<DoctorRow> {
  const res = await supabase.from('doctors').insert(row).select('*').single();
  return throwIfError<DoctorRow>(res);
}
export async function listDoctors(query?: string): Promise<DoctorRow[]> {
  let q = supabase.from('doctors').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.ilike('name', like);
  }
  const res = await q;
  return throwIfError<DoctorRow[]>(res);
}
export async function getDoctorById(id: string): Promise<DoctorRow | null> {
  const res = await supabase.from('doctors').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

// Services
export async function addService(row: Omit<ServiceRow, 'id' | 'created_at'>): Promise<ServiceRow> {
  const res = await supabase.from('services').insert(row).select('*').single();
  return throwIfError<ServiceRow>(res);
}
export async function updateService(id: string, updates: Partial<Omit<ServiceRow, 'id' | 'created_at'>>): Promise<ServiceRow> {
  const res = await supabase.from('services').update(updates).eq('id', id).select('*').single();
  return throwIfError<ServiceRow>(res);
}
export async function deleteService(id: string): Promise<void> {
  const res = await supabase.from('services').delete().eq('id', id);
  await throwIfError(res as any);
}
export async function listServices(query?: string): Promise<ServiceRow[]> {
  let q = supabase.from('services').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.or(`service_name.ilike.${like},service_type.ilike.${like}`);
  }
  const res = await q;
  return throwIfError<ServiceRow[]>(res);
}

// Bills
export async function createBill(
  bill: Omit<BillRow, 'id' | 'created_at'>,
  items: Array<Omit<BillItemRow, 'id'>>
): Promise<BillRow> {
  const billRes = await supabase.from('bills').insert(bill).select('*').single();
  const insertedBill = await throwIfError<BillRow>(billRes);
  if (items.length > 0) {
    const itemsToInsert = items.map((it) => ({ ...it, bill_id: insertedBill.id }));
    const itemsRes = await supabase.from('bill_items').insert(itemsToInsert).select('*');
    await throwIfError<BillItemRow[]>(itemsRes);
  }
  return insertedBill;
}

export async function getBillById(id: string): Promise<BillRow | null> {
  const res = await supabase.from('bills').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

export async function listBills(): Promise<BillRow[]> {
  const res = await supabase.from('bills').select('*').order('created_at', { ascending: false });
  return throwIfError<BillRow[]>(res);
}

export async function listBillItems(billId: string): Promise<BillItemRow[]> {
  const res = await supabase.from('bill_items').select('*').eq('bill_id', billId);
  return throwIfError<BillItemRow[]>(res);
}

// Inventory
export async function listInventoryItems(query?: string): Promise<InventoryItemRow[]> {
  let q = supabase.from('inventory_items').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.ilike('name', like);
  }
  const res = await q;
  return throwIfError<InventoryItemRow[]>(res);
}

export async function createInventoryItem(row: Omit<InventoryItemRow, 'id' | 'created_at' | 'current_stock'>): Promise<InventoryItemRow> {
  const payload = { 
    ...row, 
    current_stock: row.opening_stock,
    // Ensure all required fields are present
    category: row.category || 'Other',
    manufacturer: row.manufacturer || 'Unknown',
    expiry_date: row.expiry_date || null,
    batch_number: row.batch_number || null,
    hsn_code: row.hsn_code || null,
    gst_rate: row.gst_rate || 18
  } as any;
  const res = await supabase.from('inventory_items').insert(payload).select('*').single();
  return throwIfError<InventoryItemRow>(res);
}

export async function updateInventoryItem(id: string, updates: Partial<Omit<InventoryItemRow, 'id' | 'created_at'>>): Promise<InventoryItemRow> {
  const res = await supabase.from('inventory_items').update(updates).eq('id', id).select('*').single();
  return throwIfError<InventoryItemRow>(res);
}

export async function adjustStock(
  item_id: string,
  change: number,
  reason: StockLedgerRow['reason'],
  opts?: { notes?: string | null; reference_bill_id?: string | null; created_by?: string | null }
): Promise<{ item: InventoryItemRow; ledger: StockLedgerRow }> {
  const ledgerInsert = {
    item_id,
    change,
    reason,
    notes: opts?.notes ?? null,
    reference_bill_id: opts?.reference_bill_id ?? null,
    created_by: opts?.created_by ?? null,
    created_at: new Date().toISOString(),
  } as const;
  const ledgerRes = await supabase.from('stock_ledger').insert(ledgerInsert as any).select('*').single();
  const ledger = await throwIfError<StockLedgerRow>(ledgerRes);
  const itemRes = await supabase.rpc('increment_inventory_stock', { p_item_id: item_id, p_delta: change });
  await throwIfError(itemRes as any);
  const latest = await supabase.from('inventory_items').select('*').eq('id', item_id).single();
  const item = await throwIfError<InventoryItemRow>(latest);
  return { item, ledger };
}

// Medicine Store specific functions
export async function createMedicineStoreBill(
  bill: Omit<BillRow, 'id' | 'created_at'>,
  items: Array<Omit<BillItemRow, 'id'>>,
  createdBy?: string
): Promise<BillRow> {
  const billRes = await supabase.from('bills').insert(bill).select('*').single();
  const insertedBill = await throwIfError<BillRow>(billRes);
  
  if (items.length > 0) {
    const itemsToInsert = items.map((it) => ({ ...it, bill_id: insertedBill.id }));
    const itemsRes = await supabase.from('bill_items').insert(itemsToInsert).select('*');
    await throwIfError<BillItemRow[]>(itemsRes);
    
    // Update stock for each item
    for (const item of items) {
      if (item.inventory_item_id) {
        await adjustStock(
          item.inventory_item_id, 
          -item.quantity, 
          'dispense', 
          { 
            reference_bill_id: insertedBill.id, 
            created_by: createdBy || null,
            notes: `Sold in bill ${insertedBill.bill_number}`
          }
        );
      }
    }
  }
  
  return insertedBill;
}

export async function getLowStockItems(): Promise<InventoryItemRow[]> {
  const res = await supabase
    .from('inventory_items')
    .select('*')
    .not('low_stock_threshold', 'is', null)
    .filter('current_stock', 'lte', 'low_stock_threshold')
    .order('current_stock', { ascending: true });
  return throwIfError<InventoryItemRow[]>(res);
}

export async function getExpiringItems(days: number = 30): Promise<InventoryItemRow[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const res = await supabase
    .from('inventory_items')
    .select('*')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true });
  return throwIfError<InventoryItemRow[]>(res);
}

// Prescriptions
export async function createPrescription(row: Omit<PrescriptionRow, 'id' | 'created_at'>): Promise<PrescriptionRow> {
  const res = await supabase.from('prescriptions').insert(row).select('*').single();
  return throwIfError<PrescriptionRow>(res);
}
export async function getPrescriptionById(id: string): Promise<PrescriptionRow | null> {
  const res = await supabase.from('prescriptions').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}
export async function listPrescriptions(): Promise<PrescriptionRow[]> {
  const res = await supabase.from('prescriptions').select('*').order('created_at', { ascending: false });
  return throwIfError<PrescriptionRow[]>(res);
}

// Appointments
export async function createAppointment(row: Omit<AppointmentRow, 'id' | 'created_at'>): Promise<AppointmentRow> {
  const res = await supabase.from('appointments').insert(row).select('*').single();
  return throwIfError<AppointmentRow>(res);
}
export async function listAppointments(filters?: { doctor_id?: string; patient_id?: string }): Promise<AppointmentRow[]> {
  let q = supabase.from('appointments').select('*').order('created_at', { ascending: true });
  if (filters?.doctor_id) q = q.eq('doctor_id', filters.doctor_id);
  if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
  const res = await q;
  return throwIfError<AppointmentRow[]>(res);
}