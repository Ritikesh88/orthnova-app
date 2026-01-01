import { listPatients, listPrescriptions } from '../api';
import { supabase } from '../lib/supabaseClient';

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

export function generateDoctorId(registrationNumber: string, name: string, date: Date = new Date()): string {
  const yearFull = date.getFullYear().toString();
  const last4Reg = (registrationNumber || '').replace(/\D/g, '').slice(-4) || '0000';
  const initials = (name || '')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 3) || 'XX';
  return `DOC-${yearFull}-${last4Reg}-${initials}`;
}

export function calculateAge(dobIsoDate: string): number {
  const dob = new Date(dobIsoDate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

// Function to generate bill number in ON-YYMM-XXXX format (monthly serial number)
export async function generateBillNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const datePrefix = `ON-${year}${month}-`;
  
  // Get the start and end dates of the current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Retry mechanism to handle race conditions
  for (let attempts = 0; attempts < 5; attempts++) {
    // Get all bills created this month to determine the next serial number
    const { data: bills, error } = await supabase
      .from('bills')
      .select('bill_number')
      .gte('created_at', `${startOfMonth.toISOString().split('T')[0]}T00:00:00`)
      .lte('created_at', `${endOfMonth.toISOString().split('T')[0]}T23:59:59`)
      .ilike('bill_number', `${datePrefix}%`)
      .neq('bill_type', 'pharmacy'); // Exclude pharmacy bills
      
    if (error) {
      console.error('Error fetching bills for serial number generation:', error);
      // Fallback to a random number if there's an error
      const seq = Math.floor(Math.random() * 9000 + 1000).toString();
      return `${datePrefix}${seq}`;
    }
    
    // Find the highest serial number for this month
    let maxSerial = 0;
    if (bills && bills.length > 0) {
      bills.forEach((bill: any) => {
        if (bill.bill_number && bill.bill_number.startsWith(datePrefix)) {
          const serialSuffix = bill.bill_number.substring(datePrefix.length); // Get the number part after date prefix
          const serial = parseInt(serialSuffix);
          if (!isNaN(serial) && serial > maxSerial) {
            maxSerial = serial;
          }
        }
      });
    }
    
    // Next serial number
    const nextSerial = maxSerial + 1;
    const serialStr = nextSerial.toString().padStart(4, '0');
    const billNumber = `${datePrefix}${serialStr}`;
    
    // Verify that this number doesn't exist (in case another process created it while we were calculating)
    const { data: existingBill, error: existingError } = await supabase
      .from('bills')
      .select('id')
      .eq('bill_number', billNumber)
      .single();
      
    if (existingError || !existingBill) {
      // No existing bill with this number, we can use it
      return billNumber;
    }
    
    // If we get here, there was already a bill with this number, so we need to try again
    console.warn('Bill number already exists, retrying...', billNumber);
    // Add a small delay before retrying to avoid excessive database load
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // If all retries fail, generate a random number
  console.error('Failed to generate unique bill number after 5 attempts');
  const seq = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${datePrefix}${seq}`;
}



// Function to generate pharmacy bill number in ONP-YYDDMM-XXXX format
export async function generatePharmacyBillNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const datePrefix = `ONP-${year}${day}${month}-`; // Format: YYDDMM
  
  // Retry mechanism to handle race conditions
  for (let attempts = 0; attempts < 5; attempts++) {
    // Get all pharmacy bills created today to determine the next serial number
    const { data: bills, error } = await supabase
      .from('bills')
      .select('bill_number')
      .gte('created_at', `${today.toISOString().split('T')[0]}T00:00:00`)
      .lte('created_at', `${today.toISOString().split('T')[0]}T23:59:59`)
      .ilike('bill_number', `${datePrefix}%`)
      .eq('bill_type', 'pharmacy'); // Only pharmacy bills
      
    if (error) {
      console.error('Error fetching pharmacy bills for serial number generation:', error);
      // Fallback to a random number if there's an error
      const seq = Math.floor(Math.random() * 9000 + 1000).toString();
      return `${datePrefix}${seq}`;
    }
    
    // Find the highest serial number for today
    let maxSerial = 0;
    if (bills && bills.length > 0) {
      bills.forEach((bill: any) => {
        if (bill.bill_number && bill.bill_number.startsWith(datePrefix)) {
          const serialSuffix = bill.bill_number.substring(datePrefix.length); // Get the number part after date prefix
          const serial = parseInt(serialSuffix);
          if (!isNaN(serial) && serial > maxSerial) {
            maxSerial = serial;
          }
        }
      });
    }
    
    // Next serial number
    const nextSerial = maxSerial + 1;
    const serialStr = nextSerial.toString().padStart(4, '0');
    const billNumber = `${datePrefix}${serialStr}`;
    
    // Verify that this number doesn't exist (in case another process created it while we were calculating)
    const { data: existingBill, error: existingError } = await supabase
      .from('bills')
      .select('id')
      .eq('bill_number', billNumber)
      .single();
      
    if (existingError || !existingBill) {
      // No existing bill with this number, we can use it
      return billNumber;
    }
    
    // If we get here, there was already a bill with this number, so we need to try again
    console.warn('Bill number already exists, retrying...', billNumber);
    // Add a small delay before retrying to avoid excessive database load
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // If all retries fail, generate a random number
  console.error('Failed to generate unique bill number after 5 attempts');
  const seq = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${datePrefix}${seq}`;
}