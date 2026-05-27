// import React from 'react';
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';
// import { ToastProvider } from './context/ToastContext';
// import ProtectedRoute from './routes/ProtectedRoute';
// import MainLayout from './layouts/MainLayout';

// // Pages
// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
// import InquiriesPage from './pages/InquiriesPage';
// import ProjectsPage from './pages/ProjectsPage';
// import CustomersPage from './pages/CustomersPage';
// import NotificationsPage from './pages/NotificationsPage';
// import UsersPage from './pages/UsersPage';
// import NotFoundPage from './pages/NotFoundPage';

// const App = () => {
//   return (
//     <BrowserRouter>
//       <AuthProvider>
//         <ToastProvider>
//           <Routes>
//             {/* Public */}
//             <Route path="/login" element={<LoginPage />} />

//             {/* Protected - all roles */}
//             <Route element={<ProtectedRoute />}>
//               <Route element={<MainLayout />}>
//                 <Route path="/" element={<DashboardPage />} />
//                 <Route path="/inquiries" element={<InquiriesPage />} />
//                 <Route path="/projects" element={<ProjectsPage />} />
//                 <Route path="/customers" element={<CustomersPage />} />
//                 <Route path="/notifications" element={<NotificationsPage />} />
//               </Route>
//             </Route>

//             {/* Admin only */}
//             <Route element={<ProtectedRoute roles={['admin']} />}>
//               <Route element={<MainLayout />}>
//                 <Route path="/users" element={<UsersPage />} />
//               </Route>
//             </Route>

//             {/* Fallback */}
//             <Route path="/404" element={<NotFoundPage />} />
//             <Route path="*" element={<Navigate to="/404" replace />} />
//           </Routes>
//         </ToastProvider>
//       </AuthProvider>
//     </BrowserRouter>
//   );
// };

// export default App;
// ─────────────────────────────────────────────────────────────────────────────
// App.jsx  (updated — drop-in replacement for frontend/src/App.jsx)
// Adds:
//   /inquiries/new     → ElectricalPanelInquiryPage (create)
//   /inquiries/:id/edit → ElectricalPanelInquiryPage (edit)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Existing pages
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import InquiriesPage    from './pages/InquiriesPage';
import ProjectsPage     from './pages/ProjectsPage';
import CustomersPage    from './pages/CustomersPage';
import NotificationsPage from './pages/NotificationsPage';
import UsersPage        from './pages/UsersPage';
import NotFoundPage     from './pages/NotFoundPage';

// New page
import ElectricalPanelInquiryPage from './pages/ElectricalPanelInquiryPage';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — all roles */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/"              element={<DashboardPage />} />
              <Route path="/inquiries"     element={<InquiriesPage />} />

              {/* ── NEW: Full Electrical Panel Inquiry Form ── */}
              <Route path="/inquiries/new"       element={<ElectricalPanelInquiryPage />} />
              <Route path="/inquiries/:id/edit"  element={<ElectricalPanelInquiryPage />} />

              <Route path="/projects"      element={<ProjectsPage />} />
              <Route path="/customers"     element={<CustomersPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<MainLayout />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
