/**
 * Hook d'authentification pour le Finance Manager
 * Gère l'état d'authentification, le stockage du token et les fonctions login/logout/register
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { auth, getToken, removeToken } from '../services/api';
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthContextType,
} from '../types';

// Création du contexte avec une valeur par défaut undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider d'authentification
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // État de l'utilisateur connecté
  const [user, setUser] = useState<User | null>(null);
  // État de chargement (vérification initiale du token)
  const [isLoading, setIsLoading] = useState(true);
  // État d'erreur
  const [error, setError] = useState<string | null>(null);

  // L'utilisateur est authentifié si on a un user
  const isAuthenticated = !!user;

  /**
   * Vérifie si un token existe et récupère les infos utilisateur
   * Appelé au montage du composant
   */
  const checkAuth = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Tente de récupérer les infos de l'utilisateur avec le token existant
      const userData = await auth.getMe();
      setUser(userData);
    } catch (err) {
      // Token invalide ou expiré, on le supprime
      console.error('Token invalide:', err);
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vérification de l'auth au montage
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Connexion de l'utilisateur
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      // Appel à l'API de login (le token est automatiquement stocké)
      await auth.login(credentials);

      // Récupération des infos utilisateur
      const userData = await auth.getMe();
      setUser(userData);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || 'Erreur lors de la connexion';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Inscription d'un nouvel utilisateur
   */
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      // Création du compte
      await auth.register(data);
      // Note: Après l'inscription, l'utilisateur doit se connecter
      // On ne connecte pas automatiquement ici
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || "Erreur lors de l'inscription";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Déconnexion de l'utilisateur
   */
  const logout = useCallback((): void => {
    removeToken();
    setUser(null);
    setError(null);
  }, []);

  /**
   * Efface l'erreur courante
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Valeur du contexte
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// Hook personnalisé pour utiliser le contexte
// ============================================

/**
 * Hook pour accéder au contexte d'authentification
 * @throws Error si utilisé en dehors d'un AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }

  return context;
};

export default useAuth;
