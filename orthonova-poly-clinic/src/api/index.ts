import { supabase } from '../lib/supabaseClient';
import {
  BillItemRow,
  BillRow,
  DoctorRow,
  PatientRow,
  PrescriptionRow,
  ServiceRow,
  UserRow,
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
export async function listPatients(query?: string): Promise<PatientRow[]> {
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
  // Insert bill first
  const billRes = await supabase.from('bills').insert(bill).select('*').single();
  const insertedBill = await throwIfError<BillRow>(billRes);
  // Insert items, omitting id so Supabase generates UUIDs
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