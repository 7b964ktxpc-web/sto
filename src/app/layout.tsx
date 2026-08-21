import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = { title: 'НА ПОСТ', description: 'Поиск и бронирование автосервисов в Новосибирске' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" /></body></html>;
}
