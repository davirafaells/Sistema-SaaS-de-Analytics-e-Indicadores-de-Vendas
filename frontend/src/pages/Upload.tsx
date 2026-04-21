import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Papa from 'papaparse';
import { Upload as UploadIcon, CheckCircle, AlertCircle, FileSpreadsheet, PlusCircle, Search } from 'lucide-react';

interface Product { id: number; external_id: string; name: string; is_active: boolean; }

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', background: 'var(--bg-subtle)', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6,
};

export default function Upload() {
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');
  const [status, setStatus]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [columns, setColumns]     = useState<string[]>([]);
  const [mapping, setMapping]     = useState({ id_produto: '', produto: '', data: '', valor: '', quantidade: '', valor_total: '' });
  const [manualData, setManualData] = useState({ id_produto: '', nome_produto: '', data: '', valor_unitario: '', quantidade: 1, valor_total: '' });
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [productInput, setProductInput] = useState('');
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/products/').then(res => setAllProducts(res.data.filter((p: Product) => p.is_active))).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProductInput = (value: string) => {
    setProductInput(value);
    setManualData(prev => ({ ...prev, nome_produto: value, id_produto: '' }));
    if (value.trim().length === 0) { setSuggestions([]); setShowSuggestions(false); return; }
    const lower    = value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(lower) || p.external_id.toLowerCase().includes(lower));
    setSuggestions(filtered.slice(0, 8)); setShowSuggestions(true);
  };

  const selectProduct = (product: Product) => {
    setProductInput(product.name);
    setManualData(prev => ({ ...prev, nome_produto: product.name, id_produto: product.external_id }));
    setSuggestions([]); setShowSuggestions(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        preview: 1,
        complete: (results: any) => { if (results.data?.length > 0) setColumns(results.data[0]); }
      });
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(mapping).forEach(([key, value]) => formData.append(key, value));
    try {
      const res = await api.post('/upload/', formData);
      const msg = res.data.inconsistencias_geradas > 0
        ? `${res.data.linhas_importadas} linhas importadas. ${res.data.inconsistencias_geradas} inconsistência(s) detectada(s).`
        : `${res.data.linhas_importadas} linhas importadas com sucesso.`;
      setStatus({ type: 'success', msg });
      setFile(null); setColumns([]);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.response?.data?.detail || 'Erro no upload do CSV.' });
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sales/manual', manualData);
      setStatus({ type: 'success', msg: 'Venda registada com sucesso.' });
      setManualData({ id_produto: '', nome_produto: '', data: '', valor_unitario: '', quantidade: 1, valor_total: '' });
      setProductInput('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.response?.data?.detail || 'Erro ao registar venda.' });
    }
  };

  const fieldLabels: Record<string, string> = {
    id_produto: 'ID do Produto', produto: 'Nome do Produto', data: 'Data',
    valor: 'Valor Unitário', quantidade: 'Quantidade', valor_total: 'Valor Total',
  };

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
          Importar dados
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Carregue um CSV ou registre uma venda manualmente
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0 }}>
        {[{ id: 'csv', label: 'Importar CSV' }, { id: 'manual', label: 'Lançamento manual' }].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id as any); setStatus(null); }}
            style={{
              padding: '10px 18px', fontSize: 13.5, fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', background: 'transparent', marginBottom: -1, fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{ ...card, padding: 28 }}>

        {/* CSV tab */}
        {activeTab === 'csv' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <UploadIcon size={17} color="var(--accent)" />
              <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>
                Upload de relatório
              </h2>
            </div>

            {/* Drop zone */}
            <label
              htmlFor="fileInput"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '36px 24px', borderRadius: 'var(--radius)',
                border: '1.5px dashed var(--border)', background: 'var(--bg-subtle)',
                cursor: 'pointer', marginBottom: 28, textAlign: 'center',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLLabelElement).style.background = 'var(--accent-dim)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLLabelElement).style.background = 'var(--bg-subtle)';
              }}
            >
              <input type="file" className="hidden" id="fileInput" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
              <FileSpreadsheet size={32} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)' }}>
                {file ? file.name : 'Selecionar arquivo'}
              </span>
              {!file && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Suporte a .csv, .xlsx, .xls
                </span>
              )}
            </label>

            {columns.length > 0 && (
              <form onSubmit={handleCsvUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
                  Mapear colunas do CSV
                </p>
                {Object.keys(mapping).map(key => (
                  <div key={key}>
                    <label style={labelStyle}>{fieldLabels[key] || key}</label>
                    <select
                      required
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={(mapping as any)[key]}
                      onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                    >
                      <option value="">Selecione a coluna...</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
                <button
                  style={{
                    padding: '11px 16px', background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    fontFamily: 'inherit', marginTop: 4,
                  }}
                >
                  Importar dados
                </button>
              </form>
            )}
          </div>
        )}

        {/* Manual tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <PlusCircle size={17} color="var(--positive)" />
              <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>
                Novo lançamento
              </h2>
            </div>

            {/* Product autocomplete */}
            <div ref={autocompleteRef}>
              <label style={labelStyle}>Produto</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', pointerEvents: 'none',
                }}>
                  <Search size={13} color="var(--text-muted)" />
                </div>
                <input
                  style={{ ...inputStyle, paddingLeft: 34 }}
                  placeholder="Nome ou ID do produto..."
                  required
                  value={productInput}
                  onChange={e => handleProductInput(e.target.value)}
                  onFocus={() => productInput && setShowSuggestions(suggestions.length > 0)}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
                  }}>
                    {suggestions.map(p => (
                      <button
                        key={p.id} type="button" onClick={() => selectProduct(p)}
                        style={{
                          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
                          borderBottom: '1px solid var(--border)', fontFamily: 'inherit', textAlign: 'left',
                          fontSize: 13,
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-muted)' }}>
                          {p.external_id}
                        </span>
                      </button>
                    ))}
                    <div style={{ padding: '8px 14px', background: 'var(--bg-subtle)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                        Produto novo? Preencha o ID do produto abaixo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {manualData.id_produto && (
                <p style={{ fontSize: 12, color: 'var(--positive)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                  ID: {manualData.id_produto}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>
                ID do produto
                <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                  (preenchido automaticamente ou defina um novo)
                </span>
              </label>
              <input
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: manualData.id_produto ? 'rgba(74,222,128,0.12)' : 'var(--bg-subtle)',
                  borderColor: manualData.id_produto ? 'rgba(74,222,128,0.3)' : 'var(--border)',
                }}
                placeholder="Ex: PROD-001"
                required
                value={manualData.id_produto}
                onChange={e => setManualData({ ...manualData, id_produto: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" style={inputStyle} required
                  value={manualData.data} onChange={e => setManualData({ ...manualData, data: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Quantidade</label>
                <input type="number" min="1" style={inputStyle} required
                  value={manualData.quantidade} onChange={e => setManualData({ ...manualData, quantidade: parseInt(e.target.value) })} />
              </div>
              <div>
                <label style={labelStyle}>Preço unitário</label>
                <input type="number" step="0.01" min="0" style={inputStyle} required
                  value={manualData.valor_unitario} onChange={e => setManualData({ ...manualData, valor_unitario: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Valor total</label>
                <input type="number" step="0.01" min="0" style={{ ...inputStyle, fontWeight: 700 }} required
                  value={manualData.valor_total} onChange={e => setManualData({ ...manualData, valor_total: e.target.value })} />
              </div>
            </div>

            <button
              style={{
                padding: '11px 16px', background: 'var(--positive)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                fontFamily: 'inherit', marginTop: 4,
              }}
            >
              Salvar registro
            </button>
          </form>
        )}

        {status && (
          <div style={{
            marginTop: 20, padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: 13,
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: status.type === 'success' ? 'var(--positive-dim)' : 'var(--negative-dim)',
            border: `1px solid ${status.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: status.type === 'success' ? 'var(--positive)' : 'var(--negative)',
          }}>
            {status.type === 'success'
              ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
            <span>{status.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}