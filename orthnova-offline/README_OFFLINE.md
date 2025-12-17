# OrthoNova Clinic - Offline Version

This is the offline version of the OrthoNova Poly Clinic management system. It uses localStorage instead of Supabase for data storage, allowing it to run completely offline in a web browser.

## Key Features

- **Fully Offline**: No internet connection required after initial setup
- **Persistent Storage**: All data is saved in the browser's localStorage
- **Full Functionality**: All clinic management features work exactly as in the online version
- **Easy Deployment**: Simply open `index.html` in a browser

## How It Works

The offline version replaces all Supabase API calls with localStorage operations:

1. **Data Storage**: All data (patients, doctors, appointments, bills, etc.) is stored in the browser's localStorage
2. **Authentication**: User login/logout is handled through localStorage session storage
3. **API Calls**: All API functions have been rewritten to read from and write to localStorage instead of making network requests
4. **Data Persistence**: Data persists between browser sessions until explicitly cleared

## Getting Started

1. **Installation**:
   - No installation required
   - Simply open `index.html` in any modern web browser

2. **Initial Setup**:
   - On first run, the system creates sample data including:
     - Admin user (username: `admin`, password: `admin123`)
     - Sample doctor
     - Sample patient
     - Sample service
     - Sample inventory item

3. **Usage**:
   - Login with the admin credentials or create new users
   - All features work exactly as in the online version
   - Data is automatically saved to localStorage

## Technical Details

### Data Structure

All data is stored in a single localStorage key `orthnova_data` containing a JSON object with the following structure:

```json
{
  "users": [...],
  "patients": [...],
  "doctors": [...],
  "services": [...],
  "bills": [...],
  "billItems": [...],
  "inventoryItems": [...],
  "stockLedger": [...],
  "prescriptions": [...],
  "appointments": [...],
  "doctorAvailability": [...],
  "stockPurchases": [...],
  "stockPurchaseItems": [...]
}
```

### Authentication

User sessions are stored in localStorage under the key `orthonova_session_user_v1`.

### Limitations

1. **Single Browser**: Data is only available in the browser where it was created
2. **Single Device**: Data does not sync across devices
3. **Storage Limits**: localStorage has size limitations (typically 5-10MB)
4. **No Real Security**: Passwords are stored in plain text (suitable for offline use only)

## Supported Browsers

- Chrome 50+
- Firefox 50+
- Safari 10+
- Edge 15+

## Clearing Data

To reset the application and start fresh:

1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage for the site
4. Refresh the page

Or simply use the browser's "Clear browsing data" feature.