export default function ProgressBar({ value, width = '100%', showLabel = true }) {
  const pct = Math.round(Math.min(100, Math.max(0, value)))
  return (
    <div className="progress-row" style={{ width }}>
      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <div className="progress-pct">{pct}%</div>}
    </div>
  )
}
