import React, { useEffect, useState } from 'react';
import { listUsers, listPatients, listPrescriptions, listAppointments, listDoctorAvailability } from '../../api';
import { DoctorAvailabilityRow } from '../../types';
import { Link } from 'react-router-dom';

const StatCard: React.FC<{ title: string; value: number; icon?: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">{icon || '•'}</div>
    <div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState(0);
  const [patients, setPatients] = useState(0);
  const [prescriptions, setPrescriptions] = useState(0);
  const [todayTotalVisits, setTodayTotalVisits] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [todayWalkinVisits, setTodayWalkinVisits] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [doctorsSchedule, setDoctorsSchedule] = useState(0);

  useEffect(() => {
    (async () => {
      const [u, p, pr] = await Promise.all([listUsers(), listPatients(), listPrescriptions()]);
      setUsers(u.length);
      setPatients(p.length);
      setPrescriptions(pr.length);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Count unique prescriptions for today (walk-in visits)
      const uniquePatientVisits = new Set<string>();
      const todaysPrescriptions = pr.filter(p => {
        const prescDate = new Date(p.created_at);
        const prescDateStr = prescDate.toISOString().split('T')[0];
        
        // Create a unique key for patient visit per day
        const uniqueKey = `${p.patient_id}-${prescDateStr}-${p.visit_type}`;
        
        if (prescDateStr === today && !uniquePatientVisits.has(uniqueKey)) {
          uniquePatientVisits.add(uniqueKey);
          return true;
        }
        return false;
      });
      
      // Count appointments for today
      const appointments = await listAppointments({ appointment_date_exact: today });
      
      // Count pending appointments for today
      const allAppointments = await listAppointments();
      const pendingAppointmentsToday = allAppointments.filter(a => {
        // Check if the appointment date is today and status is booked (pending)
        let appointmentDate = '';
        if (a.appointment_datetime) {
          appointmentDate = new Date(a.appointment_datetime).toISOString().split('T')[0];
        } else if (a.appointment_date) {
          appointmentDate = a.appointment_date;
        } else {
          appointmentDate = new Date(a.created_at).toISOString().split('T')[0];
        }
        return appointmentDate === today && a.status === 'booked';
      });
      
      // Count doctor schedules for today (from doctor availability)
      // Count unique doctors with appointments today
      const doctorsWithAppointments = new Set(appointments.map(a => a.doctor_id));
      
      // Set counts
      setTodayAppointments(appointments.length);
      setTodayWalkinVisits(todaysPrescriptions.length);
      setTodayTotalVisits(todaysPrescriptions.length + appointments.length);
      setPendingAppointments(pendingAppointmentsToday.length);
      setDoctorsSchedule(doctorsWithAppointments.size);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard title="Users" value={users} />
        <StatCard title="Patients" value={patients} />
        <StatCard title="Prescriptions" value={prescriptions} />
        <StatCard title="Today's Total Visits" value={todayTotalVisits} />
        <StatCard title="Today's Appointments" value={todayAppointments} />
        <StatCard title="Today's Walk-ins" value={todayWalkinVisits} />
        <StatCard title="Pending Today" value={pendingAppointments} />
        <StatCard title="Doctors Today" value={doctorsSchedule} />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Activities</h2>
          <div className="flex gap-2">
            <Link to="/admin/doctor-availability" className="btn btn-secondary">Manage My Availability</Link>
            <button className="btn btn-secondary">View All</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-4">—</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2 pr-4">This can be wired to recent entities.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;