import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import { validateAdminSession } from './lib/api';
import { supabase } from './lib/supabase';
import CampaignForm from './pages/CampaignForm';
import CampaignList from './pages/CampaignList';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSession = async (nextSession?: any) => {
      const sessionToValidate = nextSession ?? (await supabase.auth.getSession()).data.session;

      if (!sessionToValidate) {
        setSession(null);
        setLoading(false);
        return;
      }

      try {
        await validateAdminSession();
        setSession(sessionToValidate);
      } catch {
        await supabase.auth.signOut();
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    void syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      void syncSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Yukleniyor...
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} />;
  }

  return (
    <Layout onLogout={() => supabase.auth.signOut()}>
      <Routes>
        <Route path="/" element={<CampaignList />} />
        <Route path="/create" element={<CampaignForm />} />
        <Route path="/edit/:id" element={<CampaignForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
