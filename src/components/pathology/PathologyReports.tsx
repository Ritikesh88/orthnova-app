import React, { useEffect, useState } from 'react';
import { listPathologyReports, createPathologyReport, updatePathologyReport, deletePathologyReport, generatePathologyReport, listPathologyTestOrders, listPatients } from '../../api';
import { PathologyReportRow, PathologyTestOrderRow, PatientRow } from '../../types';
import { format } from 'date-fns';


const PathologyReports: React.FC = () => {
  const [reports, setReports] = useState<PathologyReportRow[]>([]);
  const [orders, setOrders] = useState<PathologyTestOrderRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<PathologyReportRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<PathologyReportRow, 'id' | 'created_at'>>({
    order_id: '',
    patient_id: '',
    doctor_id: '',
    report_date: new Date().toISOString().split('T')[0],
    report_status: 'draft',
    report_data: '',
    generated_by: '',
    delivery_status: 'pending',
    delivery_date: '',
    notes: '',
  });

  useEffect(() => {
    loadReports();
    loadOrders();
    loadPatients();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPathologyReports();
      setReports(data);
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

  const loadPatients = async () => {
    try {
      const data = await listPatients();
      setPatients(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createPathologyReport(form);
      setForm({
        order_id: '',
        patient_id: '',
        doctor_id: '',
        report_date: new Date().toISOString().split('T')[0],
        report_status: 'draft',
        report_data: '',
        generated_by: '',
        delivery_status: 'pending',
        delivery_date: '',
        notes: '',
      });
      setShowForm(false);
      loadReports();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setError(null);
    try {
      await updatePathologyReport(editingReport.id, form);
      setEditingReport(null);
      setShowForm(false);
      loadReports();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deletePathologyReport(id);
        loadReports();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const startEditing = (report: PathologyReportRow) => {
    setEditingReport(report);
    setForm({
      order_id: report.order_id,
      patient_id: report.patient_id,
      doctor_id: report.doctor_id || '',
      report_date: report.report_date,
      report_status: report.report_status,
      report_data: report.report_data,
      generated_by: report.generated_by,
      delivery_status: report.delivery_status,
      delivery_date: report.delivery_date || '',
      notes: report.notes || '',
    });
    setShowForm(true);
  };

  const cancelEditing = () => {
    setEditingReport(null);
    setForm({
      order_id: '',
      patient_id: '',
      doctor_id: '',
      report_date: new Date().toISOString().split('T')[0],
      report_status: 'draft',
      report_data: '',
      generated_by: '',
      delivery_status: 'pending',
      delivery_date: '',
      notes: '',
    });
    setShowForm(false);
  };

  const generateReport = async (orderId: string) => {
    setGeneratingReport(orderId);
    setError(null);
    try {
      await generatePathologyReport(orderId, 'current_user'); // In real app, replace with actual user ID
      loadReports();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  const order = orders.find(o => o.id === form.order_id);
  const patient = patients.find(p => p.id === form.patient_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pathology Reports</h2>
        <button
          onClick={() => {
            setEditingReport(null);
            setForm({
              order_id: '',
              patient_id: '',
              doctor_id: '',
              report_date: new Date().toISOString().split('T')[0],
              report_status: 'draft',
              report_data: '',
              generated_by: '',
              delivery_status: 'pending',
              delivery_date: '',
              notes: '',
            });
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          Add Report
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
            {editingReport ? 'Edit Report' : 'Add New Report'}
          </h3>
          <form onSubmit={editingReport ? handleUpdate : handleCreate} className="space-y-4">
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
                <label className="block text-sm font-medium">Report Date</label>
                <input
                  type="date"
                  className="mt-1 w-full"
                  value={form.report_date}
                  onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Report Status</label>
                <select
                  className="mt-1 w-full"
                  value={form.report_status}
                  onChange={(e) => setForm({ ...form, report_status: e.target.value as any })}
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="generated">Generated</option>
                  <option value="verified">Verified</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Generated By</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.generated_by}
                  onChange={(e) => setForm({ ...form, generated_by: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Delivery Status</label>
                <select
                  className="mt-1 w-full"
                  value={form.delivery_status}
                  onChange={(e) => setForm({ ...form, delivery_status: e.target.value as any })}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="delivered">Delivered</option>
                  <option value="collected">Collected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Delivery Date</label>
                <input
                  type="date"
                  className="mt-1 w-full"
                  value={form.delivery_date || ''}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium">Report Data (JSON)</label>
              <textarea
                className="mt-1 w-full"
                value={form.report_data}
                onChange={(e) => setForm({ ...form, report_data: e.target.value })}
                rows={4}
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
                {editingReport ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={loadReports} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading reports...</div>
      ) : (
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => {
                  const order = orders.find(o => o.id === report.order_id);
                  const patient = patients.find(p => p.id === report.patient_id);
                  
                  return (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order ? `Order #${order.id.substring(0, 8)}` : report.order_id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{patient?.name}</div>
                        <div className="text-sm text-gray-500">{patient?.contact}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{format(new Date(report.report_date), 'dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          report.report_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          report.report_status === 'generated' ? 'bg-blue-100 text-blue-800' :
                          report.report_status === 'verified' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {report.report_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          report.delivery_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          report.delivery_status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {report.delivery_status}
                        </span>
                        {report.delivery_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            {report.delivery_date}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => startEditing(report)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => window.open(`/print/pathology-report/${report.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Print
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

      {/* Generate Report Section */}
      <div className="card p-6">
        <h3 className="text-lg font-medium mb-4">Generate New Report</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Select Order to Generate Report</label>
            <select
              className="mt-1 w-full"
              onChange={(e) => generateReport(e.target.value)}
              disabled={!!generatingReport}
            >
              <option value="">Select an order to generate report</option>
              {orders
                .filter(order => !reports.some(report => report.order_id === order.id))
                .map(order => (
                  <option key={order.id} value={order.id}>
                    Order #{order.id.substring(0, 8)} - {order.patient_id} - {order.report_status}
                  </option>
                ))}
            </select>
          </div>
          {generatingReport && (
            <div className="text-sm text-blue-600">Generating report for order {generatingReport.substring(0, 8)}...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PathologyReports;