import type { HTMLAttributes, ReactNode } from 'react';

type AuthLayoutSurface = 'plain' | 'panel';
type AuthLayoutTone = 'neutral' | 'brand';

interface AuthLayoutProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  surface?: AuthLayoutSurface;
  tone?: AuthLayoutTone;
  innerClassName?: string;
}

export function AuthLayout({
  children,
  className,
  innerClassName,
  surface = 'panel',
  tone = 'neutral',
  ...props
}: AuthLayoutProps) {
  return (
    <main
      {...props}
      className={[
        'c-auth-layout',
        surface === 'plain' && 'c-auth-layout--plain',
        tone === 'brand' && 'c-auth-layout--brand',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'c-auth-layout__inner',
          surface === 'panel' && 'c-auth-layout__inner--panel',
          surface === 'plain' && 'c-auth-layout__inner--plain',
          innerClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </main>
  );
}