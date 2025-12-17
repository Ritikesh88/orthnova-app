// Offline API implementation using localStorage
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

// Helper functions for localStorage
const STORAGE_KEY = 'orthnova_data';

const getData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {
    users: [],
    patients: [],
    doctors: [],
    services: [],
    bills: [],
    billItems: [],
    inventoryItems: [],
    stockLedger: [],
    prescriptions: [],
    appointments: [],
    doctorAvailability: [],
    stockPurchases: [],
    stockPurchaseItems: []
  };
};

const saveData = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Initialize with sample data if empty
const initializeData = () => {
  const data = getData();
  let initialized = false;
  
  // Add sample admin user if no users exist
  if (data.users.length === 0) {
    data.users.push({
      id: generateId(), // Add the missing id field
      user_id: 'admin',
      password: 'admin123',
      role: 'admin',
      created_at: new Date().toISOString()
    });
    initialized = true;
  }
  
  // Add sample doctor if none exist
  if (data.doctors.length === 0) {
    data.doctors.push({
      id: generateId(),
      name: 'Dr. Smith',
      specialization: 'General Physician',
      contact: '9876543210',
      created_at: new Date().toISOString()
    });
    initialized = true;
  }
  
  // Add sample patient if none exist
  if (data.patients.length === 0) {
    data.patients.push({
      id: generateId(),
      name: 'John Doe',
      age: 30,
      gender: 'Male',
      contact: '9876543211',
      address: '123 Main St',
      created_at: new Date().toISOString()
    });
    initialized = true;
  }
  
  // Add sample service if none exist
  if (data.services.length === 0) {
    data.services.push({
      id: generateId(),
      service_name: 'Consultation',
      service_type: 'General',
      price: 500,
      created_at: new Date().toISOString()
    });
    initialized = true;
  }
  
  // Add sample inventory item if none exist
  if (data.inventoryItems.length === 0) {
    data.inventoryItems.push({
      id: generateId(),
      name: 'Paracetamol',
      sku: 'PARA001',
      unit: 'tablet',
      cost_price: 2.5,
      sale_price: 5.0,
      opening_stock: 100,
      current_stock: 100,
      low_stock_threshold: 20,
      category: 'Tablets',
      manufacturer: 'Pharma Co.',
      expiry_date: '2025-12-31',
      batch_number: 'BATCH001',
      hsn_code: '3004',
      gst_rate: 18,
      created_at: new Date().toISOString()
    });
    initialized = true;
  }
  
  if (initialized) {
    saveData(data);
  }
  
  return data;
};

// Utility function to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initialize data on first load
let appData = initializeData();

// Users
export async function listUsers(): Promise<UserRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...appData.users]);
    }, 100);
  });
}

export async function addUser(user: { 
  user_id: string; 
  password: string; 
  role: UserRow['role'];
}): Promise<UserRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newUser: UserRow = {
        id: generateId(),
        ...user,
        created_at: new Date().toISOString()
      };
      appData.users.push(newUser);
      saveData(appData);
      resolve(newUser);
    }, 100);
  });
}

export async function updateUser(user_id: string, updates: Partial<Pick<UserRow, 'password' | 'role'>>): Promise<UserRow> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = appData.users.findIndex((u: UserRow) => u.user_id === user_id);
      if (index === -1) {
        reject(new Error('User not found'));
        return;
      }
      
      appData.users[index] = {
        ...appData.users[index],
        ...updates
      };
      
      saveData(appData);
      resolve(appData.users[index]);
    }, 100);
  });
}

export async function deleteUser(user_id: string): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      appData.users = appData.users.filter((u: UserRow) => u.user_id !== user_id);
      saveData(appData);
      resolve();
    }, 100);
  });
}

// Patients
export async function createPatient(row: Omit<PatientRow, 'created_at'>): Promise<PatientRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPatient = {
        ...row,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      appData.patients.push(newPatient);
      saveData(appData);
      resolve(newPatient);
    }, 100);
  });
}

export async function listPatients(query?: string): Promise<PatientRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let patients = [...appData.patients];
      
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        patients = patients.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.contact.includes(q)
        );
      }
      
      resolve(patients.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getPatientById(id: string): Promise<PatientRow | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const patient = appData.patients.find((p: PatientRow) => p.id === id) || null;
      resolve(patient);
    }, 100);
  });
}

