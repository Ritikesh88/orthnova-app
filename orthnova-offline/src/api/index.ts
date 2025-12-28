import { generateId, generatePatientId, generatePrescriptionSerialNumber, generateBillNumber, generatePharmacyBillNumber } from '../utils/idGenerators';
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
  StockPurchaseItemRow
} from '../types';

async function mockResponse<T>(data: T): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), 10); // Simulate network delay
  });
}

function getFromStorage<T>(key: string): T {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateTimestamp(): string {
  return new Date().toISOString();
}

// Initialize storage if needed
function initializeStorage() {
  const requiredKeys = [
    'users', 'patients', 'doctors', 'services', 'bills', 'bill_items',
    'prescriptions', 'appointments', 'inventory_items', 'stock_ledger',
    'stock_purchases', 'stock_purchase_items'
    // Note: Pathology tables are not included in offline version
  ];
  
  requiredKeys.forEach(key => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  });
}

// Initialize storage on first use
initializeStorage();

// Users
export async function listUsers(): Promise<UserRow[]> {
  const users = getFromStorage<UserRow[]>('users');
  return mockResponse(users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
}

export async function addUser(user: { 
  user_id: string; 
  password: string; 
  role: UserRow['role'];
}): Promise<UserRow> {
  const users = getFromStorage<UserRow[]>('users');
  const newUser = {
    id: generateId(),
    ...user,
    created_at: generateTimestamp(),
  };
  users.push(newUser);
  saveToStorage('users', users);
  return mockResponse(newUser);
}

export async function updateUser(user_id: string, updates: Partial<Pick<UserRow, 'password' | 'role'>>): Promise<UserRow> {
  const users = getFromStorage<UserRow[]>('users');
  const userIndex = users.findIndex(u => u.user_id === user_id);
  if (userIndex === -1) throw new Error('User not found');
  
  const updatedUser = { ...users[userIndex], ...updates };
  users[userIndex] = updatedUser;
  saveToStorage('users', users);
  return mockResponse(updatedUser);
}

export async function deleteUser(user_id: string): Promise<void> {
  const users = getFromStorage<UserRow[]>('users');
  const filteredUsers = users.filter(u => u.user_id !== user_id);
  saveToStorage('users', filteredUsers);
  return mockResponse(undefined);
}

// Patients
export async function createPatient(row: Omit<PatientRow, 'id' | 'created_at'>): Promise<PatientRow> {
  const patients = getFromStorage<PatientRow[]>('patients');
  const newPatient = {
    ...row,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  patients.push(newPatient);
  saveToStorage('patients', patients);
  return mockResponse(newPatient);
}

export async function listPatients(query?: string): Promise<PatientRow[]> {/** keep name search */
  const patients = getFromStorage<PatientRow[]>('patients');
  let result = patients.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (query && query.trim()) {
    const searchTerm = query.trim().toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(searchTerm));
  }
  
  return mockResponse(result);
}

export async function getPatientById(id: string): Promise<PatientRow | null> {
  const patients = getFromStorage<PatientRow[]>('patients');
  const patient = patients.find(p => p.id === id) || null;
  return mockResponse(patient);
}

export async function searchPatientsByContact(contact: string): Promise<PatientRow[]> {
  const clean = (contact || '').replace(/\D/g, '');
  if (!clean) return [];
  const patients = getFromStorage<PatientRow[]>('patients');
  const result = patients
    .filter(p => p.contact.includes(clean))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return mockResponse(result);
}

// Doctors
export async function createDoctor(row: Omit<DoctorRow, 'created_at'>): Promise<DoctorRow> {
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  const newDoctor = {
    ...row,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  doctors.push(newDoctor);
  saveToStorage('doctors', doctors);
  return mockResponse(newDoctor);
}

export async function listDoctors(query?: string): Promise<DoctorRow[]> {
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  let result = doctors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (query && query.trim()) {
    const searchTerm = query.trim().toLowerCase();
    result = result.filter(d => d.name.toLowerCase().includes(searchTerm));
  }
  
  return mockResponse(result);
}

export async function getDoctorById(id: string): Promise<DoctorRow | null> {
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  const doctor = doctors.find(d => d.id === id) || null;
  return mockResponse(doctor);
}

// Services
export async function addService(row: Omit<ServiceRow, 'id' | 'created_at'>): Promise<ServiceRow> {
  const services = getFromStorage<ServiceRow[]>('services');
  const newService = {
    ...row,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  services.push(newService);
  saveToStorage('services', services);
  return mockResponse(newService);
}

export async function updateService(id: string, updates: Partial<Omit<ServiceRow, 'id' | 'created_at'>>): Promise<ServiceRow> {
  const services = getFromStorage<ServiceRow[]>('services');
  const serviceIndex = services.findIndex(s => s.id === id);
  if (serviceIndex === -1) throw new Error('Service not found');
  
  const updatedService = { ...services[serviceIndex], ...updates };
  services[serviceIndex] = updatedService;
  saveToStorage('services', services);
  return mockResponse(updatedService);
}

export async function deleteService(id: string): Promise<void> {
  const services = getFromStorage<ServiceRow[]>('services');
  const billItems = getFromStorage<BillItemRow[]>('bill_items');
  
  // Check if the service is being used in any bill items
  const usageCheck = billItems.filter(item => item.service_id === id);
  
  // If there are any bill items using this service, we can't delete it
  if (usageCheck.length > 0) {
    throw new Error('Cannot delete service because it is being used in existing bills. To delete this service, first delete all bills that use this service.');
  }
  
  // If no bills are using this service, we can safely delete it
  const filteredServices = services.filter(s => s.id !== id);
  saveToStorage('services', filteredServices);
  return mockResponse(undefined);
}

export async function listServices(query?: string): Promise<ServiceRow[]> {
  const services = getFromStorage<ServiceRow[]>('services');
  let result = services.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (query && query.trim()) {
    const searchTerm = query.trim().toLowerCase();
    result = result.filter(s => 
      s.service_name.toLowerCase().includes(searchTerm) || 
      s.service_type.toLowerCase().includes(searchTerm)
    );
  }
  
  return mockResponse(result);
}

// Bills
export async function createBill(
  bill: Omit<BillRow, 'id' | 'created_at' | 'bill_number'>,
  items: Array<Omit<BillItemRow, 'id'>>
): Promise<BillRow> {
  const bills = getFromStorage<BillRow[]>('bills');
  const billItems = getFromStorage<BillItemRow[]>('bill_items');
  
  const bill_number = await generateBillNumber();
  const newBill = {
    ...bill,
    bill_number,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  
  bills.push(newBill);
  saveToStorage('bills', bills);
  
  if (items.length > 0) {
    const itemsToInsert = items.map((it) => ({ 
      ...it, 
      id: generateId(),
      bill_id: newBill.id 
    }));
    itemsToInsert.forEach(item => billItems.push(item));
    saveToStorage('bill_items', billItems);
  }
  
  return mockResponse(newBill);
}

export async function getBillById(id: string): Promise<BillRow | null> {
  const bills = getFromStorage<BillRow[]>('bills');
  const bill = bills.find(b => b.id === id) || null;
  return mockResponse(bill);
}

export async function listBills(): Promise<BillRow[]> {
  const bills = getFromStorage<BillRow[]>('bills');
  return mockResponse(bills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
}

export async function listBillItems(billId: string): Promise<BillItemRow[]> {
  const billItems = getFromStorage<BillItemRow[]>('bill_items');
  const filteredItems = billItems.filter(item => item.bill_id === billId);
  return mockResponse(filteredItems);
}

// Inventory
export async function listInventoryItems(query?: string): Promise<InventoryItemRow[]> {
  const inventoryItems = getFromStorage<InventoryItemRow[]>('inventory_items');
  let result = inventoryItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (query && query.trim()) {
    const searchTerm = query.trim().toLowerCase();
    result = result.filter(item => item.name.toLowerCase().includes(searchTerm));
  }
  
  return mockResponse(result);
}

export async function createInventoryItem(row: Omit<InventoryItemRow, 'id' | 'created_at' | 'current_stock'>): Promise<InventoryItemRow> {
  const inventoryItems = getFromStorage<InventoryItemRow[]>('inventory_items');
  const payload = { 
    ...row, 
    id: generateId(),
    current_stock: row.opening_stock,
    created_at: generateTimestamp(),
    // Ensure all required fields are present
    category: row.category || 'Other',
    manufacturer: row.manufacturer || 'Unknown',
    expiry_date: row.expiry_date || null,
    batch_number: row.batch_number || null,
    hsn_code: row.hsn_code || null,
    gst_rate: row.gst_rate || 18
  } as any;
  
  inventoryItems.push(payload);
  saveToStorage('inventory_items', inventoryItems);
  
  return mockResponse(payload);
}

export async function updateInventoryItem(id: string, updates: Partial<Omit<InventoryItemRow, 'id' | 'created_at'>>): Promise<InventoryItemRow> {
  const inventoryItems = getFromStorage<InventoryItemRow[]>('inventory_items');
  const itemIndex = inventoryItems.findIndex(item => item.id === id);
  if (itemIndex === -1) throw new Error('Inventory item not found');
  
  const updatedItem = { ...inventoryItems[itemIndex], ...updates };
  inventoryItems[itemIndex] = updatedItem;
  saveToStorage('inventory_items', inventoryItems);
  return mockResponse(updatedItem);
}

export async function adjustStock(
  item_id: string,
  change: number,
  reason: StockLedgerRow['reason'],
  opts?: { notes?: string | null; reference_bill_id?: string | null; created_by?: string | null }
): Promise<{ item: InventoryItemRow; ledger: StockLedgerRow }> {
  const inventoryItems = getFromStorage<InventoryItemRow[]>('inventory_items');
  const stockLedger = getFromStorage<StockLedgerRow[]>('stock_ledger');
  
  // Find the item
  const itemIndex = inventoryItems.findIndex(item => item.id === item_id);
  if (itemIndex === -1) throw new Error('Inventory item not found');
  
  // Calculate new stock
  const newStock = inventoryItems[itemIndex].current_stock + change;
  if (newStock < 0) throw new Error('Insufficient stock');
  
  // Update stock
  const updatedItem = {
    ...inventoryItems[itemIndex],
    current_stock: newStock
  };
  inventoryItems[itemIndex] = updatedItem;
  
  // Create ledger entry
  const ledgerEntry: StockLedgerRow = {
    id: generateId(),
    item_id,
    change,
    reason,
    notes: opts?.notes ?? null,
    reference_bill_id: opts?.reference_bill_id ?? null,
    created_by: opts?.created_by ?? null,
    created_at: generateTimestamp()
  };
  stockLedger.push(ledgerEntry);
  
  // Save both
  saveToStorage('inventory_items', inventoryItems);
  saveToStorage('stock_ledger', stockLedger);
  
  return mockResponse({ item: updatedItem, ledger: ledgerEntry });
}

// Medicine Store specific functions
export async function createMedicineStoreBill(
  bill: Omit<BillRow, 'id' | 'created_at' | 'bill_number'>,
  items: Array<Omit<BillItemRow, 'id'>>,
  createdBy?: string
): Promise<BillRow> {
  const bills = getFromStorage<BillRow[]>('bills');
  const billItems = getFromStorage<BillItemRow[]>('bill_items');
  
  const bill_number = bill.bill_type === 'pharmacy' ? await generatePharmacyBillNumber() : await generateBillNumber();
  const newBill = {
    ...bill,
    bill_number,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  
  bills.push(newBill);
  saveToStorage('bills', bills);
  
  if (items.length > 0) {
    const itemsToInsert = items.map((it) => ({ 
      ...it, 
      id: generateId(),
      bill_id: newBill.id 
    }));
    itemsToInsert.forEach(item => billItems.push(item));
    saveToStorage('bill_items', billItems);
    
    // Update stock for each item
    for (const item of items) {
      if (item.inventory_item_id) {
        await adjustStock(
          item.inventory_item_id, 
          -item.quantity, 
          'dispense', 
          { 
            reference_bill_id: newBill.id, 
            created_by: createdBy || null,
            notes: `Sold in bill ${newBill.bill_number}`
          }
        );
      }
    }
  }
  
  return mockResponse(newBill);
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
  const items = getFromStorage<InventoryItemRow[]>('inventory_items');
  
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
    
  return mockResponse(lowStockItems);
}

export async function getExpiringItems(days: number = 30): Promise<InventoryItemRow[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateString = futureDate.toISOString().split('T')[0];
  
  const items = getFromStorage<InventoryItemRow[]>('inventory_items');
  
  const expiringItems = items
    .filter(item => 
      item.expiry_date !== null && 
      item.expiry_date <= futureDateString
    )
    .sort((a, b) => {
      if (!a.expiry_date || !b.expiry_date) return 0;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
    
  return mockResponse(expiringItems);
}

// Prescriptions
export async function createPrescription(row: Omit<PrescriptionRow, 'id' | 'created_at' | 'serial_number'>): Promise<PrescriptionRow> {
  const serial_number = await generatePrescriptionSerialNumber();
  const prescriptions = getFromStorage<PrescriptionRow[]>('prescriptions');
  const newPrescription = {
    ...row,
    serial_number,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  prescriptions.push(newPrescription);
  saveToStorage('prescriptions', prescriptions);
  return mockResponse(newPrescription);
}

export async function getPrescriptionById(id: string): Promise<PrescriptionRow | null> {
  const prescriptions = getFromStorage<PrescriptionRow[]>('prescriptions');
  const prescription = prescriptions.find(p => p.id === id) || null;
  return mockResponse(prescription);
}

export async function listPrescriptions(): Promise<PrescriptionRow[]> {
  const prescriptions = getFromStorage<PrescriptionRow[]>('prescriptions');
  return mockResponse(prescriptions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
}

// Appointments
export async function createAppointment(row: Omit<AppointmentRow, 'id' | 'created_at'>): Promise<AppointmentRow> {
  const appointments = getFromStorage<AppointmentRow[]>('appointments');
  const newAppointment = {
    ...row,
    id: generateId(),
    created_at: generateTimestamp(),
  };
  appointments.push(newAppointment);
  saveToStorage('appointments', appointments);
  return mockResponse(newAppointment);
}

export async function listAppointments(filters?: { doctor_id?: string; patient_id?: string; appointment_date?: string; appointment_date_exact?: string }): Promise<AppointmentRow[]> {
  let appointments = getFromStorage<AppointmentRow[]>('appointments');
  
  // Apply filters
  if (filters?.doctor_id) {
    appointments = appointments.filter(app => app.doctor_id === filters.doctor_id);
  }
  if (filters?.patient_id) {
    appointments = appointments.filter(app => app.patient_id === filters.patient_id);
  }
  if (filters?.appointment_date) {
    appointments = appointments.filter(app => app.appointment_date === filters.appointment_date);
  }
  // Filter by exact date using appointment_datetime when available
  if (filters?.appointment_date_exact) {
    const startOfDay = new Date(`${filters.appointment_date_exact}T00:00:00`);
    const endOfDay = new Date(`${filters.appointment_date_exact}T23:59:59`);
    appointments = appointments.filter(app => {
      if (app.appointment_datetime) {
        const appDateTime = new Date(app.appointment_datetime);
        return appDateTime >= startOfDay && appDateTime <= endOfDay;
      } else {
        return app.appointment_date === filters.appointment_date_exact;
      }
    });
  }
  
  return mockResponse(appointments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
}

export async function updateAppointment(id: string, updates: Partial<Omit<AppointmentRow, 'id' | 'created_at'>>): Promise<AppointmentRow> {
  const appointments = getFromStorage<AppointmentRow[]>('appointments');
  const appointmentIndex = appointments.findIndex(app => app.id === id);
  if (appointmentIndex === -1) throw new Error('Appointment not found');
  
  const updatedAppointment = { ...appointments[appointmentIndex], ...updates };
  appointments[appointmentIndex] = updatedAppointment;
  saveToStorage('appointments', appointments);
  return mockResponse(updatedAppointment);
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
  const bills = getFromStorage<BillRow[]>('bills');
  
  // Filter bills by date range
  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= new Date(startDate) && billDate <= new Date(endDate);
  });
  
  const grouped: Record<string, SalesSummary> = {};

  filteredBills.forEach(bill => {
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

  return mockResponse(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
}

export async function getDoctorSalesReport(startDate: string, endDate: string): Promise<DoctorSalesReport[]> {
  const bills = getFromStorage<BillRow[]>('bills');
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  
  // Filter bills by date range
  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= new Date(startDate) && billDate <= new Date(endDate) && bill.doctor_id;
  });
  
  const doctorMap: Record<string, DoctorSalesReport> = {};
  
  // Create doctor map for name lookup
  const doctorsMap: Record<string, string> = {};
  doctors.forEach(d => {
    doctorsMap[d.id] = d.name;
  });
  
  filteredBills.forEach(bill => {
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

  return mockResponse(Object.values(doctorMap).sort((a, b) => b.net_amount - a.net_amount));
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
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59`);

  const bills = getFromStorage<BillRow[]>('bills');
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  const patients = getFromStorage<PatientRow[]>('patients');

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= startOfDay && billDate <= endOfDay;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Order by created_at desc

  // Create lookup maps
  const doctorsMap: Record<string, string> = {};
  doctors.forEach(d => doctorsMap[d.id] = d.name);

  const patientsMap: Record<string, string> = {};
  patients.forEach(p => patientsMap[p.id] = p.name);

  return mockResponse(filteredBills.map(bill => ({
    id: bill.id,
    bill_number: bill.bill_number,
    patient_id: bill.patient_id,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    guest_name: bill.guest_name || null,
    doctor_id: bill.doctor_id,
    doctor_name: bill.doctor_id ? (doctorsMap[bill.doctor_id] || 'Unknown') : null,
    total_amount: bill.total_amount,
    discount: bill.discount,
    net_amount: bill.net_amount,
    created_at: bill.created_at,
    status: bill.status,
    mode_of_payment: bill.mode_of_payment,
  })));
}

export async function getBillsByMonth(year: number, month: number): Promise<BillDetail[]> {
  const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59`);

  const bills = getFromStorage<BillRow[]>('bills');
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  const patients = getFromStorage<PatientRow[]>('patients');

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= startDate && billDate <= endDate;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Order by created_at desc

  // Create lookup maps
  const doctorsMap: Record<string, string> = {};
  doctors.forEach(d => doctorsMap[d.id] = d.name);

  const patientsMap: Record<string, string> = {};
  patients.forEach(p => patientsMap[p.id] = p.name);

  return mockResponse(filteredBills.map(bill => ({
    id: bill.id,
    bill_number: bill.bill_number,
    patient_id: bill.patient_id,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    guest_name: bill.guest_name || null,
    doctor_id: bill.doctor_id,
    doctor_name: bill.doctor_id ? (doctorsMap[bill.doctor_id] || 'Unknown') : null,
    total_amount: bill.total_amount,
    discount: bill.discount,
    net_amount: bill.net_amount,
    created_at: bill.created_at,
    status: bill.status,
    mode_of_payment: bill.mode_of_payment,
  })));
}

export async function getBillsByDoctor(doctorId: string, startDate: string, endDate: string): Promise<BillDetail[]> {
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate + 'T23:59:59');

  const bills = getFromStorage<BillRow[]>('bills');
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  const patients = getFromStorage<PatientRow[]>('patients');

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return bill.doctor_id === doctorId &&
           billDate >= startDateTime &&
           billDate <= endDateTime;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Order by created_at desc

  // Find doctor name
  const doctor = doctors.find(d => d.id === doctorId);
  const doctorName = doctor ? doctor.name : 'Unknown';

  // Create patient lookup map
  const patientsMap: Record<string, string> = {};
  patients.forEach(p => patientsMap[p.id] = p.name);

  return mockResponse(filteredBills.map(bill => ({
    id: bill.id,
    bill_number: bill.bill_number,
    patient_id: bill.patient_id,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    guest_name: bill.guest_name || null,
    doctor_id: bill.doctor_id,
    doctor_name: doctorName,
    total_amount: bill.total_amount,
    discount: bill.discount,
    net_amount: bill.net_amount,
    created_at: bill.created_at,
    status: bill.status,
    mode_of_payment: bill.mode_of_payment,
  })));
}

export async function getBillsByDateRange(startDate: string, endDate: string): Promise<BillDetail[]> {
  const startDateTime = new Date(`${startDate}T00:00:00`);
  const endDateTime = new Date(`${endDate}T23:59:59`);

  const bills = getFromStorage<BillRow[]>('bills');
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  const patients = getFromStorage<PatientRow[]>('patients');

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= startDateTime && billDate <= endDateTime;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Order by created_at desc

  // Create lookup maps
  const doctorsMap: Record<string, string> = {};
  doctors.forEach(d => doctorsMap[d.id] = d.name);

  const patientsMap: Record<string, string> = {};
  patients.forEach(p => patientsMap[p.id] = p.name);

  return mockResponse(filteredBills.map(bill => ({
    id: bill.id,
    bill_number: bill.bill_number,
    patient_id: bill.patient_id,
    patient_name: bill.patient_id ? (patientsMap[bill.patient_id] || 'Unknown') : null,
    guest_name: bill.guest_name || null,
    doctor_id: bill.doctor_id,
    doctor_name: bill.doctor_id ? (doctorsMap[bill.doctor_id] || 'Unknown') : null,
    total_amount: bill.total_amount,
    discount: bill.discount,
    net_amount: bill.net_amount,
    created_at: bill.created_at,
    status: bill.status,
    mode_of_payment: bill.mode_of_payment,
  })));
}

export async function getServiceSalesReport(startDate: string, endDate: string): Promise<ServiceSalesReport[]> {
  // Get bills within date range
  const bills = getFromStorage<BillRow[]>('bills');
  const billItems = getFromStorage<BillItemRow[]>('bill_items');
  const services = getFromStorage<ServiceRow[]>('services');

  const startDateTime = new Date(`${startDate}T00:00:00`);
  const endDateTime = new Date(`${endDate}T23:59:59`);

  // Filter bills by date range
  const billIds = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= startDateTime && billDate <= endDateTime;
  }).map(bill => bill.id);
  
  if (billIds.length === 0) return [];

  // Filter bill items by bill IDs and service_id not null
  const items = billItems.filter(item => 
    billIds.includes(item.bill_id) && item.service_id !== undefined && item.service_id !== null
  );

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
  const servicesMap: Record<string, string> = {};
  services.forEach(s => {
    servicesMap[s.id] = s.service_name;
  });

  // Update service names
  Object.keys(serviceMap).forEach(serviceId => {
    if (serviceMap[serviceId].service_id && serviceMap[serviceId].service_id !== 'other') {
      const serviceName = servicesMap[serviceMap[serviceId].service_id];
      if (serviceName) {
        serviceMap[serviceId].service_name = serviceName;
      }
    }
  });

  return mockResponse(Object.values(serviceMap).sort((a, b) => b.total_amount - a.total_amount));
}

// Payment update function
export async function recordPayment(
  billId: string,
  paidAmount: number,
  paymentMode?: 'Cash' | 'UPI' | 'Card',
  transactionReference?: string | null
): Promise<BillRow> {
  const bills = getFromStorage<BillRow[]>('bills');
  const billIndex = bills.findIndex(b => b.id === billId);
  if (billIndex === -1) throw new Error('Bill not found');

  const bill = bills[billIndex];
  const currentPaidAmount = Number(bill.net_amount || 0) - Number((bill as any).balance || bill.net_amount);
  const newPaidAmount = currentPaidAmount + paidAmount;
  const balance = Number(bill.net_amount) - newPaidAmount;

  let status: 'paid' | 'pending' | 'partial' = 'pending';
  if (balance <= 0) {
    status = 'paid';
  } else if (newPaidAmount > 0) {
    status = 'partial';
  }

  const updatedBill = {
    ...bill,
    status,
    mode_of_payment: paymentMode || bill.mode_of_payment,
    transaction_reference: transactionReference || bill.transaction_reference,
  };

  bills[billIndex] = updatedBill;
  saveToStorage('bills', bills);

  return mockResponse(updatedBill);
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
  const startOfDay = new Date(`${targetDate}T00:00:00`);
  const endOfDay = new Date(`${targetDate}T23:59:59`);

  // Get bills summary
  const bills = getFromStorage<BillRow[]>('bills');
  
  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= startOfDay && billDate <= endOfDay;
  });
  
  const billsSummary = filteredBills.reduce(
    (acc, bill) => ({
      total_bills: acc.total_bills + 1,
      total_amount: acc.total_amount + Number(bill.total_amount || 0),
      total_discount: acc.total_discount + Number(bill.discount || 0),
      net_amount: acc.net_amount + Number(bill.net_amount || 0),
    }),
    { total_bills: 0, total_amount: 0, total_discount: 0, net_amount: 0 }
  );

  // Get appointments summary
  const appointments = getFromStorage<AppointmentRow[]>('appointments');
  
  const filteredAppointments = appointments.filter(app => {
    if (app.appointment_datetime) {
      const appDateTime = new Date(app.appointment_datetime);
      return appDateTime >= startOfDay && appDateTime <= endOfDay;
    } else {
      return app.appointment_date === targetDate;
    }
  });
  
  const total_appointments = filteredAppointments.length;
  const pending_appointments = filteredAppointments.filter(
    (a) => a.status === 'booked'
  ).length;

  return mockResponse({
    ...billsSummary,
    total_appointments,
    pending_appointments,
  });
}

// Get pending appointments for a specific date
export async function getPendingAppointments(date: string): Promise<AppointmentRow[]> {
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59`);
  
  const appointments = getFromStorage<AppointmentRow[]>('appointments');
  
  const filteredAppointments = appointments.filter(app => {
    if (app.appointment_datetime) {
      const appDateTime = new Date(app.appointment_datetime);
      return app.status === 'booked' && appDateTime >= startOfDay && appDateTime <= endOfDay;
    } else {
      return app.status === 'booked' && app.appointment_date === date;
    }
  });
  
  // Sort by appointment_datetime if available, otherwise by created_at
  filteredAppointments.sort((a, b) => {
    if (a.appointment_datetime && b.appointment_datetime) {
      return new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime();
    } else if (a.appointment_datetime) {
      return -1;
    } else if (b.appointment_datetime) {
      return 1;
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });
  
  return mockResponse(filteredAppointments);
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
  const bills = getFromStorage<BillRow[]>('bills');
  const doctors = getFromStorage<DoctorRow[]>('doctors');
  
  // Filter bills by date range
  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= new Date(startDate) && billDate <= new Date(endDate) && bill.doctor_id;
  });
  
  const doctorMap = new Map<string, { revenue: number; count: number }>();
  
  filteredBills.forEach(bill => {
    if (!bill.doctor_id) return;
    const existing = doctorMap.get(bill.doctor_id);
    if (existing) {
      existing.revenue += Number(bill.net_amount || 0);
      existing.count += 1;
    } else {
      doctorMap.set(bill.doctor_id, {
        revenue: Number(bill.net_amount || 0),
        count: 1
      });
    }
  });

  // Create doctor names map
  const doctorsNameMap: Record<string, string> = {};
  doctors.forEach(d => {
    doctorsNameMap[d.id] = d.name;
  });

  const topDoctors: TopDoctor[] = Array.from(doctorMap.entries())
    .map(([doctor_id, data]) => ({
      doctor_id,
      doctor_name: doctorsNameMap[doctor_id] || 'Unknown',
      total_revenue: data.revenue,
      total_bills: data.count,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);

  return mockResponse(topDoctors);
}

export async function getTopServices(startDate: string, endDate: string, limit: number = 5): Promise<TopService[]> {
  const bills = getFromStorage<BillRow[]>('bills');
  const billItems = getFromStorage<BillItemRow[]>('bill_items');
  const services = getFromStorage<ServiceRow[]>('services');
  
  // Filter bills by date range
  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= new Date(startDate) && billDate <= new Date(endDate);
  });
  
  const billIds = filteredBills.map(b => b.id);
  if (billIds.length === 0) return [];

  // Filter bill items for these bills
  const filteredItems = billItems.filter(item => billIds.includes(item.bill_id));
  
  const serviceMap = new Map<string, { count: number; revenue: number }>();

  filteredItems.forEach(item => {
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

  // Create service names map
  const servicesNameMap: Record<string, string> = {};
  services.forEach(s => {
    servicesNameMap[s.id] = s.service_name;
  });

  const topServices: TopService[] = Array.from(serviceMap.entries())
    .map(([service_id, data]) => ({
      service_id,
      service_name: servicesNameMap[service_id] || 'Unknown Service',
      usage_count: data.count,
      total_revenue: data.revenue,
    }))
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, limit);

  return mockResponse(topServices);
}

// Doctor Availability

export async function listDoctorAvailability(doctorId: string): Promise<DoctorAvailabilityRow[]> {
  const availability = getFromStorage<DoctorAvailabilityRow[]>('doctor_availability');
  const filteredAvailability = availability.filter(avail => avail.doctor_id === doctorId);
  return mockResponse(filteredAvailability.sort((a, b) => {
    // Sort by day_of_week first (null values last), then by start_time
    if (a.day_of_week === null && b.day_of_week !== null) return 1;
    if (b.day_of_week === null && a.day_of_week !== null) return -1;
    if (a.day_of_week !== null && b.day_of_week !== null && a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.start_time.localeCompare(b.start_time);
  }));
}

export async function setDoctorAvailability(
  doctorId: string,
  availability: Omit<DoctorAvailabilityRow, 'id' | 'created_at' | 'updated_at'>
): Promise<DoctorAvailabilityRow> {
  const availabilityData = getFromStorage<DoctorAvailabilityRow[]>('doctor_availability');
  
  // For recurring availability, check if there's already an entry for this day/time
  if (availability.day_of_week !== null) {
    const existingIndex = availabilityData.findIndex(avail => 
      avail.doctor_id === doctorId &&
      avail.day_of_week === availability.day_of_week &&
      avail.start_time === availability.start_time &&
      avail.end_time === availability.end_time
    );
    
    if (existingIndex !== -1) {
      // Update existing entry
      const updatedEntry = {
        ...availabilityData[existingIndex],
        ...availability,
        updated_at: generateTimestamp()
      };
      availabilityData[existingIndex] = updatedEntry;
      saveToStorage('doctor_availability', availabilityData);
      return mockResponse(updatedEntry);
    }
  }
  
  // For specific dates or new recurring entries, always create a new entry
  const newEntry: DoctorAvailabilityRow = {
    ...availability,
    id: generateId(),
    doctor_id: doctorId,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp()
  };
  availabilityData.push(newEntry);
  saveToStorage('doctor_availability', availabilityData);
  return mockResponse(newEntry);
}

export async function deleteDoctorAvailability(id: string): Promise<void> {
  const availability = getFromStorage<DoctorAvailabilityRow[]>('doctor_availability');
  const filteredAvailability = availability.filter(avail => avail.id !== id);
  saveToStorage('doctor_availability', filteredAvailability);
  return mockResponse(undefined);
}

export async function listStockPurchases(): Promise<StockPurchaseRow[]> {
  const purchases = getFromStorage<StockPurchaseRow[]>('stock_purchases');
  return mockResponse(purchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
}

export async function getStockPurchaseById(id: string): Promise<StockPurchaseRow | null> {
  const purchases = getFromStorage<StockPurchaseRow[]>('stock_purchases');
  const purchase = purchases.find(p => p.id === id) || null;
  return mockResponse(purchase);
}

export async function listStockPurchaseItems(purchaseId: string): Promise<StockPurchaseItemRow[]> {
  const items = getFromStorage<StockPurchaseItemRow[]>('stock_purchase_items');
  const filteredItems = items.filter(item => item.purchase_id === purchaseId);
  return mockResponse(filteredItems);
}


