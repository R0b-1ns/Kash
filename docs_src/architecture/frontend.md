# Frontend Architecture

## Tech Stack

| Technology | Version | Usage |
|-------------|---------|-------|
| React | 18.2 | UI Framework |
| TypeScript | 5.3 | Static Typing |
| Vite | 5.0 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| React Router | 6.21 | Navigation |
| Axios | 1.6 | HTTP client |
| Recharts | 2.10 | Charts |
| Lucide React | 0.312 | Icons |

## Folder Structure

```
frontend/src/
├── main.tsx                 # Entry Point
├── App.tsx                  # Main Router
├── types/
│   └── index.ts             # TypeScript Interfaces
├── services/
│   └── api.ts               # Axios Client + Endpoints
├── hooks/
│   ├── useAuth.tsx          # Authentication Context
│   └── useDebounce.ts       # Debouncing Hook
├── components/
│   ├── Layout.tsx           # Layout with Sidebar
│   ├── ProtectedRoute.tsx   # Route Guard
│   ├── DocumentFilters.tsx  # Document Filters Panel
│   └── dashboard/           # Dashboard Components
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

## TypeScript Types

### Main Entities

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

### Statistics Types

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

## API Client

### Axios Configuration

```typescript
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adds JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_manager_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: handles 401 errors
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

### Available Endpoints

```typescript
// Authentication
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

// Statistics
stats.getSummary(month?: string): Promise<StatsSummary>
stats.getByTag(month?: string): Promise<StatsByTag[]>
stats.getMonthly(months?: number): Promise<MonthlyStats[]>
stats.getTopItems(params?): Promise<TopItem[]>

// Synchronization
sync.getStatus(): Promise<SyncStatus>
sync.testConnection(): Promise<SyncResult>
sync.runSync(): Promise<SyncRunResult>

// Export
exportApi.documentsCSV(params?): Promise<void>
exportApi.monthlyCSV(year: number, month: number): Promise<void>
exportApi.monthlyPDF(year: number, month: number): Promise<void>
exportApi.annualPDF(year: number): Promise<void>
exportApi.exportChart(chartType: ChartType, month?: string): Promise<void>
```

## Components

### Layout

The main layout with responsive sidebar:

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

Component that protects authenticated routes:

```tsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

If the user is not logged in, they are redirected to `/login`.

### Dashboard Components

| Component | Description |
|-----------|-------------|
| `StatCard` | Statistic card with icon and value |
| `MonthlyChart` | Bar chart of expenses/income |
| `TagPieChart` | Donut chart of category breakdown |
| `BudgetProgress` | Budget progress bars |
| `TopExpenses` | List of latest expenses |
| `TopItems` | Most frequent items |

## Important Frontend Pages

*   **`SettingsPage.tsx`**: This page has been extended to include new user interfaces for exporting monthly and annual PDF reports, as well as exporting individual charts in PNG format. It allows users to choose periods and chart types for their exports.

## Authentication

### Auth Context

```tsx
const AuthContext = createContext<AuthContextType>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Checks token on startup
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

### Usage

```tsx
function MyComponent() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <p>Hello {user.name}</p>
      <button onClick={logout}>Logout</button>
    }
  );
}
```

## Styling

### Tailwind CSS

Main utility classes:

```tsx
// Card
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

// Primary button
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

// Secondary button
<button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">

// Badge/Tag
<span className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: tag.color }}>
```

### Color Palette

| Usage | Color |
|-------|-------|
| Primary | `blue-600` |
| Success | `green-500` |
| Warning | `amber-500` |
| Danger | `red-500` |
| Background | `slate-50` |
| Cards | `white` |