export async function searchPatientsByContact(contact: string): Promise<PatientRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const clean = (contact || '').replace(/\D/g, '');
      if (!clean) {
        resolve([]);
        return;
      }
      
      const patients = appData.patients.filter((p: PatientRow) => 
        p.contact.includes(clean)
      );
      
      resolve(patients);
    }, 100);
  });
}

// Doctors
export async function createDoctor(row: Omit<DoctorRow, 'created_at'>): Promise<DoctorRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newDoctor = {
        ...row,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      appData.doctors.push(newDoctor);
      saveData(appData);
      resolve(newDoctor);
    }, 100);
  });
}

export async function listDoctors(query?: string): Promise<DoctorRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let doctors = [...appData.doctors];
      
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        doctors = doctors.filter(d => 
          d.name.toLowerCase().includes(q) || 
          d.specialization.toLowerCase().includes(q)
        );
      }
      
      resolve(doctors.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getDoctorById(id: string): Promise<DoctorRow | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const doctor = appData.doctors.find((d: DoctorRow) => d.id === id) || null;
      resolve(doctor);
    }, 100);
  });
}

// Services
export async function addService(row: Omit<ServiceRow, 'id' | 'created_at'>): Promise<ServiceRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newService = {
        ...row,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      appData.services.push(newService);
      saveData(appData);
      resolve(newService);
    }, 100);
  });
}

export async function updateService(id: string, updates: Partial<Omit<ServiceRow, 'id' | 'created_at'>>): Promise<ServiceRow> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = appData.services.findIndex((s: ServiceRow) => s.id === id);
      if (index === -1) {
        reject(new Error('Service not found'));
        return;
      }
      
      appData.services[index] = {
        ...appData.services[index],
        ...updates
      };
      
      saveData(appData);
      resolve(appData.services[index]);
    }, 100);
  });
}

export async function deleteService(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Check if service is being used in any bill items
      const isUsed = appData.billItems.some((item: BillItemRow) => item.service_id === id);
      
      if (isUsed) {
        reject(new Error('Cannot delete service because it is being used in existing bills.'));
        return;
      }
      
      appData.services = appData.services.filter((s: ServiceRow) => s.id !== id);
      saveData(appData);
      resolve();
    }, 100);
  });
}

export async function listServices(query?: string): Promise<ServiceRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let services = [...appData.services];
      
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        services = services.filter(s => 
          s.service_name.toLowerCase().includes(q) || 
          s.service_type.toLowerCase().includes(q)
        );
      }
      
      resolve(services.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

// Bills
export async function createBill(
  bill: Omit<BillRow, 'id' | 'created_at'>,
  items: Array<Omit<BillItemRow, 'id'>>
): Promise<BillRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newBill = {
        ...bill,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      
      appData.bills.push(newBill);
      
      if (items.length > 0) {
        const itemsToInsert = items.map((it) => ({ 
          ...it, 
          id: generateId(),
          bill_id: newBill.id 
        }));
        appData.billItems.push(...itemsToInsert);
      }
      
      saveData(appData);
      resolve(newBill);
    }, 100);
  });
}

export async function getBillById(id: string): Promise<BillRow | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bill = appData.bills.find((b: BillRow) => b.id === id) || null;
      resolve(bill);
    }, 100);
  });
}

export async function listBills(): Promise<BillRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...appData.bills].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function listBillItems(billId: string): Promise<BillItemRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const items = appData.billItems.filter((item: BillItemRow) => item.bill_id === billId);
      resolve(items);
    }, 100);
  });
}

// Inventory
export async function listInventoryItems(query?: string): Promise<InventoryItemRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let items = [...appData.inventoryItems];
      
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        items = items.filter(i => 
          i.name.toLowerCase().includes(q) || 
          i.sku.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.manufacturer.toLowerCase().includes(q)
        );
      }
      
      resolve(items.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function createInventoryItem(row: Omit<InventoryItemRow, 'id' | 'created_at' | 'current_stock'>): Promise<InventoryItemRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const payload = { 
        ...row, 
        id: generateId(),
        current_stock: row.opening_stock,
        category: row.category || 'Other',
        manufacturer: row.manufacturer || 'Unknown',
        expiry_date: row.expiry_date || null,
        batch_number: row.batch_number || null,
        hsn_code: row.hsn_code || null,
        gst_rate: row.gst_rate || 18,
        created_at: new Date().toISOString()
      } as any;
      
      appData.inventoryItems.push(payload);
      saveData(appData);
      resolve(payload);
    }, 100);
  });
}

