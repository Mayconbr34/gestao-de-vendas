import { Suspense } from 'react';
import ResetPasswordClient from './reset-password-client';

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="login">Carregando...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
