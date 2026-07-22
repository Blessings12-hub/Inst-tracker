import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Engagement from './pages/Engagement.jsx';
import ContentTools from './pages/ContentTools.jsx';
import Premium from './pages/Premium.jsx';
import Settings from './pages/Settings.jsx';

function Shell({ children }) {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/engagement"
        element={
          <ProtectedRoute>
            <Shell>
              <Engagement />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/content"
        element={
          <ProtectedRoute>
            <Shell>
              <ContentTools />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/premium"
        element={
          <ProtectedRoute>
            <Shell>
              <Premium />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Shell>
              <Settings />
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
