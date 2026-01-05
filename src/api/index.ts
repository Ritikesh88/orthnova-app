import { supabase } from '../lib/supabaseClient';
import {
  BillItemRow,
  BillRow,
  DoctorRow,
  DoctorAvailabilityRow,
  InventoryItemRow,
  PatientRow,
  PrescriptionRow,
  ServiceRow,
  StockLedgerRow,
  UserRow,
  AppointmentRow,
  StockPurchaseRow,
  StockPurchaseItemRow,
  PathologyTestRow,
  PathologyTestOrderRow,
  PathologyTestResultRow,
  PathologyReportRow
} from '../types';
import { generatePrescriptionSerialNumber, generateBillNumber, generatePharmacyBillNumber } from '../utils/idGenerators';

async function throwIfError<T>(res: { data: T | null; error: any }) {
  if (res.error) throw new Error(res.error.message || 'Unknown Supabase error');
  return res.data as T;
}

async function getUserIdByUserId(userId: string): Promise<string | null> {
  const res = await supabase.from('users').select('id').eq('user_id', userId).single();
  if (res.error) return null;
  return res.data?.id || null;
}

// Users
export async function listUsers(): Promise<UserRow[]> {
  const res = await supabase.from('users').select('*').order('created_at', { ascending: false });
  return throwIfError<UserRow[]>(res);
}

export async function addUser(user: { 
  user_id: string; 
  password: string; 
  role: UserRow['role'];
}): Promise<UserRow> {
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

export async function checkPatientExists(name: string, contact: string): Promise<PatientRow | null> {
  // First, search by contact to get potential matches
  const contactMatches = await searchPatientsByContact(contact);
  
  // Then check if any of the contact matches also have the same name
  const matchingPatient = contactMatches.find(patient => 
    patient.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  
  return matchingPatient || null;
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

export async function updateDoctor(id: string, updates: Partial<Omit<DoctorRow, 'id' | 'created_at' | 'doctor_id'>>): Promise<DoctorRow> {
  const res = await supabase.from('doctors').update(updates).eq('id', id).select('*').single();
  return throwIfError<DoctorRow>(res);
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
  // First check if the service is being used in any bill items
  const usageCheck = await supabase
    .from('bill_items')
    .select('id')
    .eq('service_id', id)
    .limit(1);
  
  if (usageCheck.error) {
    throw new Error(usageCheck.error.message || 'Failed to check service usage');
  }
  
  // If there are any bill items using this service, we can't delete it
  if (usageCheck.data && usageCheck.data.length > 0) {
    throw new Error('Cannot delete service because it is being used in existing bills. To delete this service, first delete all bills that use this service.');
  }
  
  // If no bills are using this service, we can safely delete it
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
  bill: Omit<BillRow, 'id' | 'created_at' | 'bill_number'> & { bill_number?: string | null },
  items: Array<Omit<BillItemRow, 'id'>>
): Promise<BillRow> {
  // If bill_number is null or explicitly provided as null, treat as draft
  const bill_number = bill.bill_number !== undefined ? bill.bill_number : await generateBillNumber();
  const billWithNumber = { ...bill, bill_number };
  const billRes = await supabase.from('bills').insert(billWithNumber).select('*').single();
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
  if (res.error) {
    console.error('Error fetching bills:', res.error);
    throw new Error(res.error.message || 'Failed to fetch bills. Please check database permissions.');
  }
  console.log('Bills fetched:', res.data?.length || 0);
  return res.data || [];
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
  bill: Omit<BillRow, 'id' | 'created_at' | 'bill_number'> & { bill_number?: string | null },
  items: Array<Omit<BillItemRow, 'id'>>,
  createdBy?: string
): Promise<BillRow> {
  // If bill_number is null or explicitly provided as null, treat as draft
  const bill_number = bill.bill_number !== undefined ? bill.bill_number : (bill.bill_type === 'pharmacy' ? await generatePharmacyBillNumber() : await generateBillNumber());
  const billWithNumber = { ...bill, bill_number };
  const billRes = await supabase.from('bills').insert(billWithNumber).select('*').single();
  const insertedBill = await throwIfError<BillRow>(billRes);
  
  // Get the actual user UUID if a user_id string is provided
  let actualUserId: string | null = null;
  if (createdBy) {
    actualUserId = await getUserIdByUserId(createdBy);
  }
  
  if (items.length > 0) {
    const itemsToInsert = items.map((it) => ({ ...it, bill_id: insertedBill.id }));
    const itemsRes = await supabase.from('bill_items').insert(itemsToInsert).select('*');
    await throwIfError<BillItemRow[]>(itemsRes);
    
    // Update stock for each item only if not a draft
    if (bill_number) { // Only update stock if it's not a draft (has a bill number)
      for (const item of items) {
        if (item.inventory_item_id) {
          await adjustStock(
            item.inventory_item_id, 
            -item.quantity, 
            'dispense', 
            { 
              reference_bill_id: insertedBill.id, 
              created_by: actualUserId || null,
              notes: `Sold in bill ${insertedBill.bill_number}`
            }
          );
        }
      }
    }
  }
  
  return insertedBill;
}

export interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  low_stock_threshold: number;
  category: string;
  manufacturer: string;
}

export async function getLowStockItems(): Promise<LowStockItem[]> {
  // Fetch all inventory items and filter on the client side
  // since Supabase filter doesn't work with column-to-column comparisons
  const res = await supabase
    .from('inventory_items')
    .select('*');
  
  const items = await throwIfError<InventoryItemRow[]>(res);
  
  // Filter items with low stock on the client side
  const lowStockItems: LowStockItem[] = items
    .filter(item => 
      item.low_stock_threshold !== null && 
      item.current_stock <= item.low_stock_threshold
    )
    .map(item => ({
      id: item.id,
      name: item.name,
      current_stock: item.current_stock,
      low_stock_threshold: item.low_stock_threshold!,
      category: item.category,
      manufacturer: item.manufacturer
    }))
    .sort((a, b) => a.current_stock - b.current_stock);
    
  return lowStockItems;
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

export async function getExpiringItemsWithinMonths(months: number = 4): Promise<InventoryItemRow[]> {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + months);
  
  const res = await supabase
    .from('inventory_items')
    .select('*')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true });
  return throwIfError<InventoryItemRow[]>(res);
}

