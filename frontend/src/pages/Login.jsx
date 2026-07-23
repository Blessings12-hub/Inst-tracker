import logo from '../assets/logo.png';
import { buildInstagramConnectUrl } from '../lib/api.js';

const SCOPES = [
  ['Follower & engagement insights', 'Growth chart, reach, impressions, per-post metrics'],
  ['Comments on your posts', 'Top commenters, engagement rate'],
  ['Basic profile', 'Username, account type, profile photo'],
];

export default function Login() {
  const connectUrl = buildInstagramConnectUrl();

  return (
    <div className="login-screen">
      <div className="card login-card">
        <img src={logo} alt="inst-tracker" width={72} height={72} style={{ borderRadius: 18 }} />
        <h1>Connect your Instagram</h1>
        <p>
          inst-tracker reads insights Instagram's own app doesn't surface clearly —
          growth trends, engagement, and your best-performing content. Requires a
          Business or Creator account linked to a Facebook Page.
        </p>

        <ul className="login-scopes">
          {SCOPES.map(([title, sub]) => (
            <li key={title}>
              <span style={{ color: 'var(--teal)' }}>✓</span>
              <span>
                <strong>{title}</strong>
                <br />
                <span style={{ color: 'var(--muted)' }}>{sub}</span>
              </span>
            </li>
          ))}
        </ul>

        <a className="btn btn-primary" style={{ width: '100%' }} href={connectUrl}>
          Connect with Facebook
        </a>
        <p style={{ marginTop: 16, fontSize: 12 }}>
          Instagram login goes through Meta's official Graph API — we never ask
          for your Instagram password.
        </p>
      </div>
    </div>
  );
}
