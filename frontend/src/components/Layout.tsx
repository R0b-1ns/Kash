/**
 * Layout principal de l'application
 * Contient la sidebar de navigation, le header et la zone de contenu
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Tags,
  PiggyBank,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

// ============================================
// Configuration de la navigation
// ============================================

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Tags', href: '/tags', icon: Tags },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

// ============================================
// Composant Layout
// ============================================

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // État pour le menu mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Gère la déconnexion
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /**
   * Vérifie si un lien est actif
   */
  const isActiveLink = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============================================ */}
      {/* Overlay mobile pour fermer la sidebar */}
      {/* ============================================ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============================================ */}
      {/* Sidebar */}
      {/* ============================================ */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Titre */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <Link to="/" className="flex items-center space-x-2">
            <PiggyBank className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-800">Kash</span>
          </Link>
          {/* Bouton fermer sur mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = isActiveLink(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center px-4 py-3 rounded-lg transition-colors duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Section utilisateur en bas */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center px-4 py-3 rounded-lg bg-slate-50">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.name || 'Utilisateur'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ============================================ */}
      {/* Contenu principal */}
      {/* ============================================ */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Bouton menu mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Titre de la page */}
            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-800 lg:ml-0 ml-4">
                {navigation.find((item) => isActiveLink(item.href))?.name || 'Kash'}
              </h1>
            </div>

            {/* Infos utilisateur (desktop) */}
            <div className="hidden sm:flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Bonjour, <span className="font-medium text-slate-800">{user?.name}</span>
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Zone de contenu */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
