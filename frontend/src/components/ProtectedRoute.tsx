/**
 * Composant de route protégée
 * Redirige vers /login si l'utilisateur n'est pas authentifié
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

// ============================================
// Types
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// ============================================
// Composant ProtectedRoute
// ============================================

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Affiche un loader pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirige vers login si non authentifié
  // Sauvegarde l'URL actuelle pour rediriger après connexion
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Utilisateur authentifié, affiche le contenu
  return <>{children}</>;
};

export default ProtectedRoute;
