import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--dim)' }}>
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
