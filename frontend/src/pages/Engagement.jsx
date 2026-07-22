import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';

// Shaped like the response of GET /{media-id}/comments aggregated per commenter,
// across the last 30 posts. Swap for a live query once refreshInsights() runs.
const topCommenters = [
  { username: 'maya.codes', comments: 14, lastComment: '2d ago' },
  { username: 'thecoffeeroute', comments: 11, lastComment: '5d ago' },
  { username: 'dev.ana', comments: 9, lastComment: '1d ago' },
  { username: 'noah.builds', comments: 7, lastComment: '6d ago' },
  { username: 'kite_and_key', comments: 6, lastComment: '3d ago' },
];

const perPost = [
  { post: 'Jul 3', likes: 210, comments: 18 },
  { post: 'Jul 7', likes: 340, comments: 26 },
  { post: 'Jul 12', likes: 180, comments: 12 },
  { post: 'Jul 16', likes: 410, comments: 31 },
  { post: 'Jul 20', likes: 295, comments: 20 },
];

export default function Engagement() {
  return (
    <>
      <PageHeader
        eyebrow="Engagement"
        title="Who's showing up for you"
        description="Comments and reactions across your last 30 posts."
      />

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <StatCard label="Avg. likes / post" value="287" delta={9} trend={[240, 260, 250, 290, 287]} />
        <StatCard label="Avg. comments / post" value="21" delta={2} trend={[18, 22, 12, 31, 21]} />
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 4 }}>Likes & comments per post</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Last 5 posts</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={perPost}>
            <CartesianGrid stroke="#e4e6ec" vertical={false} />
            <XAxis dataKey="post" tick={{ fontSize: 12, fill: '#6b7080' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7080' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip />
            <Bar dataKey="likes" fill="#ff5c7a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="comments" fill="#159e97" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3>Top commenters</h3>
        </div>
        <div className="row-list" style={{ marginTop: 8 }}>
          {topCommenters.map((c, i) => (
            <div className="row-item" key={c.username}>
              <div className="row-avatar">{i + 1}</div>
              <div className="row-main">
                <div className="row-name">@{c.username}</div>
                <div className="row-sub">Last commented {c.lastComment}</div>
              </div>
              <div className="row-meta">{c.comments} comments</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
