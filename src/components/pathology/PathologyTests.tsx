import React, { useEffect, useState, useCallback } from 'react';
import { listPathologyTests, createPathologyTest, updatePathologyTest, deletePathologyTest } from '../../api';
import { PathologyTestRow } from '../../types';

const PathologyTests: React.FC = () => {
  const [tests, setTests] = useState<PathologyTestRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<PathologyTestRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<Omit<PathologyTestRow, 'id' | 'created_at'>>({
    test_name: '',
    test_code: '',
    category: '',
    description: '',
    price: 0,
    sample_type: '',
    report_format: '',
    reference_ranges: '',
    method: '',
    units: '',
  });

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPathologyTests(query);
      setTests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createPathologyTest(form);
      setForm({
        test_name: '',
        test_code: '',
        category: '',
        description: '',
        price: 0,
        sample_type: '',
        report_format: '',
        reference_ranges: '',
        method: '',
        units: '',
      });
      setShowForm(false);
      loadTests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    setError(null);
    try {
      await updatePathologyTest(editingTest.id, form);
      setEditingTest(null);
      setShowForm(false);
      loadTests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await deletePathologyTest(id);
        loadTests();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const startEditing = (test: PathologyTestRow) => {
    setEditingTest(test);
    setForm({
      test_name: test.test_name,
      test_code: test.test_code,
      category: test.category,
      description: test.description,
      price: test.price,
      sample_type: test.sample_type,
      report_format: test.report_format || '',
      reference_ranges: test.reference_ranges || '',
      method: test.method || '',
      units: test.units || '',
    });
    setShowForm(true);
  };

  const cancelEditing = () => {
    setEditingTest(null);
    setForm({
      test_name: '',
      test_code: '',
      category: '',
      description: '',
      price: 0,
      sample_type: '',
      report_format: '',
      reference_ranges: '',
      method: '',
      units: '',
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pathology Tests</h2>
        <button
          onClick={() => {
            setEditingTest(null);
            setForm({
              test_name: '',
              test_code: '',
              category: '',
              description: '',
              price: 0,
              sample_type: '',
              report_format: '',
              reference_ranges: '',
              method: '',
              units: '',
            });
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          Add Test
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
            {editingTest ? 'Edit Test' : 'Add New Test'}
          </h3>
          <form onSubmit={editingTest ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Test Name</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.test_name}
                  onChange={(e) => setForm({ ...form, test_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Test Code</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.test_code}
                  onChange={(e) => setForm({ ...form, test_code: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Category</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Sample Type</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.sample_type}
                  onChange={(e) => setForm({ ...form, sample_type: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                className="mt-1 w-full"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium">Price</label>
                <input
                  type="number"
                  className="mt-1 w-full"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
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
              <div>
                <label className="block text-sm font-medium">Method</label>
                <input
                  type="text"
                  className="mt-1 w-full"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Reference Ranges</label>
              <textarea
                className="mt-1 w-full"
                value={form.reference_ranges}
                onChange={(e) => setForm({ ...form, reference_ranges: e.target.value })}
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
                {editingTest ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between">
        <input
          placeholder="Search tests..."
          className="rounded-xl border border-gray-300 px-4 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={loadTests} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading tests...</div>
      ) : (
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map((test) => (
                  <tr key={test.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{test.test_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{test.test_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{test.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{test.sample_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">₹{test.price}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEditing(test)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(test.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathologyTests;