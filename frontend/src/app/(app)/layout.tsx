'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, logout, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !token) {
      router.replace('/login');
    }
  }, [token, isReady, router]);

  useEffect(() => {
    if (user?.company?.primaryColor) {
      document.documentElement.style.setProperty('--accent', user.company.primaryColor);
    }
  }, [user?.company?.primaryColor]);

  if (!isReady || !token) {
    return null;
  }

  if (user && user.role !== 'SUPER_ADMIN' && !user.companyId) {
    return (
      <div className="app-shell">
        <Sidebar
          userEmail={user?.name || user?.email}
          role={user?.role}
          token={token}
          avatarUrl={user?.avatarUrl ?? null}
          onLogout={logout}
        />
        <main className="content">
          <div className="card">
            <strong>Empresa não configurada</strong>
            <p className="hint">
              Sua conta ainda não está vinculada a uma empresa. Peça ao super admin para
              criar/atribuir uma empresa antes de continuar.
            </p>
            <div className="quick-actions">
              <button className="btn primary" onClick={logout}>
                Sair
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        userEmail={user?.name || user?.email}
        role={user?.role}
        token={token}
        avatarUrl={user?.avatarUrl ?? null}
        onLogout={logout}
      />
      <main className="content">{children}</main>
    </div>
  );
}
