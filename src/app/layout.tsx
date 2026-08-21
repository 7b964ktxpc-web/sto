import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'НА ПОСТ', description: 'Поиск и бронирование автосервисов в Новосибирске' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
