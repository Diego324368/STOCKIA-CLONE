import type { FormEvent } from 'react';
import type { AuthMode } from '../types/app';

type AuthPageProps = {
  mode: AuthMode;
  message: string;
  isSubmitting: boolean;
  isPostgresProvider: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (form: HTMLFormElement) => void;
};

export function AuthPage({ mode, message, isSubmitting, isPostgresProvider, onModeChange, onSubmit }: AuthPageProps) {
  const isLogin = mode === 'login';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(event.currentTarget);
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-visual-top">
          <div className="brand-mark">StockIA</div>
        </div>
        <div className="auth-visual-copy">
          <p className="eyebrow">Gestão de estoque</p>
          <h1>Seu estoque, sempre em dia.</h1>
          <p>Acompanhe produtos, validades, reposições e movimentações em um só lugar.</p>
        </div>
      </section>

      <section className="auth-card reveal">
        <div className="auth-brand">
          <div>
            <p className="logo-tag">StockIA</p>
            <strong>{isLogin ? 'Acessar sua conta' : 'Criar conta'}</strong>
            <p className="auth-card-subtitle">{isLogin ? 'Entre com seu e-mail e senha.' : 'Preencha os dados abaixo para continuar.'}</p>
          </div>
          <span className="auth-status-chip compact">{isPostgresProvider ? 'Sincronizado' : 'Local'}</span>
        </div>

        {message && (
          <div className="auth-message" role="status">
            {message}
          </div>
        )}

        <div className="auth-tabs" role="tablist" aria-label="Autenticação">
          <button type="button" onClick={() => onModeChange('login')} className={isLogin ? 'active' : ''}>
            Entrar
          </button>
          <button type="button" onClick={() => onModeChange('register')} className={!isLogin ? 'active' : ''}>
            Cadastrar
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              Nome completo
              <input name="name" type="text" required minLength={3} placeholder="Seu nome" />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" required placeholder={isLogin ? 'seu@email.com' : 'voce@empresa.com'} />
          </label>
          <label>
            Senha
            <input name="password" type="password" required minLength={6} placeholder="Minimo 6 caracteres" />
          </label>
          {!isLogin && (
            <label>
              Confirmar senha
              <input name="confirmPassword" type="password" required minLength={6} placeholder="Repita a senha" />
            </label>
          )}
          <button type="submit" className="primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </section>
    </main>
  );
}
