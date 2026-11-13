'use client';

import { cn } from '@/lib/cn';
import { Link, usePathname } from '@/services/i18n/navigation';

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Header nav link that marks the current page (`aria-current="page"` —
 * screen readers announce it, CSS styles it via `aria-[current=page]:`).
 * The client leaf of the server Header: only it needs the pathname.
 */
export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname();
  const current = pathname === href;

  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'transition-colors hover:text-foreground aria-[current=page]:text-foreground',
        className,
      )}
    >
      {children}
    </Link>
  );
}
