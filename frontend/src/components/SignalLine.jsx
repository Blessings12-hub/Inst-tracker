/**
 * SignalLine — the app's recurring motif.
 * A small tick-mark pulse, like a seismograph reading of an account's
 * activity. Used in the nav mark and next to every stat card so the
 * "signal" idea (who's active, who's gone quiet) is felt everywhere,
 * not just on the growth chart.
 */
export default function SignalLine({ values = [], width = 72, height = 20, color = '#ff5c7a' }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / (values.length - 1 || 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
