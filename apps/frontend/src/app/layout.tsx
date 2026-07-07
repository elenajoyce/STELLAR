import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Astraea | AI-Delegated Commerce on Stellar',
  description: 'Delegate shopping and payment tasks to secure AI agents under your control on Stellar and Soroban.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
