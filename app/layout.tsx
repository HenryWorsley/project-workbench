import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '项目工作台 · Project Workbench',
  description: '支持甘特图、动态任务视图、日程、工作记录与报表导出的本地项目工作台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
