import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || 'Falha no login';
      setError(msg);
      console.error('Login error:', e.response?.data);
    }
  };
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#0d1117', color: '#fff' }}>
      <form onSubmit={submit} style={{ background: '#161b22', padding: 32, borderRadius: 12, width: 320 }}>
        <h1 style={{ marginTop: 0 }}>Login</h1>
        <label>Email<br/><input value={email} onChange={e=>setEmail(e.target.value)} style={{ width:'100%', padding:8 }}/></label>
        <label style={{ marginTop:12 }}>Senha<br/><input type='password' value={password} onChange={e=>setPassword(e.target.value)} style={{ width:'100%', padding:8 }}/></label>
        {error && <p style={{ color: 'tomato' }}>{error}</p>}
        <button style={{ marginTop:16, width:'100%', padding:10, background:'#238636', color:'#fff', border:'none', borderRadius:6 }}>Entrar</button>
      </form>
    </div>
  );
}
