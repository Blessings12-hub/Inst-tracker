import { NavLink } from 'react-router-dom';
import SignalLine from './SignalLine.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/engagement', label: 'Engagement' },
  { to: '/content', label: 'Content tools' },
  { to: '/premium', label: 'Premium' },
  { to: '/settings', label: 'Settings' },
];

export default function NavBar() {
  const { profile } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-brand">
        <SignalLine values={[3, 8, 5, 11, 7, 14, 9]} width={30} height={18} color="#ff5c7a" />
        inst-tracker
      </div>
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          <span className="label">{link.label}</span>
        </NavLink>
      ))}
      <div className="nav-footer">
        {profile?.ig_username ? `@${profile.ig_username}` : 'Not connected'}
      </div>
    </nav>
  );
}
