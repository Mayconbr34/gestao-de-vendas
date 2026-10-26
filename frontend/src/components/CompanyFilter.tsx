'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type Company = { id: string; tradeName: string };

/**
 * Seletor de empresa (multitenancy) exibido apenas para o super admin.
 * Os demais perfis sempre consultam a própria empresa no backend.
 */
export default function CompanyFilter({
  token,
  value,
  onChange,
  allowAll = true,
  label = 'Empresa'
}: {
  token: string | null;
  value: string;
  onChange: (companyId: string) => void;
  allowAll?: boolean;
  label?: string;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (!token) return;
    apiRequest<Company[]>('/companies', {}, token)
      .then((data) => {
        setCompanies(data);
        if (!allowAll && !value && data.length) onChange(data[0].id);
      })
      .catch(() => setCompanies([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {allowAll ? <option value="">Todas as empresas</option> : null}
        {!allowAll && !companies.length ? <option value="">Nenhuma empresa</option> : null}
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.tradeName}
          </option>
        ))}
      </select>
    </label>
  );
}