export async function updateInventoryItem(id: string, updates: Partial<Omit<InventoryItemRow, 'id' | 'created_at'>>): Promise<InventoryItemRow> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = appData.inventoryItems.findIndex((i: InventoryItemRow) => i.id === id);
      if (index === -1) {
        reject(new Error('Inventory item not found'));
        return;
      }
      
      appData.inventoryItems[index] = {
        ...appData.inventoryItems[index],
        ...updates
      };
      
      saveData(appData);
      resolve(appData.inventoryItems[index]);
    }, 100);
  });
}

export async function adjustStock(
  item_id: string,
  change: number,
  reason: StockLedgerRow['reason'],
  opts?: { notes?: string | null; reference_bill_id?: string | null; created_by?: string | null }
): Promise<{ item: InventoryItemRow; ledger: StockLedgerRow }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = appData.inventoryItems.findIndex((i: InventoryItemRow) => i.id === item_id);
      if (index === -1) {
        reject(new Error('Inventory item not found'));
        return;
      }
      
      // Create ledger entry
      const ledgerEntry: StockLedgerRow = {
        id: generateId(),
        item_id,
        change,
        reason,
        notes: opts?.notes ?? null,
        reference_bill_id: opts?.reference_bill_id ?? null,
        created_by: opts?.created_by ?? null,
        created_at: new Date().toISOString()
      };
      
      appData.stockLedger.push(ledgerEntry);
      
      // Update stock
      appData.inventoryItems[index].current_stock += change;
      
      saveData(appData);
      resolve({
        item: appData.inventoryItems[index],
        ledger: ledgerEntry
      });
    }, 100);
  });
}

// Medicine Store specific functions
export async function createMedicineStoreBill(
  bill: Omit<BillRow, 'id' | 'created_at'>,
  items: Array<Omit<BillItemRow, 'id'>>,
  createdBy?: string
): Promise<BillRow> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const newBill = {
          ...bill,
          id: generateId(),
          created_at: new Date().toISOString()
        };
        
        appData.bills.push(newBill);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((it) => ({ 
            ...it, 
            id: generateId(),
            bill_id: newBill.id 
          }));
          appData.billItems.push(...itemsToInsert);
          
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
        
        saveData(appData);
        resolve(newBill);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowStockItems: LowStockItem[] = appData.inventoryItems
        .filter((item: InventoryItemRow) => 
          item.low_stock_threshold !== null && 
          item.current_stock <= item.low_stock_threshold
        )
        .map((item: InventoryItemRow) => ({
          id: item.id,
          name: item.name,
          current_stock: item.current_stock,
          low_stock_threshold: item.low_stock_threshold!,
          category: item.category,
          manufacturer: item.manufacturer
        }))
        .sort((a: LowStockItem, b: LowStockItem) => a.current_stock - b.current_stock);
        
      resolve(lowStockItems);
    }, 100);
  });
}

export async function getExpiringItems(days: number = 30): Promise<InventoryItemRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      
      const expiringItems = appData.inventoryItems
        .filter((item: InventoryItemRow) => 
          item.expiry_date !== null &&
          new Date(item.expiry_date) <= futureDate
        )
        .sort((a: InventoryItemRow, b: InventoryItemRow) => 
          new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()
        );
        
      resolve(expiringItems);
    }, 100);
  });
}

// Prescriptions
export async function createPrescription(row: Omit<PrescriptionRow, 'id' | 'created_at'>): Promise<PrescriptionRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPrescription = {
        ...row,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      appData.prescriptions.push(newPrescription);
      saveData(appData);
      resolve(newPrescription);
    }, 100);
  });
}

export async function getPrescriptionById(id: string): Promise<PrescriptionRow | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const prescription = appData.prescriptions.find((p: PrescriptionRow) => p.id === id) || null;
      resolve(prescription);
    }, 100);
  });
}

export async function listPrescriptions(): Promise<PrescriptionRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...appData.prescriptions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

// Appointments
export async function createAppointment(row: Omit<AppointmentRow, 'id' | 'created_at'>): Promise<AppointmentRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newAppointment = {
        ...row,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      appData.appointments.push(newAppointment);
      saveData(appData);
      resolve(newAppointment);
    }, 100);
  });
}

