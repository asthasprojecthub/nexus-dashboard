import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import API from '../../api/axios';

const routeTitles = {
  '/': 'Dashboard',
  '/inquiries': 'Inquiries',
  '/inquiries/add': 'Add Inquiry',
  '/projects': 'Projects',
  '/customers': 'Customers',
  '/notifications': 'Notifications',
  '/users': 'User Management',
};

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const title = routeTitles[location.pathname] || 'Electrical CRM';

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await API.get('/notifications?isRead=false&limit=1');
        setUnreadCount(data.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
  }, [location.pathname]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="font-semibold text-gray-900 text-lg">{title}</h1>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
