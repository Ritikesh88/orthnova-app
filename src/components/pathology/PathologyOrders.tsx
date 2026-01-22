import React, { useEffect, useState, useCallback } from 'react';
import { listPathologyTestOrders, createPathologyTestOrder, updatePathologyTestOrder, deletePathologyTestOrder, listPathologyTests, listPatients } from '../../api';
import { PathologyTestOrderRow, PathologyTestRow, PatientRow } from '../../types';
import { format } from 'date-fns';

const PathologyOrders: React.FC = () => {
  const [orders, setOrders] = useState<PathologyTestOrderRow[]>([]);
  const [tests, setTests] = useState<PathologyTestRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<PathologyTestOrderRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<Omit<PathologyTestOrderRow, 'id' | 'created_at'>>({
    patient_id: '',
    test_ids: [],
    doctor_id: '',
    technician_id: '',
    order_date: new Date().toISOString().split('T')[0],
    sample_collection_date: '',
    sample_collector: '',
    report_generation_date: '',
    report_status: 'ordered',
    priority: 'normal',
    notes: '',
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPathologyTestOrders(query);
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadTests = async () => {
    try {
      const data = await listPathologyTests();
      setTests(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await listPatients();
      setPatients(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadOrders();
    loadTests();
    loadPatients();
  }, [loadOrders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createPathologyTestOrder(form);
      setForm({
        patient_id: '',
        test_ids: [],
        doctor_id: '',
        technician_id: '',
        order_date: new Date().toISOString().split('T')[0],
        sample_collection_date: '',
        sample_collector: '',
        report_generation_date: '',
        report_status: 'ordered',
        priority: 'normal',
        notes: '',
      });
      setShowForm(false);
      loadOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setError(null);
    try {
      await updatePathologyTestOrder(editingOrder.id, form);
      setEditingOrder(null);
      setShowForm(false);
      loadOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deletePathologyTestOrder(id);
        loadOrders();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const startEditing = (order: PathologyTestOrderRow) => {
    setEditingOrder(order);
    setForm({
      patient_id: order.patient_id,
      test_ids: order.test_ids,
      doctor_id: order.doctor_id || '',
      technician_id: order.technician_id || '',
      order_date: order.order_date,
      sample_collection_date: order.sample_collection_date || '',
      sample_collector: order.sample_collector || '',
      report_generation_date: order.report_generation_date || '',
      report_status: order.report_status,
      priority: order.priority,
      notes: order.notes || '',
    });
    setShowForm(true);
  };

  const cancelEditing = () => {
    setEditingOrder(null);
    setForm({
      patient_id: '',
      test_ids: [],
      doctor_id: '',
      technician_id: '',
      order_date: new Date().toISOString().split('T')[0],
      sample_collection_date: '',
      sample_collector: '',
      report_generation_date: '',
      report_status: 'ordered',
      priority: 'normal',
      notes: '',
    });
    setShowForm(false);
  };

  const addTest = (testId: string) => {
    if (!form.test_ids.includes(testId)) {
      setForm({ ...form, test_ids: [...form.test_ids, testId] });
    }
  };

  const removeTest = (testId: string) => {
    setForm({ ...form, test_ids: form.test_ids.filter(id => id !== testId) });
  };

  const selectedTests = tests.filter(t => form.test_ids.includes(t.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pathology Test Orders</h2>
        <button
          onClick={() => {
            setEditingOrder(null);
            setForm({
              patient_id: '',
              test_ids: [],
              doctor_id: '',
              technician_id: '',
              order_date: new Date().toISOString().split('T')[0],
              sample_collection_date: '',
              sample_collector: '',
              report_generation_date: '',
              report_status: 'ordered',
              priority: 'normal',
              notes: '',
            });
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          Add Order
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingOrder ? 'Edit Order' : 'Add New Order'}
          </h3>
          <form onSubmit={editingOrder ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Patient</label>
                <select
                  className="mt-1 w-full"
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} ({patient.contact})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Order Date</label>
                <input
                  type="date"
                  className="mt-1 w-full"
                  value={form.order_date}
                  onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Doctor (Optional)</label>
                <select
                  className="mt-1 w-full"
                  value={form.doctor_id}
                  onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                >
                  <option value="">Select Doctor</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Priority</label>
                <select
                  className="mt-1 w-full"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">Stat</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Technician (Optional)</label>
                <select
                  className="mt-1 w-full"
                  value={form.technician_id}
                  onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
                >
                  <option value="">Select Technician</option>
                  <option value="tech1">Technician 1</option>
                  <option value="tech2">Technician 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Report Status</label>
                <select
                  className="mt-1 w-full"
                  value={form.report_status}
                  onChange={(e) => setForm({ ...form, report_status: e.target.value as any })}
                  required
                >
                  <option value="ordered">Ordered</option>
                  <option value="sample_collected">Sample Collected</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="verified">Verified</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium">Sample Collection Date</label>
              <input
                type="date"
                className="mt-1 w-full"
                value={form.sample_collection_date || ''}
                onChange={(e) => setForm({ ...form, sample_collection_date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium">Sample Collector</label>
              <input
                type="text"
                className="mt-1 w-full"
                value={form.sample_collector || ''}
                onChange={(e) => setForm({ ...form, sample_collector: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium">Tests</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTests.map(test => (
                  <span 
                    key={test.id} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {test.test_name}
                    <button
                      type="button"
                      onClick={() => removeTest(test.id)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2">
                <select
                  className="mt-1 w-full"
                  onChange={(e) => addTest(e.target.value)}
                >
                  <option value="">Add Test</option>
                  {tests
                    .filter(test => !form.test_ids.includes(test.id))
                    .map(test => (
                      <option key={test.id} value={test.id}>
                        {test.test_name} - ₹{test.price}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <textarea
                className="mt-1 w-full"
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingOrder ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between">
        <input
          placeholder="Search orders..."
          className="rounded-xl border border-gray-300 px-4 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={loadOrders} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading orders...</div>
      ) : (
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const patient = patients.find(p => p.id === order.patient_id);
                  const orderTests = tests.filter(t => order.test_ids.includes(t.id));
                  
                  return (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{patient?.name}</div>
                        <div className="text-sm text-gray-500">{patient?.contact}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {orderTests.map(t => t.test_name).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{format(new Date(order.order_date), 'dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.report_status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                          order.report_status === 'sample_collected' ? 'bg-blue-100 text-blue-800' :
                          order.report_status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                          order.report_status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.report_status === 'verified' ? 'bg-teal-100 text-teal-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.report_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.priority}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => startEditing(order)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathologyOrders;