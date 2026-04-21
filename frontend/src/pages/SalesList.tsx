import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  Trash2, Edit2, Plus, Search, X, AlertTriangle,
  CheckSquare, Square, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Sale {
  id:           number;
  date:         string;
  product_name: string;
  quantity:     number;
  unit_price:   number;
  total_value:  number;
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', background: 'var(--bg-subtle)',
  fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
};
const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
};

function ConfirmModal({ title, description, confirmLabel = 'Confirmar', onConfirm, onCancel }: {
  title: string; description: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        width: '100%', maxWidth: 360, overflow: 'hidden',
      }}>
        <div style={{ padding: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, background: 'var(--negative-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <AlertTriangle size={20} color="var(--negative)" />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{description}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 24px 24px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', fontSize: 13,
          }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 16px', background: 'var(--negative)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ sale, onSave, onClose }: {
  sale: Sale; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    date: sale.date, quantity: sale.quantity,
    unit_price: sale.unit_price, total_value: sale.total_value,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await api.put(`/sales/${sale.id}`, form); onSave(); }
    finally { setSaving(false); }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6,
  };
  const fieldInput: React.CSSProperties = {
    ...inputStyle, width: '100%', boxSizing: 'border-box', background: 'var(--bg-subtle)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, margin: 0, color: 'var(--text-primary)' }}>Editar venda</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Data</label>
            <input type="date" style={fieldInput} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div><label style={labelStyle}>Quantidade</label>
            <input type="number" min="1" style={fieldInput} value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
          </div>
          <div><label style={labelStyle}>Preço unitário</label>
            <input type="number" step="0.01" min="0" style={fieldInput} value={form.unit_price} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div><label style={labelStyle}>Valor total</label>
            <input type="number" step="0.01" min="0" style={{ ...fieldInput, fontWeight: 700 }} value={form.total_value} onChange={e => setForm({ ...form, total_value: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 24px 24px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', fontSize: 13,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: '10px 16px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1, fontFamily: 'inherit', fontSize: 13,
          }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesList() {
  const [sales, setSales]           = useState<Sale[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(0);
  const PER_PAGE = 30;
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [editSale, setEditSale]     = useState<Sale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [bulkConfirm, setBulkConfirm]   = useState(false);

  const fmtDate  = (s: string) => { try { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; } catch { return s; } };
  const fmtMoney = (n: any) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params: any = {};
      if (dateFrom) params.date_from    = dateFrom;
      if (dateTo)   params.date_to      = dateTo;
      if (search)   params.product_name = search;
      const res = await api.get('/sales/', { params });
      setSales(Array.isArray(res.data) ? res.data : []);
      setSelected(new Set()); setPage(0);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar vendas.'); setSales([]);
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, search]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/sales/${deleteTarget.id}`); } catch {}
    setDeleteTarget(null); load();
  };

  const doBulkDelete = async () => {
    try { await Promise.all([...selected].map(id => api.delete(`/sales/${id}`))); } catch {}
    setBulkConfirm(false); setSelected(new Set()); load();
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const totalPages      = Math.ceil(sales.length / PER_PAGE);
  const visibleSales    = sales.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalRevenue    = sales.reduce((s, r) => s + (r.total_value || 0), 0);
  const allPageSelected = visibleSales.length > 0 && visibleSales.every(s => selected.has(s.id));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected(prev => { const s = new Set(prev); visibleSales.forEach(v => s.delete(v.id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); visibleSales.forEach(v => s.add(v.id)); return s; });
    }
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
    background: 'var(--bg-subtle)', textAlign: 'left',
  };

  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>Vendas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {sales.length.toLocaleString('pt-BR')} registro{sales.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/upload"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)',
            fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}
        >
          <Plus size={14} /> Nova venda
        </a>
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{
          flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px',
        }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text" placeholder="Buscar por produto..."
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)' }}
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <input
          type="date" style={inputStyle} value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
        />
        <input
          type="date" style={inputStyle} value={dateTo}
          onChange={e => setDateTo(e.target.value)}
        />
        {(dateFrom || dateTo || search) && (
          <button
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'inherit',
            }}
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          ...card, padding: '12px 16px', background: 'var(--negative-dim)', borderColor: 'rgba(248,113,113,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--negative)' }}>
            {selected.size} venda{selected.size > 1 ? 's' : ''} selecionada{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setSelected(new Set())}
              style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Desmarcar
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'var(--negative)', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Trash2 size={13} /> Excluir {selected.size}
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total de registros',    value: sales.length.toLocaleString('pt-BR'),  accent: false },
          { label: 'Faturamento filtrado',  value: fmtMoney(totalRevenue),                accent: true  },
          { label: 'Selecionadas',          value: selected.size > 0 ? `${selected.size}` : '—', accent: false },
        ].map((item, i) => (
          <div key={i} style={{ ...card, padding: '14px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: '0 0 6px' }}>
              {item.label}
            </p>
            <p style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              color: item.accent ? 'var(--accent)' : 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--negative-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius)', color: 'var(--negative)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ ...thStyle, width: 44, textAlign: 'center' }}>
                      <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {allPageSelected
                          ? <CheckSquare size={16} color="var(--accent)" />
                          : <Square size={16} color="var(--border)" />}
                      </button>
                    </th>
                    {['Data', 'Produto', 'Qtd', 'Preço unit.', 'Total', ''].map(h => (
                      <th key={h} style={{ ...thStyle, textAlign: h === 'Total' || h === 'Qtd' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSales.map((sale, i) => (
                    <tr
                      key={sale.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: selected.has(sale.id) ? 'var(--accent-dim)' : i % 2 === 1 ? 'var(--bg-main)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <button onClick={() => toggleSelect(sale.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected.has(sale.id)
                            ? <CheckSquare size={16} color="var(--accent)" />
                            : <Square size={16} color="var(--border)" />}
                        </button>
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(sale.date)}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sale.product_name}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {(sale.quantity || 0).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {fmtMoney(sale.unit_price)}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {fmtMoney(sale.total_value)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setEditSale(sale)}
                            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--text-muted)', display: 'flex' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(sale)}
                            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--text-muted)', display: 'flex' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--negative-dim)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleSales.length && !loading && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {(search || dateFrom || dateTo)
                    ? 'Nenhuma venda encontrada para os filtros aplicados.'
                    : 'Nenhuma venda cadastrada ainda.'}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div style={{
                padding: '12px 16px', borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                  {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, sales.length)} de {sales.length}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                    style={{ padding: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.3 : 1, display: 'flex' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = page < 3 ? i : page - 2 + i;
                    if (pg >= totalPages) return null;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        style={{
                          width: 30, height: 30, borderRadius: 6, fontSize: 13, fontWeight: 600,
                          background: pg === page ? 'var(--accent)' : 'transparent',
                          color: pg === page ? '#fff' : 'var(--text-secondary)',
                          border: pg === page ? 'none' : '1px solid var(--border)', cursor: 'pointer',
                        }}>
                        {pg + 1}
                      </button>
                    );
                  })}
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                    style={{ padding: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1, display: 'flex' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Excluir venda"
          description={`Excluir a venda de "${deleteTarget.product_name}" em ${fmtDate(deleteTarget.date)}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir venda"
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {bulkConfirm && (
        <ConfirmModal
          title={`Excluir ${selected.size} vendas`}
          description={`Você está prestes a excluir ${selected.size} venda${selected.size > 1 ? 's' : ''} permanentemente.`}
          confirmLabel={`Excluir ${selected.size}`}
          onConfirm={doBulkDelete}
          onCancel={() => setBulkConfirm(false)}
        />
      )}
      {editSale && (
        <EditModal
          sale={editSale}
          onSave={() => { setEditSale(null); load(); }}
          onClose={() => setEditSale(null)}
        />
      )}
    </div>
  );
}