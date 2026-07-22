import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { disconnectInstagram } from '../lib/api.js';

export default function Settings() {
  const { profile, signOut } = useAuth();

  return (
    <>
      <PageHeader eyebrow="Settings" title="Account" />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Connected Instagram account</h3>
        <div className="row-item" style={{ borderTop: 'none', padding: '0 0 14px' }}>
          <div className="row-avatar">{profile?.ig_username?.[0]?.toUpperCase() ?? '?'}</div>
          <div className="row-main">
            <div className="row-name">@{profile?.ig_username ?? 'unknown'}</div>
            <div className="row-sub">{profile?.ig_account_type ?? 'Business'} account</div>
          </div>
          <span className="badge badge-teal">Connected</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => disconnectInstagram()}>
          Disconnect account
        </button>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Session</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </>
  );
}
