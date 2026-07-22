import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';

// Placeholder data shaped exactly like what refreshInsights() will eventually
// write to Firestore at users/{uid}/insights/daily. Swap for a live Firestore
// query once the Cloud Function is deployed and has run at least once.
const growth = [
  { day: 'Jul 1', followers: 4210, engagementRate: 3.1 },
  { day: 'Jul 6', followers: 4265, engagementRate: 3.4 },
  { day: 'Jul 11', followers: 4301, engagementRate: 3.0 },
  { day: 'Jul 16', followers: 4340, engagementRate: 3.8 },
  { day: 'Jul 21', followers: 4398, engagementRate: 3.6 },
];

export default function Dashboard() {
  const trend = growth.map((g) => g.followers);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Your account, at a glance"
        description="Pulled from Instagram's official Graph API — refreshes once a day."
      />

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Followers" value="4,398" delta={88} trend={trend} />
        <StatCard label="New (7d)" value="112" delta={12} trend={[8, 14, 10, 16, 12, 18, 14]} />
        <StatCard label="Lost (7d)" value="24" delta={-3} trend={[5, 4, 6, 3, 4, 2, 3]} />
        <StatCard label="Engagement rate" value="3.6%" delta={0.4} trend={growth.map((g) => g.engagementRate)} />
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 4 }}>Follower growth</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Last 30 days</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={growth}>
            <CartesianGrid stroke="#e4e6ec" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7080' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7080' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip />
            <Line type="monotone" dataKey="followers" stroke="#ff5c7a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
