import React, { useState, useEffect } from 'react';
import { listAppointments, listDoctors } from '../../api';
import { AppointmentRow, DoctorRow } from '../../types';
import { formatDate, formatDateTime } from '../../utils/format';

const ReceptionistDashboard: React.FC = () => {
  const [todayAppointments, setTodayAppointments] = useState<AppointmentRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [appointments, allDoctors] = await Promise.all([
        listAppointments(),
        listDoctors()
      ]);

      // Filter today's appointments
      const todaysAppts = appointments.filter(apt => {
        const aptDate = apt.created_at ? new Date(apt.created_at).toISOString().split('T')[0] : '';
        return aptDate === today;
      });

      setTodayAppointments(todaysAppts);
      setDoctors(allDoctors);
    } catch (e: any) {
      console.error('Error fetching dashboard data:', e);
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate pending appointments
  const pendingAppointments = todayAppointments.filter(apt => apt.status === 'booked');
  const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed');

  // Calculate doctor slots - only include doctors who have appointments today
  const doctorSlots = doctors
    .map(doctor => {
      const doctorAppts = todayAppointments.filter(apt => apt.doctor_id === doctor.id);
      const pending = doctorAppts.filter(apt => apt.status === 'booked').length;
      const completed = doctorAppts.filter(apt => apt.status === 'completed').length;
      
      return {
        doctor,
        total: doctorAppts.length,
        pending,
        completed,
        available: true // Simplified - can be enhanced with actual availability logic
      };
    })
    .filter(slot => slot.total > 0); // Only show doctors with appointments

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today's Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-2">Loading today's schedule...</p>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Appointments */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Total Appointments</p>
                  <p className="text-3xl font-bold mt-2">{todayAppointments.length}</p>
                  <p className="text-xs opacity-75 mt-1">Scheduled for today</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending Appointments */}
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Pending</p>
                  <p className="text-3xl font-bold mt-2">{pendingAppointments.length}</p>
                  <p className="text-xs opacity-75 mt-1">Waiting to be seen</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completed Appointments */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Completed</p>
                  <p className="text-3xl font-bold mt-2">{completedAppointments.length}</p>
                  <p className="text-xs opacity-75 mt-1">Consultations done</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Appointments List */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pending Appointments Today
                </h3>
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingAppointments.length}
                </span>
              </div>

              {pendingAppointments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingAppointments.map((apt) => {
                    const doctor = doctors.find(d => d.id === apt.doctor_id);
                    return (
                      <div key={apt.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="font-medium text-gray-900">
                                {apt.guest_name || 'Patient'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Dr. {doctor?.name || 'Unknown'}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(apt.created_at)}
                            </p>
                            {apt.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">Note: {apt.notes}</p>
                            )}
                          </div>
                          <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                            Pending
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">No pending appointments for today</p>
                </div>
              )}
            </div>

            {/* Doctor Slots/Availability */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Doctor's Schedule Today
                </h3>
              </div>

              {doctorSlots.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {doctorSlots.map((slot) => (
                    <div key={slot.doctor.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">Dr. {slot.doctor.name}</p>
                          <p className="text-xs text-gray-500">Reg: {slot.doctor.registration_number}</p>
                        </div>
                        {slot.available ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            Available
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                            Busy
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="text-lg font-bold text-blue-600">{slot.total}</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <p className="text-xs text-gray-600">Pending</p>
                          <p className="text-lg font-bold text-yellow-600">{slot.pending}</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-xs text-gray-600">Done</p>
                          <p className="text-lg font-bold text-green-600">{slot.completed}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No doctors scheduled for today</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
