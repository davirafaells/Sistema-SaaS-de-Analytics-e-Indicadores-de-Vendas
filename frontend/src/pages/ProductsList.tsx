import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Pencil, Check, X, ToggleLeft, ToggleRight, Package, Search } from 'lucide-react';

interface Product {
  id: number;
  external_id: string;
  name: string;
  is_active: boolean;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
};

export default function ProductsList() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editName, setEditName]     = useState('');
  const [feedback, setFeedback]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
    } catch {
      showFeedback('error', 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const filtered = products.filter(p => {
    const matchSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.external_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active'   && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);
    return matchSearch && matchStatus;
  });

  const activeCount   = products.filter(p => p.is_active).length;
  const inactiveCount = products.length - activeCount;

  const startEdit  = (product: Product) => { setEditingId(product.id); setEditName(product.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/products/${id}`, { name: editName.trim() });
      showFeedback('success', 'Nome atualizado.');
      cancelEdit(); loadProducts();
    } catch {
      showFeedback('error', 'Erro ao atualizar produto.');
    }
  };

  const toggleActive = async (id: number) => {
    try { await api.patch(`/products/${id}/toggle`); loadProducts(); }
    catch { showFeedback('error', 'Erro ao alterar status.'); }
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'left',
    background: 'var(--bg-subtle)', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent-dim)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package size={18} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
              Catálogo de produtos
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {products.length} produto{products.length !== 1 ? 's' : ''} no total
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            padding: '4px 12px', background: 'var(--positive-dim)', color: 'var(--positive)',
            borderRadius: 4, fontSize: 12, fontWeight: 600,
          }}>
            {activeCount} ativo{activeCount !== 1 ? 's' : ''}
          </span>
          <span style={{
            padding: '4px 12px', background: 'var(--bg-subtle)', color: 'var(--text-muted)',
            borderRadius: 4, fontSize: 12, fontWeight: 600,
          }}>
            {inactiveCount} inativo{inactiveCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{
          flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px',
        }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text" placeholder="Buscar por nome ou ID..."
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)' }}
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => {
            const labels = { all: 'Todos', active: 'Ativos', inactive: 'Inativos' };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
                  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                  background: statusFilter === s ? 'var(--accent)' : 'transparent',
                  color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        {(search || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'inherit',
            }}
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {(search || statusFilter !== 'all') && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {feedback && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13,
          background: feedback.type === 'success' ? 'var(--positive-dim)' : 'var(--negative-dim)',
          color: feedback.type === 'success' ? 'var(--positive)' : 'var(--negative)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Table */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando catálogo...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Nome</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product, i) => (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: !product.is_active ? 'var(--bg-main)' : i % 2 === 1 ? 'var(--bg-main)' : 'transparent',
                      opacity: product.is_active ? 1 : 0.6,
                    }}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500,
                        background: 'var(--bg-subtle)', padding: '3px 8px', borderRadius: 4,
                        color: 'var(--text-secondary)', border: '1px solid var(--border)',
                      }}>
                        {product.external_id}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {editingId === product.id ? (
                        <input
                          autoFocus
                          style={{
                            padding: '6px 10px', border: '1px solid var(--accent)',
                            borderRadius: 'var(--radius)', fontSize: 13, outline: 'none',
                            fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-card)',
                            width: '100%', boxSizing: 'border-box',
                          }}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(product.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <span>{product.name}</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                        background: product.is_active ? 'var(--positive-dim)' : 'var(--bg-subtle)',
                        color: product.is_active ? 'var(--positive)' : 'var(--text-muted)',
                      }}>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {editingId === product.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(product.id)}
                              style={{ padding: 7, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--positive)', display: 'flex' }}
                              title="Confirmar"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{ padding: 7, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--text-muted)', display: 'flex' }}
                              title="Cancelar"
                            >
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(product)}
                              style={{ padding: 7, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--text-muted)', display: 'flex' }}
                              title="Editar nome"
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => toggleActive(product.id)}
                              style={{
                                padding: 7, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex',
                                color: product.is_active ? 'var(--positive)' : 'var(--text-muted)',
                              }}
                              title={product.is_active ? 'Inativar' : 'Ativar'}
                            >
                              {product.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                {search || statusFilter !== 'all'
                  ? 'Nenhum produto encontrado para os filtros selecionados.'
                  : 'Nenhum produto cadastrado. Importe um CSV para criar o catálogo.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}