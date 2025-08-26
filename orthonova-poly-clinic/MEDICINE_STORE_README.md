# Medicine Store System - Orthonova Poly Clinic

## Overview

The Medicine Store System is a comprehensive solution integrated with the Orthonova Poly Clinic application that allows clinic staff to manage medicine inventory, handle billing for both registered patients and walk-in customers, and maintain proper stock control.

## Features

### 🏥 **Medicine Store Billing**
- **Patient Billing**: Bill registered clinic patients for medicines
- **Guest Billing**: Bill walk-in customers without patient registration
- **GST Calculation**: Automatic GST calculation based on medicine rates
- **Multiple Payment Modes**: Cash, UPI, and Card payments
- **Discount Management**: Apply discounts on bills
- **Bill Printing**: Generate and print medicine bills

### 📦 **Inventory Management**
- **Medicine Categories**: Organize medicines by type (Tablets, Syrups, Injections, etc.)
- **Manufacturer Tracking**: Track medicine manufacturers
- **Batch Management**: Manage medicine batches and expiry dates
- **HSN Codes**: Support for GST HSN codes
- **Stock Thresholds**: Set low stock alerts
- **Stock Adjustments**: Add/remove stock with reason tracking

### 🛒 **Stock Purchase Management**
- **Supplier Management**: Track medicine suppliers
- **Purchase Orders**: Create stock purchase records
- **Invoice Tracking**: Link purchases to supplier invoices
- **Expiry Date Management**: Track medicine expiry dates
- **Batch Number Tracking**: Monitor medicine batches

### 👥 **Role-Based Access Control**
- **Admin**: Full access to all features
- **Store Manager**: Manage inventory, purchases, and billing
- **Receptionist**: Create bills for patients and guests
- **Doctor**: View patient prescriptions and medicine history

## Database Structure

### Core Tables

#### 1. **inventory_items** (Enhanced)
```sql
- id: UUID (Primary Key)
- name: Medicine name
- sku: Stock keeping unit
- category: Medicine category (Tablets, Syrups, etc.)
- manufacturer: Medicine manufacturer
- unit: Unit of measurement
- cost_price: Purchase cost
- sale_price: Selling price
- opening_stock: Initial stock
- current_stock: Current available stock
- low_stock_threshold: Low stock alert level
- expiry_date: Medicine expiry date
- batch_number: Batch identifier
- hsn_code: GST HSN code
- gst_rate: GST percentage
- created_at: Creation timestamp
```

#### 2. **medicine_store_bills**
```sql
- id: UUID (Primary Key)
- bill_number: Unique bill number
- patient_id: Reference to patient (optional)
- guest_name: Walk-in customer name
- guest_contact: Walk-in customer contact
- prescription_id: Reference to prescription (optional)
- doctor_id: Reference to doctor (optional)
- total_amount: Bill total before discount
- discount: Applied discount
- net_amount: Final amount after discount
- gst_amount: GST amount
- status: Bill status (paid/pending/partial)
- mode_of_payment: Payment method
- transaction_reference: UPI/Card reference
- created_by: User who created the bill
- created_at: Creation timestamp
```

#### 3. **medicine_store_bill_items**
```sql
- id: UUID (Primary Key)
- bill_id: Reference to bill
- inventory_item_id: Reference to medicine
- item_name: Medicine name (denormalized)
- quantity: Quantity sold
- price: Unit price
- gst_rate: GST rate applied
- gst_amount: GST amount for this item
- total: Total amount for this item
- created_at: Creation timestamp
```

#### 4. **stock_purchases**
```sql
- id: UUID (Primary Key)
- supplier_name: Supplier company name
- supplier_contact: Supplier contact details
- invoice_number: Supplier invoice number
- invoice_date: Invoice date
- total_amount: Purchase total
- gst_amount: GST amount
- net_amount: Net amount after GST
- payment_status: Payment status
- notes: Additional notes
- created_by: User who created purchase
- created_at: Creation timestamp
```

#### 5. **stock_purchase_items**
```sql
- id: UUID (Primary Key)
- purchase_id: Reference to purchase
- inventory_item_id: Reference to medicine
- item_name: Medicine name
- quantity: Quantity purchased
- cost_price: Purchase cost per unit
- expiry_date: Expiry date
- batch_number: Batch number
- total: Total cost for this item
- created_at: Creation timestamp
```

#### 6. **suppliers**
```sql
- id: UUID (Primary Key)
- name: Supplier company name
- contact_person: Primary contact person
- phone: Contact phone number
- email: Contact email
- address: Company address
- gst_number: GST registration number
- pan_number: PAN number
- payment_terms: Payment terms
- created_at: Creation timestamp
```

### Supporting Tables

#### 7. **stock_ledger**
```sql
- id: UUID (Primary Key)
- item_id: Reference to medicine
- change: Stock change (+/-)
- reason: Reason for change (purchase/adjustment/dispense)
- notes: Additional notes
- reference_bill_id: Reference to bill (if applicable)
- created_by: User who made the change
- created_at: Change timestamp
```

#### 8. **medicine_categories**
```sql
- id: UUID (Primary Key)
- name: Category name
- description: Category description
- created_at: Creation timestamp
```

## API Functions

### Core Functions

#### Inventory Management
- `listInventoryItems(query?)`: List all inventory items with optional search
- `createInventoryItem(item)`: Create new inventory item
- `updateInventoryItem(id, updates)`: Update existing item
- `adjustStock(id, change, reason, options)`: Adjust stock levels

