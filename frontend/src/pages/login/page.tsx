
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setIsLoading(true);
      setError('');
      
      try {
        const response = await authAPI.login(username, password);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username.toLowerCase());
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Login error:', err);
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img 
                src="https://static.readdy.ai/image/b22b93079978dab8c24ffa7a6f5c701a/1627e95bb5255090322468c6e80f8ef5.jfif" 
                alt="Refex Logo" 
                className="h-12 w-12 object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">POS System</h1>
          <p className="text-gray-600">Welcome back! Please sign in to continue</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <i className="ri-user-line mr-2"></i>
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-4 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter your username"
                required
              />
              <i className="ri-user-line absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <i className="ri-lock-line mr-2"></i>
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter your password"
                required
              />
              <i className="ri-lock-line absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line mr-2 animate-spin"></i>
                Signing In...
              </>
            ) : (
              <>
                <i className="ri-login-box-line mr-2"></i>
                Sign In
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              <i className="ri-information-line mr-2"></i>
              Demo Credentials
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Username:</strong> admin / refextower / bazullah</p>
              <p><strong>Password:</strong> password</p>
            </div>
            <div className="mt-3 text-xs text-blue-600 bg-blue-100 rounded-lg p-2">
              <p><strong>Note:</strong> Different usernames affect support staff company assignment:</p>
              <p>• refextower → Refex Industries Limited</p>
              <p>• bazullah → Refex Holding Private Limited</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
