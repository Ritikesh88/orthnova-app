import React, { useEffect, useMemo, useState } from 'react';
import { listAppointments, listDoctors } from '../../api';
import { AppointmentRow, DoctorRow } from '../../types';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00

const AppointmentsCalendar: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const ds = await listDoctors();
      setDoctors(ds);
      const saved = localStorage.getItem('orthonova_calendar_doctor_id');
      if (saved && ds.some(d => d.id === saved)) setSelectedDoctorId(saved);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedDoctorId) return;
      setLoading(true);
      try {
        const list = await listAppointments({ doctor_id: selectedDoctorId });
        setAppointments(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDoctorId]);

  const slots: { time: string; date: Date }[] = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    const base = new Date(y, (m - 1), d, START_HOUR, 0, 0, 0);
    const arr: { time: string; date: Date }[] = [];
    const end = new Date(y, (m - 1), d, END_HOUR, 0, 0, 0);
    let cur = new Date(base);
    while (cur <= end) {
      arr.push({ time: formatTime(cur), date: new Date(cur) });
      cur = new Date(cur.getTime() + 15 * 60 * 1000);
    }
    return arr;
  }, [date]);

  const bookedTimes = useMemo(() => {
    if (!selectedDoctorId) return new Set<string>();
    const [y, m, d] = date.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const set = new Set<string>();
    appointments.forEach(a => {
      if (a.doctor_id !== selectedDoctorId) return;
      const dt = new Date(a.created_at);
      if (dt >= dayStart && dt <= dayEnd) {
        dt.setSeconds(0, 0);
        const minutes = dt.getMinutes();
        const rounded = new Date(dt);
        const roundedMinutes = Math.floor(minutes / 15) * 15;
        rounded.setMinutes(roundedMinutes);
        set.add(formatTime(rounded));
      }
    });
    return set;
  }, [appointments, selectedDoctorId, date]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Doctor</label>
            <select className="mt-1 w-full" value={selectedDoctorId} onChange={e => { setSelectedDoctorId(e.target.value); localStorage.setItem('orthonova_calendar_doctor_id', e.target.value); }}>
              <option value="">Select doctor</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input type="date" className="mt-1 w-full" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm"><span className="w-3 h-3 inline-block rounded bg-green-200 border border-green-400" /> Available</span>
              <span className="inline-flex items-center gap-1 text-sm"><span className="w-3 h-3 inline-block rounded bg-amber-200 border border-amber-400" /> Booked</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 overflow-hidden">
        {(!selectedDoctorId) ? (
          <div className="text-sm text-gray-500">Select a doctor to view calendar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 py-2 pr-4">Time</th>
                  <th className="text-left text-gray-500 py-2 pr-4">Slot</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(({ time }) => {
                  const isBooked = bookedTimes.has(time);
                  return (
                    <tr key={time} className="border-t border-gray-100">
                      <td className="py-2 pr-4 font-mono text-gray-600">{time}</td>
                      <td className="py-2 pr-4">
                        <div className={`h-6 rounded-md border ${isBooked ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-green-100 border-green-300 text-green-800'}`}></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsCalendar;