import React, { useEffect, useState } from 'react';
import { listDoctors, listDoctorAvailability, setDoctorAvailability, deleteDoctorAvailability } from '../../api';
import { DoctorRow, DoctorAvailabilityRow } from '../../types';

const DoctorAvailability: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [availability, setAvailability] = useState<DoctorAvailabilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [availabilityType, setAvailabilityType] = useState<'recurring' | 'specific'>('recurring');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [specificDate, setSpecificDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await listDoctors();
        setDoctors(data);
        if (data.length > 0) {
          setSelectedDoctor(data[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchAvailability();
    }
  }, [selectedDoctor]);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDoctorAvailability(selectedDoctor);
      setAvailability(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (availabilityType === 'recurring' && (dayOfWeek < 0 || dayOfWeek > 6)) {
      setError('Please select a valid day of the week');
      return;
    }
    
    if (availabilityType === 'specific' && !specificDate) {
      setError('Please select a specific date');
      return;
    }

    try {
      await setDoctorAvailability(selectedDoctor, {
        doctor_id: selectedDoctor,
        day_of_week: availabilityType === 'recurring' ? dayOfWeek : null,
        specific_date: availabilityType === 'specific' ? specificDate : null,
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable
      });
      
      setSuccess('Availability saved successfully');
      fetchAvailability(); // Refresh the list
      
      // Reset form
      setAvailabilityType('recurring');
      setDayOfWeek(0);
      setSpecificDate('');
      setStartTime('09:00');
      setEndTime('17:00');
      setIsAvailable(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }

    try {
      await deleteDoctorAvailability(id);
      setSuccess('Availability slot deleted');
      fetchAvailability(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedDoctorName = doctors.find(d => d.id === selectedDoctor)?.name || 'Unknown Doctor';

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Doctor Availability</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Doctor</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
          >
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </div>

        {selectedDoctor && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Availability Form */}
            <div className="card p-5">
              <h3 className="text-lg font-medium mb-4">Set Availability</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Availability Type</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={availabilityType === 'recurring'}
                        onChange={() => setAvailabilityType('recurring')}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="ml-2">Recurring (Weekly)</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={availabilityType === 'specific'}
                        onChange={() => setAvailabilityType('specific')}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="ml-2">Specific Date</span>
                    </label>
                  </div>
                </div>

                {availabilityType === 'recurring' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">Day of Week</label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                      className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                    >
                      {daysOfWeek.map((day, index) => (
                        <option key={index} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Specific Date</label>
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="isAvailable" className="ml-2 text-sm font-medium">
                    Available
                  </label>
                </div>

                <button type="submit" className="btn btn-primary w-full">
                  Save Availability
                </button>
              </form>
            </div>

            {/* Availability List */}
            <div className="card p-5">
              <h3 className="text-lg font-medium mb-4">Current Availability for {selectedDoctorName}</h3>
              
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : error ? (
                <div className="text-red-600 py-4">{error}</div>
              ) : availability.length === 0 ? (
                <div className="text-gray-500 py-4 text-center">
                  No availability set for this doctor
                </div>
              ) : (
                <div className="space-y-3">
                  {availability.map((slot) => (
                    <div 
                      key={slot.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        slot.is_available 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div>
                        <div className="font-medium">
                          {slot.day_of_week !== null 
                            ? daysOfWeek[slot.day_of_week] 
                            : `Date: ${slot.specific_date}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {slot.start_time} - {slot.end_time}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          slot.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {slot.is_available ? 'Available' : 'Unavailable'}
                        </span>
                        <button
                          onClick={() => handleDelete(slot.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-red-600 mt-4">{error}</div>}
        {success && <div className="text-green-600 mt-4">{success}</div>}
      </div>
    </div>
  );
};

export default DoctorAvailability;