export async function listAppointments(filters?: { doctor_id?: string; patient_id?: string; appointment_date?: string; appointment_date_exact?: string }): Promise<AppointmentRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let appointments = [...appData.appointments];
      
      if (filters?.doctor_id) {
        appointments = appointments.filter(a => a.doctor_id === filters.doctor_id);
      }
      
      if (filters?.patient_id) {
        appointments = appointments.filter(a => a.patient_id === filters.patient_id);
      }
      
      if (filters?.appointment_date) {
        appointments = appointments.filter(a => a.appointment_date === filters.appointment_date);
      }
      
      if (filters?.appointment_date_exact) {
        appointments = appointments.filter(a => 
          a.appointment_date === filters.appointment_date_exact ||
          (a.appointment_datetime && 
           a.appointment_datetime.startsWith(filters.appointment_date_exact))
        );
      }
      
      resolve(appointments.sort((a, b) => {
        if (a.appointment_datetime && b.appointment_datetime) {
          return new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime();
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }));
    }, 100);
  });
}

export async function updateAppointment(id: string, updates: Partial<Omit<AppointmentRow, 'id' | 'created_at'>>): Promise<AppointmentRow> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = appData.appointments.findIndex((a: AppointmentRow) => a.id === id);
      if (index === -1) {
        reject(new Error('Appointment not found'));
        return;
      }
      
      appData.appointments[index] = {
        ...appData.appointments[index],
        ...updates
      };
      
      saveData(appData);
      resolve(appData.appointments[index]);
    }, 100);
  });
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate >= start && billDate <= end;
      });
      
      const grouped: Record<string, SalesSummary> = {};
      
      filteredBills.forEach((bill: BillRow) => {
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
      
      resolve(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
    }, 100);
  });
}

export async function getDoctorSalesReport(startDate: string, endDate: string): Promise<DoctorSalesReport[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate >= start && billDate <= end && bill.doctor_id;
      });
      
      const doctorMap: Record<string, DoctorSalesReport> = {};
      
      filteredBills.forEach((bill: BillRow) => {
        const doctorId = bill.doctor_id;
        if (!doctorId) return;
        
        const doctor = appData.doctors.find((d: DoctorRow) => d.id === doctorId);
        
        if (!doctorMap[doctorId]) {
          doctorMap[doctorId] = {
            doctor_id: doctorId,
            doctor_name: doctor?.name || 'Unknown',
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
      
      resolve(Object.values(doctorMap).sort((a, b) => b.net_amount - a.net_amount));
    }, 100);
  });
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const targetDate = new Date(date);
      
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate.toDateString() === targetDate.toDateString();
      });
      
      const result: BillDetail[] = filteredBills.map((bill: BillRow) => {
        const patient = bill.patient_id ? 
          appData.patients.find((p: PatientRow) => p.id === bill.patient_id) : 
          null;
          
        const doctor = bill.doctor_id ? 
          appData.doctors.find((d: DoctorRow) => d.id === bill.doctor_id) : 
          null;
          
        return {
          ...bill,
          patient_name: patient?.name || null,
          doctor_name: doctor?.name || null,
        } as BillDetail;
      });
      
      resolve(result.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getBillsByMonth(year: number, month: number): Promise<BillDetail[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate.getFullYear() === year && billDate.getMonth() === month - 1;
      });
      
      const result: BillDetail[] = filteredBills.map((bill: BillRow) => {
        const patient = bill.patient_id ? 
          appData.patients.find((p: PatientRow) => p.id === bill.patient_id) : 
          null;
          
        const doctor = bill.doctor_id ? 
          appData.doctors.find((d: DoctorRow) => d.id === bill.doctor_id) : 
          null;
          
        return {
          ...bill,
          patient_name: patient?.name || null,
          doctor_name: doctor?.name || null,
        } as BillDetail;
      });
      
      resolve(result.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getBillsByDoctor(doctorId: string, startDate: string, endDate: string): Promise<BillDetail[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return bill.doctor_id === doctorId && billDate >= start && billDate <= end;
      });
      
      const doctor = appData.doctors.find((d: DoctorRow) => d.id === doctorId);
      const doctorName = doctor?.name || 'Unknown';
      
      const result: BillDetail[] = filteredBills.map((bill: BillRow) => {
        const patient = bill.patient_id ? 
          appData.patients.find((p: PatientRow) => p.id === bill.patient_id) : 
          null;
          
        return {
          ...bill,
          patient_name: patient?.name || null,
          doctor_name: doctorName,
        } as BillDetail;
      });
      
      resolve(result.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getBillsByDateRange(startDate: string, endDate: string): Promise<BillDetail[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate >= start && billDate <= end;
      });
      
      const result: BillDetail[] = filteredBills.map((bill: BillRow) => {
        const patient = bill.patient_id ? 
          appData.patients.find((p: PatientRow) => p.id === bill.patient_id) : 
          null;
          
        const doctor = bill.doctor_id ? 
          appData.doctors.find((d: DoctorRow) => d.id === bill.doctor_id) : 
          null;
          
        return {
          ...bill,
          patient_name: patient?.name || null,
          doctor_name: doctor?.name || null,
        } as BillDetail;
      });
      
      resolve(result.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getServiceSalesReport(startDate: string, endDate: string): Promise<ServiceSalesReport[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Get bill items within date range
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate >= start && billDate <= end;
      });
      
      const billIds = filteredBills.map((b: BillRow) => b.id);
      const filteredItems = appData.billItems.filter((item: BillItemRow) => 
        billIds.includes(item.bill_id) && item.service_id
      );
      
      const serviceMap: Record<string, ServiceSalesReport> = {};
      
      filteredItems.forEach((item: BillItemRow) => {
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
      
      // Fetch actual service names
      Object.keys(serviceMap).forEach(serviceId => {
        if (serviceId !== 'other') {
          const service = appData.services.find((s: ServiceRow) => s.id === serviceId);
          if (service) {
            serviceMap[serviceId].service_name = service.service_name;
          }
        }
      });
      
      resolve(Object.values(serviceMap).sort((a, b) => b.total_amount - a.total_amount));
    }, 100);
  });
}

