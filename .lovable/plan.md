

# Simple Capital Solutions – Bilty Management System

A professional, production-ready logistics management application for managing bilties (consignment notes/lorry receipts) built for the Indian transport industry.

**Brand:** Simple Capital Solutions  
**Currency:** INR (₹) | **Date Format:** DD-MM-YYYY  
**Design:** Clean, minimal & corporate dashboard style

---

## Phase 1: Foundation & Navigation

### Top Navigation Bar
- Company logo + "Simple Capital Solutions" branding
- Horizontal navigation: Dashboard, Master Data, Reports, Invoices, All Bilties, Parties, Expenses, Settings, Backup, Users
- Responsive — collapses to hamburger menu on mobile

### Dashboard
- Welcome header with today's date (DD-MM-YYYY)
- 4 KPI cards: Total Bilties, Total Revenue (₹), Outstanding Amount (₹), Total Advance (₹)
- 5 Quick Action buttons: Create Bilty, All Bilties, Create Invoice, Manage Parties, View Reports
- Recent Bilties table (last 10)
- Recent Invoices table (last 10)

---

## Phase 2: Database & Core Data (Supabase Backend)

### Database Tables
- **Bilties** — all bilty/LR details with auto-numbering
- **Bilty Items** — goods line items per bilty
- **Parties** — consignors & consignees with GSTIN, address, credit terms
- **Invoices** — generated from bilties, with GST breakdown
- **Invoice Items** — bilties linked to each invoice
- **Vehicles, Drivers, Locations, Goods Types** — master data
- **Expenses** — categorized, linkable to vehicles/trips
- **Company Settings** — GST info, invoice numbering, financial year
- **Users** — future-ready user management table

---

## Phase 3: Create Bilty (Core Feature)

### Bilty Creation Form
- Auto-generated bilty number with manual override toggle
- **Basic Info:** Date, Vehicle Number (dropdown from master), Driver (dropdown), Driver Mobile
- **Bill & E-way:** Bill Number, Bill Date, E-way Bill Number
- **Party Details (side-by-side):** Consignor and Consignee — select from saved parties or enter manually (Name, Address, GSTIN, Ship From/To)
- **Goods Table:** Add multiple items with Description, Quantity, Weight — auto-totals
- **Financials (₹):** Freight, Loading/Unloading/Weight charges, Advance Paid — auto-calculated Balance Due and Total Amount
- Save & Cancel actions with form validation (GSTIN format, required fields, phone validation)

---

## Phase 4: All Bilties & Bilty Management

### Summary Cards
- Total Bilties, Unbilled, Billed, Selected Total (₹)

### Filters & Search
- Status filter (All / Billed / Unbilled)
- Party filter, Date range (From–To), Search by bilty number or party name

### Data Table
- Checkbox selection, Bilty No, Date, Consignor, Consignee, Vehicle, Amount (₹), Status, Actions (View/Edit/Delete)
- Bulk selection with running total calculation
- Export to Excel
- Clear filters button

---

## Phase 5: Party Management

### Party List
- Tabbed by type: Consignor / Consignee
- Search by Name, Phone, GSTIN
- Add / Edit / Delete parties

### Party Form
- Name, GSTIN, Contact Person, Phone, Email, Address, City, State, Pincode
- Credit Limit (₹), Payment Terms (days), Active/Inactive status

---

## Phase 6: Invoice Management

### Invoice Dashboard Cards
- Total Invoices, Total Amount (₹), Balance Due (₹), Duplicate Invoices

### Create Invoice
- Select one or multiple unbilled bilties
- Auto-calculate GST (CGST/SGST for intra-state, IGST for inter-state)
- Set payment status: Paid / Partial / Unpaid

### Invoice List
- Filterable by status, party, date range
- Export to PDF & Excel

---

## Phase 7: Master Data

### Tabbed Management
- **Vehicles:** Number, Type, Owner, Status
- **Drivers:** Name, License, Mobile, Status  
- **Locations:** City, State, Pincode
- **Goods Types:** Category name, Description

Each tab: Add, Edit, Delete, Active/Inactive toggle

---

## Phase 8: Reports & Analytics

### Available Reports
- **Monthly Revenue:** Bar/line chart + data table
- **Party-wise Ledger:** All transactions per party
- **Outstanding Payments:** Aging report (30/60/90 days)
- **Vehicle-wise Report:** Revenue & trips per vehicle
- **GST Report:** CGST/SGST/IGST summary
- **Profit & Loss:** Revenue vs expenses

### Report Features
- Date range filter on every report
- Party/Vehicle filter where applicable
- Export each report to Excel & PDF

---

## Phase 9: Expenses Module

- Add expenses with Category, Amount (₹), Date, Notes
- Link to Vehicle or Trip
- Included in Profit & Loss calculations
- Filterable list with date range and category filters

---

## Phase 10: Settings, Backup & Users

### Settings
- Company profile (Name, Address, Phone, Email)
- GST details (GSTIN, State Code)
- Invoice numbering prefix/format
- Financial year configuration

### Backup
- Manual database export / download as JSON

### Users (Future-Ready)
- User list with role placeholders (Admin, Accountant)
- Add/edit user form (no auth for now, just data structure)

