# Simple Capital Solutions — Bilty Management System

**Website:** [simplecapital.co.in](http://simplecapital.co.in/)

A comprehensive Bilty (Lorry Receipt / GR) management system built for the Indian logistics and transport industry. Designed for **Simple Capital Solutions** to streamline daily operations including bilty creation, invoicing, expense tracking, party management, and financial reporting.

---

## Features

### 🔐 Authentication & Session Management
- Username/password-based admin login
- Session persistence via `localStorage`
- Protected routes — all pages require login
- Logout from sidebar

### 🚚 Bilty (Lorry Receipt) Management
- Create bilties with auto-generated serial numbers (configurable prefix)
- Consignor & Consignee party selection with auto-fill of address/GSTIN
- Vehicle & Driver selection from master data
- Goods items table with quantity, weight, rate, and amount calculation
- Financial breakdown: freight, loading/unloading, weight charges, advance paid
- E-way bill number support
- GSTIN validation (15-char Indian format)

### 🧾 Invoice Management
- Create GST invoices linked to unbilled bilties
- Auto-detect IGST vs CGST+SGST based on party state code
- Configurable GST rates
- Payment status tracking (Unpaid / Partial / Paid)
- Auto-increment invoice numbers

### 👥 Party Management
- Manage consignors, consignees, and dual-role parties
- Store contact details, GSTIN, address, payment terms, credit limits
- Active/inactive status toggle

### 📊 Master Data
- **Vehicles**: Vehicle number, type, owner
- **Drivers**: Name, license number, mobile
- **Locations**: City, state, pincode
- **Goods Types**: Name, description
- All master data supports CRUD with active/inactive toggle

### 💰 Expense Tracking
- Record expenses by category (Fuel, Maintenance, Toll, Insurance, Salary, Office, Other)
- Link expenses to vehicles
- Filter by category and date range
- Running total calculation

### 📈 Reports & Dashboard
- Dashboard with key metrics
- Financial reporting

### ⚙️ Settings
- Company name, address, GSTIN, state code
- Bilty & Invoice prefix and auto-numbering
- Financial year configuration

### 👤 User Management
- Manage app users with roles
- Active/inactive status

### 💾 Backup
- Data backup functionality

### 🔔 SweetAlert2 Notifications
- Confirmation dialogs for save, delete, and discard actions
- Success/error popups for all CRUD operations
- Replaces native browser alerts with styled modals

### ➕ Inline Quick-Add in Dropdowns
- All master data dropdowns (Vehicle, Driver, Party) have a `+` button
- Inline dialog to add new entries without leaving the current form
- Newly added items auto-select in the dropdown

### 🔄 Real-Time Data Sync
- Supabase Realtime subscriptions on master data tables
- Dropdowns auto-refresh when data is added from Master Data page or another browser tab
- No manual page refresh needed — works like AJAX live updates

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui, Radix UI Primitives |
| **Styling** | Tailwind CSS, CSS Variables (HSL design tokens) |
| **State Management** | TanStack React Query (server state) |
| **Routing** | React Router DOM v6 |
| **Backend / Database** | Lovable Cloud (Supabase) — PostgreSQL |
| **Real-Time** | Supabase Realtime (Postgres Changes) |
| **Notifications** | SweetAlert2 |
| **Icons** | Lucide React |
| **Forms** | React Hook Form + Zod (available) |
| **Charts** | Recharts |
| **Date Utilities** | date-fns |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `bilties` | Lorry receipts / bilties |
| `bilty_items` | Goods line items per bilty |
| `invoices` | GST invoices |
| `invoice_items` | Bilties linked to invoices |
| `parties` | Consignors, consignees |
| `vehicles` | Fleet vehicles |
| `drivers` | Driver records |
| `locations` | City/state/pincode master |
| `goods_types` | Goods category master |
| `expenses` | Expense records |
| `company_settings` | Company info, numbering config |
| `app_users` | Application users |

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, AppSidebar
│   ├── ui/              # shadcn/ui components
│   └── SelectWithAdd.tsx # Reusable select + quick-add component
├── contexts/
│   └── AuthContext.tsx   # Auth state & session management
├── hooks/
│   ├── use-realtime-query.ts  # Supabase realtime auto-invalidation
│   ├── use-toast.ts
│   └── use-mobile.tsx
├── integrations/
│   └── supabase/        # Auto-generated client & types
├── lib/
│   ├── format.ts        # INR & date formatters
│   ├── swal.ts          # SweetAlert2 utility functions
│   └── utils.ts         # cn() helper
├── pages/               # All route pages
└── main.tsx
```

---

## Getting Started

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Credentials

| Username | Password |
|----------|----------|
| `admin`  | `12345`  |

---

© [Simple Capital Solutions](http://simplecapital.co.in/)
