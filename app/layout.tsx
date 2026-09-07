import './globals.css';
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificate Studio & Dispatcher',
  description: 'Smart Excel Mapping • Bulk Certificate Generator • Email Dispatcher',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..800;1,9..40,400..800&family=Alex+Brush&family=Cinzel:wght@500;600;700;800&family=Cinzel+Decorative:wght@700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Parisienne&family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Roboto:wght@300;400;500;700&family=Tangerine:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F5F0EB] text-[#1A1A1A] font-sans min-h-screen flex flex-col antialiased selection:bg-[#D72638] selection:text-white">
        {children}
      </body>
    </html>
  );
}
