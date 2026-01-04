import React, { useState, useEffect } from 'react';
import { getSalesSummary, getDoctorSalesReport, getServiceSalesReport, getBillsByDate, getBillsByMonth, getBillsByDoctor, getBillsByDateRange, getBillById, listBillItems, getDoctorById, listPrescriptions, SalesSummary, DoctorSalesReport, ServiceSalesReport, BillDetail, listBills, listDoctors } from '../../api';
import { BillRow, BillItemRow, DoctorRow, PrescriptionRow } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import * as XLSX from 'xlsx'; // Using type assertion for utils to avoid TypeScript issues
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

type ReportTab = 'sales' | 'doctor' | 'service' | 'doctorServices' | 'visitType';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salesData, setSalesData] = useState<SalesSummary[]>([]);
  const [doctorData, setDoctorData] = useState<DoctorSalesReport[]>([]);
  const [serviceData, setServiceData] = useState<ServiceSalesReport[]>([]);
  const [visitTypeData, setVisitTypeData] = useState<{visit_type: 'walk-in' | 'appointment'; count: number}[]>([]);

  type Summary = {
    total_bills?: number;
    total_amount?: number;
    total_discount?: number;
    net_amount?: number;
    total_quantity?: number;
    total_visits?: number;
    walkin_visits?: number;
    appointment_visits?: number;
  };

  // Deep dive states
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [deepDiveData, setDeepDiveData] = useState<BillDetail[]>([]);
  const [deepDiveTitle, setDeepDiveTitle] = useState('');

  // Bill detail modal states
  const [showBillDetail, setShowBillDetail] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillRow | null>(null);
  const [billItems, setBillItems] = useState<BillItemRow[]>([]);
  const [loadingBillDetail, setLoadingBillDetail] = useState(false);

  // Doctor-Service analysis
  const [doctorServiceData, setDoctorServiceData] = useState<Array<{
    doctor_id: string;
    doctor_name: string;
    services: Array<{ service_name: string; quantity: number; amount: number }>;
    total_amount: number;
  }>>([]);

  // Set default dates (today and 30 days ago)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'sales') {
        if (user?.role === 'doctor' && user?.userId) {
          // For doctor role, get their own doctor ID and fetch only their data
          const allDoctors: DoctorRow[] = await listDoctors();
          const doctorMatch = allDoctors.find(doctor => 
            doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
            user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
          );
          
          if (doctorMatch) {
            // Get bills specifically for this doctor and generate sales summary
            const doctorBills = await getBillsByDoctor(doctorMatch.id, startDate, endDate);
            
            // Group bills by date/month as needed
            const grouped: Record<string, SalesSummary> = {};
            
            doctorBills.forEach(bill => {
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

            setSalesData(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
          } else {
            setSalesData([]);
            setError('Doctor profile not found. Contact admin to set up your doctor profile.');
          }
        } else {
          const data = await getSalesSummary(startDate, endDate, groupBy);
          setSalesData(data);
        }
      } else if (activeTab === 'doctor') {
        if (user?.role === 'doctor' && user?.userId) {
          // For doctor role, get their own doctor ID and fetch only their data
          const allDoctors: DoctorRow[] = await listDoctors();
          const doctorMatch = allDoctors.find(doctor => 
            doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
            user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
          );
          
          if (doctorMatch) {
            // Get bills specifically for this doctor
            const doctorBills = await getBillsByDoctor(doctorMatch.id, startDate, endDate);
            // Convert to doctor sales report format
            const reportData: DoctorSalesReport[] = [
              {
                doctor_id: doctorMatch.id,
                doctor_name: doctorMatch.name,
                total_bills: doctorBills.length,
                total_amount: doctorBills.reduce((sum, bill) => sum + bill.total_amount, 0),
                total_discount: doctorBills.reduce((sum, bill) => sum + bill.discount, 0),
                net_amount: doctorBills.reduce((sum, bill) => sum + bill.net_amount, 0),
              }
            ];
            setDoctorData(reportData);
          } else {
            setDoctorData([]);
            setError('Doctor profile not found. Contact admin to set up your doctor profile.');
          }
        } else {
          const data = await getDoctorSalesReport(startDate, endDate);
          setDoctorData(data);
        }
      } else if (activeTab === 'service') {
        if (user?.role === 'doctor' && user?.userId) {
          // For doctor role, only show services associated with their bills
          const allDoctors: DoctorRow[] = await listDoctors();
          const doctorMatch = allDoctors.find(doctor => 
            doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
            user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
          );
          
          if (doctorMatch) {
            // Get all bills for this doctor in the date range
            const doctorBills = await getBillsByDoctor(doctorMatch.id, startDate, endDate);
            const billIds = doctorBills.map(bill => bill.id);
            
            // Get service sales report only for this doctor's bills
            const itemsRes = await supabase
              .from('bill_items')
              .select('service_id, item_name, quantity, total')
              .in('bill_id', billIds)
              .not('service_id', 'is', null);
            
            if (itemsRes.error) throw new Error(itemsRes.error.message);
            
            const items = itemsRes.data || [];
            const serviceMap: Record<string, ServiceSalesReport> = {};
            
            items.forEach((item: any) => {
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
            
            setServiceData(Object.values(serviceMap).sort((a, b) => b.total_amount - a.total_amount));
          } else {
            setServiceData([]);
            setError('Doctor profile not found. Contact admin to set up your doctor profile.');
          }
        } else {
          const data = await getServiceSalesReport(startDate, endDate);
          setServiceData(data);
        }
      } else if (activeTab === 'doctorServices') {
        // Fetch doctor-service analysis
        await fetchDoctorServiceAnalysis();
      } else if (activeTab === 'visitType') {
        // Fetch visit type report data
        await fetchVisitTypeReport();
      }
    } catch (e: any) {
      console.error('Error fetching reports:', e);
      setError(e.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitTypeReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let prescriptions = await listPrescriptions();
      
      // Filter by date range
      prescriptions = prescriptions.filter((prescription: PrescriptionRow) => {
        const prescriptionDate = new Date(prescription.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Set time to beginning/end of day for comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        return prescriptionDate >= start && prescriptionDate <= end;
      });
      
      // Group by visit type
      const visitTypeMap: Record<string, number> = {
        'walk-in': 0,
        'appointment': 0
      };
      
      prescriptions.forEach((prescription: PrescriptionRow) => {
        if (prescription.visit_type === 'walk-in' || prescription.visit_type === 'appointment') {
          visitTypeMap[prescription.visit_type]++;
        }
      });
      
      // Convert to array format
      const result = Object.entries(visitTypeMap).map(([visit_type, count]) => ({
        visit_type: visit_type as 'walk-in' | 'appointment',
        count
      }));
      
      setVisitTypeData(result);
    } catch (e: any) {
      console.error('Error fetching visit type report:', e);
      setError(e.message || 'Failed to fetch visit type report');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorServiceAnalysis = async () => {
    try {
      if (user?.role === 'doctor' && user?.userId) {
        // For doctor role, get their own doctor ID and fetch only their bills
        const allDoctors: DoctorRow[] = await listDoctors();
        const doctorMatch = allDoctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch) {
          // Get bills specifically for this doctor
          const doctorBills = await getBillsByDoctor(doctorMatch.id, startDate, endDate);
          const billIds = doctorBills.map(bill => bill.id);
          
          // Get bill items for these bills
          const itemsRes = await supabase
            .from('bill_items')
            .select('service_id, bill_id, quantity, total')
            .in('bill_id', billIds)
            .not('service_id', 'is', null);
          
          if (itemsRes.error) throw new Error(itemsRes.error.message);
          
          const items = itemsRes.data || [];
          
          // Group by doctor and services
          const doctorServiceMap = new Map<string, any>();
          
          // Get services data
          const serviceIds = items.map(item => item.service_id).filter(Boolean) as string[];
          let servicesMap: Record<string, string> = {};
          
          if (serviceIds.length > 0) {
            const servicesRes = await supabase
              .from('services')
              .select('id, service_name')
              .in('id', serviceIds);
            
            if (!servicesRes.error && servicesRes.data) {
              servicesRes.data.forEach((s: any) => {
                servicesMap[s.id] = s.service_name;
              });
            }
          }
          
          // Process items
          items.forEach(item => {
            if (!doctorServiceMap.has(doctorMatch.id)) {
              doctorServiceMap.set(doctorMatch.id, {
                doctor_id: doctorMatch.id,
                doctor_name: doctorMatch.name,
                services: [],
                total_amount: 0
              });
            }
            
            const doctorData = doctorServiceMap.get(doctorMatch.id);
            const service_name = servicesMap[item.service_id as string] || 'Unknown Service';
            
            // Check if service already exists in the array
            const existingService = doctorData.services.find((s: any) => s.service_name === service_name);
            
            if (existingService) {
              existingService.quantity += Number(item.quantity || 0);
              existingService.amount += Number(item.total || 0);
            } else {
              doctorData.services.push({
                service_name,
                quantity: Number(item.quantity || 0),
                amount: Number(item.total || 0)
              });
            }
            
            doctorData.total_amount += Number(item.total || 0);
          });
          
          setDoctorServiceData(Array.from(doctorServiceMap.values()));
        } else {
          setDoctorServiceData([]);
          setError('Doctor profile not found. Contact admin to set up your doctor profile.');
        }
      } else {
        // For admin/other roles, get all bills in date range
        const bills = await getBillsByDate(startDate); // Get all bills in date range
        // You'll need to implement a proper API function to get bills with items by date range
        // For now, this is a placeholder
        const doctorServiceMap = new Map<string, any>();
        
        // This is simplified - in production, you'd need a dedicated API endpoint
        setDoctorServiceData([]);
      }
    } catch (e: any) {
      console.error('Error fetching doctor-service analysis:', e);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      if (activeTab === 'doctorServices') {
        fetchDoctorServiceAnalysis();
      } else if (activeTab === 'visitType') {
        fetchVisitTypeReport();
      } else {
        fetchReports();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupBy]);

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - days);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(pastDate.toISOString().split('T')[0]);
  };

  const getTotalSummary = () => {
    if (activeTab === 'sales') {
      return {
        total_bills: salesData.reduce((sum, d) => sum + d.total_bills, 0),
        total_amount: salesData.reduce((sum, d) => sum + d.total_amount, 0),
        total_discount: salesData.reduce((sum, d) => sum + d.total_discount, 0),
        net_amount: salesData.reduce((sum, d) => sum + d.net_amount, 0),
      };
    } else if (activeTab === 'doctor') {
      return {
        total_bills: doctorData.reduce((sum, d) => sum + d.total_bills, 0),
        total_amount: doctorData.reduce((sum, d) => sum + d.total_amount, 0),
        total_discount: doctorData.reduce((sum, d) => sum + d.total_discount, 0),
        net_amount: doctorData.reduce((sum, d) => sum + d.net_amount, 0),
      };
    } else if (activeTab === 'service') {
      return {
        total_quantity: serviceData.reduce((sum, d) => sum + d.total_quantity, 0),
        total_amount: serviceData.reduce((sum, d) => sum + d.total_amount, 0),
      };
    } else if (activeTab === 'visitType') {
      const walkinCount = visitTypeData.find(v => v.visit_type === 'walk-in')?.count || 0;
      const appointmentCount = visitTypeData.find(v => v.visit_type === 'appointment')?.count || 0;
      return {
        total_visits: walkinCount + appointmentCount,
        walkin_visits: walkinCount,
        appointment_visits: appointmentCount,
      };
    }
    return null;
  };

  const summary = getTotalSummary() as Summary | null;

  // Export to Excel
  const exportToExcel = () => {
    let data: any[] = [];
    let sheetName = '';

    if (activeTab === 'sales') {
      sheetName = 'Sales Summary';
      data = salesData.map(row => ({
        Date: groupBy === 'month' 
          ? new Date(row.date + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
          : formatDate(row.date),
        'Total Bills': row.total_bills,
        'Total Amount': row.total_amount,
        'Discount': row.total_discount,
        'Net Amount': row.net_amount,
      }));
    } else if (activeTab === 'doctor') {
      sheetName = 'Doctor Sales';
      data = doctorData.map(row => ({
        'Doctor Name': row.doctor_name,
        'Total Bills': row.total_bills,
        'Total Amount': row.total_amount,
        'Discount': row.total_discount,
        'Net Amount': row.net_amount,
      }));
    } else if (activeTab === 'service') {
      sheetName = 'Service Sales';
      data = serviceData.map(row => ({
        'Service Name': row.service_name,
        'Total Quantity': row.total_quantity,
        'Total Sales': row.total_amount,
      }));
    }

    const worksheet = (XLSX as any).utils.json_to_sheet(data);
    const workbook = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}_${startDate}_to_${endDate}.xlsx`);
  };

  // Export Complete Billing Data to Excel
  const exportCompleteBillingDataToExcel = async () => {
    setLoading(true);
    try {
      let allBills: BillDetail[];
      
      if (user?.role === 'doctor' && user?.userId) {
        // For doctor role, get their own doctor ID and fetch only their bills
        const allDoctors: DoctorRow[] = await listDoctors();
        const doctorMatch = allDoctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch) {
          // Get all bills for this doctor in the date range
          const doctorBills = await getBillsByDoctor(doctorMatch.id, startDate, endDate);
          allBills = doctorBills;
        } else {
          allBills = [];
          setError('Doctor profile not found. Contact admin to set up your doctor profile.');
          return;
        }
      } else {
        // Fetch all bills in the selected date range
        allBills = await getBillsByDateRange(startDate, endDate);
      }
      
      // Export to Excel
      const data = allBills.map((bill: BillDetail) => ({
        'Bill Number': bill.bill_number,
        'Date': formatDateTime(bill.created_at),
        'Patient': bill.patient_name || bill.guest_name || 'N/A',
        'Doctor': bill.doctor_name || 'N/A',
        'Total Amount': bill.total_amount,
        'Discount': bill.discount,
        'Net Amount': bill.net_amount,
        'Payment Mode': bill.mode_of_payment,
        'Status': bill.status,
      }));

      const worksheet = (XLSX as any).utils.json_to_sheet(data);
      const workbook = (XLSX as any).utils.book_new();
      (XLSX as any).utils.book_append_sheet(workbook, worksheet, 'Complete Billing Data');
      XLSX.writeFile(workbook, `Complete_Billing_Data_${startDate}_to_${endDate}.xlsx`);
    } catch (e: any) {
      console.error('Error exporting complete billing data:', e);
      setError(e.message || 'Failed to export complete billing data');
    } finally {
      setLoading(false);
    }
  };

  // Export Complete Billing Data to PDF
  const exportCompleteBillingDataToPDF = async () => {
    setLoading(true);
    try {
      let allBills: BillDetail[];
      
      if (user?.role === 'doctor' && user?.userId) {
        // For doctor role, get their own doctor ID and fetch only their bills
        const allDoctors: DoctorRow[] = await listDoctors();
        const doctorMatch = allDoctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch) {
          // Get all bills for this doctor in the date range
          const doctorBills = await getBillsByDoctor(doctorMatch.id, startDate, endDate);
          allBills = doctorBills;
        } else {
          allBills = [];
          setError('Doctor profile not found. Contact admin to set up your doctor profile.');
          return;
        }
      } else {
        // Fetch all bills in the selected date range
        allBills = await getBillsByDateRange(startDate, endDate);
      }
      
      // Export to PDF
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('Complete Billing Data', 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
      
      const headers = [['Bill #', 'Date', 'Patient', 'Doctor', 'Total', 'Discount', 'Net', 'Payment', 'Status']];
      const data = allBills.map((bill: BillDetail) => [
        bill.bill_number,
        formatDateTime(bill.created_at),
        bill.patient_name || bill.guest_name || 'N/A',
        bill.doctor_name || 'N/A',
        formatCurrency(bill.total_amount),
        formatCurrency(bill.discount),
        formatCurrency(bill.net_amount),
        bill.mode_of_payment,
        bill.status,
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], halign: 'center' },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 30 },
          2: { halign: 'left', cellWidth: 30 },
          3: { halign: 'left', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 22 },
          7: { halign: 'center', cellWidth: 20 },
          8: { halign: 'center', cellWidth: 18 },
        },
      });

      doc.save(`Complete_Billing_Data_${startDate}_to_${endDate}.pdf`);
    } catch (e: any) {
      console.error('Error exporting complete billing data to PDF:', e);
      setError(e.message || 'Failed to export complete billing data to PDF');
    } finally {
      setLoading(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let title = '';
    let headers: any[] = [];
    let data: any[][] = [];

    if (activeTab === 'sales') {
      title = 'Sales Summary Report';
      headers = [['Date', 'Bills', 'Total Amount', 'Discount', 'Net Amount']];
      data = salesData.map(row => [
        groupBy === 'month' 
          ? new Date(row.date + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
          : formatDate(row.date),
        row.total_bills.toString(),
        formatCurrency(row.total_amount),
        formatCurrency(row.total_discount),
        formatCurrency(row.net_amount),
      ]);
    } else if (activeTab === 'doctor') {
      title = 'Doctor Sales Report';
      headers = [['Doctor Name', 'Bills', 'Total Amount', 'Discount', 'Net Amount']];
      data = doctorData.map(row => [
        row.doctor_name,
        row.total_bills.toString(),
        formatCurrency(row.total_amount),
        formatCurrency(row.total_discount),
        formatCurrency(row.net_amount),
      ]);
    } else if (activeTab === 'service') {
      title = 'Service Sales Report';
      headers = [['Service Name', 'Quantity', 'Total Sales']];
      data = serviceData.map(row => [
        row.service_name,
        row.total_quantity.toString(),
        formatCurrency(row.total_amount),
      ]);
    }

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      styles: { fontSize: 9 },
      columnStyles: activeTab === 'sales' || activeTab === 'doctor' ? {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      } : {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });

    doc.save(`${title.replace(/ /g, '_')}_${startDate}_to_${endDate}.pdf`);
  };

  // Deep dive handlers
  const handleDateClick = async (date: string) => {
    setLoading(true);
    try {
      let bills: BillDetail[];
      if (user?.role === 'doctor' && user?.userId) {
        // For doctor role, get their own doctor ID and filter bills by their name
        const allDoctors: DoctorRow[] = await listDoctors();
        const doctorMatch = allDoctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch) {
          if (groupBy === 'month') {
            const [year, month] = date.split('-').map(Number);
            const allBills = await getBillsByMonth(year, month);
            bills = allBills.filter(bill => bill.doctor_id === doctorMatch.id);
            setDeepDiveTitle(`Bills for ${new Date(year, month - 1).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}`);
          } else {
            const allBills = await getBillsByDate(date);
            bills = allBills.filter(bill => bill.doctor_id === doctorMatch.id);
            setDeepDiveTitle(`Bills for ${formatDate(date)}`);
          }
        } else {
          bills = [];
          setError('Doctor profile not found. Contact admin to set up your doctor profile.');
        }
      } else {
        if (groupBy === 'month') {
          const [year, month] = date.split('-').map(Number);
          bills = await getBillsByMonth(year, month);
          setDeepDiveTitle(`Bills for ${new Date(year, month - 1).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}`);
        } else {
          bills = await getBillsByDate(date);
          setDeepDiveTitle(`Bills for ${formatDate(date)}`);
        }
      }
      setDeepDiveData(bills);
      setShowDeepDive(true);
    } catch (e: any) {
      console.error('Error fetching bills:', e);
      setError(e.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorClick = async (doctorId: string, doctorName: string) => {
    setLoading(true);
    try {
      if (user?.role === 'doctor' && user?.userId) {
        // For doctor role, only allow viewing their own bills
        const allDoctors: DoctorRow[] = await listDoctors();
        const doctorMatch = allDoctors.find(doctor => 
          doctor.name.toLowerCase().includes(user.userId.toLowerCase()) ||
          user.userId.toLowerCase().includes(doctor.name.toLowerCase().split(' ')[0]?.toLowerCase() || '')
        );
        
        if (doctorMatch && doctorMatch.id === doctorId) {
          const bills = await getBillsByDoctor(doctorId, startDate, endDate);
          setDeepDiveData(bills);
          setDeepDiveTitle(`Bills by ${doctorName}`);
          setShowDeepDive(true);
        } else {
          setError('You can only view your own bills');
        }
      } else {
        const bills = await getBillsByDoctor(doctorId, startDate, endDate);
        setDeepDiveData(bills);
        setDeepDiveTitle(`Bills by ${doctorName}`);
        setShowDeepDive(true);
      }
    } catch (e: any) {
      console.error('Error fetching bills:', e);
      setError(e.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  // Export deep dive data
  const exportDeepDiveToExcel = () => {
    const data = deepDiveData.map(bill => ({
      'Bill Number': bill.bill_number,
      'Date': formatDateTime(bill.created_at),
      'Patient': bill.patient_name || bill.guest_name || 'N/A',
      'Doctor': bill.doctor_name || 'N/A',
      'Total Amount': bill.total_amount,
      'Discount': bill.discount,
      'Net Amount': bill.net_amount,
      'Payment Mode': bill.mode_of_payment,
      'Status': bill.status,
    }));

    const worksheet = (XLSX as any).utils.json_to_sheet(data);
    const workbook = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(workbook, worksheet, 'Bill Details');
    XLSX.writeFile(workbook, `${deepDiveTitle.replace(/ /g, '_')}.xlsx`);
  };

  const exportDeepDiveToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(deepDiveTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

    const headers = [['Bill #', 'Date', 'Patient', 'Doctor', 'Total', 'Discount', 'Net', 'Status']];
    const data = deepDiveData.map(bill => [
      bill.bill_number,
      formatDateTime(bill.created_at),
      bill.patient_name || bill.guest_name || 'N/A',
      bill.doctor_name || 'N/A',
      formatCurrency(bill.total_amount),
      formatCurrency(bill.discount),
      formatCurrency(bill.net_amount),
      bill.status,
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 20 },
        1: { halign: 'left', cellWidth: 30 },
        2: { halign: 'left', cellWidth: 30 },
        3: { halign: 'left', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 18 },
      },
    });

    doc.save(`${deepDiveTitle.replace(/ /g, '_')}.pdf`);
  };

  const handleViewBill = async (billId: string) => {
    setLoadingBillDetail(true);
    try {
      const [bill, items] = await Promise.all([
        getBillById(billId),
        listBillItems(billId)
      ]);
      if (bill) {
        // Fetch doctor details if doctor_id exists
        if (bill.doctor_id) {
          const doctor = await getDoctorById(bill.doctor_id);
          (bill as any).opd_fees = doctor?.opd_fees || 0;
        }
        setSelectedBill(bill);
        setBillItems(items);
        setShowBillDetail(true);
      }
    } catch (e: any) {
      console.error('Error loading bill details:', e);
      setError(e.message || 'Failed to load bill details');
    } finally {
      setLoadingBillDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bill Detail Modal */}
      {showBillDetail && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Bill Details - {selectedBill.bill_number}</h3>
              <button
                onClick={() => { setShowBillDetail(false); setSelectedBill(null); setBillItems([]); }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Patient:</p>
                  <p className="font-medium">{(selectedBill as any).patient_name || (selectedBill as any).guest_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Doctor:</p>
                  <p className="font-medium">{(selectedBill as any).doctor_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date:</p>
                  <p className="font-medium">{formatDateTime(selectedBill.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Mode:</p>
                  <p className="font-medium">{selectedBill.mode_of_payment}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status:</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedBill.status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedBill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Bill Items</h4>
                {billItems.length > 0 ? (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Service</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Price</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billItems.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{(item as any).service_name || 'Service'}</td>
                          <td className="py-2 text-right">{item.quantity}</td>
                          <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                          <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                      {(selectedBill as any).doctor_id && (
                        <tr className="border-b bg-blue-50">
                          <td className="py-2 font-medium">Consultation Fee</td>
                          <td className="py-2 text-right">1</td>
                          <td className="py-2 text-right">{formatCurrency((selectedBill as any).opd_fees || 0)}</td>
                          <td className="py-2 text-right">{formatCurrency((selectedBill as any).opd_fees || 0)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-center py-4">No items found</p>
                )}
              </div>

              <div className="border-t pt-4 mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(selectedBill.total_amount)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-semibold">-{formatCurrency(selectedBill.discount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Net Amount:</span>
                  <span>{formatCurrency(selectedBill.net_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deep Dive Modal */}
      {showDeepDive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{deepDiveTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportDeepDiveToExcel}
                  className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                  title="Export to Excel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={exportDeepDiveToPDF}
                  className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                  title="Export to PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => setShowDeepDive(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold ml-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {deepDiveData.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Bill Number</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Patient</th>
                      <th className="py-2 pr-4">Doctor</th>
                      <th className="py-2 pr-4 text-right w-24">Total</th>
                      <th className="py-2 pr-4 text-right w-24">Discount</th>
                      <th className="py-2 pr-4 text-right w-24">Net Amount</th>
                      <th className="py-2 pr-4">Payment</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deepDiveData.map((bill) => (
                      <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => handleViewBill(bill.id)}
                            className="text-brand-600 hover:text-brand-800 hover:underline font-medium cursor-pointer"
                          >
                            {bill.bill_number}
                          </button>
                        </td>
                        <td className="py-2 pr-4">{formatDateTime(bill.created_at)}</td>
                        <td className="py-2 pr-4">{bill.patient_name || bill.guest_name || 'N/A'}</td>
                        <td className="py-2 pr-4">{bill.doctor_name || 'N/A'}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(bill.total_amount)}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(bill.discount)}</td>
                        <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(bill.net_amount)}</td>
                        <td className="py-2 pr-4">
                          <span className="text-xs">{bill.mode_of_payment}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                            bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold border-t-2">
                      <td colSpan={4} className="py-2 pr-4 text-right">Total:</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(deepDiveData.reduce((sum, b) => sum + b.total_amount, 0))}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-600">
                        {formatCurrency(deepDiveData.reduce((sum, b) => sum + b.discount, 0))}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(deepDiveData.reduce((sum, b) => sum + b.net_amount, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-8">No bills found</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-xl font-semibold mb-4">Reports</h2>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'sales'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Summary
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'doctor'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('doctor')}
          >
            Doctor Sales
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'service'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('service')}
          >
            Service Sales
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'doctorServices'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('doctorServices')}
          >
            Doctor-Services
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'visitType'
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('visitType')}
          >
            Visit Type
          </button>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              className="w-full"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              className="w-full"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          {activeTab === 'sales' && (
            <div>
              <label className="block text-sm font-medium mb-1">Group By</label>
              <select
                className="w-full"
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as 'day' | 'month')}
              >
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={fetchReports} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Quick Select */}
        <div className="flex gap-2 mb-4">
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => handleQuickSelect(7)}>
            Last 7 Days
          </button>
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => handleQuickSelect(30)}>
            Last 30 Days
          </button>
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => handleQuickSelect(90)}>
            Last 90 Days
          </button>
          <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(firstDay.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
          }}>
            This Month
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(activeTab === 'visitType') ? (
            <>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold">{summary.total_visits ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Walk-in Visits</p>
                <p className="text-2xl font-bold">{summary.walkin_visits ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Appointment Visits</p>
                <p className="text-2xl font-bold">{summary.appointment_visits ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Walk-in %</p>
                <p className="text-2xl font-bold">{summary.total_visits ? (((summary.walkin_visits ?? 0) / summary.total_visits) * 100).toFixed(1) + '%' : '0%'}</p>
              </div>
            </>
          ) : activeTab === 'service' ? (
            <>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Quantity</p>
                <p className="text-2xl font-bold">{summary.total_quantity}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_amount ?? 0)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Bills</p>
                <p className="text-2xl font-bold">{summary.total_bills}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_amount ?? 0)}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Total Discount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_discount ?? 0)}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500">Net Amount</p>
                <p className="text-2xl font-bold text-brand-600">{formatCurrency(summary.net_amount ?? 0)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Report Tables */}
      <div className="card p-6">
        {/* Export Buttons */}
        {!loading && (
          (activeTab === 'sales' && salesData.length > 0) || 
          (activeTab === 'doctor' && doctorData.length > 0) || 
          (activeTab === 'service' && serviceData.length > 0) ||
          (activeTab === 'doctorServices' && doctorServiceData.length > 0)
        ) && (
          (activeTab === 'sales' && salesData.length > 0) || 
          (activeTab === 'doctor' && doctorData.length > 0) || 
          (activeTab === 'service' && serviceData.length > 0) || 
          (activeTab === 'doctorServices' && doctorServiceData.length > 0) ||
          (activeTab as string === 'visitType' && visitTypeData.length > 0)
        ) && (
          <div className="mb-4 flex gap-2 justify-end">
            <div className="relative group">
              <button
                className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Complete Billing Data
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block z-10">
                <button
                  onClick={exportCompleteBillingDataToExcel}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Excel
                </button>
                <button
                  onClick={exportCompleteBillingDataToPDF}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  PDF
                </button>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Summary to Excel
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export Summary to PDF
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading report data...</p>
          </div>
        ) : activeTab === 'sales' && salesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4 text-right">Bills</th>
                  <th className="py-2 pr-4 text-right">Total Amount</th>
                  <th className="py-2 pr-4 text-right">Discount</th>
                  <th className="py-2 pr-4 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => handleDateClick(row.date)}
                        className="text-brand-600 hover:text-brand-800 hover:underline font-medium cursor-pointer"
                      >
                        {groupBy === 'month' 
                          ? new Date(row.date + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
                          : formatDate(row.date)}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-right">{row.total_bills}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(row.total_amount)}</td>
                    <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(row.total_discount)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(row.net_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'doctor' && doctorData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Doctor Name</th>
                  <th className="py-2 pr-4 text-right">Total Bills</th>
                  <th className="py-2 pr-4 text-right">Total Amount</th>
                  <th className="py-2 pr-4 text-right">Discount</th>
                  <th className="py-2 pr-4 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {doctorData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => handleDoctorClick(row.doctor_id, row.doctor_name)}
                        className="text-brand-600 hover:text-brand-800 hover:underline font-medium cursor-pointer"
                      >
                        {row.doctor_name}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-right">{row.total_bills}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(row.total_amount)}</td>
                    <td className="py-2 pr-4 text-right text-red-600">{formatCurrency(row.total_discount)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(row.net_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'service' && serviceData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Service Name</th>
                  <th className="py-2 pr-4 text-right">Total Quantity</th>
                  <th className="py-2 pr-4 text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {serviceData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{row.service_name}</td>
                    <td className="py-2 pr-4 text-right">{row.total_quantity}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'doctorServices' && doctorServiceData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Doctor</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4 text-right">Quantity</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {doctorServiceData.map((docData, idx) => (
                  <React.Fragment key={idx}>
                    {docData.services.map((service, serviceIdx) => (
                      <tr key={`${idx}-${serviceIdx}`} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">{docData.doctor_name}</td>
                        <td className="py-2 pr-4">{service.service_name}</td>
                        <td className="py-2 pr-4 text-right">{service.quantity}</td>
                        <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(service.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <td className="py-2 pr-4 font-bold" colSpan={2}>Total for {docData.doctor_name}</td>
                      <td className="py-2 pr-4 text-right font-bold">-</td>
                      <td className="py-2 pr-4 text-right font-bold">{formatCurrency(docData.total_amount)}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'visitType' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Visit Type</th>
                  <th className="py-2 pr-4 text-right">Count</th>
                  <th className="py-2 pr-4 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {visitTypeData.map((row: {visit_type: 'walk-in' | 'appointment'; count: number}, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.visit_type === 'walk-in' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {row.visit_type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right">{row.count}</td>
                    <td className="py-2 pr-4 text-right">
                      {(() => {
                        const total = visitTypeData.reduce((sum: number, r: {visit_type: 'walk-in' | 'appointment'; count: number}) => sum + r.count, 0);
                        return total > 0 ? ((row.count / total) * 100).toFixed(1) + '%' : '0%';
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right">
                    {visitTypeData.reduce((sum: number, r: {visit_type: 'walk-in' | 'appointment'; count: number}) => sum + r.count, 0)}
                  </td>
                  <td className="py-2 pr-4 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : activeTab === 'doctorServices' ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Doctor-Services Analysis</p>
            <p className="text-sm">This feature shows which doctors prescribed which services.</p>
            <p className="text-sm text-gray-400 mt-4">No data available for the selected period</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {startDate && endDate ? 'No data found for the selected period' : 'Please select a date range'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

