
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Reduced padding */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <i className="ri-menu-line text-xl text-gray-600"></i>
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-xs text-gray-600 sm:hidden">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Reduced padding */}
        <main className="flex-1 overflow-auto p-3 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
