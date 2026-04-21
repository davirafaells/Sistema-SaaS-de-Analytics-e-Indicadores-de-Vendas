import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, ChevronDown,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Calendar, BookOpen, Plus, X, Trash2, Loader2
} from 'lucide-react';

type MainTab = 'relatorio' | 'analise' | 'alertas' | 'evolucao' | 'tabela';

const MONTHS_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const pad    = (n: number) => String(n).padStart(2, '0');
const R$     = (n: any)   => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const pct    = (n: any)   => n == null ? '—' : `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
const fmtDate = (s: any): string => {
  if (!s || typeof s !== 'string') return '—';
  try { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; } catch { return String(s); }
};

function defaultMonth() {
  const now = new Date();
  const jsMonth = now.getMonth();
  if (jsMonth === 0) return { year: now.getFullYear() - 1, month: 12 };
  return { year: now.getFullYear(), month: jsMonth };
}
function buildMonthOptions() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};
const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
};

// ─── MonthPicker ──────────────────────────────────────────────────────────────
function MonthPicker({ sel, onChange }: {
  sel: { year: number; month: number };
  onChange: (v: { year: number; month: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);
  const opts = buildMonthOptions();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px', cursor: 'pointer',
          fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)',
          fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Calendar size={14} color="var(--accent)" />
        {MONTHS_PT[sel.month]} {sel.year}
        <ChevronDown size={13} color="var(--text-muted)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 220,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 40,
          overflow: 'hidden',
        }}>
          <p style={{ ...sectionLabel, padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>
            Período
          </p>
          <div style={{ maxHeight: 256, overflowY: 'auto' }}>
            {opts.map(o => {
              const active = o.year === sel.year && o.month === sel.month;
              return (
                <button
                  key={`${o.year}-${o.month}`}
                  onClick={() => { onChange(o); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px', fontSize: 13.5, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  <span>{MONTHS_PT[o.month]}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text-muted)' }}>
                    {o.year}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DiffBadge ────────────────────────────────────────────────────────────────
function DiffBadge({ diff, pctVal }: { diff: number; pctVal: number | null }) {
  const pos = diff >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13,
      fontWeight: 600, color: pos ? 'var(--positive)' : 'var(--negative)',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {pos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {pos ? '+' : ''}{R$(diff)}
      {pctVal != null && (
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>({pct(pctVal)})</span>
      )}
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab]         = useState<MainTab>('relatorio');
  const [selMonth, setSelMonth] = useState(defaultMonth());
  const [loading, setLoading]   = useState(false);
  const [alerts, setAlerts]     = useState(0);
  const { year, month }         = selMonth;

  const [execData, setExecData] = useState<any>(null);
  const [opData,    setOpData]    = useState<any>(null);
  const [alertData, setAlertData] = useState<any>(null);
  const [evolData,  setEvolData]  = useState<any>(null);
  const [tabData,   setTabData]   = useState<any>(null);

  const monthParams = useCallback(() => {
    const lastDay = new Date(year, month, 0).getDate();
    return { date_from: `${year}-${pad(month)}-01`, date_to: `${year}-${pad(month)}-${pad(lastDay)}` };
  }, [year, month]);
  const execParams = { year, month };

  useEffect(() => {
    api.get('/dashboard/alertas', { params: monthParams() })
      .then(r => setAlerts(r.data.total_alerts ?? 0)).catch(() => {});
  }, [year, month]);

  useEffect(() => {
    if (tab !== 'relatorio') return;
    setLoading(true); setExecData(null);
    Promise.all([
      api.get('/executive/summary',            { params: execParams }),
      api.get('/executive/product-impact',     { params: execParams }),
      api.get('/executive/structural-trend',   { params: execParams }),
      api.get('/executive/concentration-risk', { params: execParams }),
      api.get('/executive/money-on-table',     { params: execParams }),
      api.get('/executive/score',              { params: execParams }),
      api.get('/executive/decisions',          { params: execParams }),
    ]).then(([s, i, t, r, mo, sc, d]) => {
      setExecData({ summary: s.data, impact: i.data, trend: t.data, risk: r.data, money: mo.data, score: sc.data, decisions: d.data });
    }).catch(console.error).finally(() => setLoading(false));
  }, [tab, year, month]);

  useEffect(() => {
    if (tab !== 'analise') return;
    setLoading(true);
    api.get('/dashboard/overview', { params: monthParams() })
      .then(r => setOpData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [tab, year, month]);

  useEffect(() => {
    if (tab !== 'alertas') return;
    setLoading(true);
    api.get('/dashboard/alertas', { params: monthParams() })
      .then(r => { setAlertData(r.data); setAlerts(r.data.total_alerts ?? 0); })
      .catch(console.error).finally(() => setLoading(false));
  }, [tab, year, month]);

  useEffect(() => {
    if (tab !== 'evolucao') return;
    setLoading(true);
    api.get('/dashboard/evolucao', { params: monthParams() })
      .then(r => setEvolData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [tab, year, month]);

  useEffect(() => {
    if (tab !== 'tabela') return;
    setLoading(true);
    api.get('/dashboard/tabela', { params: monthParams() })
      .then(r => setTabData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [tab, year, month]);

  const tabs = [
    { id: 'relatorio', label: 'Relatório' },
    { id: 'analise',   label: 'Análise'   },
    { id: 'alertas',   label: 'Alertas'   },
    { id: 'evolucao',  label: 'Evolução'  },
    { id: 'tabela',    label: 'Tabela'    },
  ];

  return (
    <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            Relatório de Vendas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Análise mensal de desempenho
          </p>
        </div>
        <MonthPicker sel={selMonth} onChange={setSelMonth} />
      </div>

      {/* Tab nav */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)', gap: 0,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as MainTab)}
            style={{
              padding: '10px 16px', fontSize: 13.5, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', background: 'transparent', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              transition: 'color 0.1s',
            }}
          >
            {t.label}
            {t.id === 'alertas' && alerts > 0 && (
              <span style={{
                background: 'var(--negative)', color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10, fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {alerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Carregando...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <>
          {tab === 'relatorio' && execData && (
            <TabRelatorio d={execData} year={year} month={month} onDecisionAdded={() => {
              api.get('/executive/decisions', { params: execParams })
                .then(r => setExecData((prev: any) => prev ? { ...prev, decisions: r.data } : null));
            }} />
          )}
          {tab === 'relatorio' && !execData && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhum dado para {MONTHS_PT[month]} {year}.
            </div>
          )}
          {tab === 'analise'  && opData    && <TabAnalise data={opData} />}
          {tab === 'alertas'  && alertData && <TabAlertas data={alertData} />}
          {tab === 'evolucao' && evolData   && <TabEvolucao data={evolData} />}
          {tab === 'tabela'   && tabData    && <TabTabela data={tabData} />}
        </>
      )}
    </div>
  );
}

// ─── TabRelatorio ─────────────────────────────────────────────────────────────
function TabRelatorio({ d, year, month, onDecisionAdded }: {
  d: any; year: number; month: number; onDecisionAdded: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ExecSummaryBlock summary={d.summary} />
      <ProductImpactBlock impact={d.impact} />
      <StructuralTrendBlock trend={d.trend} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <MoneyOnTableBlock money={d.money} />
        <ScoreBlock score={d.score} />
      </div>
      <ConcentrationRiskBlock risk={d.risk} />
      <DecisionsBlock decisions={d.decisions} year={year} month={month} onAdded={onDecisionAdded} />
    </div>
  );
}

// ─── ExecSummaryBlock ─────────────────────────────────────────────────────────
function ExecSummaryBlock({ summary: s }: { summary: any }) {
  if (!s) return null;
  const isGrowth = s.diff_absolute >= 0;

  return (
    <div style={card}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <p style={{ ...sectionLabel, marginBottom: 8 }}>
              Resumo — {s.month_name} {s.year}
            </p>
            <p style={{
              fontSize: 34, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.02em', margin: 0,
            }}>
              {R$(s.current_total)}
            </p>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DiffBadge diff={s.diff_absolute} pctVal={s.diff_pct} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>vs {s.prev_name}</span>
            </div>
          </div>
          <div style={{
            padding: 10, borderRadius: 8,
            background: isGrowth ? 'var(--positive-dim)' : 'var(--negative-dim)',
            color: isGrowth ? 'var(--positive)' : 'var(--negative)',
          }}>
            {isGrowth ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
        </div>
        {s.narrative && (
          <div style={{
            marginTop: 14, padding: '10px 14px', background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius)', borderLeft: `3px solid ${isGrowth ? 'var(--positive)' : 'var(--negative)'}`,
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {s.narrative}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'Crescimento',     items: s.top_positive, positive: true },
          { label: 'Queda',           items: s.top_negative, positive: false },
        ].map(({ label, items, positive }) => (
          <div
            key={label}
            style={{ padding: '16px 24px', borderRight: positive ? '1px solid var(--border)' : 'none' }}
          >
            <p style={{ ...sectionLabel, marginBottom: 10 }}>{label}</p>
            {!items?.length
              ? <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum destaque</p>
              : items.map((p: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 8, marginBottom: 8,
                  borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                    color: positive ? 'var(--positive)' : 'var(--negative)',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {positive ? '+' : ''}{R$(p.diff)}
                  </span>
                </div>
              ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ProductImpactBlock ───────────────────────────────────────────────────────
function ProductImpactBlock({ impact: d }: { impact: any }) {
  if (!d) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {d.lost?.length > 0 && (
        <div style={{ ...card }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--negative-dim)',
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
                Receita perdida — {d.month_name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Redução de {R$(d.total_lost)} vs {d.prev_name}
              </p>
            </div>
            <span style={{
              fontSize: 20, fontWeight: 800, color: 'var(--negative)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              -{R$(d.total_lost)}
            </span>
          </div>
          <div>
            {d.lost.map((p: any, i: number) => <ImpactRow key={i} p={p} mode="loss" />)}
          </div>
        </div>
      )}
      {d.gained?.length > 0 && (
        <div style={{ ...card }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--positive-dim)',
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
                Receita ganha — {d.month_name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                +{R$(d.total_gained)} acima de {d.prev_name}
              </p>
            </div>
            <span style={{
              fontSize: 20, fontWeight: 800, color: 'var(--positive)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              +{R$(d.total_gained)}
            </span>
          </div>
          <div>
            {d.gained.map((p: any, i: number) => <ImpactRow key={i} p={p} mode="gain" />)}
          </div>
        </div>
      )}
      {/* Full table */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
            Todos os produtos — {d.month_name} vs {d.prev_name}
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Produto', d.prev_name, d.month_name, 'Diferença', 'Part.'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: i === 0 ? 'left' : 'right',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.products?.filter((p: any) => p.current > 0 || p.previous > 0)
                .sort((a: any, b: any) => Math.abs(b.diff) - Math.abs(a.diff))
                .slice(0, 15)
                .map((p: any, i: number) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 1 ? 'var(--bg-main)' : 'transparent',
                  }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{R$(p.previous)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{R$(p.current)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 700, color: p.diff >= 0 ? 'var(--positive)' : 'var(--negative)',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                      }}>
                        {p.diff >= 0 ? '+' : ''}{R$(p.diff)}
                      </span>
                      {p.pct_var != null && (
                        <span style={{ marginLeft: 4, fontSize: 11, color: p.diff >= 0 ? 'var(--positive)' : 'var(--negative)', opacity: 0.7 }}>
                          ({pct(p.pct_var)})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>{p.share}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ p, mode }: { p: any; mode: 'loss' | 'gain' }) {
  const isLoss = mode === 'loss';
  return (
    <div style={{
      padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', margin: 0 }}>{p.name}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: "'IBM Plex Mono', monospace" }}>
          {R$(p.previous)} → {R$(p.current)}
          {p.share > 0 && <span style={{ marginLeft: 10, color: 'var(--text-muted)' }}>{p.share}% do fat.</span>}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontSize: 16, fontWeight: 800, margin: 0,
          color: isLoss ? 'var(--negative)' : 'var(--positive)',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {isLoss ? '-' : '+'}{R$(Math.abs(p.diff))}
        </p>
        {p.pct_var != null && (
          <p style={{
            fontSize: 11, margin: '2px 0 0',
            color: isLoss ? 'var(--negative)' : 'var(--positive)', opacity: 0.8,
          }}>
            {pct(p.pct_var)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── StructuralTrendBlock ─────────────────────────────────────────────────────
function StructuralTrendBlock({ trend: t }: { trend: any }) {
  if (!t) return null;
  const hasFalling = t.falling?.length > 0;
  const hasRising  = t.rising?.length > 0;
  const hasMixed   = t.mixed?.length > 0;
  if (!hasFalling && !hasRising && !hasMixed) return (
    <div style={{ ...card, padding: 24 }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
        Dados insuficientes para tendência estrutural (mínimo 3 meses).
      </p>
    </div>
  );

  const sections = [
    {
      label: 'Queda contínua', sub: `${t.months_analyzed?.join(' → ')}`, items: t.falling,
      mode: 'falling', accent: 'var(--negative)', dimBg: 'var(--negative-dim)', borderColor: 'rgba(248,113,113,0.2)',
    },
    {
      label: 'Crescimento contínuo', sub: '', items: t.rising,
      mode: 'rising', accent: 'var(--positive)', dimBg: 'var(--positive-dim)', borderColor: 'rgba(74,222,128,0.2)',
    },
    {
      label: 'Comportamento irregular', sub: '', items: t.mixed,
      mode: 'mixed', accent: 'var(--text-muted)', dimBg: 'var(--bg-subtle)', borderColor: 'var(--border)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>
        Tendência estrutural
        {t.months_analyzed && (
          <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            {t.months_analyzed.join(' → ')}
          </span>
        )}
      </p>
      {hasFalling && t.total_structural_loss > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'var(--negative-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius)',
        }}>
          <AlertTriangle size={16} color="var(--negative)" />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--negative)', fontSize: 13, margin: 0 }}>
              Produto em queda há {t.falling?.length} produto{t.falling?.length > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Perda acumulada de {R$(t.total_structural_loss)} nos últimos 3 meses.
            </p>
          </div>
        </div>
      )}
      {sections.map(s => s.items?.length > 0 && (
        <div key={s.mode} style={card}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            background: s.dimBg, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: s.accent }} />
            <p style={{ fontWeight: 700, fontSize: 13.5, margin: 0, color: 'var(--text-primary)' }}>
              {s.label}
              <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                ({s.items.length})
              </span>
            </p>
          </div>
          <div>
            {s.items.slice(0, s.mode === 'mixed' ? 6 : 99).map((p: any, i: number) => (
              <div key={i} style={{
                padding: '14px 20px', borderBottom: i < s.items.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {p.name}
                    </p>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                      {p.monthly?.map((m: any, mi: number) => (
                        <div key={mi} style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                            {m.month_name.slice(0, 3)}
                          </p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {R$(m.revenue)}
                          </p>
                          {mi > 0 && p.directions?.[mi - 1] === 'up'   && <ArrowUpRight  size={11} color="var(--positive)" style={{ margin: '2px auto 0' }} />}
                          {mi > 0 && p.directions?.[mi - 1] === 'down' && <ArrowDownRight size={11} color="var(--negative)" style={{ margin: '2px auto 0' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {s.mode === 'falling' && p.cumulative_loss > 0 && (
                      <>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Perda acumulada</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--negative)', margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                          -{R$(p.cumulative_loss)}
                        </p>
                      </>
                    )}
                    {s.mode === 'rising' && p.cumulative_gain > 0 && (
                      <>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Ganho acumulado</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--positive)', margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                          +{R$(p.cumulative_gain)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ConcentrationRiskBlock ───────────────────────────────────────────────────
function ConcentrationRiskBlock({ risk: r }: { risk: any }) {
  if (!r) return null;
  const riskColors: Record<string, { accent: string; bg: string; badge: string }> = {
    critical: { accent: 'var(--negative)', bg: 'var(--negative-dim)', badge: 'var(--negative)' },
    high:     { accent: 'var(--warning)',  bg: 'var(--warning-dim)',  badge: 'var(--warning)' },
    medium:   { accent: 'var(--warning)',  bg: 'var(--warning-dim)',  badge: 'var(--warning)' },
    low:      { accent: 'var(--positive)', bg: 'var(--positive-dim)', badge: 'var(--positive)' },
  };
  const c = riskColors[r.risk_level] || riskColors.medium;

  return (
    <div style={card}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)', background: c.bg,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AlertTriangle size={15} color={c.accent} />
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
              Concentração de risco — {r.month_name}
            </p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{r.narrative}</p>
        </div>
        <span style={{
          background: c.badge, color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: 4,
        }}>
          {r.risk_label}
        </span>
      </div>

      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        {[
          { label: 'Top 3 concentração', value: `${r.top3_share}%` },
          { label: 'Top 5 concentração', value: `${r.top5_share}%` },
          { label: 'Impacto -20% top 3', value: `-${R$(r.impact_20pct_top3)}` },
          { label: 'Produtos p/ 80% fat.', value: `${r.products_for_80pct}` },
        ].map((item, i) => (
          <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>{item.label}</p>
            <p style={{
              fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ ...sectionLabel, marginBottom: 12 }}>Participação por produto</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {r.top_products?.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  width: `${p.share}%`,
                  background: ['#8B5CF6','#A78BFA','#C4B5FD','#F59E0B','#FBBF24'][i] || '#FBBF24',
                }} />
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', width: 36, textAlign: 'right',
                fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
              }}>
                {p.share}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MoneyOnTableBlock ────────────────────────────────────────────────────────
function MoneyOnTableBlock({ money: m }: { money: any }) {
  if (!m?.has_data) return (
    <div style={{ ...card, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
        Dados insuficientes (mínimo 3 meses).
      </p>
    </div>
  );
  const isBelowAvg = m.is_below_avg;
  const accent     = isBelowAvg ? 'var(--warning)' : 'var(--positive)';
  const bg         = isBelowAvg ? 'var(--warning-dim)' : 'var(--positive-dim)';

  return (
    <div style={{ ...card }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: bg }}>
        <p style={{ ...sectionLabel, marginBottom: 6 }}>
          {isBelowAvg ? 'Abaixo da média histórica' : 'Acima da média histórica'}
        </p>
        <p style={{
          fontSize: 26, fontWeight: 800, margin: 0, color: accent,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {isBelowAvg ? '-' : '+'}{R$(Math.abs(m.diff))}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', fontFamily: "'IBM Plex Mono', monospace" }}>
          {m.month_name}: {R$(m.current_total)} vs média 3m: {R$(m.avg_3m)}
        </p>
      </div>
      {m.narrative && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{m.narrative}</p>
        </div>
      )}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8 }}>
        {m.monthly_detail?.map((md: any, i: number) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center', padding: '8px 4px',
            background: 'var(--bg-subtle)', borderRadius: 'var(--radius)',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 3px' }}>{md.month_name.slice(0, 3)}</p>
            <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {R$(md.revenue)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ScoreBlock ───────────────────────────────────────────────────────────────
function ScoreBlock({ score: s }: { score: any }) {
  if (!s) return null;
  const colorMap: Record<string, { accent: string; bg: string }> = {
    green:  { accent: 'var(--positive)', bg: 'var(--positive-dim)' },
    blue:   { accent: 'var(--accent)',   bg: 'var(--accent-dim)' },
    yellow: { accent: 'var(--warning)',  bg: 'var(--warning-dim)' },
    red:    { accent: 'var(--negative)', bg: 'var(--negative-dim)' },
  };
  const c = colorMap[s.color] || colorMap.blue;

  return (
    <div style={card}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: c.bg }}>
        <p style={{ ...sectionLabel, marginBottom: 8 }}>Score de saúde</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
          <span style={{
            fontSize: 44, fontWeight: 800, lineHeight: 1, color: c.accent,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {s.score}
          </span>
          <div style={{ paddingBottom: 4 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: c.accent, margin: 0 }}>{s.classification}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>de 100 pts</p>
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: 6, borderRadius: 3, width: `${s.score}%`, background: c.accent }} />
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.values(s.breakdown || {}).map((b: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.label}
            </span>
            <div style={{ flex: 1, height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: 4, borderRadius: 2, background: c.accent, width: `${(b.score / b.max) * 100}%` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', width: 36, textAlign: 'right', flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
              {b.score}/{b.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DecisionsBlock ───────────────────────────────────────────────────────────
const ACTION_OPTIONS = [
  { value: 'promotion',    label: 'Promoção'            },
  { value: 'restock',      label: 'Reposição de estoque' },
  { value: 'price_change', label: 'Mudança de preço'    },
  { value: 'campaign',     label: 'Campanha'             },
  { value: 'other',        label: 'Outro'                },
];
const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  promotion:    { bg: 'rgba(139,92,246,0.18)', color: '#c4b5fd' },
  restock:      { bg: 'rgba(99,179,237,0.15)',  color: '#7dd3fc' },
  price_change: { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  campaign:     { bg: 'rgba(74,222,128,0.15)',  color: 'var(--positive)' },
  other:        { bg: 'var(--bg-subtle)',        color: 'var(--text-muted)' },
};

function DecisionsBlock({ decisions: d, year, month, onAdded }: {
  decisions: any; year: number; month: number; onAdded: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ product_id: '', action_type: 'promotion', description: '', decision_date: today });

  useEffect(() => {
    api.get('/products/').then(r => setProducts(r.data.filter((p: any) => p.is_active))).catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await api.post('/decisions/', { ...form, product_id: form.product_id ? Number(form.product_id) : null });
      setShowForm(false);
      setForm({ product_id: '', action_type: 'promotion', description: '', decision_date: today });
      onAdded();
    } catch {}
    setSaving(false);
  };

  const del = async (id: number) => {
    setDeleting(id);
    try { await api.delete(`/decisions/${id}`); onAdded(); } catch {}
    setDeleting(null);
  };

  if (!d) return null;
  const totalImpact = (d.total_positive_impact || 0) + (d.total_negative_impact || 0);
  const selectStyle: React.CSSProperties = {
    padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    background: 'var(--bg-card)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
  };

  return (
    <div style={card}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--accent-dim)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={15} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--text-primary)' }}>
              Diário de decisões — {d.month_name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '1px 0 0' }}>
              {d.total_decisions} decisão(ões) · {d.evaluated_count} com impacto calculado
              {Math.abs(totalImpact) > 0 && (
                <span style={{
                  marginLeft: 8, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                  color: totalImpact >= 0 ? 'var(--positive)' : 'var(--negative)',
                }}>
                  · {totalImpact >= 0 ? '+' : ''}{R$(totalImpact)}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={12} /> Registar
        </button>
      </div>

      {showForm && (
        <div style={{ padding: 20, background: 'rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <select style={selectStyle} value={form.product_id}
                onChange={e => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Geral (todos)</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select style={selectStyle} value={form.action_type}
                onChange={e => setForm({ ...form, action_type: e.target.value })}>
                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="date" style={selectStyle} value={form.decision_date}
                onChange={e => setForm({ ...form, decision_date: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                required type="text"
                placeholder='Ex: "Coloquei Heineken em promoção de R$ 8"'
                style={{ ...selectStyle, flex: 1, background: 'var(--bg-card)' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
              <button
                type="submit" disabled={saving || !form.description.trim()}
                style={{
                  padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
                }}>
                {saving ? '...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 10px', background: 'var(--bg-card)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex',
                }}>
                <X size={14} />
              </button>
            </div>
          </form>
        </div>
      )}

      {d.decisions?.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <BookOpen size={28} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
          Nenhuma decisão em {d.month_name}.
        </div>
      ) : (
        <div>
          {d.decisions.map((dec: any) => {
            const impact = dec.impact;
            const aColor = ACTION_COLORS[dec.action_type] || { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };
            return (
              <div key={dec.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: aColor.bg, color: aColor.color,
                    }}>
                      {ACTION_OPTIONS.find(o => o.value === dec.action_type)?.label || dec.action_type}
                    </span>
                    {dec.product_name && (
                      <span style={{
                        fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-subtle)',
                        padding: '2px 8px', borderRadius: 4,
                      }}>
                        {dec.product_name}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {fmtDate(dec.decision_date)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px' }}>"{dec.description}"</p>
                  {impact ? (
                    <div style={{
                      padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12,
                      background: impact.is_positive ? 'var(--positive-dim)' : 'var(--negative-dim)',
                      border: `1px solid ${impact.is_positive ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                      color: impact.is_positive ? 'var(--positive)' : 'var(--negative)',
                    }}>
                      <span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                        Impacto 7 dias: {impact.is_positive ? '+' : ''}{R$(impact.total_impact)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                        ({R$(impact.avg_before)}/dia → {R$(impact.avg_after)}/dia)
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--warning)', margin: 0 }}>
                      Impacto disponível após 7 dias
                    </p>
                  )}
                </div>
                <button
                  onClick={() => del(dec.id)} disabled={deleting === dec.id}
                  style={{
                    padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', borderRadius: 'var(--radius)', flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TabAnalise ───────────────────────────────────────────────────────────────
function TabAnalise({ data: d }: { data: any }) {
  if (!d) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        padding: '10px 14px', background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--warning)',
      }}>
        Métricas operacionais complementares do mês selecionado.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Faturamento',       value: R$(d.total_revenue),                   sub: `Ant: ${R$(d.prev_revenue)}` },
          { label: 'Pedidos',           value: d.sale_count?.toLocaleString('pt-BR'), sub: `${d.total_qty?.toLocaleString('pt-BR')} itens` },
          { label: 'Ticket médio',      value: R$(d.avg_ticket),                      sub: 'por pedido' },
          { label: 'Dias com vendas',   value: `${d.days_active}/${d.period_days}`,   sub: `${d.regularity}% regularidade` },
          { label: 'Média por dia',     value: R$(d.avg_per_day),                     sub: 'dias com venda' },
          { label: 'Receita/unidade',   value: R$(d.revenue_per_unit),                sub: 'ganho médio/item' },
          { label: 'Melhor dia',        value: d.best_weekday || '—',                 sub: 'maior receita média' },
          { label: 'Tendência interna', value: d.trend != null ? `${d.trend > 0 ? '+' : ''}${d.trend}%` : '—', sub: '2ª metade vs 1ª' },
        ].map((item, i) => (
          <div key={i} style={{ ...card, padding: '14px 16px' }}>
            <p style={{ ...sectionLabel, marginBottom: 6 }}>{item.label}</p>
            <p style={{
              fontSize: 20, fontWeight: 800, margin: '0 0 3px', color: 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {item.value}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{item.sub}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>Top 5 produtos</p>
          <div style={{ height: 176 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.top_products} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                <Tooltip formatter={(v: any) => [R$(v), 'Receita']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {d.top_products?.map((_: any, i: number) => (
                    <Cell key={i} fill={['#8B5CF6', '#A78BFA', '#C4B5FD', '#F59E0B', '#FBBF24'][i] || '#FBBF24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>Média por dia da semana</p>
          <div style={{ height: 176 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.weekday_chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} width={30} />
                <Tooltip formatter={(v: any) => [R$(v), 'Média']} />
                <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                  {d.weekday_chart?.map((_: any, i: number) => {
                    const maxV = Math.max(...(d.weekday_chart?.map((x: any) => x.media) || [0]));
                    return <Cell key={i} fill={d.weekday_chart?.[i]?.media === maxV ? '#F59E0B' : 'rgba(245,158,11,0.25)'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TabAlertas ───────────────────────────────────────────────────────────────
function TabAlertas({ data }: { data: any }) {
  const period = data?.period || {};
  const sections = [
    { key: 'growths', label: 'Crescimento expressivo', sub: '+30% ou mais', items: data?.growths || [], accent: 'var(--positive)', bg: 'var(--positive-dim)', border: 'rgba(74,222,128,0.2)', showLoss: false },
    { key: 'drops',   label: 'Queda expressiva',       sub: '-30% ou mais', items: data?.drops   || [], accent: 'var(--negative)', bg: 'var(--negative-dim)', border: 'rgba(248,113,113,0.2)', showLoss: true  },
    { key: 'stopped', label: 'Sem vendas',             sub: 'Parou de vender', items: data?.stopped || [], accent: 'var(--text-muted)', bg: 'var(--bg-subtle)', border: 'var(--border)', showLoss: true },
  ];
  const total = data?.total_alerts ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: '10px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--accent)',
      }}>
        Comparando <strong>{fmtDate(period.current_from)}</strong> a <strong>{fmtDate(period.current_to)}</strong> vs período anterior
      </div>
      {total === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Tudo estável
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Nenhuma variação expressiva neste período.
          </p>
        </div>
      ) : (
        sections.map(s => s.items.length > 0 && (
          <div key={s.key} style={card}>
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--border)', background: s.bg,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: s.accent }} />
              <p style={{ fontWeight: 700, fontSize: 13.5, margin: 0, color: 'var(--text-primary)' }}>
                {s.label}
                <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                  {s.sub} · {s.items.length} produto{s.items.length > 1 ? 's' : ''}
                </span>
              </p>
            </div>
            <div>
              {s.items.map((item: any, i: number) => {
                const diff = item?.difference ?? 0;
                const lp   = item?.loss_projection;
                return (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: i < s.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                          {item?.name}
                        </p>
                        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>Antes: <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{R$(item?.previous)}</strong></span>
                          <span>Agora: <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{R$(item?.current)}</strong></span>
                          {item?.share > 0 && <span>{item.share}% do fat.</span>}
                        </div>
                        {s.showLoss && lp && (
                          <div style={{
                            marginTop: 8, padding: '7px 12px', borderRadius: 'var(--radius)',
                            background: 'var(--negative-dim)', border: '1px solid rgba(248,113,113,0.25)', fontSize: 12,
                          }}>
                            <span style={{ fontWeight: 700, color: 'var(--negative)' }}>Custo da inação: </span>
                            <span style={{ color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace" }}>
                              Perdido: {R$(Math.abs(diff))} · Até fim do mês: {R$(lp.loss_until_month_end)} · Ano: {R$(lp.annualized)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{
                          fontSize: 18, fontWeight: 800, margin: '0 0 2px', color: s.accent,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {pct(item?.variation)}
                        </p>
                        <p style={{
                          fontSize: 13, fontWeight: 700, margin: 0,
                          color: diff >= 0 ? 'var(--positive)' : 'var(--negative)',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {diff >= 0 ? '+' : ''}{R$(diff)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── TabEvolucao ──────────────────────────────────────────────────────────────
function TabEvolucao({ data }: { data: any }) {
  const [view, setView] = useState<'day' | 'week'>('day');
  const chartData = view === 'day' ? data.daily : data.weekly;
  const key       = view === 'day' ? 'date' : 'week';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', width: 'fit-content' }}>
        {[{ id: 'day', label: 'Por dia' }, { id: 'week', label: 'Por semana' }].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id as any)}
            style={{
              padding: '8px 16px', fontSize: 13.5, fontWeight: view === v.id ? 600 : 400,
              color: view === v.id ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none', borderBottom: view === v.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', background: 'transparent', marginBottom: -1, fontFamily: 'inherit',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      {[
        { title: `Faturamento ${view === 'day' ? 'por dia' : 'por semana'}`, dk: 'revenue',  fmt: (v: any) => [R$(v), 'Faturamento'], fill: '#F59E0B', h: 256 },
        { title: `Unidades ${view === 'day' ? 'por dia' : 'por semana'}`,   dk: 'quantity', fmt: (v: any) => [`${Number(v).toLocaleString('pt-BR')} un.`, 'Qtd'], fill: '#8B5CF6', h: 200 },
      ].map(({ title, dk, fmt, fill, h }) => (
        <div key={dk} style={{ ...card, padding: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>{title}</p>
          <div style={{ height: h }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey={key} tick={{ fontSize: 10 }} tickFormatter={v => view === 'day' ? fmtDate(v).slice(0, 5) : v} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} width={35} />
                <Tooltip formatter={fmt} labelFormatter={l => view === 'day' ? fmtDate(String(l)) : String(l)} />
                <Bar dataKey={dk} fill={fill} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
      <div style={{ ...card, padding: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>Faturamento acumulado</p>
        <div style={{ height: 208 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--positive)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--positive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => fmtDate(v).slice(0, 5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} width={35} />
              <Tooltip formatter={(v: any) => [R$(v), 'Acumulado']} labelFormatter={l => fmtDate(String(l))} />
              <Area type="monotone" dataKey="cumulative" stroke="var(--positive)" strokeWidth={2} fill="url(#cumGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── TabTabela ────────────────────────────────────────────────────────────────
function TabTabela({ data }: { data: any }) {
  const [search, setSearch]   = useState('');
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage]       = useState(0);
  const PER_PAGE = 50;

  const rows: any[] = data.rows || [];
  const filtered = rows.filter(r =>
    r.product_name.toLowerCase().includes(search.toLowerCase()) || r.date.includes(search)
  );
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    if (typeof av === 'number') return sortDir === 'desc' ? bv - av : av - bv;
    return sortDir === 'desc' ? String(bv).localeCompare(String(av), 'pt-BR') : String(av).localeCompare(String(bv), 'pt-BR');
  });
  const pages   = Math.ceil(sorted.length / PER_PAGE);
  const visible = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalRev = filtered.reduce((s, r) => s + r.revenue, 0);
  const totalQty = filtered.reduce((s, r) => s + r.quantity, 0);

  const Th = ({ col, label }: { col: string; label: string }) => (
    <th
      onClick={() => { if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortCol(col); setSortDir('desc'); } setPage(0); }}
      style={{
        padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none',
        whiteSpace: 'nowrap', background: 'var(--bg-subtle)',
      }}
    >
      {label} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 320,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Buscar</span>
          <input
            type="text" placeholder="Produto ou data..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: 'var(--text-primary)' }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '8px 14px', fontSize: 13,
          }}>
            Total: <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: "'IBM Plex Mono', monospace" }}>{R$(totalRev)}</span>
          </div>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '8px 14px', fontSize: 13, color: 'var(--text-muted)',
          }}>
            {filtered.length} linhas
          </div>
        </div>
      </div>
      <div style={card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th col="date" label="Data" />
                <Th col="weekday" label="Dia" />
                <Th col="product_name" label="Produto" />
                <Th col="revenue" label="Valor" />
                <Th col="quantity" label="Qtd" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r: any, i: number) => (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 1 ? 'var(--bg-main)' : 'transparent',
                }}>
                  <td style={{ padding: '10px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {fmtDate(r.date)}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {r.weekday}
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.product_name}
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--accent)', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                    {R$(r.revenue)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                    {r.quantity.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Total ({filtered.length} linhas)
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--accent)', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                    {R$(totalRev)}
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--accent)', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                    {totalQty.toLocaleString('pt-BR')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          {!visible.length && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {search ? `Nenhum resultado para "${search}".` : 'Nenhum dado.'}
            </div>
          )}
        </div>
        {pages > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Página {page + 1} de {pages}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                disabled={page === 0} onClick={() => setPage(p => p - 1)}
                style={{ padding: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.3 : 1, display: 'flex' }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const pg = page < 3 ? i : page - 2 + i;
                if (pg >= pages) return null;
                return (
                  <button
                    key={pg} onClick={() => setPage(pg)}
                    style={{
                      width: 30, height: 30, borderRadius: 6, fontSize: 13, fontWeight: 600,
                      background: pg === page ? 'var(--accent)' : 'transparent',
                      color: pg === page ? '#fff' : 'var(--text-secondary)',
                      border: pg === page ? 'none' : '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    {pg + 1}
                  </button>
                );
              })}
              <button
                disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}
                style={{ padding: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: page >= pages - 1 ? 'not-allowed' : 'pointer', opacity: page >= pages - 1 ? 0.3 : 1, display: 'flex' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}