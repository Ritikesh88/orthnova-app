import React, { useEffect, useState } from 'react';
import { addService, deleteService, listServices, updateService } from '../../api';
import { ServiceRow } from '../../types';

const ServicesCatalog: React.FC = () => {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<{ service_name: string; service_type: string; price: number }>({ service_name: '', service_type: '', price: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const data = await listServices();
      setServices(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    try {
      if (editingId) {
        await updateService(editingId, form);
        setSuccess('Service updated');
        setEditingId(null);
      } else {
        await addService(form);
        setSuccess('Service added');
      }
      setForm({ service_name: '', service_type: '', price: 0 });
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  const onEdit = (s: ServiceRow) => {
    setEditingId(s.id);
    setForm({ service_name: s.service_name, service_type: s.service_type, price: Number(s.price) });
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this service? This action cannot be undone.')) return;
    setError(null); setSuccess(null);
    try { 
      await deleteService(id); 
      setSuccess('Service deleted successfully'); 
      await refresh(); 
    }
    catch (e: any) { 
      setError(e.message || 'Failed to delete service. Please try again.'); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Service' : 'Add Service'}</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.service_name} onChange={e => setForm(f => ({...f, service_name: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Type</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.service_type} onChange={e => setForm(f => ({...f, service_type: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Price (₹)</label>
            <input type="number" step="0.01" className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.price} onChange={e => setForm(f => ({...f, price: Number(e.target.value)}))} />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-primary w-full" disabled={loading}>{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" className="btn btn-secondary w-full" onClick={() => { setEditingId(null); setForm({ service_name: '', service_type: '', price: 0 }); }}>Cancel</button>}
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Services</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{s.service_name}</td>
                  <td className="py-2 pr-4">{s.service_type}</td>
                  <td className="py-2 pr-4">₹{Number(s.price).toFixed(2)}</td>
                  <td className="py-2 pr-4 space-x-2">
                    <button className="btn btn-secondary px-3 py-1" onClick={() => onEdit(s)}>Edit</button>
                    <button className="btn bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1" onClick={() => onDelete(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={4}>No services found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServicesCatalog;