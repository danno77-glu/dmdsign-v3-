import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname === '/';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Logo className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin ? 'Document Manager' : 'Sign Document'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link
                to="/"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Dashboard
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
