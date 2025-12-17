export function generatePatientId(contact: string, name: string, date: Date = new Date()): string {
  const yearTwo = date.getFullYear().toString().slice(-2);
  const last4Contact = (contact || '').replace(/\D/g, '').slice(-4) || '0000';
  const first4Name = (name || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'XXXX';
  return `${yearTwo}-${last4Contact}-${first4Name}`;
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