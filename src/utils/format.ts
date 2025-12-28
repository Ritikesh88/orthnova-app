export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

export function generateBillNumber(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = now.getFullYear().toString().slice(-2); // Get last 2 digits of year
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  // Generate a 4-digit sequential number (replace with actual sequential logic if needed)
  const seq = Math.floor(Math.random() * 9000 + 1000); // 4-digit random for now
  return `ON-${y}${m}${d}-${seq}`;
}