import SignalLine from './SignalLine.jsx';

export default function StatCard({ label, value, delta, trend = [] }) {
  const isUp = typeof delta === 'number' && delta >= 0;

  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {typeof delta === 'number' && (
          <span className={'stat-delta ' + (isUp ? 'up' : 'down')}>
            {isUp ? '▲' : '▼'} {Math.abs(delta)}
          </span>
        )}
      </div>
      {trend.length > 1 && (
        <div className="stat-signal">
          <SignalLine values={trend} color={isUp ? '#159e97' : '#ff5c7a'} />
        </div>
      )}
    </div>
  );
}
