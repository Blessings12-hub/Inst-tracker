import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FREE = ['Follower & engagement dashboard', 'Top commenters (last 30 posts)', 'Best posting time', '30-day history'];
const PREMIUM = [
  'AI caption & hashtag suggestions',
  'Weekly email report (PDF)',
  '6-month history + month-over-month compare',
  'Track up to 3 Instagram accounts',
];

export default function Premium() {
  const { profile } = useAuth();
  const isPremium = profile?.plan === 'premium';

  return (
    <>
      <PageHeader
        eyebrow="Premium"
        title={isPremium ? "You're on Premium" : 'Go further with Premium'}
        description="$9/month. Cancel anytime."
      />

      <div className="grid grid-2">
        <div className="card card-pad">
          <h3 style={{ marginBottom: 4 }}>Free</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>1 account</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            {FREE.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="card card-pad" style={{ borderColor: 'var(--coral)' }}>
          <h3 style={{ marginBottom: 4 }}>Premium — $9/mo</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Up to 3 accounts</p>
          <ul style={{ margin: '0 0 18px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            {PREMIUM.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {!isPremium && (
            // TODO: wire this up to a Stripe Checkout session (see README "Billing" section).
            <button className="btn btn-coral" style={{ width: '100%' }} onClick={() => alert('Connect Stripe Checkout here')}>
              Upgrade to Premium
            </button>
          )}
        </div>
      </div>
    </>
  );
}
