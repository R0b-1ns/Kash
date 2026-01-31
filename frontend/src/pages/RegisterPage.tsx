/**
 * Page d'inscription
 * Formulaire d'inscription avec email, mot de passe et nom
 */

import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  PiggyBank,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// ============================================
// Composant RegisterPage
// ============================================

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  // État du formulaire
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Valide le formulaire avant soumission
   */
  const validateForm = (): boolean => {
    // Vérification des champs requis
    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Veuillez remplir tous les champs');
      return false;
    }

    // Vérification du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Adresse email invalide');
      return false;
    }

    // Vérification de la longueur du mot de passe
    if (password.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    // Vérification de la correspondance des mots de passe
    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validation du formulaire
    if (!validateForm()) {
      return;
    }

    try {
      await register({ name, email, password });
      setSuccess(true);
      // Redirection vers login après 2 secondes
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setLocalError(err.message || "Erreur lors de l'inscription");
    }
  };

  // Erreur à afficher (locale ou du contexte)
  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* ============================================ */}
      {/* Header avec logo */}
      {/* ============================================ */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <PiggyBank className="w-16 h-16 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-slate-800">
          Créer un compte
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Rejoignez Kash pour gérer vos finances
        </p>
      </div>

      {/* ============================================ */}
      {/* Formulaire d'inscription */}
      {/* ============================================ */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-xl sm:px-10">
          {/* Message de succès */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-green-700 font-medium">
                  Compte créé avec succès !
                </span>
                <p className="text-xs text-green-600 mt-1">
                  Redirection vers la page de connexion...
                </p>
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {displayError && !success && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champ Nom */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700"
              >
                Nom complet
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={success}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>

            {/* Champ Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Adresse email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={success}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={success}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                  placeholder="Minimum 8 caractères"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Le mot de passe doit contenir au moins 8 caractères
              </p>
            </div>

            {/* Champ Confirmation mot de passe */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700"
              >
                Confirmer le mot de passe
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={success}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                  placeholder="Confirmez votre mot de passe"
                />
              </div>
            </div>

            {/* Bouton d'inscription */}
            <div>
              <button
                type="submit"
                disabled={isLoading || success}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Création du compte...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Compte créé !
                  </>
                ) : (
                  "S'inscrire"
                )}
              </button>
            </div>
          </form>

          {/* Lien vers connexion */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Déjà un compte ?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
