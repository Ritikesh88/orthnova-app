import React, { useEffect, useState } from 'react';
import { listPathologyTestResults, createPathologyTestResult, updatePathologyTestResult, deletePathologyTestResult, listPathologyTestOrders, listPathologyTests } from '../../api';
import { PathologyTestResultRow, PathologyTestOrderRow, PathologyTestRow } from '../../types';
import { format } from 'date-fns';

const PathologyResults: React.FC = () => {
  const [results, setResults] = useState<PathologyTestResultRow[]>([]);
  const [orders, setOrders] = useState<PathologyTestOrderRow[]>([]);
  const [tests, setTests] = useState<PathologyTestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState<PathologyTestResultRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<Omit<PathologyTestResultRow, 'id' | 'created_at'>>({
    order_id: '',
    test_id: '',
    result_value: '',
    units: '',
    reference_range: '',
    status: 'pending',
    result_date: new Date().toISOString().split('T')[0],
    technician_id: '',
    pathologist_id: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
    loadOrders();
    loadTests();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPathologyTestResults();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await listPathologyTestOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadTests = async () => {
    try {
      const data = await listPathologyTests();
      setTests(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createPathologyTestResult(form);
      setForm({
        order_id: '',
        test_id: '',
        result_value: '',
        units: '',
        reference_range: '',
        status: 'pending',
        result_date: new Date().toISOString().split('T')[0],
        technician_id: '',
        pathologist_id: '',
        notes: '',
      });
      setShowForm(false);
      loadResults();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;
    setError(null);
    try {
      await updatePathologyTestResult(editingResult.id, form);
      setEditingResult(null);
      setShowForm(false);
      loadResults();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this result?')) {
      try {
        await deletePathologyTestResult(id);
        loadResults();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const startEditing = (result: PathologyTestResultRow) => {
    setEditingResult(result);
    setForm({
      order_id: result.order_id,
      test_id: result.test_id,
      result_value: result.result_value,
      units: result.units || '',
      reference_range: result.reference_range || '',
      status: result.status,
      result_date: result.result_date,
      technician_id: result.technician_id || '',
      pathologist_id: result.pathologist_id || '',
      notes: result.notes || '',
    });
    setShowForm(true);
  };

  const cancelEditing = () => {
    setEditingResult(null);
    setForm({
      order_id: '',
      test_id: '',
      result_value: '',
      units: '',
      reference_range: '',
      status: 'pending',
      result_date: new Date().toISOString().split('T')[0],
      technician_id: '',
      pathologist_id: '',
      notes: '',
    });
    setShowForm(false);
  };

  const order = orders.find(o => o.id === form.order_id);
  const test = tests.find(t => t.id === form.test_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pathology Test Results</h2>
        <button
          onClick={() => {
            setEditingResult(null);
            setForm({
              order_id: '',
              test_id: '',
              result_value: '',
              units: '',
              reference_range: '',
              status: 'pending',
              result_date: new Date().toISOString().split('T')[0],
              technician_id: '',
              pathologist_id: '',
              notes: '',
            });
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          Add Result
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
            {editingResult ? 'Edit Result' : 'Add New Result'}
          </h3>
          <form onSubmit={editingResult ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Order</label>
                <select
                  className="mt-1 w-full"
                  value={form.order_id}
                  onChange={(e) => setForm({ ...form, order_id: e.target.value })}
                  required
                >
                  <option value="">Select Order</option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      Order #{order.id.substring(0, 8)} - {order.patient_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Test</label>
                <select
                  className="mt-1 w-full"
                  value={form.test_id}
                  onChange={(e) => setForm({ ...form, test_id: e.target.value })}
                  required
                >
                  <option value="">Select Test</option>
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.test_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Result Value</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.result_value}
                  onChange={(e) => setForm({ ...form, result_value: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Units</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Reference Range</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.reference_range}
                  onChange={(e) => setForm({ ...form, reference_range: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Result Date</label>
                <input
                  type="date"
                  className="mt-1 w-full"
                  value={form.result_date}
                  onChange={(e) => setForm({ ...form, result_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Status</label>
                <select
                  className="mt-1 w-full"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="verified">Verified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Technician</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.technician_id}
                  onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium">Pathologist</label>
              <input
                type="text"
                className="mt-1 w-full"
                value={form.pathologist_id}
                onChange={(e) => setForm({ ...form, pathologist_id: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <textarea
                className="mt-1 w-full"
                value={form.notes}
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
                {editingResult ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={loadResults} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading results...</div>
      ) : (
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => {
                  const order = orders.find(o => o.id === result.order_id);
                  const test = tests.find(t => t.id === result.test_id);
                  
                  return (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order ? `Order #${order.id.substring(0, 8)}` : result.order_id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{test?.test_name}</div>
                        <div className="text-sm text-gray-500">{test?.test_code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{result.result_value}</div>
                        <div className="text-sm text-gray-500">
                          {result.units && `${result.units}`}
                          {result.reference_range && ` (Ref: ${result.reference_range})`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{format(new Date(result.result_date), 'dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          result.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          result.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => startEditing(result)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(result.id)}
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

export default PathologyResults;