// Prescriptions

export async function createPrescription(row: Omit<PrescriptionRow, 'id' | 'created_at' | 'serial_number'>): Promise<PrescriptionRow> {
  // Check if a prescription already exists for this patient with the same doctor today
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  // Look for existing prescriptions for this patient with the same doctor today
  const { data: existingPrescriptions, error } = await supabase
    .from('prescriptions')
    .select('serial_number')
    .eq('patient_id', row.patient_id)
    .eq('doctor_id', row.doctor_id)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: true })
    .limit(1);
  
  let serial_number: string;
  if (error) {
    // If there's an error fetching existing prescriptions, generate a new one
    serial_number = await generatePrescriptionSerialNumber();
  } else if (existingPrescriptions && existingPrescriptions.length > 0) {
    // A prescription already exists for this patient with the same doctor today, throw an error to show warning
    throw new Error('Duplicate Prescription Requested ! Check Patient Visit History for Reprint');
  } else {
    // No existing prescription for this patient with this doctor today, generate a new serial number
    serial_number = await generatePrescriptionSerialNumber();
  }
  
  const res = await supabase.from('prescriptions').insert({...row, serial_number, visit_type: row.visit_type || 'walk-in'}).select('*').single();
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

export async function listAppointments(filters?: { doctor_id?: string; patient_id?: string; appointment_date?: string; appointment_date_exact?: string }): Promise<AppointmentRow[]> {
  let q = supabase.from('appointments').select('*').order('created_at', { ascending: true });
  if (filters?.doctor_id) q = q.eq('doctor_id', filters.doctor_id);
  if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
  if (filters?.appointment_date) q = q.eq('appointment_date', filters.appointment_date);
  // Filter by exact date using appointment_datetime when available
  if (filters?.appointment_date_exact) {
    const startOfDay = `${filters.appointment_date_exact}T00:00:00`;
    const endOfDay = `${filters.appointment_date_exact}T23:59:59`;
    q = q.or(
      `and(appointment_datetime.gte.${startOfDay},appointment_datetime.lte.${endOfDay}),` +
      `appointment_date.eq.${filters.appointment_date_exact}`
    );
  }
  const res = await q;
  return throwIfError<AppointmentRow[]>(res);
}

