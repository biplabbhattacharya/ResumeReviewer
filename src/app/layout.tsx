import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resume Reviewer — AI-powered candidate scoring',
  description:
    'Upload a batch PDF of resumes, define your rubric, and get AI-scored results in an Excel spreadsheet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
