import { useState } from 'react';

import { validateAdminSession } from '../lib/api';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setError('Lutfen e-posta ve sifre giriniz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Hatali e-posta veya sifre.');
        return;
      }

      try {
        await validateAdminSession();
      } catch {
        await supabase.auth.signOut();
        setError('Bu panel yalnizca admin kullanicilara aciktir.');
        return;
      }

      onLogin();
    } catch {
      setError('Bir hata olustu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1>EstateFlow</h1>
        <p>Reklam Yonetim Paneli - Sadece Admin</p>
        {error && <div className="login-error">{error}</div>}
        <div className="form-group">
          <label>E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
          />
        </div>
        <div className="form-group">
          <label>Sifre</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="******"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>
      </form>
    </div>
  );
}
