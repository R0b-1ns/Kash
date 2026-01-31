/**
 * Application principale Finance Manager
 * Configuration du routeur et des providers
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Composants
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import TagsPage from './pages/TagsPage';
import BudgetsPage from './pages/BudgetsPage';
import SettingsPage from './pages/SettingsPage';

// ============================================
// Composant App
// ============================================

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ============================================ */}
          {/* Routes publiques (non authentifiees) */}
          {/* ============================================ */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ============================================ */}
          {/* Routes protegees (authentification requise) */}
          {/* ============================================ */}

          {/* Dashboard - Page d'accueil */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Documents - Liste et upload */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Tags - Gestion des categories */}
          <Route
            path="/tags"
            element={
              <ProtectedRoute>
                <Layout>
                  <TagsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Budgets - Gestion des budgets */}
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <Layout>
                  <BudgetsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Parametres - Sync NAS et export */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ============================================ */}
          {/* Route par defaut - Redirection vers dashboard */}
          {/* ============================================ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
