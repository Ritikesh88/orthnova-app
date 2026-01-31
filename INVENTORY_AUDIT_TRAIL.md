# Inventory Audit Trail System

## Overview
This system tracks all inventory updates with detailed audit information, providing a comprehensive trail of who made changes, when, and why.

## Database Structure

### New Table: `inventory_audit_trail`

The system creates a new table to store detailed inventory audit information:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| item_name | VARCHAR | Name of the inventory item |
| category | VARCHAR | Item category (Tablets, Syrups, etc.) |
| manufacturer | VARCHAR | Manufacturer name |
| sku | VARCHAR | Stock Keeping Unit |
| unit | VARCHAR | Unit of measurement |
| sale_price | DECIMAL(10,2) | Sale price per unit |
| gst_rate | DECIMAL(5,2) | GST rate percentage |
| quantity_added | INTEGER | Quantity added/removed |
| date_time | TIMESTAMP | Date and time of the action |
| batch_number | VARCHAR | Batch number (nullable) |
| expiry_date | DATE | Expiry date (nullable) |
| uploaded_by | VARCHAR | User who performed the action |
| action_type | VARCHAR | Type of action (ADD_ITEM, UPDATE_STOCK, PURCHASE, ADJUSTMENT, CORRECTION) |
| previous_stock | INTEGER | Stock level before the change |
| new_stock | INTEGER | Stock level after the change |
| notes | TEXT | Additional notes about the action |
| reference_id | UUID | Reference to related record (purchase order, bill, etc.) |
| created_at | TIMESTAMP | Record creation timestamp |

## Automatic Tracking

The system automatically logs inventory changes from the following sources:

1. **New Item Creation** - When items are added to inventory
2. **Stock Purchases** - When stock is purchased through StockPurchase component
3. **Stock Adjustments** - Manual stock adjustments
4. **Inventory Updates** - Direct inventory item updates
5. **Sales/DISPENSE** - When items are sold (negative stock changes)

## Access

The Inventory Audit Trail is accessible at:
```
/admin/inventory/audit
```

Accessible to users with roles: `admin`, `store_manager`

## Features

### Filtering Options
- Date range filtering (start/end dates)
- Item name search
- Category filtering
- Action type filtering

### Export Capabilities
- **Excel Export**: Complete detailed export with all columns
- **PDF Export**: Summary report with key information

### Statistics Dashboard
- Total records count
- Items added count
- Purchase transactions count
- Total quantity added

### Detailed Information Displayed
- Item details (name, category, manufacturer, SKU)
- Pricing information (sale price, GST rate)
- Stock changes (previous stock, new stock, quantity added)
- Timing information (date/time, batch number, expiry date)
- User information (who performed the action)
- Action context (notes, reference information)

## Implementation Details

### API Functions
- `getInventoryAuditTrail()` - Fetch audit trail data with filtering
- Enhanced `adjustStock()` - Now logs to both stock_ledger and inventory_audit_trail
- Enhanced `createInventoryItemWithStockTracking()` - Logs new item creation

### Database Functions
- `log_inventory_change()` - Trigger function for automatic logging
- `manual_inventory_log()` - Function for manual audit logging

### Triggers
- Automatic trigger on `inventory_items` table for INSERT/UPDATE operations

## Usage Examples

### Viewing Audit Trail
1. Navigate to `/admin/inventory/audit`
2. Apply desired filters
3. View detailed audit information in table format
4. Export data as needed

### Integration Points
The audit trail automatically captures:
- Stock purchases from StockPurchase component
- Manual stock adjustments from InventoryUpdate component
- New item additions from various inventory management screens
- Stock deductions from pharmacy billing

## Benefits

1. **Complete Audit Trail** - Every inventory change is tracked
2. **Multi-dimensional Filtering** - Easy to find specific records
3. **Export Capabilities** - Share audit information externally
4. **Real-time Tracking** - Immediate logging of all changes
5. **Comprehensive Details** - All relevant information captured
6. **Role-based Access** - Secure access control

## Future Enhancements

Potential improvements:
- Real-time notifications for significant inventory changes
- Automated alerts for suspicious activity patterns
- Integration with external audit systems
- Advanced analytics and reporting
- Mobile-friendly audit interface