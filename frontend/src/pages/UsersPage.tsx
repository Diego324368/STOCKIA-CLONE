import type { FormEvent } from 'react';
import type { AppUser } from '../types/models';
import { MetricCard } from '../components/MetricCard';
import { dateTime } from '../lib/format';

type UsersPageProps = {
  users: AppUser[];
  currentUser: AppUser;
  editingUserId: string | null;
  syncStatus: string;
  isPostgresProvider: boolean;
  onSubmit: (form: HTMLFormElement) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
};

export function UsersPage({ users, currentUser, editingUserId, syncStatus, isPostgresProvider, onSubmit, onEdit, onDelete, onCancelEdit }: UsersPageProps) {
  const editingUser = editingUserId ? users.find((user) => user.id === editingUserId) : null;
  const admins = users.filter((user) => user.role === 'admin').length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(event.currentTarget);
  }

  return (
    <>
      <section className="cards">
        <MetricCard label="Total de usuarios" value={users.length} tone="accent" />
        <MetricCard label="Administradores" value={admins} />
        <MetricCard label="Operadores" value={users.length - admins} />
        <MetricCard label="Sync de usuarios" value={isPostgresProvider ? 'API' : 'Entre abas'} />
      </section>

      <section className="content-grid user-layout">
        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">{editingUser ? 'Permissao' : 'Novo acesso'}</p><h3>{editingUser ? 'Editar usuario' : 'Criar usuario interno'}</h3></div></div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <input type="hidden" name="userId" value={editingUser?.id ?? ''} />
            <label>Nome<input name="name" required minLength={3} defaultValue={editingUser?.name ?? ''} /></label>
            <label>Email<input name="email" type="email" required defaultValue={editingUser?.email ?? ''} /></label>
            <label>Senha<input name="password" type="password" minLength={6} required={!editingUser} placeholder={editingUser ? 'Preencha apenas para trocar' : 'Minimo 6 caracteres'} /></label>
            <label>Perfil<select name="role" defaultValue={editingUser?.role ?? 'staff'}><option value="staff">Operador</option><option value="admin">Administrador</option></select></label>
            <div className="inline-actions">
              <button type="submit" className="primary">{editingUser ? 'Salvar usuario' : 'Criar usuario'}</button>
              {editingUser && <button type="button" onClick={onCancelEdit}>Cancelar</button>}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">Equipe</p><h3>Usuarios cadastrados</h3></div><span className="info-chip">{syncStatus}</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Ultimo login</th><th /></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td><td>{user.email}</td><td>{user.role === 'admin' ? 'Admin' : 'Operador'}</td><td>{user.lastLoginAt ? dateTime(user.lastLoginAt) : '-'}</td>
                    <td className="actions"><button type="button" onClick={() => onEdit(user.id)}>Editar</button>{currentUser.id !== user.id && <button type="button" onClick={() => onDelete(user.id)} className="danger">Excluir</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}
