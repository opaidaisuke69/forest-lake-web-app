import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const navSections = [
  {
    label: 'Main',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
      { path: '/admin/reports', label: 'Reservation Reports', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    ],
  },
  {
    label: 'Cemetery Management',
    items: [
      { path: '/admin/burial-lots', label: 'Burial Lots', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
      { path: '/admin/burial-lots/map', label: 'Cemetery Map', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
      { path: '/admin/reservations', label: 'Reservations', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
      { path: '/admin/manage-lots', label: 'Manage Client Lots', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
  {
    label: 'Client Management',
    items: [
      { path: '/admin/clients', label: 'Clients', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/admin/settings', label: 'Settings', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { darkMode, compactSidebar } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    const fetchPending = () => {
      api.get('/reservations/list.php?role=admin')
        .then(res => {
          const count = (res.data.data || []).filter(r => r.status === 'pending').length;
          setPendingCount(count);
        })
        .catch(() => {});
    };
    fetchPending();
    const id = setInterval(fetchPending, 3000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };
  const confirmLogout = () => setShowLogoutModal(true);

  return (
    <div className={`h-screen flex overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-surface'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${compactSidebar ? 'w-20' : 'w-72'} ${darkMode ? 'bg-gray-900 border-r border-gray-700' : 'bg-primary-dark'} transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`${compactSidebar ? 'p-4 flex justify-center' : 'p-6 pb-4'}`}>
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <img src="/src/assets/global/forest-lake-logo-white.png" alt="Forest Lake" className={`${compactSidebar ? 'h-8' : 'h-9'} w-auto`} />
              {!compactSidebar && (
                <div>
                  <p className="text-white font-bold text-lg leading-tight">Forest Lake</p>
                  <p className="text-green-300/70 text-xs font-medium">Admin Panel</p>
                </div>
              )}
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-6 overflow-y-auto pt-2">
            {navSections.map(section => (
              <div key={section.label}>
                {!compactSidebar && <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-green-400/50 mb-2">{section.label}</p>}
                <div className="space-y-1">
                  {section.items.map(item => {
                    const isActive = location.pathname === item.path;
                    const badge = item.path === '/admin/reservations' && pendingCount > 0 ? pendingCount : null;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        title={compactSidebar ? item.label : undefined}
                        className={`flex items-center ${compactSidebar ? 'justify-center' : ''} gap-3 ${compactSidebar ? 'px-3 py-3' : 'px-4 py-2.5'} rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-green-200/70 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        {!compactSidebar && <span>{item.label}</span>}
                        {badge && !compactSidebar && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 animate-pulse">{badge}</span>
                        )}
                        {badge && compactSidebar && (
                          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-0.5">{badge}</span>
                        )}
                        {isActive && !compactSidebar && !badge && <span className="ml-auto w-1.5 h-1.5 bg-green-400 rounded-full"></span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User section */}
          {!compactSidebar ? (
            <div className="p-4 m-4 mt-0 bg-white/5 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-primary/50 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.first_name?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.first_name || 'Admin'}</p>
                  <p className="text-green-300/60 text-xs truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={confirmLogout} className="w-full text-left text-sm text-red-300/80 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          ) : (
            <div className="p-3 flex justify-center">
              <button onClick={confirmLogout} title="Logout" className="w-10 h-10 rounded-xl text-red-300/80 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen lg:min-w-0 overflow-hidden">
        <header className={`shrink-0 z-30 backdrop-blur-xl border-b px-4 sm:px-6 lg:px-8 py-4 ${darkMode ? 'bg-gray-700/80 border-gray-600' : 'bg-white/80 border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition" aria-label="Open sidebar">
              <svg className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <div className="hidden sm:block text-right">
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Administrator</p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${darkMode ? 'bg-primary/20 text-primary-light' : 'bg-primary/10 text-primary'}`}>
                {user?.first_name?.[0] || 'A'}
              </div>
            </div>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${darkMode ? 'bg-gray-800 dark-content' : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowLogoutModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Logout</h3>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to log out?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold transition hover:bg-gray-200">Cancel</button>
              <button onClick={handleLogout} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition">Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
