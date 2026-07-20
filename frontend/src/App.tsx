import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { AuthPage } from './components/AuthPage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { MetricsPage } from './pages/MetricsPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AssistantPage, BatchesPage, ForecastsPage, PromotionsPage, ReplenishmentsPage } from './pages/IntelligencePages';
import { ApiRepository } from './data/apiRepository';
import type { AccessLog, AppUser, DashboardIntelligence, DemandForecastResult, ExpirationRiskItem, Product, PromotionSuggestion, Repository, ReplenishmentRecommendation, UserRole } from './types/models';
import type { AuthMode, ProductFilter, Screen } from './types/app';
import { defaultUnitForCategory, isAdmin, isRestrictedScreen } from './lib/stock';
import { errorMessage, id } from './lib/format';

const isPostgresProvider = true;
const defaultCompanyId = '00000000-0000-4000-8000-000000000001';

export function App() {
  const repository = useMemo<Repository>(() => new ApiRepository({ baseUrl: import.meta.env.VITE_API_URL }), []);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [dashboard, setDashboard] = useState<DashboardIntelligence | null>(null);
  const [expirationRisks, setExpirationRisks] = useState<ExpirationRiskItem[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecastResult[]>([]);
  const [replenishments, setReplenishments] = useState<ReplenishmentRecommendation[]>([]);
  const [promotions, setPromotions] = useState<PromotionSuggestion[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>('inicio');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMessage, setAuthMessage] = useState('');
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Postgres conectado');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const currentUserRef = useRef<AppUser | null>(null);
  const usersRef = useRef<AppUser[]>([]);
  const productsRef = useRef<Product[]>([]);
  const accessLogsRef = useRef<AccessLog[]>([]);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { productsRef.current = products; }, [products]);
  useEffect(() => { accessLogsRef.current = accessLogs; }, [accessLogs]);

  const logAction = useCallback(async (action: AccessLog['action'], details?: string) => {
    const user = currentUserRef.current;
    if (!user) {
      return;
    }

    const nextLogs = [
      { id: id(), companyId: user.companyId, userId: user.id, userName: user.name, action, details, timestamp: new Date().toISOString() },
      ...accessLogsRef.current,
    ].slice(0, 1000);
    setAccessLogs(nextLogs);
    accessLogsRef.current = nextLogs;

    try {
      await repository.saveAccessLogs(nextLogs);
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  }, [repository]);

  const refreshData = useCallback(async (reason = 'Atualizado') => {
    try {
      const [nextUsers, nextProducts, nextLogs] = await Promise.all([
        repository.getUsers(),
        repository.getProducts(),
        repository.getAccessLogs(),
      ]);
      const companyId = currentUserRef.current?.companyId ?? nextUsers[0]?.companyId ?? defaultCompanyId;
      const [nextDashboard, nextRisks, nextForecasts, nextReplenishments, nextPromotions] = await Promise.all([
        repository.getDashboard(companyId).catch(() => null),
        repository.getExpirationRisks(companyId).catch(() => []),
        repository.getForecasts(companyId).catch(() => []),
        repository.getReplenishments(companyId).catch(() => []),
        repository.getPromotions(companyId).catch(() => []),
      ]);

      setUsers(nextUsers);
      setProducts(nextProducts);
      setAccessLogs(nextLogs);
      setDashboard(nextDashboard);
      setExpirationRisks(nextRisks);
      setForecasts(nextForecasts);
      setReplenishments(nextReplenishments);
      setPromotions(nextPromotions);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus(reason);

      const current = currentUserRef.current;
      if (current) {
        const freshUser = nextUsers.find((user) => user.id === current.id);
        setCurrentUser(freshUser ? { ...freshUser } : null);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncStatus('Erro de conexao com o servidor');
    }
  }, [repository]);

  useEffect(() => {
    async function seedInitialData() {
      try {
        const nextUsers = await repository.getUsers();
        const nextProducts = await repository.getProducts();
        const nextLogs = await repository.getAccessLogs();

        setUsers(nextUsers);
        setProducts(nextProducts);
        setAccessLogs(nextLogs);
        setDashboard(await repository.getDashboard(nextUsers[0]?.companyId ?? defaultCompanyId).catch(() => null));
        setExpirationRisks(await repository.getExpirationRisks(nextUsers[0]?.companyId ?? defaultCompanyId).catch(() => []));
        setForecasts(await repository.getForecasts(nextUsers[0]?.companyId ?? defaultCompanyId).catch(() => []));
        setReplenishments(await repository.getReplenishments(nextUsers[0]?.companyId ?? defaultCompanyId).catch(() => []));
        setPromotions(await repository.getPromotions(nextUsers[0]?.companyId ?? defaultCompanyId).catch(() => []));
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        setAuthMessage(`Erro ao conectar com o servidor: ${errorMessage(error)}.`);
        console.error(error);
      }
    }

    void seedInitialData();
  }, [repository]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith('stockia.')) {
        void refreshData('Dados atualizados em outra aba');
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 960) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('resize', handleResize);
    const pollInterval = window.setInterval(() => {
      if (currentUserRef.current) {
        void refreshData('Sincronizado');
      }
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('resize', handleResize);
      window.clearInterval(pollInterval);
    };
  }, [refreshData]);

  useEffect(() => {
    if (currentUser && isRestrictedScreen(activeScreen) && !isAdmin(currentUser)) {
      setActiveScreen('inicio');
    }
  }, [activeScreen, currentUser]);

  async function handleAuthSubmit(form: HTMLFormElement): Promise<void> {
    const formData = new FormData(form);

    if (authMode === 'login') {
      const email = String(formData.get('email') ?? '').trim().toLowerCase();
      const password = String(formData.get('password') ?? '');
      const user = usersRef.current.find((item) => item.email.toLowerCase() === email && item.password === password);

      if (!user) {
        setAuthMessage('Email ou senha invalidos.');
        return;
      }

      const loggedUser = { ...user, lastLoginAt: new Date().toISOString() };
      const nextUsers = usersRef.current.map((item) => (item.id === user.id ? loggedUser : item));
      setUsers(nextUsers);
      await repository.saveUsers(nextUsers);
      setCurrentUser(loggedUser);
      currentUserRef.current = loggedUser;
      setAuthMessage('');
      setActiveScreen('inicio');
      await logAction('login');
      await logAction('page_view', 'inicio');
      return;
    }

    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setAuthMessage('As senhas nao conferem.');
      return;
    }

    if (usersRef.current.some((user) => user.email.toLowerCase() === email)) {
      setAuthMessage('Ja existe usuario com este email.');
      return;
    }

    const isFirstUser = usersRef.current.length === 0;
    const newUser: AppUser = {
      id: id(),
      companyId: usersRef.current[0]?.companyId ?? defaultCompanyId,
      name,
      email,
      password,
      role: isFirstUser ? 'admin' : 'staff',
      active: true,
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [newUser, ...usersRef.current];
    setUsers(nextUsers);
    await repository.saveUsers(nextUsers);
    setAuthMode('login');
    setAuthMessage('Cadastro concluido. Agora faca login.');
  }

  async function handleProductSubmit(form: HTMLFormElement): Promise<void> {
    if (!currentUserRef.current) {
      return;
    }

    const formData = new FormData(form);
    const productId = String(formData.get('productId') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim();
    const unit = String(formData.get('unit') ?? '').trim() || defaultUnitForCategory(category);
    const barcode = String(formData.get('barcode') ?? '').trim();
    const imageUrl = String(formData.get('imageUrl') ?? '').trim();
    const quantity = Number(formData.get('quantity') ?? 0);
    const minQuantity = Number(formData.get('minQuantity') ?? 0);
    const price = Number(formData.get('price') ?? 0);

    if (!name) {
      return;
    }

    let nextProducts: Product[];
    if (productId) {
      nextProducts = productsRef.current.map((product) =>
        product.id === productId
          ? { ...product, name, category: category || undefined, unit: unit || undefined, barcode: barcode || undefined, imageUrl: imageUrl || undefined, quantity, minQuantity, price, updatedAt: new Date().toISOString() }
          : product,
      );
      setEditProductId(null);
      await logAction('update_product', name);
    } else {
      const now = new Date().toISOString();
      nextProducts = [
        { id: id(), companyId: currentUserRef.current.companyId, name, category: category || undefined, unit: unit || undefined, barcode: barcode || undefined, imageUrl: imageUrl || undefined, quantity, minQuantity, maxQuantity: undefined, costPrice: price, price, createdBy: currentUserRef.current.id, active: true, createdAt: now, updatedAt: now },
        ...productsRef.current,
      ];
      await logAction('create_product', name);
      form.reset();
    }

    setProducts(nextProducts);
    productsRef.current = nextProducts;
    await repository.saveProducts(nextProducts);
  }

  async function handleUserSubmit(form: HTMLFormElement): Promise<void> {
    if (!isAdmin(currentUserRef.current)) {
      return;
    }

    const formData = new FormData(form);
    const userId = String(formData.get('userId') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    const role = (String(formData.get('role') ?? 'staff') === 'admin' ? 'admin' : 'staff') as UserRole;

    if (usersRef.current.some((user) => user.email.toLowerCase() === email && user.id !== userId)) {
      alert('Ja existe usuario com este email.');
      return;
    }

    const nextUsers = userId
      ? usersRef.current.map((user) => user.id === userId ? { ...user, name, email, role, password: password || user.password } : user)
      : [{ id: id(), companyId: currentUserRef.current?.companyId ?? defaultCompanyId, name, email, password: password || '123456', role, active: true, createdAt: new Date().toISOString() }, ...usersRef.current];

    setUsers(nextUsers);
    usersRef.current = nextUsers;
    await repository.saveUsers(nextUsers);
    const freshCurrent = nextUsers.find((user) => user.id === currentUserRef.current?.id);
    setCurrentUser(freshCurrent ? { ...freshCurrent } : null);
    setEditingUserId(null);

    if (!userId) {
      await logAction('create_user', name);
    }
  }

  async function handleDeleteProduct(productId: string): Promise<void> {
    const product = productsRef.current.find((item) => item.id === productId);
    if (!product || !confirm(`Excluir ${product.name}?`)) {
      return;
    }

    await repository.deleteProduct(productId);
    const nextProducts = productsRef.current.filter((item) => item.id !== productId);
    setProducts(nextProducts);
    productsRef.current = nextProducts;
    setEditProductId((current) => (current === productId ? null : current));
    await logAction('delete_product', product.name);
  }

  async function handleDeleteUser(userId: string): Promise<void> {
    const adminUser = currentUserRef.current;
    if (!isAdmin(adminUser)) {
      return;
    }

    const user = usersRef.current.find((item) => item.id === userId);
    if (!user) {
      return;
    }

    if (adminUser.id === userId) {
      alert('Voce nao pode excluir o proprio usuario logado.');
      return;
    }

    if (user.role === 'admin' && usersRef.current.filter((item) => item.role === 'admin').length <= 1) {
      alert('Nao e permitido excluir o ultimo administrador do sistema.');
      return;
    }

    if (!confirm(`Excluir o funcionario ${user.name}?`)) {
      return;
    }

    await repository.deleteUser(userId);
    const nextUsers = usersRef.current.filter((item) => item.id !== userId);
    setUsers(nextUsers);
    usersRef.current = nextUsers;
    setEditingUserId((current) => (current === userId ? null : current));
    await logAction('delete_user', user.name);
  }

  function changeScreen(screen: Screen) {
    if (currentUser && isRestrictedScreen(screen) && !isAdmin(currentUser)) {
      return;
    }
    setEditProductId(null);
    setEditingUserId(null);
    setActiveScreen(screen);
    setMobileMenuOpen(false);
    void logAction('page_view', screen);
  }

  function logout() {
    void logAction('logout');
    setCurrentUser(null);
    setEditProductId(null);
    setEditingUserId(null);
    setActiveScreen('inicio');
    setMobileMenuOpen(false);
  }

  if (!currentUser) {
    return (
      <AuthPage
        mode={authMode}
        message={authMessage}
        isPostgresProvider={isPostgresProvider}
        onModeChange={(mode) => { setAuthMode(mode); setAuthMessage(''); }}
        onSubmit={(form) => { void handleAuthSubmit(form); }}
      />
    );
  }

  return (
    <AppLayout
      user={currentUser}
      activeScreen={activeScreen}
      syncStatus={syncStatus}
      lastSyncedAt={lastSyncedAt}
      isPostgresProvider={isPostgresProvider}
      mobileMenuOpen={mobileMenuOpen}
      onScreenChange={changeScreen}
      onLogout={logout}
      onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
      onCloseMobileMenu={() => setMobileMenuOpen(false)}
    >
      {activeScreen === 'inicio' && <HomePage user={currentUser} users={users} products={products} accessLogs={accessLogs} lastSyncedAt={lastSyncedAt} dashboard={dashboard} />}
      {activeScreen === 'produtos' && <ProductsPage products={products} editingProductId={editProductId} searchQuery={searchQuery} productFilter={productFilter} onSearchChange={setSearchQuery} onFilterChange={setProductFilter} onSubmit={(form) => { void handleProductSubmit(form); }} onEdit={setEditProductId} onDelete={(productId) => { void handleDeleteProduct(productId); }} onCancelEdit={() => setEditProductId(null)} />}
      {activeScreen === 'lotes' && <BatchesPage risks={expirationRisks} />}
      {activeScreen === 'previsoes' && <ForecastsPage forecasts={forecasts} />}
      {activeScreen === 'recomendacoes' && (
  <ReplenishmentsPage 
    recommendations={replenishments} 
    onDecision={async (recommendation, action) => { 
      await repository.decideRecommendation({ 
        companyId: currentUser.companyId, 
        recommendationId: recommendation.product.id, 
        userId: currentUser.id, 
        action, 
        originalValue: recommendation.suggestedQuantity, 
        justification: recommendation.reason 
      });
      
      // Essa linha abaixo é a que faz o card sumir da tela:
      setReplenishments(prev => prev.filter(r => r.product.id !== recommendation.product.id));
    }} 
  />
)}

      {activeScreen === 'promocoes' && <PromotionsPage promotions={promotions} />}
      {activeScreen === 'alertas' && <AlertsPage products={products} />}
      {activeScreen === 'relatorios' && (isAdmin(currentUser) ? <ReportsPage products={products} /> : <section className="panel"><p>Acesso restrito ao administrador.</p></section>)}
      {activeScreen === 'assistente' && <AssistantPage onAsk={(message, conversation) => repository.askAssistant(currentUser.companyId, message, conversation)} />}
      {activeScreen === 'historico' && <HistoryPage accessLogs={accessLogs} />}
      {activeScreen === 'usuarios' && (isAdmin(currentUser) ? <UsersPage users={users} currentUser={currentUser} editingUserId={editingUserId} syncStatus={syncStatus} isPostgresProvider={isPostgresProvider} onSubmit={(form) => { void handleUserSubmit(form); }} onEdit={setEditingUserId} onDelete={(userId) => { void handleDeleteUser(userId); }} onCancelEdit={() => setEditingUserId(null)} /> : <section className="panel"><p>Acesso restrito ao administrador.</p></section>)}
      {activeScreen === 'metricas' && (isAdmin(currentUser) ? <MetricsPage accessLogs={accessLogs} /> : <section className="panel"><p>Apenas administradores podem visualizar as metricas.</p></section>)}
    </AppLayout>
  );
}
