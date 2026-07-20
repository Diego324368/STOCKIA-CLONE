import type { ReactNode } from 'react';
import type { AppUser } from '../types/models';
import type { Screen } from '../types/app';
import { navItems } from '../lib/constants';
import { dateTime } from '../lib/format';
import { isAdmin, screenSubtitle, screenTitle } from '../lib/stock';

type AppLayoutProps = {
  user: AppUser;
  activeScreen: Screen;
  syncStatus: string;
  lastSyncedAt: string | null;
  isPostgresProvider: boolean;
  mobileMenuOpen: boolean;
  children: ReactNode;
  onScreenChange: (screen: Screen) => void;
  onLogout: () => void;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
};

export function AppLayout({
  user,
  activeScreen,
  syncStatus,
  lastSyncedAt,
  isPostgresProvider,
  mobileMenuOpen,
  children,
  onScreenChange,
  onLogout,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: AppLayoutProps) {
  return (
    <div className={`app-shell ${user.role === 'admin' ? 'shell-admin' : 'shell-staff'} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <button className="mobile-overlay" type="button" onClick={onCloseMobileMenu} aria-label="Fechar menu" />

      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-block">
            <div>
              <p className="logo-tag">StockIa</p>
              <h2>{user.role === 'admin' ? 'Central de Controle' : 'Operacao da Loja'}</h2>
            </div>
            <button className="icon-button mobile-only" type="button" onClick={onCloseMobileMenu} aria-label="Fechar menu">
              x
            </button>
          </div>

          <div className="profile-card">
            <strong>{user.name}</strong>
            <p>{user.role === 'admin' ? 'Administrador' : 'Operador'}</p>
            <span className={`role-chip ${user.role === 'admin' ? 'admin' : 'staff'}`}>
              {user.role === 'admin' ? 'Visao executiva' : 'Rotina operacional'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin(user))
            .map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={activeScreen === item.id ? 'active' : ''}
              >
                <span className="nav-icon">{item.short}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sync-card">
            <span>{syncStatus}</span>
            <strong>{lastSyncedAt ? dateTime(lastSyncedAt) : isPostgresProvider ? 'API ativa' : 'Navegador atual'}</strong>
          </div>
          <button className="logout" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="header">
          <div className="header-main">
            <div className="header-title-row">
              <button className="icon-button mobile-only" type="button" onClick={onToggleMobileMenu} aria-label="Abrir menu">
                =
              </button>
              <div>
                <p className="eyebrow">{user.role === 'admin' ? 'Painel admin' : 'Painel operacional'}</p>
                <h1>{screenTitle(activeScreen)}</h1>
              </div>
            </div>
            <p className="header-copy">{screenSubtitle(activeScreen, user)}</p>
          </div>
          <div className="header-aside">
            <span className="pill">{user.role === 'admin' ? 'Unidade Matriz' : 'Equipe de Loja'}</span>
            <span className="sync-inline">{syncStatus}</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