// Payment update function
export async function recordPayment(
  billId: string,
  paidAmount: number,
  paymentMode?: 'Cash' | 'UPI' | 'Card',
  transactionReference?: string | null
): Promise<BillRow> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const billIndex = appData.bills.findIndex((b: BillRow) => b.id === billId);
      if (billIndex === -1) {
        reject(new Error('Bill not found'));
        return;
      }
      
      const bill = appData.bills[billIndex];
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
      
      appData.bills[billIndex] = {
        ...bill,
        ...updates
      };
      
      saveData(appData);
      resolve(appData.bills[billIndex]);
    }, 100);
  });
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const targetDate = date ? new Date(date) : new Date();
      
      // Get bills summary
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate.toDateString() === targetDate.toDateString();
      });
      
      const billsSummary = filteredBills.reduce(
        (acc: any, bill: BillRow) => ({
          total_bills: acc.total_bills + 1,
          total_amount: acc.total_amount + Number(bill.total_amount || 0),
          total_discount: acc.total_discount + Number(bill.discount || 0),
          net_amount: acc.net_amount + Number(bill.net_amount || 0),
        }),
        { total_bills: 0, total_amount: 0, total_discount: 0, net_amount: 0 }
      );
      
      // Get appointments summary
      const filteredAppointments = appData.appointments.filter((appointment: AppointmentRow) => {
        const apptDate = appointment.appointment_date ? 
          new Date(appointment.appointment_date) : 
          (appointment.appointment_datetime ? new Date(appointment.appointment_datetime) : null);
          
        return apptDate && apptDate.toDateString() === targetDate.toDateString();
      });
      
      const total_appointments = filteredAppointments.length;
      const pending_appointments = filteredAppointments.filter(
        (a: AppointmentRow) => a.status === 'booked'
      ).length;
      
      resolve({
        ...billsSummary,
        total_appointments,
        pending_appointments,
      });
    }, 100);
  });
}

// Get pending appointments for a specific date
export async function getPendingAppointments(date: string): Promise<AppointmentRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const targetDate = new Date(date);
      
      const pendingAppointments = appData.appointments.filter((appointment: AppointmentRow) => {
        if (appointment.status !== 'booked') return false;
        
        const apptDate = appointment.appointment_date ? 
          new Date(appointment.appointment_date) : 
          (appointment.appointment_datetime ? new Date(appointment.appointment_datetime) : null);
          
        return apptDate && apptDate.toDateString() === targetDate.toDateString();
      });
      
      resolve(pendingAppointments.sort((a: AppointmentRow, b: AppointmentRow) => {
        if (a.appointment_datetime && b.appointment_datetime) {
          return new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime();
        }
        return 0;
      }));
    }, 100);
  });
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return bill.doctor_id && billDate >= start && billDate <= end;
      });
      
      const doctorMap = new Map<string, { revenue: number; count: number }>();
      
      filteredBills.forEach((bill: BillRow) => {
        const doctorId = bill.doctor_id!;
        const existing = doctorMap.get(doctorId);
        
        if (existing) {
          existing.revenue += Number(bill.net_amount || 0);
          existing.count += 1;
        } else {
          doctorMap.set(doctorId, {
            revenue: Number(bill.net_amount || 0),
            count: 1
          });
        }
      });
      
      // Get doctor names
      const doctorsNameMap: Record<string, string> = {};
      appData.doctors.forEach((d: DoctorRow) => {
        doctorsNameMap[d.id] = d.name;
      });
      
      const topDoctors: TopDoctor[] = Array.from(doctorMap.entries())
        .map(([doctor_id, data]) => ({
          doctor_id,
          doctor_name: doctorsNameMap[doctor_id] || 'Unknown',
          total_revenue: data.revenue,
          total_bills: data.count,
        }))
        .sort((a: TopDoctor, b: TopDoctor) => b.total_revenue - a.total_revenue)
        .slice(0, limit);
      
      resolve(topDoctors);
    }, 100);
  });
}

