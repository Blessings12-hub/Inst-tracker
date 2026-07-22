import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, requireInstagram = true }) {
  const { user, loading, isInstagramConnected } = useAuth();

  if (loading) return null; // could render a spinner
  if (!user) return <Navigate to="/login" replace />;
  if (requireInstagram && !isInstagramConnected) return <Navigate to="/login" replace />;

  return children;
}
