# Simple Capital Solutions — Bilty Management System

**Website:** [simplecapital.co.in](http://simplecapital.co.in/)

A comprehensive Bilty (Lorry Receipt / GR) management system built for the Indian logistics and transport industry. Designed for **Simple Capital Solutions** to streamline daily operations including bilty creation, invoicing, expense tracking, party management, and financial reporting.

---

## Features

### 🔐 Authentication & RBAC
- Supabase Auth with email/password login
- **TOTP Two-Factor Authentication** (Microsoft Authenticator / Google Authenticator)
  - Users can enable/disable 2FA from their profile
  - Super Admins can manage 2FA settings in Users page
  - QR code enrollment flow with 6-digit verification
  - MFA challenge on login when 2FA is enabled
- Role-Based Access Control (RBAC) with 5 roles: Super Admin, Admin, Manager, Accountant, Viewer
- Group-based user management
- Per-module CRUD permissions (configurable in Settings)
- Each user gets their own login credentials
- Edge function for admin user creation with role assignment
- **User Profile Menu** with name display, session timer (hh:mm:ss), profile editing, and password change

### 🚚 Bilty (Lorry Receipt) Management
- Create & **edit** bilties with auto-generated serial numbers (configurable prefix)
- Consignor & Consignee party selection with auto-fill of address/GSTIN
- Vehicle & Driver selection from master data
- Goods items table with quantity, weight, rate, and amount calculation
- Financial breakdown: freight, loading/unloading, weight charges, advance paid
- E-way bill number support
- GSTIN validation (15-char Indian format)
- **PDF generation** with company letterhead, GST breakdown, download/print support

### 🧾 Invoice Management
- Create GST invoices linked to unbilled bilties
- Auto-detect IGST vs CGST+SGST based on party state code
- Configurable GST rates
- Payment status tracking (Unpaid / Partial / Paid)
- Auto-increment invoice numbers
- **PDF generation** with full GST breakdown
- **Public/shareable invoice link** with password protection (viewable without login)
- Status filter cards (click to filter Unpaid/Paid/Partial)

### 💳 Payment Records
- Record payments against invoices (Cash, UPI, Bank Transfer, Cheque, Other)
- Auto-generated payment numbers
- Automatic invoice balance & status updates on payment recording
- Filter by date range and payment method

### 📝 Proposals
- Create proposals with line items, optional items, and GST
- Discount support (percentage or fixed amount)
- Proposal status tracking (Draft, Sent, Accepted, Rejected, Expired)
- Convert proposals to invoices (future-ready)

### 🎯 Lead Management
- Visual pipeline view with status cards (New, Contacted, Qualified, Proposal Sent, Negotiation, Customer, Lost)
- Track lead value, source, expected close date
- Convert leads to parties
- Tag-based organization

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
- Dashboard with key metrics (Total Bilties, Revenue, Outstanding, Advance)
- Quick action buttons for common tasks
- Recent bilties and invoices tables

### ⚙️ Settings
- **Company Profile**: Name, address, phone, email
- **Branding**: Upload light logo, dark logo, and favicon
- **GST Details**: GSTIN, state code
- **Numbering**: Bilty & invoice prefix and auto-numbering
- **Role Permissions**: Full CRUD permission matrix for all modules × roles

### 👤 User Management
- Create users with Supabase Auth (real email/password)
- Assign roles (Super Admin, Admin, Manager, Accountant, Viewer)
- Active/inactive status
- Profile management

### 💾 Backup
- Data backup functionality

### 🔔 SweetAlert2 Notifications
- Confirmation dialogs for save, delete, and discard actions
- Success/error popups for all CRUD operations

### ➕ Inline Quick-Add in Dropdowns
- All master data dropdowns (Vehicle, Driver, Party) have a `+` button
- Inline dialog to add new entries without leaving the current form
- Newly added items auto-select in the dropdown

### 🔄 Real-Time Data Sync
- Supabase Realtime subscriptions on master data tables
- Dropdowns auto-refresh when data is added

### 📄 PDF Generation
- Professional bilty PDFs with company letterhead
- Tax invoice PDFs with full GST breakdown (CGST/SGST/IGST)
- Company footer with branding
- Download and print support

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
| **Authentication** | Supabase Auth (email/password) |
| **Real-Time** | Supabase Realtime (Postgres Changes) |
| **PDF Generation** | jsPDF + jsPDF-AutoTable |
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
| `invoices` | GST invoices with public sharing |
| `invoice_items` | Bilties linked to invoices |
| `parties` | Consignors, consignees |
| `vehicles` | Fleet vehicles |
| `drivers` | Driver records |
| `locations` | City/state/pincode master |
| `goods_types` | Goods category master |
| `expenses` | Expense records |
| `proposals` | Sales proposals |
| `proposal_items` | Proposal line items |
| `payment_records` | Payment transactions |
| `leads` | Sales leads / pipeline |
| `company_settings` | Company info, numbering, logos |
| `profiles` | User profiles (linked to auth) |
| `user_roles` | RBAC role assignments |
| `roles` | Role definitions |
| `groups` | User groups |
| `user_groups` | Group membership |
| `module_permissions` | Per-role CRUD permissions |

---

## RBAC Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full access to everything |
| `admin` | Full access (except system config) |
| `manager` | Create, read, update on most modules |
| `accountant` | Financial modules (invoices, payments, expenses) |
| `viewer` | Read-only access |

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, AppSidebar
│   ├── ui/              # shadcn/ui components
│   └── SelectWithAdd.tsx # Reusable select + quick-add component
├── contexts/
│   └── AuthContext.tsx   # Supabase Auth state & session
├── hooks/
│   ├── use-rbac.ts           # RBAC permission hooks
│   ├── use-company-settings.ts # Dynamic company name
│   ├── use-realtime-query.ts  # Supabase realtime
│   ├── use-toast.ts
│   └── use-mobile.tsx
├── integrations/
│   └── supabase/        # Auto-generated client & types
├── lib/
│   ├── format.ts        # INR & date formatters
│   ├── pdf.ts           # PDF generation (bilty & invoice)
│   ├── swal.ts          # SweetAlert2 utility functions
│   └── utils.ts         # cn() helper
├── pages/
│   ├── Index.tsx         # Dashboard
│   ├── Bilties.tsx       # All bilties with edit/delete/PDF
│   ├── CreateBilty.tsx   # Create & edit bilty
│   ├── Invoices.tsx      # Invoice list with PDF & public link
│   ├── CreateInvoice.tsx # Create invoice
│   ├── PublicInvoice.tsx # Password-protected public invoice view
│   ├── Proposals.tsx     # Proposals management
│   ├── CreateProposal.tsx
│   ├── PaymentRecords.tsx
│   ├── Leads.tsx         # Lead pipeline
│   ├── Parties.tsx
│   ├── MasterData.tsx
│   ├── Reports.tsx
│   ├── Expenses.tsx
│   ├── SettingsPage.tsx  # Settings with branding & permissions
│   ├── UsersPage.tsx     # User management
│   ├── Backup.tsx
│   └── Login.tsx
├── main.tsx
supabase/
├── functions/
│   ├── create-user/      # Admin user creation edge function
│   └── setup-admin/      # Initial admin setup
└── migrations/           # Database schema migrations
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

## Default Credentials

| Email | Password |
|-------|----------|
| `admin@simplecapital.co.in` | `Admin@12345` |

---

© [Simple Capital Solutions](http://simplecapital.co.in/) · Developed by [BRANDZAHA CREATIVE AGENCY](https://brandzaha.com) with ❤️
