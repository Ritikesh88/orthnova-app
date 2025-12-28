import { listPatients, listPrescriptions, listBills } from '../api';

// Function to generate patient ID in YYYY/XXXX format
export async function generatePatientId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const currentYearStr = currentYear.toString();
  
  // Get all patients for current year to determine the next serial number
  const allPatients = await listPatients();
  const currentYearPatients = allPatients.filter(p => {
    const patientYear = parseInt(p.patient_id.split('/')[0]);
    return patientYear === currentYear;
  });
  
  // Find the highest serial number for this year
  let maxSerial = 0;
  currentYearPatients.forEach(patient => {
    const parts = patient.patient_id.split('/');
    if (parts.length === 2 && parts[0] === currentYearStr) {
      const serial = parseInt(parts[1]);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });
  
  // Next serial number
  const nextSerial = maxSerial + 1;
  const serialStr = nextSerial.toString().padStart(4, '0');
  
  return `${currentYearStr}/${serialStr}`;
}

// Function to generate prescription serial number in YYMMDDXXX format
export async function generatePrescriptionSerialNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // Get all prescriptions created today to determine the next serial number
  const allPrescriptions = await listPrescriptions();
  const todayPrescriptions = allPrescriptions.filter(p => {
    const prescDate = new Date(p.created_at);
    return prescDate.getFullYear() === today.getFullYear() &&
           prescDate.getMonth() === today.getMonth() &&
           prescDate.getDate() === today.getDate();
  });
  
  // Find the highest serial number for today
  let maxSerial = 0;
  todayPrescriptions.forEach(prescription => {
    if (prescription.serial_number && prescription.serial_number.startsWith(datePrefix)) {
      const serialSuffix = prescription.serial_number.substring(6); // Get the number part after date prefix
      const serial = parseInt(serialSuffix);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });
  
  // Next serial number
  const nextSerial = maxSerial + 1;
  const serialStr = nextSerial.toString().padStart(3, '0');
  
  return `${datePrefix}${serialStr}`;
}

export function generateId(): string {
  return 'offline-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Function to generate bill number in ON-YYMMDD-XXXX format
export async function generateBillNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `ON-${year}${month}${day}-`;
  
  // Get all bills created today to determine the next serial number
  const allBills = await listBills();
  const todayBills = allBills.filter(b => {
    const billDate = new Date(b.created_at);
    return billDate.getFullYear() === today.getFullYear() &&
           billDate.getMonth() === today.getMonth() &&
           billDate.getDate() === today.getDate() &&
           b.bill_type !== 'pharmacy'; // Exclude pharmacy bills
  });
  
  // Find the highest serial number for today
  let maxSerial = 0;
  todayBills.forEach(bill => {
    if (bill.bill_number && bill.bill_number.startsWith(datePrefix)) {
      const serialSuffix = bill.bill_number.substring(datePrefix.length); // Get the number part after date prefix
      const serial = parseInt(serialSuffix);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });
  
  // Next serial number
  const nextSerial = maxSerial + 1;
  const serialStr = nextSerial.toString().padStart(4, '0');
  
  return `${datePrefix}${serialStr}`;
}

// Function to generate pharmacy bill number in ONP-YYDDMM-XXXX format
export async function generatePharmacyBillNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const datePrefix = `ONP-${year}${day}${month}-`; // Format: YYDDMM
  
  // Get all pharmacy bills created today to determine the next serial number
  const allBills = await listBills();
  const todayBills = allBills.filter(b => {
    const billDate = new Date(b.created_at);
    return billDate.getFullYear() === today.getFullYear() &&
           billDate.getMonth() === today.getMonth() &&
           billDate.getDate() === today.getDate() &&
           b.bill_type === 'pharmacy'; // Only pharmacy bills
  });
  
  // Find the highest serial number for today
  let maxSerial = 0;
  todayBills.forEach(bill => {
    if (bill.bill_number && bill.bill_number.startsWith(datePrefix)) {
      const serialSuffix = bill.bill_number.substring(datePrefix.length); // Get the number part after date prefix
      const serial = parseInt(serialSuffix);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });
  
  // Next serial number
  const nextSerial = maxSerial + 1;
  const serialStr = nextSerial.toString().padStart(4, '0');
  
  return `${datePrefix}${serialStr}`;
}