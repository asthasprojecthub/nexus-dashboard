# ⚡ Electrical CRM Dashboard

A full-stack production-ready CRM system for Electrical Panel Manufacturing companies. Manage inquiries, projects, customers, and team — all in one place.

---

## 🏗️ Tech Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS        |
| Backend    | Node.js + Express.js                  |
| Database   | MongoDB + Mongoose                    |
| Auth       | JWT (JSON Web Tokens)                 |
| Charts     | Recharts                              |
| Icons      | Lucide React                          |
| HTTP       | Axios                                 |

---

## 📁 Project Structure

```
electrical-crm/
│
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Login, me, change-password
│   │   ├── inquiryController.js   # Full CRUD + follow-ups
│   │   ├── projectController.js   # Full CRUD + convert inquiry
│   │   ├── customerController.js  # Full CRUD + history
│   │   ├── dashboardController.js # Stats, charts, recent
│   │   ├── notificationController.js
│   │   └── userController.js      # Admin user management
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT protect + role authorize
│   │   └── errorMiddleware.js     # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Inquiry.js
│   │   ├── Project.js
│   │   ├── Customer.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── inquiryRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── userRoutes.js
│   ├── seed/
│   │   └── seedData.js            # Demo data + users
│   ├── utils/
│   │   └── generateToken.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js           # Axios instance + interceptors
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Sidebar.jsx    # Dark collapsible sidebar
    │   │   │   ├── Topbar.jsx     # Top navbar + bell icon
    │   │   │   ├── Table.jsx      # Reusable paginated table
    │   │   │   ├── Modal.jsx      # Reusable modal
    │   │   │   ├── StatusBadge.jsx # Color-coded status badges
    │   │   │   ├── Spinner.jsx
    │   │   │   └── FormComponents.jsx # Input, Select, Button, Card...
    │   │   ├── inquiry/
    │   │   │   └── InquiryForm.jsx
    │   │   ├── project/
    │   │   │   └── ProjectForm.jsx
    │   │   └── customer/
    │   │       └── CustomerForm.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx    # Auth state + login/logout
    │   │   └── ToastContext.jsx   # Global toast notifications
    │   ├── layouts/
    │   │   └── MainLayout.jsx     # Sidebar + Topbar + Outlet
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx  # Stats + 4 charts + recent
    │   │   ├── InquiriesPage.jsx  # CRUD + filter + pagination
    │   │   ├── ProjectsPage.jsx   # CRUD + filter + progress bar
    │   │   ├── CustomersPage.jsx  # CRUD + history detail
    │   │   ├── NotificationsPage.jsx
    │   │   ├── UsersPage.jsx      # Admin only
    │   │   └── NotFoundPage.jsx
    │   ├── routes/
    │   │   └── ProtectedRoute.jsx
    │   ├── App.jsx                # All routes defined here
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

---

### Step 1 — Clone or copy the project

```bash
# If using git
git clone <your-repo-url>
cd electrical-crm
```

---

### Step 2 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/electrical_crm
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
NODE_ENV=development
```

---

### Step 3 — Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

No `.env` needed for frontend (uses Vite proxy to forward `/api` → `localhost:5000`).

---

### Step 4 — Seed Demo Data

```bash
cd backend
npm run seed
```

This creates:
- 4 demo users (admin, manager, 2 salespersons)
- 4 customers
- 6 inquiries (various statuses)
- 2 projects
- 3 notifications

---

### Step 5 — Run the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App running on http://localhost:3000
```

Open: **http://localhost:3000**

---

## 🔐 Demo Login Credentials

| Role        | Email                          | Password   |
|-------------|--------------------------------|------------|
| Admin       | admin@electricalcrm.com        | admin123   |
| Manager     | manager@electricalcrm.com      | manager123 |
| Salesperson | amit@electricalcrm.com         | sales123   |
| Salesperson | priya@electricalcrm.com        | sales123   |

---

## 📡 API Reference

### Auth
| Method | Endpoint               | Access  | Description      |
|--------|------------------------|---------|------------------|
| POST   | /api/auth/login        | Public  | Login            |
| GET    | /api/auth/me           | Private | Get current user |
| PUT    | /api/auth/change-password | Private | Change password |

### Inquiries
| Method | Endpoint                    | Access         | Description              |
|--------|-----------------------------|----------------|--------------------------|
| GET    | /api/inquiries              | Private        | List (filter+pagination) |
| GET    | /api/inquiries/:id          | Private        | Single inquiry           |
| POST   | /api/inquiries              | Private        | Create inquiry           |
| PUT    | /api/inquiries/:id          | Private        | Update inquiry           |
| DELETE | /api/inquiries/:id          | Admin/Manager  | Delete inquiry           |
| GET    | /api/inquiries/follow-ups   | Private        | Pending follow-ups       |

### Projects
| Method | Endpoint                        | Access  | Description           |
|--------|---------------------------------|---------|-----------------------|
| GET    | /api/projects                   | Private | List projects         |
| POST   | /api/projects                   | Private | Create project        |
| PUT    | /api/projects/:id               | Private | Update project        |
| DELETE | /api/projects/:id               | Admin   | Delete project        |
| POST   | /api/projects/convert/:inquiryId | Private | Convert inquiry→project |

### Dashboard
| Method | Endpoint              | Access  | Description             |
|--------|-----------------------|---------|-------------------------|
| GET    | /api/dashboard/stats  | Private | All stats + chart data  |
| GET    | /api/dashboard/recent | Private | Recent inquiries/projects |

### Customers, Notifications, Users — all follow same CRUD pattern.

---

## ✨ Features

- 🔐 **JWT Auth** with role-based access (Admin / Manager / Salesperson)
- 📋 **Full Inquiry CRUD** — add, edit, delete, filter, search, paginate
- 🏗️ **Project Management** — convert confirmed inquiries to projects in one click
- 👥 **Customer History** — auto-created from inquiries, tracks business value
- 🔔 **Notifications** — follow-up reminders, order confirmations, overdue alerts
- 📊 **Dashboard** — 8 stat cards + 4 charts (trend, revenue, funnel, pie)
- 🎨 **Modern UI** — dark sidebar, white content, colored status badges
- 📱 **Responsive** — works on desktop and tablet
- 🏷️ **Status Badges** — color-coded for every status and priority

---

## 🎨 Status Badge Colors

| Status           | Color  |
|------------------|--------|
| New              | Blue   |
| Under Discussion | Orange |
| Quotation Sent   | Purple |
| Order Confirmed  | Green  |
| Lost             | Red    |
| Completed        | Emerald|
| High Priority    | Red    |
| Medium Priority  | Yellow |
| Low Priority     | Green  |
