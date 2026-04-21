import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { AlertTriangle, CheckCircle, XCircle, MinusCircle, GitBranch, X } from 'lucide-react';

interface Inconsistency {
  id: number; product_id: number; external_id: string;
  current_name: string; new_name: string;
}
type Action = 'keep' | 'update' | 'ignore' | 'remap';

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
};

export default function Inconsistencies() {
  const [items, setItems]         = useState<Inconsistency[]>([]);
  const [loading, setLoading]     = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [remapModal, setRemapModal] = useState<{ item: Inconsistency; newId: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inconsistencies/');
      setItems(res.data);
    } catch { showFeedback('error', 'Erro ao carregar inconsistências.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 4000);
  };

  const resolve = async (id: number, action: Action, newExternalId?: string) => {
    setResolving(id);
    try {
      const body: any = { action };
      if (action === 'remap') body.new_external_id = newExternalId;
      const res = await api.post(`/inconsistencies/${id}/resolve`, body);
      showFeedback('success', res.data.message);
      setRemapModal(null); load();
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.detail || 'Erro ao resolver.');
    } finally { setResolving(null); }
  };

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', fontFamily: 'inherit', transition: 'opacity 0.1s',
  };

  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'var(--warning-dim)',
          border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AlertTriangle size={19} color="var(--warning)" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            Inconsistências de produtos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Mesmo ID encontrado com nomes diferentes no CSV
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '14px 18px', borderRadius: 'var(--radius)',
        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[
          ['Manter',      'Conserva o nome atual do catálogo sem alterações.'],
          ['Atualizar',   'Renomeia o produto para o novo nome do CSV.'],
          ['Criar novo',  'O nome pertence a outro produto. Você define o código.'],
          ['Ignorar',     'Descarta a inconsistência sem alterar nada.'],
        ].map(([title, desc]) => (
          <p key={title} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{title}</strong> — {desc}
          </p>
        ))}
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

      {loading ? (
        <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: 64, textAlign: 'center' }}>
          <CheckCircle size={36} style={{ display: 'block', margin: '0 auto 12px', color: 'var(--positive)' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Nenhuma inconsistência pendente
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Todos os produtos estão consistentes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(item => (
            <div key={item.id} style={card}>
              {/* Conflict header */}
              <div style={{
                padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--warning-dim)', borderBottom: '1px solid rgba(245,158,11,0.25)',
              }}>
                <AlertTriangle size={13} color="var(--warning)" />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning)' }}>
                  Conflito — ID:{' '}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{item.external_id}</span>
                </span>
              </div>

              <div style={{ padding: '18px 18px 16px' }}>
                {/* Name comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                      Nome atual
                    </p>
                    <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', margin: 0 }}>{item.current_name}</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--accent-dim)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', margin: '0 0 6px' }}>
                      Nome novo (CSV)
                    </p>
                    <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', margin: 0 }}>{item.new_name}</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    disabled={resolving === item.id} onClick={() => resolve(item.id, 'keep')}
                    style={{ ...btnBase, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', opacity: resolving === item.id ? 0.5 : 1 }}
                  >
                    <MinusCircle size={14} /> Manter
                  </button>
                  <button
                    disabled={resolving === item.id} onClick={() => resolve(item.id, 'update')}
                    style={{ ...btnBase, background: 'var(--accent)', color: '#fff', opacity: resolving === item.id ? 0.5 : 1 }}
                  >
                    <CheckCircle size={14} /> Atualizar
                  </button>
                  <button
                    disabled={resolving === item.id} onClick={() => setRemapModal({ item, newId: '' })}
                    style={{ ...btnBase, background: 'var(--accent)', color: '#fff', opacity: resolving === item.id ? 0.5 : 1 }}
                  >
                    <GitBranch size={14} /> Criar novo
                  </button>
                  <button
                    disabled={resolving === item.id} onClick={() => resolve(item.id, 'ignore')}
                    style={{
                      ...btnBase, background: 'transparent', color: 'var(--negative)',
                      border: '1px solid rgba(248,113,113,0.3)', opacity: resolving === item.id ? 0.5 : 1,
                    }}
                  >
                    <XCircle size={14} /> Ignorar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remap Modal */}
      {remapModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            width: '100%', maxWidth: 420,
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--text-primary)' }}>
                <GitBranch size={16} color="var(--accent)" /> Criar novo produto
              </h2>
              <button onClick={() => setRemapModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                O nome <strong>"{remapModal.item.new_name}"</strong> será associado ao código que você definir abaixo.
              </p>
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius)',
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Código em conflito:</span>{' '}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{remapModal.item.external_id}</span>
                </p>
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Produto existente:</span>{' '}
                  {remapModal.item.current_name}
                </p>
              </div>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6,
                }}>
                  Código do novo produto
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Ex: PROD-042 ou 9999"
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', background: 'var(--bg-subtle)',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, outline: 'none',
                    color: 'var(--text-primary)', boxSizing: 'border-box',
                  }}
                  value={remapModal.newId}
                  onChange={e => setRemapModal({ ...remapModal, newId: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && remapModal.newId.trim()) {
                      resolve(remapModal.item.id, 'remap', remapModal.newId.trim());
                    }
                  }}
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  Se o código já existir, o nome será vinculado a ele.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 24px 24px' }}>
              <button
                onClick={() => setRemapModal(null)}
                style={{
                  flex: 1, padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', background: 'transparent',
                  fontFamily: 'inherit', fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                disabled={!remapModal.newId.trim() || resolving === remapModal.item.id}
                onClick={() => resolve(remapModal.item.id, 'remap', remapModal.newId.trim())}
                style={{
                  flex: 1, padding: '10px 16px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius)', fontWeight: 700, cursor: !remapModal.newId.trim() ? 'not-allowed' : 'pointer',
                  opacity: !remapModal.newId.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13,
                }}
              >
                <GitBranch size={14} />
                {resolving === remapModal.item.id ? 'Criando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}