import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

import { useTranslation } from '../utils/translations';

/** "Because · ..." reasoning line — the core trust-building pattern from the
 * prototype: every recommendation gets a plain-English reason attached. */
export function Why({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <p className="mt-1.5 text-[16px] leading-snug font-semibold text-jz-teal">
      <span className="font-extrabold">{t('ui.reason')} · </span>{children}
    </p>
  );
}

export function Card({
  children,
  tint,
  className = '',
  onClick,
}: {
  children: ReactNode;
  tint?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-jz-card p-[18px] border-[1.5px] border-jz-line shadow-sm ${tint || 'bg-jz-card'} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-3 text-jz-title font-black text-jz-ink">{children}</h2>;
}

export function BigButton({
  children,
  onClick,
  icon: Icon,
  secondary = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-h-jz-touch rounded-jz-btn flex items-center justify-center gap-2.5 text-jz-body-big font-extrabold transition-all ${secondary
        ? 'bg-jz-card border-2 border-jz-teal text-jz-teal'
        : 'bg-jz-teal text-white shadow-md hover:bg-jz-tealDark'
        }`}
    >
      {Icon && <Icon className="w-6 h-6" strokeWidth={2.4} />}
      {children}
    </button>
  );
}