export async function getTopServices(startDate: string, endDate: string, limit: number = 5): Promise<TopService[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Get bills in date range
      const filteredBills = appData.bills.filter((bill: BillRow) => {
        const billDate = new Date(bill.created_at);
        return billDate >= start && billDate <= end;
      });
      
      const billIds = filteredBills.map((b: BillRow) => b.id);
      const filteredItems = appData.billItems.filter((item: BillItemRow) => 
        billIds.includes(item.bill_id) && item.service_id
      );
      
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      
      filteredItems.forEach((item: BillItemRow) => {
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
      
      // Get service names
      const servicesNameMap: Record<string, string> = {};
      appData.services.forEach((s: ServiceRow) => {
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
      
      resolve(topServices);
    }, 100);
  });
}

// Doctor Availability
export async function listDoctorAvailability(doctorId: string): Promise<DoctorAvailabilityRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const availability = appData.doctorAvailability.filter((a: DoctorAvailabilityRow) => 
        a.doctor_id === doctorId
      ).sort((a: DoctorAvailabilityRow, b: DoctorAvailabilityRow) => {
        if (a.day_of_week !== null && b.day_of_week !== null) {
          if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
          }
          return a.start_time.localeCompare(b.start_time);
        }
        return 0;
      });
      
      resolve(availability);
    }, 100);
  });
}

export async function setDoctorAvailability(
  doctorId: string,
  availability: Omit<DoctorAvailabilityRow, 'id' | 'created_at' | 'updated_at'>
): Promise<DoctorAvailabilityRow> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // For recurring availability, check if there's already an entry for this day/time
      let existingId: string | null = null;
      
      if (availability.day_of_week !== null) {
        const existing = appData.doctorAvailability.find((a: DoctorAvailabilityRow) => 
          a.doctor_id === doctorId &&
          a.day_of_week === availability.day_of_week &&
          a.start_time === availability.start_time &&
          a.end_time === availability.end_time
        );
        
        if (existing) {
          existingId = existing.id;
        }
      }
      
      if (existingId) {
        // Update existing entry
        const index = appData.doctorAvailability.findIndex((a: DoctorAvailabilityRow) => 
          a.id === existingId
        );
        
        appData.doctorAvailability[index] = {
          ...appData.doctorAvailability[index],
          ...availability,
          updated_at: new Date().toISOString()
        };
        
        saveData(appData);
        resolve(appData.doctorAvailability[index]);
      } else {
        // Create new entry
        const newAvailability = {
          ...availability,
          id: generateId(),
          doctor_id: doctorId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        appData.doctorAvailability.push(newAvailability);
        saveData(appData);
        resolve(newAvailability);
      }
    }, 100);
  });
}

export async function deleteDoctorAvailability(id: string): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      appData.doctorAvailability = appData.doctorAvailability.filter((a: DoctorAvailabilityRow) => 
        a.id !== id
      );
      saveData(appData);
      resolve();
    }, 100);
  });
}

export async function listStockPurchases(): Promise<StockPurchaseRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...appData.stockPurchases].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }, 100);
  });
}

export async function getStockPurchaseById(id: string): Promise<StockPurchaseRow | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const purchase = appData.stockPurchases.find((p: StockPurchaseRow) => p.id === id) || null;
      resolve(purchase);
    }, 100);
  });
}

export async function listStockPurchaseItems(purchaseId: string): Promise<StockPurchaseItemRow[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const items = appData.stockPurchaseItems.filter((item: StockPurchaseItemRow) => 
        item.purchase_id === purchaseId
      );
      resolve(items);
    }, 100);
  });
}