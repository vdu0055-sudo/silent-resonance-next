import type { Metadata } from 'next';
import { Manrope, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const notoSerifSC = Noto_Serif_SC({
  variable: '--font-noto-serif-sc',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: '沉默宇宙',
  description: '一个让沉默的人彼此感知的安静数字宇宙。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${manrope.variable} ${notoSerifSC.variable} antialiased`}>{children}</body>
    </html>
  );
}
