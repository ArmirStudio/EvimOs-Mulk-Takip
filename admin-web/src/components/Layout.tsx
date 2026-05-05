import { NavLink } from 'react-router-dom';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onLogout: () => void;
}

export default function Layout({ children, onLogout }: Props) {
  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-brand">
          EstateFlow
          <small>Reklam Yönetimi</small>
        </div>
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="material-icons">campaign</span>
          Kampanyalar
        </NavLink>
        <NavLink to="/create" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="material-icons">add_circle</span>
          Yeni Kampanya
        </NavLink>
        <div style={{ flex: 1 }} />
        <button onClick={onLogout}>
          <span className="material-icons">logout</span>
          Cikis Yap
        </button>
      </nav>
      <main className="main">
        {children}
      </main>
    </div>
  );
}
