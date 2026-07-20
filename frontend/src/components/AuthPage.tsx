import type { FormEvent } from 'react';
import type { AuthMode } from '../types/app';

type AuthPageProps = {
  mode: AuthMode;
  message: string;
  isPostgresProvider: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (form: HTMLFormElement) => void;
};

export function AuthPage({ mode, message, isPostgresProvider, onModeChange, onSubmit }: AuthPageProps) {
  const isLogin = mode === 'login';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(event.currentTarget);
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-hidden="true">
        <div className="brand-mark">StockIA</div>
        <div className="auth-visual-copy">
          <p className="eyebrow">Gestao de estoque</p>
          <h1>Operacao, validade e reposicao em um painel unico.</h1>
          <p>Use dados reais de produtos, lotes e movimentacoes para acompanhar riscos e decisoes do estoque.</p>
        </div>
      </section>

      <section className="auth-card reveal">
        <div className="auth-brand">
          <div>
            <p className="logo-tag">StockIa</p>
            <strong>{isLogin ? 'Entrar no painel' : 'Criar acesso'}</strong>
          </div>
          <span className="status-dot">{isPostgresProvider ? 'Postgres conectado' : 'Modo local'}</span>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Autenticacao">
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
          <button type="submit" className="primary auth-submit">
            {isLogin ? 'Entrar no painel' : 'Criar conta'}
          </button>
        </form>

        <div className="auth-footer">
          {message ? <p className="message">{message}</p> : <p>Se ainda nao houver usuarios, o primeiro cadastro sera administrador.</p>}
        </div>
      </section>
    </main>
  );
}
