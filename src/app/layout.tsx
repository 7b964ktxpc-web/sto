import type { Metadata } from 'next';
import Script from 'next/script';
import MobileNav from '@/components/MobileNav';
import './globals.css';
import './business-mobile.css';

export const metadata: Metadata = {
  title: 'НА ПОСТ',
  description: 'Поиск и бронирование автосервисов в Новосибирске',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <MobileNav />
        <Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
