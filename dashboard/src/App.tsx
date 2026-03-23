import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LandingPage2 from './pages/LandingPage2';
import InteractiveEffectsDemo from './pages/InteractiveEffectsDemo';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted">Загрузка...</div>;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function StyleManager() {
  const location = useLocation();

  useEffect(() => {
    // Remove landing styles link if it exists
    let landingLink = document.getElementById('landing-styles') as HTMLLinkElement | null;
    
    // Check if current route is a landing page
    const isLandingRoute = ['/', '/landing2', '/interactive-demo'].includes(location.pathname);
    
    if (isLandingRoute && !landingLink) {
      // Add landing styles
      landingLink = document.createElement('link') as HTMLLinkElement;
      landingLink.id = 'landing-styles';
      landingLink.rel = 'stylesheet';
      landingLink.href = '/src/landing.css';
      document.head.appendChild(landingLink);
    } else if (!isLandingRoute && landingLink) {
      // Remove landing styles
      landingLink.remove();
    }
  }, [location.pathname]);

  return null;
}

function AppRoutes() {
  const { isAuthenticated, fetchUser, initialize } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated, fetchUser]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      <StyleManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing2" element={<LandingPage2 />} />
        <Route path="/interactive-demo" element={<InteractiveEffectsDemo />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
