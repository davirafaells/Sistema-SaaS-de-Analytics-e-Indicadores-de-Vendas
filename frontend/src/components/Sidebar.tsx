import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, UploadCloud, LogOut, BarChart3,
  ShoppingBag, Package, AlertTriangle, BookOpen
} from 'lucide-react';
import api from '../services/api';

export default function Sidebar() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.get('/inconsistencies/')
      .then(res => setPendingCount(res.data.length))
      .catch(() => {});
  }, [location.pathname]);

  const menuItems = [
    { name: 'Dashboard',        path: '/dashboard',       icon: LayoutDashboard },
    { name: 'Vendas',           path: '/sales',           icon: ShoppingBag },
    { name: 'Produtos',         path: '/products',        icon: Package },
    { name: 'Inconsistências',  path: '/inconsistencies', icon: AlertTriangle, badge: pendingCount },
    { name: 'Decisões',         path: '/decisions',       icon: BookOpen },
    { name: 'Importar Dados',   path: '/upload',          icon: UploadCloud },
  ];

  return (
    <div style={{
      width: 224,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 28,
          height: 28,
          background: 'var(--accent)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <BarChart3 size={16} color="#fff" />
        </div>
        <span style={{
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          SaaS Sales
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const Icon     = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 6,
                marginBottom: 2,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13.5,
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
              <span style={{ flex: 1 }}>{item.name}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  background: 'var(--warning)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => { localStorage.clear(); navigate('/login'); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 13.5,
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}