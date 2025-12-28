import React, { useState, ChangeEvent } from 'react';
import { addService, createInventoryItem } from '../../api';
import { ServiceRow, InventoryItemRow } from '../../types';
import * as XLSX from 'xlsx';

const BulkOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'medicine'>('services');
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Function to download template for services as Excel
  const downloadServicesTemplate = () => {
    const templateData = [
      {
        service_name: 'Consultation',
        service_type: 'OPD',
        price: 500,
      },
      {
        service_name: 'Blood Test',
        service_type: 'Laboratory',
        price: 300,
      },
      {
        service_name: 'X-Ray',
        service_type: 'Radiology',
        price: 800,
      },
    ];
    
    const ws = (XLSX as any).utils.json_to_sheet(templateData);
    const wb = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(wb, ws, 'Services Template');
    XLSX.writeFile(wb, 'services_template.xlsx');
  };

  // Function to download template for medicine stock as Excel
  const downloadMedicineTemplate = () => {
    const templateData = [
      {
        name: 'Paracetamol 500mg',
        sku: 'PARA500',
        unit: 'tablet',
        cost_price: 2.5,
        sale_price: 5,
        opening_stock: 100,
        category: 'Tablets',
        manufacturer: 'Generic Pharma',
        expiry_date: '2026-12-31',
        batch_number: 'BATCH001',
        hsn_code: '292429',
        gst_rate: 12,
        low_stock_threshold: 10,
      },
      {
        name: 'Aspirin 100mg',
        sku: 'ASP100',
        unit: 'tablet',
        cost_price: 1.2,
        sale_price: 3,
        opening_stock: 200,
        category: 'Tablets',
        manufacturer: 'Generic Pharma',
        expiry_date: '2025-11-30',
        batch_number: 'BATCH002',
        hsn_code: '292630',
        gst_rate: 12,
        low_stock_threshold: 10,
      },
    ];
    
    const ws = (XLSX as any).utils.json_to_sheet(templateData);
    const wb = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(wb, ws, 'Medicine Template');
    XLSX.writeFile(wb, 'medicine_template.xlsx');
  };

  // Function to handle services upload
  const handleServicesUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage(null);
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: ServiceRow[] = (XLSX as any).utils.sheet_to_json(worksheet, { defval: null }) as ServiceRow[];
      
      if (jsonData.length === 0) {
        throw new Error('Excel file must contain at least one data row');
      }
      
      // Validate required fields
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row.service_name || !row.service_type || row.price === undefined || row.price === null || isNaN(row.price)) {
          console.warn(`Row ${i + 1} missing required fields, skipping: ${JSON.stringify(row)}`);
          continue;
        }
      }
      
      const validRows = jsonData.filter(row => 
        row.service_name && row.service_type && row.price !== undefined && row.price !== null && !isNaN(row.price)
      );
      
      const servicePromises = validRows.map(row => 
        addService({
          service_name: row.service_name,
          service_type: row.service_type,
          price: Number(row.price),
        })
      );
      
      await Promise.all(servicePromises);
      
      setMessage(`Successfully uploaded ${servicePromises.length} services`);
    } catch (error: any) {
      setMessage(`Error uploading services: ${error.message}`);
      console.error('Error uploading services:', error);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Function to handle medicine stock upload
  const handleMedicineUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage(null);
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: InventoryItemRow[] = (XLSX as any).utils.sheet_to_json(worksheet, { defval: null }) as InventoryItemRow[];
      
      if (jsonData.length === 0) {
        throw new Error('Excel file must contain at least one data row');
      }
      
      // Validate required fields
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row.name || !row.sku || !row.unit || 
            row.cost_price === undefined || row.cost_price === null || isNaN(row.cost_price) ||
            row.sale_price === undefined || row.sale_price === null || isNaN(row.sale_price)) {
          console.warn(`Row ${i + 1} missing required fields, skipping: ${JSON.stringify(row)}`);
          continue;
        }
      }
      
      const validRows = jsonData.filter(row => 
        row.name && row.sku && row.unit && 
        row.cost_price !== undefined && row.cost_price !== null && !isNaN(row.cost_price) &&
        row.sale_price !== undefined && row.sale_price !== null && !isNaN(row.sale_price)
      );
      
      const medicinePromises = validRows.map(row => 
        createInventoryItem({
          name: row.name,
          sku: row.sku,
          unit: row.unit,
          cost_price: Number(row.cost_price),
          sale_price: Number(row.sale_price),
          opening_stock: Number(row.opening_stock) || 0,
          category: row.category || 'Other',
          manufacturer: row.manufacturer || 'Unknown',
          expiry_date: row.expiry_date || null,
          batch_number: row.batch_number || null,
          hsn_code: row.hsn_code || null,
          gst_rate: Number(row.gst_rate) || 12,
          low_stock_threshold: row.low_stock_threshold ? Number(row.low_stock_threshold) : null,
        })
      );
      
      await Promise.all(medicinePromises);
      
      setMessage(`Successfully uploaded ${medicinePromises.length} medicines`);
    } catch (error: any) {
      setMessage(`Error uploading medicines: ${error.message}`);
      console.error('Error uploading medicines:', error);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Bulk Operations</h2>
        
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'services'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('services')}
            >
              Services
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'medicine'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('medicine')}
            >
              Medicine Stock
            </button>
          </nav>
        </div>

        <div className="mt-4">
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  className="btn btn-primary"
                  onClick={downloadServicesTemplate}
                >
                  Download Services Template
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Upload Services Excel File</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleServicesUpload}
                    disabled={uploading}
                    className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium">Template Instructions:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Download the template to see the required format</li>
                  <li>Required fields: service_name, service_type, price</li>
                  <li>Each row represents one service</li>
                  <li>Save file as Excel format before uploading</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'medicine' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  className="btn btn-primary"
                  onClick={downloadMedicineTemplate}
                >
                  Download Medicine Template
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Upload Medicine Stock Excel File</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleMedicineUpload}
                    disabled={uploading}
                    className="w-full rounded-xl border border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium">Template Instructions:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Download the template to see the required format</li>
                  <li>Required fields: name, sku, unit, cost_price, sale_price</li>
                  <li>Each row represents one medicine item</li>
                  <li>opening_stock is optional (defaults to 0)</li>
                  <li>Save file as Excel format before uploading</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className={`mt-4 text-sm p-3 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {uploading && (
          <div className="mt-4 flex items-center text-blue-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
            Uploading data...
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;