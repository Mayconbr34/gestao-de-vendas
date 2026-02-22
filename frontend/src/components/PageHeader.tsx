'use client';

export default function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="content-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
