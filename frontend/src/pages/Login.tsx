import React, { useState } from 'react';
import api from '../services/api';
import { BarChart3, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-subtle)',
  fontSize: 14,
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  marginBottom: 6,
};

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [regName, setRegName]       = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regEmail, setRegEmail]     = useState('');
  const [regPw, setRegPw]           = useState('');
  const [regPw2, setRegPw2]         = useState('');
  const [showRegPw, setShowRegPw]   = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('username', email);
      form.append('password', password);
      const res = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      localStorage.setItem('token', res.data.access_token);
      window.location.href = '/';
    } catch {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPw !== regPw2) { setError('As senhas não coincidem.'); return; }
    if (regPw.length < 6)  { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: regName, company_name: regCompany, email: regEmail, password: regPw,
      });
      setRegSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 36,
              height: 36,
              background: 'var(--accent)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BarChart3 size={20} color="#fff" />
            </div>
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}>
              SaaS Sales
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
            Inteligência de vendas para o seu negócio
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setRegSuccess(false); }}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <div style={{ padding: 28 }}>

            {/* Login */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input
                    type="email" required placeholder="seu@email.com"
                    style={inputStyle} value={email} onChange={e => setEmail(e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: 44 }} value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <button
                      type="button" onClick={() => setShowPw(!showPw)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', padding: 0,
                      }}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: 'var(--negative-dim)', border: '1px solid #fecaca',
                    color: 'var(--negative)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    padding: '11px 16px', background: 'var(--accent)', color: '#fff',
                    fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius)', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'inherit', transition: 'opacity 0.15s',
                  }}
                >
                  {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={15} /></>}
                </button>
              </form>
            )}

            {/* Register */}
            {mode === 'register' && !regSuccess && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Seu nome</label>
                  <input type="text" required placeholder="João Silva" style={inputStyle}
                    value={regName} onChange={e => setRegName(e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Empresa</label>
                  <input type="text" required placeholder="Minha Empresa LTDA" style={inputStyle}
                    value={regCompany} onChange={e => setRegCompany(e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" required placeholder="seu@email.com" style={inputStyle}
                    value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Senha</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showRegPw ? 'text' : 'password'} required placeholder="mín. 6 chars"
                        style={{ ...inputStyle, paddingRight: 38 }} value={regPw}
                        onChange={e => setRegPw(e.target.value)}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                      <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', padding: 0,
                        }}>
                        {showRegPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Confirmar</label>
                    <input type="password" required placeholder="repetir senha" style={inputStyle}
                      value={regPw2} onChange={e => setRegPw2(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: 'var(--negative-dim)', border: '1px solid #fecaca',
                    color: 'var(--negative)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    padding: '11px 16px', background: 'var(--positive)', color: '#0F172A',
                    fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius)', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'inherit',
                  }}>
                  {loading ? 'Criando conta...' : <><span>Criar conta</span><ArrowRight size={15} /></>}
                </button>
                <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-muted)', margin: 0 }}>
                  30 dias grátis, sem cartão de crédito.
                </p>
              </form>
            )}

            {/* Success */}
            {mode === 'register' && regSuccess && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 56, height: 56, background: 'var(--positive-dim)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <CheckCircle2 size={28} color="var(--positive)" />
                </div>
                <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 17, marginBottom: 6 }}>
                  Conta criada com sucesso
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Seu período de 30 dias começou.
                </p>
                <button
                  onClick={() => { setMode('login'); setRegSuccess(false); setEmail(regEmail); }}
                  style={{
                    width: '100%', padding: '11px 16px', background: 'var(--accent)', color: '#fff',
                    fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius)', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'inherit',
                  }}>
                  <span>Fazer login</span><ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}