import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  BookOpen, Plus, Trash2, TrendingUp, TrendingDown,
  Clock, CheckCircle2, Tag, X
} from 'lucide-react';

interface Product { id: number; name: string; external_id: string; }
interface Impact {
  avg_before: number; avg_after: number; daily_diff: number;
  total_impact: number; pct_change: number | null; is_positive: boolean;
}
interface Decision {
  id: number; product_id: number | null; product_name: string | null;
  action_type: string; action_label: string; description: string;
  decision_date: string; impact: Impact | null;
}

const ACTION_OPTIONS = [
  { value: 'promotion',    label: 'Promoção'             },
  { value: 'restock',      label: 'Reposição de estoque' },
  { value: 'price_change', label: 'Mudança de preço'     },
  { value: 'campaign',     label: 'Campanha'              },
  { value: 'other',        label: 'Outro'                 },
];

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  promotion:    { bg: 'rgba(139,92,246,0.18)', color: '#c4b5fd' },
  restock:      { bg: 'rgba(99,179,237,0.15)',  color: '#7dd3fc' },
  price_change: { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  campaign:     { bg: 'rgba(74,222,128,0.15)',  color: 'var(--positive)' },
  other:        { bg: 'var(--bg-subtle)',        color: 'var(--text-muted)' },
};

const R$ = (n: any) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fmtDate = (s: string) => { try { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; } catch { return s; } };

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', background: 'var(--bg-subtle)', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6,
};

export default function Decisions() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ product_id: '' as string | number, action_type: 'promotion', description: '', decision_date: today });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, pRes] = await Promise.all([api.get('/decisions/'), api.get('/products/')]);
      setDecisions(dRes.data);
      setProducts(pRes.data.filter((p: Product & { is_active: boolean }) => p.is_active));
    } catch { showFb('error', 'Erro ao carregar dados.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showFb = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await api.post('/decisions/', {
        product_id: form.product_id ? Number(form.product_id) : null,
        action_type: form.action_type, description: form.description.trim(), decision_date: form.decision_date,
      });
      showFb('success', 'Decisão registada.');
      setShowForm(false);
      setForm({ product_id: '', action_type: 'promotion', description: '', decision_date: today });
      load();
    } catch (err: any) { showFb('error', err?.response?.data?.detail || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try { await api.delete(`/decisions/${id}`); showFb('success', 'Decisão removida.'); load(); }
    catch { showFb('error', 'Erro ao remover.'); }
    finally { setDeleting(null); }
  };

  const withImpact = decisions.filter(d => d.impact !== null);
  const pending    = decisions.filter(d => d.impact === null);

  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookOpen size={19} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
              Diário de decisões
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Registre uma ação e veja o impacto nos 7 dias seguintes
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <Plus size={14} /> Nova decisão
        </button>
      </div>

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

      {/* Form */}
      {showForm && (
        <div style={{ ...card, borderColor: 'rgba(139,92,246,0.35)' }}>
          <div style={{
            padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(139,92,246,0.12)', borderBottom: '1px solid rgba(139,92,246,0.25)',
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)', margin: 0 }}>Registar nova decisão</h2>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>
                  Produto <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: e.target.value })}>
                  <option value="">Geral (todos)</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de ação</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.action_type}
                  onChange={e => setForm({ ...form, action_type: e.target.value })}>
                  {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" required style={inputStyle}
                  value={form.decision_date} onChange={e => setForm({ ...form, decision_date: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>O que você fez?</label>
                <input type="text" required placeholder='Ex: "Coloquei Heineken em promoção de R$ 8,00"'
                  style={inputStyle}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                type="submit" disabled={saving || !form.description.trim()}
                style={{
                  flex: 1, padding: '11px 16px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving || !form.description.trim() ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >
                {saving ? 'Salvando...' : 'Salvar decisão'}
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                style={{
                  padding: '11px 18px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent',
                  color: 'var(--text-secondary)', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando...
        </div>
      ) : decisions.length === 0 ? (
        <div style={{ ...card, padding: 64, textAlign: 'center' }}>
          <BookOpen size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Nenhuma decisão registada
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Registre uma promoção ou campanha e veja o impacto real nos 7 dias seguintes.
          </p>
        </div>
      ) : (
        <>
          {withImpact.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color="var(--positive)" />
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0 }}>
                  Impacto calculado ({withImpact.length})
                </p>
              </div>
              {withImpact.map(d => <DecisionCard key={d.id} d={d} onDelete={handleDelete} deleting={deleting} />)}
            </section>
          )}
          {pending.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="var(--warning)" />
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0 }}>
                  Aguardando 7 dias ({pending.length})
                </p>
              </div>
              {pending.map(d => <DecisionCard key={d.id} d={d} onDelete={handleDelete} deleting={deleting} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DecisionCard({ d, onDelete, deleting }: { d: Decision; onDelete: (id: number) => void; deleting: number | null }) {
  const aColor   = ACTION_COLORS[d.action_type] || { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };
  const hasImpact = d.impact !== null;
  const borderColor = hasImpact
    ? (d.impact!.is_positive ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)')
    : 'var(--border)';

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
              background: aColor.bg, color: aColor.color,
            }}>
              {d.action_label}
            </span>
            {d.product_name && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
              }}>
                <Tag size={9} /> {d.product_name}
              </span>
            )}
            <span style={{
              marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {fmtDate(d.decision_date)}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 10px' }}>
            "{d.description}"
          </p>
          {hasImpact ? (
            <ImpactPanel impact={d.impact!} />
          ) : (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 4,
              background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.3)',
              fontSize: 12, color: 'var(--warning)',
            }}>
              <Clock size={11} />
              Impacto em {Math.max(0, 7 - Math.floor((Date.now() - new Date(d.decision_date).getTime()) / 86400000))} dia(s)
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(d.id)} disabled={deleting === d.id}
          style={{
            padding: 7, background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: 6, color: 'var(--text-muted)', display: 'flex', flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--negative-dim)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ImpactPanel({ impact }: { impact: Impact }) {
  const sign   = impact.is_positive ? '+' : '';
  const accent = impact.is_positive ? 'var(--positive)' : 'var(--negative)';
  const bg     = impact.is_positive ? 'var(--positive-dim)' : 'var(--negative-dim)';
  const border = impact.is_positive ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)';
  const Icon   = impact.is_positive ? TrendingUp : TrendingDown;

  return (
    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: bg, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon size={13} color={accent} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accent }}>
          Impacto nos 7 dias seguintes
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Antes (média/dia)', value: R$(impact.avg_before), bold: false },
          { label: 'Depois (média/dia)', value: R$(impact.avg_after), bold: false },
          {
            label: 'Resultado (7 dias)',
            value: `${sign}${R$(impact.total_impact)}${impact.pct_change != null ? ` (${sign}${impact.pct_change}%)` : ''}`,
            bold: true,
          },
        ].map(item => (
          <div key={item.label}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 3px' }}>{item.label}</p>
            <p style={{
              fontSize: item.bold ? 14 : 13, fontWeight: item.bold ? 800 : 700, margin: 0,
              color: item.bold ? accent : 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}