export async function updateAppointment(id: string, updates: Partial<Omit<AppointmentRow, 'id' | 'created_at'>>): Promise<AppointmentRow> {
  const res = await supabase.from('appointments').update(updates).eq('id', id).select('*').single();
  return throwIfError<AppointmentRow>(res);
}

// Reports
export interface SalesSummary {
  date: string;
  total_bills: number;
  total_amount: number;
  total_discount: number;
  net_amount: number;
}

export interface DoctorSalesReport {
  doctor_id: string;
  doctor_name: string;
  total_bills: number;
  total_amount: number;
  total_discount: number;
  net_amount: number;
}

export interface ServiceSalesReport {
  service_id: string | null;
  service_name: string;
  total_quantity: number;
  total_amount: number;
}

export async function getSalesSummary(startDate: string, endDate: string, groupBy: 'day' | 'month' = 'day'): Promise<SalesSummary[]> {
  const res = await supabase
    .from('bills')
    .select('created_at, net_amount, discount, total_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (res.error) throw new Error(res.error.message);

  const bills = res.data || [];
  const grouped: Record<string, SalesSummary> = {};

  bills.forEach(bill => {
    const date = new Date(bill.created_at);
    let key: string;
    
    if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        total_bills: 0,
        total_amount: 0,
        total_discount: 0,
        net_amount: 0,
      };
    }

    grouped[key].total_bills += 1;
    grouped[key].total_amount += Number(bill.total_amount || 0);
    grouped[key].total_discount += Number(bill.discount || 0);
    grouped[key].net_amount += Number(bill.net_amount || 0);
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDoctorSalesReport(startDate: string, endDate: string): Promise<DoctorSalesReport[]> {
  const res = await supabase
    .from('bills')
    .select('doctor_id, net_amount, discount, total_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('doctor_id', 'is', null)
    .order('created_at', { ascending: false });

  if (res.error) throw new Error(res.error.message);

  const bills = res.data || [];
  const doctorMap: Record<string, DoctorSalesReport> = {};
  const doctorIds = new Set(bills.map(b => b.doctor_id).filter(Boolean));

  // Fetch doctor names
  if (doctorIds.size > 0) {
    const doctorsRes = await supabase
      .from('doctors')
      .select('id, name')
      .in('id', Array.from(doctorIds));
    
    if (!doctorsRes.error && doctorsRes.data) {
      const doctorsMap: Record<string, string> = {};
      doctorsRes.data.forEach((d: any) => {
        doctorsMap[d.id] = d.name;
      });

      bills.forEach(bill => {
        const doctorId = bill.doctor_id;
        if (!doctorId) return;

        if (!doctorMap[doctorId]) {
          doctorMap[doctorId] = {
            doctor_id: doctorId,
            doctor_name: doctorsMap[doctorId] || 'Unknown',
            total_bills: 0,
            total_amount: 0,
            total_discount: 0,
            net_amount: 0,
          };
        }

        doctorMap[doctorId].total_bills += 1;
        doctorMap[doctorId].total_amount += Number(bill.total_amount || 0);
        doctorMap[doctorId].total_discount += Number(bill.discount || 0);
        doctorMap[doctorId].net_amount += Number(bill.net_amount || 0);
      });
    }
  }

  return Object.values(doctorMap).sort((a, b) => b.net_amount - a.net_amount);
}

export interface BillDetail {
  id: string;
  bill_number: string;
  patient_id: string | null;
  patient_name: string | null;
  guest_name: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  total_amount: number;
  discount: number;
  net_amount: number;
  created_at: string;
  status: string;
  mode_of_payment: string;
}

export async function getBillsByDate(date: string): Promise<BillDetail[]> {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const res = await supabase
    .from('bills')
    .select('id, bill_number, patient_id, guest_name, doctor_id, total_amount, discount, net_amount, created_at, status, mode_of_payment')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: false });

  if (res.error) throw new Error(res.error.message);

  const bills = res.data || [];
  const doctorIds = new Set(bills.map(b => b.doctor_id).filter(Boolean));
  const patientIds = new Set(bills.map(b => b.patient_id).filter(Boolean));

  let doctorsMap: Record<string, string> = {};
  let patientsMap: Record<string, string> = {};

  if (doctorIds.size > 0) {
    const doctorsRes = await supabase
      .from('doctors')
      .select('id, name')
      .in('id', Array.from(doctorIds));
    
    if (!doctorsRes.error && doctorsRes.data) {
      doctorsRes.data.forEach((d: any) => {
        doctorsMap[d.id] = d.name;
      });
    }
  }

  if (patientIds.size > 0) {
    const patientsRes = await supabase
      .from('patients')
      .select('id, name')
      .in('id', Array.from(patientIds));
    
    if (!patientsRes.error && patientsRes.data) {
      patientsRes.data.forEach((p: any) => {
        patientsMap[p.id] = p.name;
      });
    }
  }

  return bills.map(bill => ({
    ...bill,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    doctor_name: bill.doctor_id ? (doctorsMap[bill.doctor_id] || 'Unknown') : null,
  }));
}

export async function getBillsByMonth(year: number, month: number): Promise<BillDetail[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59`;

  const res = await supabase
    .from('bills')
    .select('id, bill_number, patient_id, guest_name, doctor_id, total_amount, discount, net_amount, created_at, status, mode_of_payment')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (res.error) throw new Error(res.error.message);

  const bills = res.data || [];
  const doctorIds = new Set(bills.map(b => b.doctor_id).filter(Boolean));
  const patientIds = new Set(bills.map(b => b.patient_id).filter(Boolean));

  let doctorsMap: Record<string, string> = {};
  let patientsMap: Record<string, string> = {};

  if (doctorIds.size > 0) {
    const doctorsRes = await supabase
      .from('doctors')
      .select('id, name')
      .in('id', Array.from(doctorIds));
    
    if (!doctorsRes.error && doctorsRes.data) {
      doctorsRes.data.forEach((d: any) => {
        doctorsMap[d.id] = d.name;
      });
    }
  }

  if (patientIds.size > 0) {
    const patientsRes = await supabase
      .from('patients')
      .select('id, name')
      .in('id', Array.from(patientIds));
    
    if (!patientsRes.error && patientsRes.data) {
      patientsRes.data.forEach((p: any) => {
        patientsMap[p.id] = p.name;
      });
    }
  }

  return bills.map(bill => ({
    ...bill,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    doctor_name: bill.doctor_id ? (doctorsMap[bill.doctor_id] || 'Unknown') : null,
  }));
}

export async function getBillsByDoctor(doctorId: string, startDate: string, endDate: string): Promise<BillDetail[]> {
  const res = await supabase
    .from('bills')
    .select('id, bill_number, patient_id, guest_name, doctor_id, total_amount, discount, net_amount, created_at, status, mode_of_payment')
    .eq('doctor_id', doctorId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (res.error) throw new Error(res.error.message);

  const bills = res.data || [];
  const patientIds = new Set(bills.map(b => b.patient_id).filter(Boolean));

  const doctorRes = await supabase
    .from('doctors')
    .select('name')
    .eq('id', doctorId)
    .single();

  const doctorName = doctorRes.data?.name || 'Unknown';

  let patientsMap: Record<string, string> = {};
  if (patientIds.size > 0) {
    const patientsRes = await supabase
      .from('patients')
      .select('id, name')
      .in('id', Array.from(patientIds));
    
    if (!patientsRes.error && patientsRes.data) {
      patientsRes.data.forEach((p: any) => {
        patientsMap[p.id] = p.name;
      });
    }
  }

  return bills.map(bill => ({
    ...bill,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    doctor_name: doctorName,
  }));
}

export async function getBillsByDateRange(startDate: string, endDate: string): Promise<BillDetail[]> {
  const startOfDay = `${startDate}T00:00:00`;
  const endOfDay = `${endDate}T23:59:59`;

  const res = await supabase
    .from('bills')
    .select('id, bill_number, patient_id, guest_name, doctor_id, total_amount, discount, net_amount, created_at, status, mode_of_payment')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: false });

  if (res.error) throw new Error(res.error.message);

  const bills = res.data || [];
  const doctorIds = new Set(bills.map(b => b.doctor_id).filter(Boolean));
  const patientIds = new Set(bills.map(b => b.patient_id).filter(Boolean));

  let doctorsMap: Record<string, string> = {};
  let patientsMap: Record<string, string> = {};

  if (doctorIds.size > 0) {
    const doctorsRes = await supabase
      .from('doctors')
      .select('id, name')
      .in('id', Array.from(doctorIds));
    
    if (!doctorsRes.error && doctorsRes.data) {
      doctorsRes.data.forEach((d: any) => {
        doctorsMap[d.id] = d.name;
      });
    }
  }

  if (patientIds.size > 0) {
    const patientsRes = await supabase
      .from('patients')
      .select('id, name')
      .in('id', Array.from(patientIds));
    
    if (!patientsRes.error && patientsRes.data) {
      patientsRes.data.forEach((p: any) => {
        patientsMap[p.id] = p.name;
      });
    }
  }

  return bills.map(bill => ({
    ...bill,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    doctor_name: bill.doctor_id ? (doctorsMap[bill.doctor_id] || 'Unknown') : null,
  }));
}

export async function getServiceSalesReport(startDate: string, endDate: string): Promise<ServiceSalesReport[]> {
  // Get bill items within date range
  const billsRes = await supabase
    .from('bills')
    .select('id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (billsRes.error) throw new Error(billsRes.error.message);

  const billIds = (billsRes.data || []).map(b => b.id);
  
  if (billIds.length === 0) return [];

  const itemsRes = await supabase
    .from('bill_items')
    .select('service_id, item_name, quantity, total')
    .in('bill_id', billIds)
    .not('service_id', 'is', null);

  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const items = itemsRes.data || [];
  const serviceMap: Record<string, ServiceSalesReport> = {};

  items.forEach(item => {
    const serviceId = item.service_id || 'other';
    const serviceName = item.item_name || 'Unknown Service';

    if (!serviceMap[serviceId]) {
      serviceMap[serviceId] = {
        service_id: serviceId,
        service_name: serviceName,
        total_quantity: 0,
        total_amount: 0,
      };
    }

    serviceMap[serviceId].total_quantity += Number(item.quantity || 0);
    serviceMap[serviceId].total_amount += Number(item.total || 0);
  });

  // Fetch actual service names from services table
  const serviceIds = Object.keys(serviceMap).filter(id => id !== 'other');
  if (serviceIds.length > 0) {
    const servicesRes = await supabase
      .from('services')
      .select('id, service_name')
      .in('id', serviceIds);

    if (!servicesRes.error && servicesRes.data) {
      servicesRes.data.forEach((s: any) => {
        if (serviceMap[s.id]) {
          serviceMap[s.id].service_name = s.service_name;
        }
      });
    }
  }

  return Object.values(serviceMap).sort((a, b) => b.total_amount - a.total_amount);
}

// Payment update function
export async function recordPayment(
  billId: string,
  paidAmount: number,
  paymentMode?: 'Cash' | 'UPI' | 'Card',
  transactionReference?: string | null
): Promise<BillRow> {
  const bill = await getBillById(billId);
  if (!bill) throw new Error('Bill not found');

  const currentPaidAmount = Number(bill.net_amount || 0) - Number((bill as any).balance || bill.net_amount);
  const newPaidAmount = currentPaidAmount + paidAmount;
  const balance = Number(bill.net_amount) - newPaidAmount;

  let status: 'paid' | 'pending' | 'partial' = 'pending';
  if (balance <= 0) {
    status = 'paid';
  } else if (newPaidAmount > 0) {
    status = 'partial';
  }

  const updates: any = {
    status,
  };

  if (paymentMode) {
    updates.mode_of_payment = paymentMode;
  }
  if (transactionReference) {
    updates.transaction_reference = transactionReference;
  }

  const res = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId)
    .select('*')
    .single();

  return throwIfError<BillRow>(res);
}

// Admin summary function
export interface AdminSummary {
  total_bills: number;
  total_amount: number;
  total_discount: number;
  net_amount: number;
  total_appointments: number;
  pending_appointments: number;
}

export async function adminSummary(date?: string): Promise<AdminSummary> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const startOfDay = `${targetDate}T00:00:00`;
  const endOfDay = `${targetDate}T23:59:59`;

  // Get bills summary
  const billsRes = await supabase
    .from('bills')
    .select('total_amount, discount, net_amount')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (billsRes.error) throw new Error(billsRes.error.message);

  const bills = billsRes.data || [];
  const billsSummary = bills.reduce(
    (acc, bill) => ({
      total_bills: acc.total_bills + 1,
      total_amount: acc.total_amount + Number(bill.total_amount || 0),
      total_discount: acc.total_discount + Number(bill.discount || 0),
      net_amount: acc.net_amount + Number(bill.net_amount || 0),
    }),
    { total_bills: 0, total_amount: 0, total_discount: 0, net_amount: 0 }
  );

  // Get appointments summary
  // Check both appointment_datetime and appointment_date to ensure we catch all appointments for the date
  const appointmentsRes = await supabase
    .from('appointments')
    .select('status')
    .or(
      `and(appointment_datetime.gte.${startOfDay},appointment_datetime.lte.${endOfDay}),` +
      `appointment_date.eq.${targetDate}`
    );

  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);

  const appointments = appointmentsRes.data || [];
  const total_appointments = appointments.length;
  const pending_appointments = appointments.filter(
    (a) => a.status === 'booked'
  ).length;

  return {
    ...billsSummary,
    total_appointments,
    pending_appointments,
  };
}

// Get pending appointments for a specific date
export async function getPendingAppointments(date: string): Promise<AppointmentRow[]> {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;
  
  const res = await supabase
    .from('appointments')
    .select('*')
    .eq('status', 'booked')
    .or(
      `and(appointment_datetime.gte.${startOfDay},appointment_datetime.lte.${endOfDay}),` +
      `appointment_date.eq.${date}`
    )
    .order('appointment_datetime', { ascending: true });
  
  return throwIfError<AppointmentRow[]>(res);
}

// Dashboard Analytics
export interface TopDoctor {
  doctor_id: string;
  doctor_name: string;
  total_revenue: number;
  total_bills: number;
}

export interface TopService {
  service_id: string | null;
  service_name: string;
  usage_count: number;
  total_revenue: number;
}

export async function getTopDoctors(startDate: string, endDate: string, limit: number = 5): Promise<TopDoctor[]> {
  const billsRes = await supabase
    .from('bills')
    .select('doctor_id, net_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('doctor_id', 'is', null);

  if (billsRes.error) throw new Error(billsRes.error.message);

  const bills = billsRes.data || [];
  const doctorMap = new Map<string, { revenue: number; count: number }>();

  bills.forEach(bill => {
    const existing = doctorMap.get(bill.doctor_id!);
    if (existing) {
      existing.revenue += Number(bill.net_amount || 0);
      existing.count += 1;
    } else {
      doctorMap.set(bill.doctor_id!, {
        revenue: Number(bill.net_amount || 0),
        count: 1
      });
    }
  });

  // Fetch doctor names
  const doctorIds = Array.from(doctorMap.keys());
  const doctorsRes = await supabase
    .from('doctors')
    .select('id, name')
    .in('id', doctorIds);

  const doctorsNameMap: Record<string, string> = {};
  if (!doctorsRes.error && doctorsRes.data) {
    doctorsRes.data.forEach((d: any) => {
      doctorsNameMap[d.id] = d.name;
    });
  }

  const topDoctors: TopDoctor[] = Array.from(doctorMap.entries())
    .map(([doctor_id, data]) => ({
      doctor_id,
      doctor_name: doctorsNameMap[doctor_id] || 'Unknown',
      total_revenue: data.revenue,
      total_bills: data.count,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);

  return topDoctors;
}

export async function getTopServices(startDate: string, endDate: string, limit: number = 5): Promise<TopService[]> {
  // Get all bills in date range
  const billsRes = await supabase
    .from('bills')
    .select('id, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (billsRes.error) throw new Error(billsRes.error.message);

  const billIds = (billsRes.data || []).map(b => b.id);
  if (billIds.length === 0) return [];

  // Get bill items for these bills
  const itemsRes = await supabase
    .from('bill_items')
    .select('service_id, quantity, total')
    .in('bill_id', billIds);

  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const items = itemsRes.data || [];
  const serviceMap = new Map<string, { count: number; revenue: number }>();

  items.forEach(item => {
    if (!item.service_id) return;
    const existing = serviceMap.get(item.service_id);
    if (existing) {
      existing.count += item.quantity;
      existing.revenue += Number(item.total || 0);
    } else {
      serviceMap.set(item.service_id, {
        count: item.quantity,
        revenue: Number(item.total || 0)
      });
    }
  });

  // Fetch service names
  const serviceIds = Array.from(serviceMap.keys());
  const servicesRes = await supabase
    .from('services')
    .select('id, service_name')
    .in('id', serviceIds);

  const servicesNameMap: Record<string, string> = {};
  if (!servicesRes.error && servicesRes.data) {
    servicesRes.data.forEach((s: any) => {
      servicesNameMap[s.id] = s.service_name;
    });
  }

  const topServices: TopService[] = Array.from(serviceMap.entries())
    .map(([service_id, data]) => ({
      service_id,
      service_name: servicesNameMap[service_id] || 'Unknown Service',
      usage_count: data.count,
      total_revenue: data.revenue,
    }))
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, limit);

  return topServices;
}

// Doctor Availability

export async function listDoctorAvailability(doctorId: string): Promise<DoctorAvailabilityRow[]> {
  const res = await supabase
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  return throwIfError<DoctorAvailabilityRow[]>(res);
}

export async function setDoctorAvailability(
  doctorId: string,
  availability: Omit<DoctorAvailabilityRow, 'id' | 'created_at' | 'updated_at'>
): Promise<DoctorAvailabilityRow> {
  // For recurring availability, check if there's already an entry for this day/time
  if (availability.day_of_week !== null) {
    const existingRes = await supabase
      .from('doctor_availability')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', availability.day_of_week)
      .eq('start_time', availability.start_time)
      .eq('end_time', availability.end_time)
      .maybeSingle();
    
    if (existingRes.error) throw new Error(existingRes.error.message);
    
    if (existingRes.data) {
      // Update existing entry
      const res = await supabase
        .from('doctor_availability')
        .update({
          ...availability,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRes.data.id)
        .select('*')
        .single();
      return throwIfError<DoctorAvailabilityRow>(res);
    }
  }
  
  // For specific dates or new recurring entries, always create a new entry
  const res = await supabase
    .from('doctor_availability')
    .insert({
      ...availability,
      doctor_id: doctorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any)
    .select('*')
    .single();
  return throwIfError<DoctorAvailabilityRow>(res);
}

export async function deleteDoctorAvailability(id: string): Promise<void> {
  const res = await supabase
    .from('doctor_availability')
    .delete()
    .eq('id', id);
  await throwIfError(res as any);
}

export async function listStockPurchases(): Promise<StockPurchaseRow[]> {
  const res = await supabase
    .from('stock_purchases')
    .select('*')
    .order('created_at', { ascending: false });
  return throwIfError<StockPurchaseRow[]>(res);
}

export async function getStockPurchaseById(id: string): Promise<StockPurchaseRow | null> {
  const res = await supabase
    .from('stock_purchases')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

export async function listStockPurchaseItems(purchaseId: string): Promise<StockPurchaseItemRow[]> {
  const res = await supabase
    .from('stock_purchase_items')
    .select('*')
    .eq('purchase_id', purchaseId);
  return throwIfError<StockPurchaseItemRow[]>(res);
}

// Pathology Lab Functions

// Pathology Tests
export async function listPathologyTests(query?: string): Promise<PathologyTestRow[]> {
  let q = supabase.from('pathology_tests').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.ilike('test_name', like);
  }
  const res = await q;
  return throwIfError<PathologyTestRow[]>(res);
}

export async function createPathologyTest(row: Omit<PathologyTestRow, 'id' | 'created_at'>): Promise<PathologyTestRow> {
  const res = await supabase.from('pathology_tests').insert(row).select('*').single();
  return throwIfError<PathologyTestRow>(res);
}

export async function updatePathologyTest(id: string, updates: Partial<Omit<PathologyTestRow, 'id' | 'created_at'>>): Promise<PathologyTestRow> {
  const res = await supabase.from('pathology_tests').update(updates).eq('id', id).select('*').single();
  return throwIfError<PathologyTestRow>(res);
}

export async function deletePathologyTest(id: string): Promise<void> {
  const res = await supabase.from('pathology_tests').delete().eq('id', id);
  await throwIfError(res as any);
}

export async function getPathologyTestById(id: string): Promise<PathologyTestRow | null> {
  const res = await supabase.from('pathology_tests').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

// Pathology Test Orders
export async function listPathologyTestOrders(query?: string): Promise<PathologyTestOrderRow[]> {
  let q = supabase.from('pathology_test_orders').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.ilike('id', like);
  }
  const res = await q;
  return throwIfError<PathologyTestOrderRow[]>(res);
}

export async function createPathologyTestOrder(row: Omit<PathologyTestOrderRow, 'id' | 'created_at'>): Promise<PathologyTestOrderRow> {
  const res = await supabase.from('pathology_test_orders').insert(row).select('*').single();
  return throwIfError<PathologyTestOrderRow>(res);
}

export async function updatePathologyTestOrder(id: string, updates: Partial<Omit<PathologyTestOrderRow, 'id' | 'created_at'>>): Promise<PathologyTestOrderRow> {
  const res = await supabase.from('pathology_test_orders').update(updates).eq('id', id).select('*').single();
  return throwIfError<PathologyTestOrderRow>(res);
}

export async function deletePathologyTestOrder(id: string): Promise<void> {
  const res = await supabase.from('pathology_test_orders').delete().eq('id', id);
  await throwIfError(res as any);
}

export async function getPathologyTestOrderById(id: string): Promise<PathologyTestOrderRow | null> {
  const res = await supabase.from('pathology_test_orders').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

// Pathology Test Results
export async function listPathologyTestResults(orderId?: string): Promise<PathologyTestResultRow[]> {
  let q = supabase.from('pathology_test_results').select('*').order('created_at', { ascending: false });
  if (orderId) {
    q = q.eq('order_id', orderId);
  }
  const res = await q;
  return throwIfError<PathologyTestResultRow[]>(res);
}

export async function createPathologyTestResult(row: Omit<PathologyTestResultRow, 'id' | 'created_at'>): Promise<PathologyTestResultRow> {
  const res = await supabase.from('pathology_test_results').insert(row).select('*').single();
  return throwIfError<PathologyTestResultRow>(res);
}

export async function updatePathologyTestResult(id: string, updates: Partial<Omit<PathologyTestResultRow, 'id' | 'created_at'>>): Promise<PathologyTestResultRow> {
  const res = await supabase.from('pathology_test_results').update(updates).eq('id', id).select('*').single();
  return throwIfError<PathologyTestResultRow>(res);
}

export async function deletePathologyTestResult(id: string): Promise<void> {
  const res = await supabase.from('pathology_test_results').delete().eq('id', id);
  await throwIfError(res as any);
}

export async function getPathologyTestResultById(id: string): Promise<PathologyTestResultRow | null> {
  const res = await supabase.from('pathology_test_results').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

// Pathology Reports
export async function listPathologyReports(query?: string): Promise<PathologyReportRow[]> {
  let q = supabase.from('pathology_reports').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.ilike('id', like);
  }
  const res = await q;
  return throwIfError<PathologyReportRow[]>(res);
}

export async function createPathologyReport(row: Omit<PathologyReportRow, 'id' | 'created_at'>): Promise<PathologyReportRow> {
  const res = await supabase.from('pathology_reports').insert(row).select('*').single();
  return throwIfError<PathologyReportRow>(res);
}

export async function updatePathologyReport(id: string, updates: Partial<Omit<PathologyReportRow, 'id' | 'created_at'>>): Promise<PathologyReportRow> {
  const res = await supabase.from('pathology_reports').update(updates).eq('id', id).select('*').single();
  return throwIfError<PathologyReportRow>(res);
}

export async function deletePathologyReport(id: string): Promise<void> {
  const res = await supabase.from('pathology_reports').delete().eq('id', id);
  await throwIfError(res as any);
}

export async function getPathologyReportById(id: string): Promise<PathologyReportRow | null> {
  const res = await supabase.from('pathology_reports').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as any;
}

export async function generatePathologyReport(orderId: string, generatedBy: string): Promise<PathologyReportRow> {
  // This would typically involve:
  // 1. Getting the order and associated test results
  // 2. Formatting the report data
  // 3. Creating the report record
  
  const order = await getPathologyTestOrderById(orderId);
  if (!order) {
    throw new Error('Test order not found');
  }
  
  const results = await listPathologyTestResults(orderId);
  
  // Format the report data as JSON
  const reportData = {
    order: order,
    results: results,
    // Add other relevant data
  };
  
  const report: Omit<PathologyReportRow, 'id' | 'created_at'> = {
    order_id: orderId,
    patient_id: order.patient_id,
    doctor_id: order.doctor_id,
    report_date: new Date().toISOString(),
    report_status: 'generated',
    report_data: JSON.stringify(reportData),
    generated_by: generatedBy,
    delivery_status: 'pending',
    notes: 'Auto-generated report',
  };
  
  return await createPathologyReport(report);
}
