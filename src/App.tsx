import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { SignDocument } from './pages/SignDocument';
import { PublicSigningPage } from './pages/PublicSigningPage';
import { Navigation } from './components/Navigation';
import { SignIn } from './components/SignIn';
import { supabase } from './lib/supabase';
import { ViewDocument } from './pages/ViewDocument';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setIsLoading(false);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const publicRoutes = ['/sign/:templateId', '/sign/:templateId/complete'];
  const isPublicRoute = publicRoutes.some(route => {
      const regex = new RegExp('^' + route.replace(/:\w+/g, '[^/]+') + '$');
      return regex.test(location.pathname);
  });

  // If it's NOT a public route and the user is NOT authenticated, show sign in
  if (!isPublicRoute && !isAuthenticated) {
    return <SignIn />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show navigation on admin dashboard when authenticated */}
      {isAuthenticated && !isPublicRoute && <Navigation />}
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/sign/:templateId" element={<PublicSigningPage />} />
        <Route path="/sign/:templateId/complete" element={<SignDocument />} />
        <Route path="/view/:documentId" element={<ViewDocument />} />
      </Routes>
    </div>
  );
}

export default App;
