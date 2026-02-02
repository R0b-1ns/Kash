# Architecture Frontend

## Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.2 | UI Framework |
| TypeScript | 5.3 | Typage statique |
| Vite | 5.0 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| React Router | 6.21 | Navigation |
| Axios | 1.6 | HTTP client |
| Recharts | 2.10 | Graphiques |
| Lucide React | 0.312 | Icônes |

## Structure des dossiers

```
frontend/src/
├── main.tsx                 # Point d'entrée
├── App.tsx                  # Router principal
├── types/
│   └── index.ts             # Interfaces TypeScript
├── services/
│   └── api.ts               # Client Axios + endpoints
├── hooks/
│   ├── useAuth.tsx          # Context d'authentification
│   └── useDebounce.ts       # Hook pour le debouncing
├── components/
│   ├── Layout.tsx           # Layout avec sidebar
│   ├── ProtectedRoute.tsx   # Garde de route
│   ├── DocumentFilters.tsx  # Panneau de filtres pour les documents
│   └── dashboard/           # Composants du dashboard
│       ├── StatCard.tsx
│       ├── MonthlyChart.tsx
│       ├── TagPieChart.tsx
│       ├── BudgetProgress.tsx
│       ├── TopExpenses.tsx
│       └── TopItems.tsx
└── pages/
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── DashboardPage.tsx
    ├── DocumentsPage.tsx
    ├── TagsPage.tsx
    ├── BudgetsPage.tsx
    └── SettingsPage.tsx
```

## Types TypeScript

### Entités principales

```typescript
interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

interface Document {
  id: number;
  file_path: string;
  original_name: string;
  doc_type?: 'receipt' | 'invoice' | 'payslip' | 'other';
  date?: string;
  merchant?: string;
  total_amount?: number;
  currency: string;
  is_income: boolean;
  tags: Tag[];
  items: Item[];
}

interface Tag {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

interface Budget {
  id: number;
  tag_id: number;
  month: string;
  limit_amount: number;
  currency: string;
}
```

### Types de statistiques

```typescript
interface StatsSummary {
  month: string;
  total_expenses: number;
  total_income: number;
  balance: number;
  transaction_count: number;
}

interface BudgetWithSpending {
  id: number;
  tag_name: string;
  tag_color: string;
  limit_amount: number;
  spent_amount: number;
  percentage_used: number;
}
```

## Client API

### Configuration Axios

```typescript
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur : ajoute le token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_manager_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur : gère les erreurs 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('finance_manager_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Endpoints disponibles

```typescript
// Authentification
auth.register(data: RegisterData): Promise<User>
auth.login(credentials: LoginCredentials): Promise<AuthResponse>
auth.getMe(): Promise<User>

// Documents
documents.list(params?): Promise<DocumentListItem[]>
documents.upload(file: File): Promise<Document>
documents.get(id: number): Promise<Document>
documents.update(id: number, data): Promise<Document>
documents.delete(id: number): Promise<void>

// Tags
tags.list(): Promise<Tag[]>
tags.create(data: TagCreate): Promise<Tag>
tags.update(id: number, data: TagUpdate): Promise<Tag>
tags.delete(id: number): Promise<void>

// Budgets
budgets.list(params?): Promise<Budget[]>
budgets.getCurrent(month?: string): Promise<BudgetWithSpending[]>
budgets.create(data: BudgetCreate): Promise<Budget>
budgets.update(id: number, data: BudgetUpdate): Promise<Budget>
budgets.delete(id: number): Promise<void>

// Statistiques
stats.getSummary(month?: string): Promise<StatsSummary>
stats.getByTag(month?: string): Promise<StatsByTag[]>
stats.getMonthly(months?: number): Promise<MonthlyStats[]>
stats.getTopItems(params?): Promise<TopItem[]>

// Synchronisation
sync.getStatus(): Promise<SyncStatus>
sync.testConnection(): Promise<SyncResult>
sync.runSync(): Promise<SyncRunResult>

// Export
exportApi.documentsCSV(params?): Promise<void>
exportApi.monthlyCSV(year: number, month: number): Promise<void>
```

## Composants

### Layout

Le layout principal avec sidebar responsive :

```tsx
<Layout>
  <Sidebar>
    <Logo />
    <Navigation />
    <UserInfo />
  </Sidebar>
  <Main>
    <Header />
    <Content>{children}</Content>
  </Main>
</Layout>
```

### ProtectedRoute

Composant qui protège les routes authentifiées :

```tsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

Si l'utilisateur n'est pas connecté, il est redirigé vers `/login`.

### Composants Dashboard

| Composant | Description |
|-----------|-------------|
| `StatCard` | Carte statistique avec icône et valeur |
| `MonthlyChart` | Graphique barres dépenses/revenus |
| `TagPieChart` | Camembert répartition par tag |
| `BudgetProgress` | Barres de progression budgets |
| `TopExpenses` | Liste dernières dépenses |
| `TopItems` | Articles les plus fréquents |

## Authentification

### Context Auth

```tsx
const AuthContext = createContext<AuthContextType>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifie le token au démarrage
  useEffect(() => {
    const token = getToken();
    if (token) {
      auth.getMe().then(setUser).catch(() => removeToken());
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await auth.login(credentials);
    setToken(response.access_token);
    const user = await auth.getMe();
    setUser(user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Utilisation

```tsx
function MyComponent() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <p>Bonjour {user.name}</p>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

## Styling

### Tailwind CSS

Classes utilitaires principales :

```tsx
// Carte
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

// Bouton primaire
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

// Bouton secondaire
<button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

// Badge/Tag
<span className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: tag.color }}>
```

### Palette de couleurs

| Usage | Couleur |
|-------|---------|
| Primary | `blue-600` |
| Success | `green-500` |
| Warning | `amber-500` |
| Danger | `red-500` |
| Background | `slate-50` |
| Cards | `white` |
