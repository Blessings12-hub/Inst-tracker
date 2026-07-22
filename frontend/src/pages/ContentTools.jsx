import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { suggestCaption, suggestHashtags } from '../lib/api.js';

// Derived from the user's own post timestamps vs. per-post reach/engagement.
// Computed server-side in refreshInsights(); this is placeholder shape.
const bestTimes = [
  { day: 'Wed', time: '7:30 PM', score: 'high' },
  { day: 'Sat', time: '11:00 AM', score: 'high' },
  { day: 'Mon', time: '8:00 AM', score: 'medium' },
];

export default function ContentTools() {
  const [topic, setTopic] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  async function handleCaption() {
    if (!topic.trim()) return;
    setLoadingCaption(true);
    try {
      const { data } = await suggestCaption(topic);
      setCaption(data.caption);
    } finally {
      setLoadingCaption(false);
    }
  }

  async function handleHashtags() {
    if (!topic.trim()) return;
    setLoadingTags(true);
    try {
      const { data } = await suggestHashtags(topic);
      setHashtags(data.hashtags ?? []);
    } finally {
      setLoadingTags(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Content tools"
        title="Plan your next post"
        description="Best times come from your own posting history. Captions and hashtags are AI-generated starting points."
      />

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>Best times to post</h3>
        <div className="row-list">
          {bestTimes.map((t) => (
            <div className="row-item" key={t.day + t.time}>
              <div className="row-main">
                <div className="row-name">
                  {t.day} · {t.time}
                </div>
              </div>
              <span className={'badge ' + (t.score === 'high' ? 'badge-teal' : 'badge-amber')}>
                {t.score === 'high' ? 'Best' : 'Good'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 4 }}>Caption & hashtag ideas</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
          Describe what the post is about.
        </p>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. behind the scenes at the studio"
          style={{
            width: '100%',
            padding: '11px 14px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            fontSize: 14,
            marginBottom: 14,
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button className="btn btn-primary btn-sm" onClick={handleCaption} disabled={loadingCaption}>
            {loadingCaption ? 'Writing…' : 'Suggest caption'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleHashtags} disabled={loadingTags}>
            {loadingTags ? 'Thinking…' : 'Suggest hashtags'}
          </button>
        </div>

        {caption && (
          <div className="card card-pad" style={{ marginBottom: 14, background: 'var(--paper)' }}>
            <div className="stat-label" style={{ marginBottom: 6 }}>
              Caption
            </div>
            <p style={{ fontSize: 14, margin: 0 }}>{caption}</p>
          </div>
        )}

        {hashtags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hashtags.map((h) => (
              <span className="badge badge-coral" key={h}>
                #{h}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