#### Medicine Store Billing
- `createMedicineStoreBill(bill, items)`: Create medicine store bill
- `getLowStockItems()`: Get items below stock threshold
- `getExpiringItems(days)`: Get items expiring within specified days

### Database Functions

#### PostgreSQL Functions
- `increment_inventory_stock(item_id, delta)`: Update stock levels
- `calculate_gst_amount(price, gst_rate)`: Calculate GST
- `get_low_stock_items()`: Get low stock items
- `get_expiring_items(days)`: Get expiring items

## User Interface Components

### 1. **PharmacyBilling** (`/src/components/billing/PharmacyBilling.tsx`)
- Main billing interface for medicine store
- Patient/guest selection
- Medicine search and selection
- GST calculation
- Bill generation and printing

### 2. **InventoryManager** (`/src/components/admin/InventoryManager.tsx`)
- Enhanced inventory management
- Medicine categorization
- Manufacturer tracking
- Expiry date management
- Stock threshold alerts

### 3. **StockPurchase** (`/src/components/admin/StockPurchase.tsx`)
- Stock purchase management
- Supplier information
- Invoice tracking
- Batch and expiry management

## Setup Instructions

### 1. Database Setup
Run the SQL script `medicine_store_database.sql` in your Supabase SQL editor:

```bash
# Copy the contents of medicine_store_database.sql
# Paste into Supabase SQL Editor
# Execute the script
```

### 2. Environment Configuration
Ensure your `.env` file has the required Supabase credentials:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Role Configuration
Create users with appropriate roles:

```sql
-- Create store manager user
INSERT INTO users (user_id, password, role) 
VALUES ('store_manager1', 'password123', 'store_manager');

-- Create admin user
INSERT INTO users (user_id, password, role) 
VALUES ('admin1', 'password123', 'admin');
```

## Usage Guide

### For Store Managers

#### Adding New Medicines
1. Navigate to **Admin > Inventory Manager**
2. Fill in medicine details:
   - Name, SKU, Category, Manufacturer
   - Cost Price, Sale Price, GST Rate
   - Opening Stock, Low Stock Threshold
   - Expiry Date, Batch Number, HSN Code
3. Click "Add Medicine"

#### Managing Stock Purchases
1. Navigate to **Admin > Stock Purchase**
2. Enter supplier information
3. Add medicines to purchase
4. Set quantities, costs, expiry dates
5. Complete purchase to update stock

#### Monitoring Inventory
- View low stock alerts
- Check expiring medicines
- Monitor stock levels
- Track stock movements

### For Receptionists

#### Creating Medicine Bills
1. Navigate to **Billing > Medicine Store Billing**
2. Select patient or enter guest details
3. Search and add medicines
4. Apply discounts if needed
5. Select payment mode
6. Generate bill and print

#### Patient Billing
- Search patients by contact number
- View patient history
- Link bills to patient records
- Apply patient-specific discounts

#### Guest Billing
- Enter customer name and contact
- Create bills without patient registration
- Track walk-in sales
- Maintain customer records

### For Admins

#### System Overview
- Monitor all medicine store activities
- View sales reports and analytics
- Manage user roles and permissions
- Oversee inventory and purchases

#### Reports and Analytics
- Daily/monthly sales reports
- Inventory turnover analysis
- Low stock and expiry alerts
- Supplier performance tracking

## Security Features

### Row Level Security (RLS)
- **Authenticated Users**: Read access to bills and inventory
- **Store Managers**: Full access to medicine store operations
- **Admins**: Complete system access

### Data Validation
- Input validation for all forms
- Stock level checks
- Expiry date validation
- Payment verification

## Best Practices

### Inventory Management
1. **Regular Stock Checks**: Monitor stock levels weekly
2. **Expiry Management**: Check expiring items monthly
3. **Supplier Relations**: Maintain good supplier relationships
4. **Stock Rotation**: Use FIFO (First In, First Out) method

### Billing Operations
1. **Patient Verification**: Always verify patient details
2. **Medicine Verification**: Check medicine names and dosages
3. **Payment Security**: Verify payment transactions
4. **Record Keeping**: Maintain accurate billing records

### Data Backup
1. **Regular Backups**: Backup database regularly
2. **Export Reports**: Export important data periodically
3. **Audit Trails**: Maintain change logs for compliance

## Troubleshooting

### Common Issues

#### Stock Not Updating
- Check if stock adjustment was successful
- Verify user permissions
- Check database triggers

#### Bills Not Generating
- Verify patient/guest information
- Check medicine availability
- Ensure payment details are complete

#### GST Calculation Errors
- Verify GST rates in inventory
- Check calculation functions
- Validate price formats

### Support
For technical support or questions:
1. Check the application logs
2. Verify database connectivity
3. Review user permissions
4. Contact system administrator

## Future Enhancements

### Planned Features
- **Barcode Scanning**: QR code support for medicines
- **Mobile App**: Mobile interface for store operations
- **Advanced Analytics**: Business intelligence dashboards
- **Integration**: Pharmacy management system integration
- **Automation**: Automated reorder notifications

### Scalability
- **Multi-location Support**: Multiple clinic locations
- **Cloud Storage**: Enhanced data storage
- **API Integration**: Third-party system integration
- **Performance Optimization**: Database query optimization

## Conclusion

The Medicine Store System provides a robust, secure, and user-friendly solution for managing medicine inventory and billing operations in the Orthonova Poly Clinic. With proper setup and usage, it will significantly improve efficiency and accuracy in medicine store operations.

For additional support or feature requests, please contact the development team.
