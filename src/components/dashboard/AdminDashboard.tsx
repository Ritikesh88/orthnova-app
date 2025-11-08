import React, { useEffect, useState } from 'react';
import { listUsers, listPatients, listPrescriptions } from '../../api';
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

  useEffect(() => {
    (async () => {
      const [u, p, pr] = await Promise.all([listUsers(), listPatients(), listPrescriptions()]);
      setUsers(u.length);
      setPatients(p.length);
      setPrescriptions(pr.length);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Users" value={users} />
        <StatCard title="Patients" value={patients} />
        <StatCard title="Prescriptions" value={prescriptions} />
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