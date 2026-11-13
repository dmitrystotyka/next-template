'use client';

import { useTranslations } from 'next-intl';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  // sonner's built-in labels are English ("Notifications", "Close toast").
  const t = useTranslations('translations.shared');

  return (
    <Sonner
      theme="light"
      position="top-right"
      className="toaster group"
      containerAriaLabel={t('notifications')}
      toastOptions={{
        closeButtonAriaLabel: t('close'),
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
