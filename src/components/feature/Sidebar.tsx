
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/dashboard' },
    { id: 'billing', label: 'Billing', icon: 'ri-bill-line', path: '/billing' },
    { id: 'master', label: 'Master', icon: 'ri-settings-line', path: '/master' },
    { id: 'reports', label: 'Reports', icon: 'ri-file-chart-line', path: '/reports' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar - Reduced width */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-auto w-56 lg:shadow-lg`}>
        
        {/* Header - Reduced padding */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="https://static.readdy.ai/image/b22b93079978dab8c24ffa7a6f5c701a/1627e95bb5255090322468c6e80f8ef5.jfif" 
                alt="Refex Logo" 
                className="h-6 w-6 object-contain"
              />
              <h2 className="text-base font-bold text-gray-800">POS System</h2>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <i className="ri-close-line text-lg text-gray-600"></i>
            </button>
          </div>
        </div>

        {/* Navigation - Reduced padding */}
        <nav className="p-3 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap group ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <i className={`${item.icon} text-lg mr-2 ${
                    location.pathname === item.path ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`}></i>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer - Reduced padding */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap group"
          >
            <i className="ri-logout-box-line text-lg mr-2 group-hover:text-red-700"></i>
            <span className="font-medium text-sm group-hover:text-red-700">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
