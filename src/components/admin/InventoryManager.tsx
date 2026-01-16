import React from 'react';
import { Link } from 'react-router-dom';

// Feature flag to toggle Medicine Store UI
const MEDICINE_STORE_ACTIVE = true;

const InventoryManager = () => {
  return (
    <div className="space-y-6">
      {!MEDICINE_STORE_ACTIVE ? (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-2">Medicine Store (Inactive)</h2>
          <p className="text-sm text-gray-600">This module is currently disabled. All code is preserved and can be re-enabled later.</p>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Inventory Management</h2>
          <p className="mb-4">The inventory management functionality has been split into separate sections:</p>
          <p className="mb-4">Access the different inventory management features through the sidebar navigation:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Stock Update</strong>: Add new inventory items and view recent uploads</li>
            <li><strong>Existing Stock Details</strong>: View and manage existing inventory stock levels</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;

