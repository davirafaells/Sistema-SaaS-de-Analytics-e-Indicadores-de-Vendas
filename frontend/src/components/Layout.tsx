import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        marginLeft: 224,
        padding: '32px 36px',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}