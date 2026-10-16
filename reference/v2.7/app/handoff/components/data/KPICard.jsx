import React from 'react';

const css = `
.os-kpi{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  padding:var(--space-5) var(--space-6);display:flex;flex-direction:column;gap:4px;font-family:var(--font-sans);box-sizing:border-box;}
.os-kpi__label{font-size:var(--text-label-s-size);line-height:var(--text-label-s-line);font-weight:500;letter-spacing:0.2px;color:var(--text-secondary);}
.os-kpi__row{display:flex;align-items:baseline;gap:8px;}
.os-kpi__value{font-size:var(--text-numeric-l-size);line-height:var(--text-numeric-l-line);font-weight:600;
  font-variant-numeric:tabular-nums;color:var(--text-primary);}
.os-kpi__unit{font-size:var(--text-caption-size);color:var(--text-secondary);}
.os-kpi__delta{font-size:var(--text-label-s-size);font-weight:500;display:inline-flex;align-items:center;gap:2px;}
.os-kpi__delta--up{color:var(--sky-600);}
.os-kpi__delta--down{color:var(--orange-600);}
.os-kpi__period{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.os-kpi__spark{margin-top:6px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-kpi-css')) {
  const s = document.createElement('style'); s.id = 'os-kpi-css'; s.textContent = css; document.head.appendChild(s);
}

/** KPI card: label → tabular value → delta (sky ▲ / orange ▼ — up isn't always "good") → sparkline. */
export function KPICard({ label, value, unit, delta, period, spark, style, className }) {
  const empty = value == null;
  const up = typeof delta === 'number' ? delta >= 0 : null;
  return (
    <div className={`os-kpi${className ? ' ' + className : ''}`} style={style}>
      <span className="os-kpi__label">{label}</span>
      <span className="os-kpi__row">
        <span className="os-kpi__value">{empty ? '—' : value}</span>
        {unit && !empty ? <span className="os-kpi__unit">{unit}</span> : null}
        {up != null && !empty ? (
          <span className={`os-kpi__delta os-kpi__delta--${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(delta)}%</span>
        ) : null}
      </span>
      {empty
        ? <span className="os-kpi__period">No data for this period</span>
        : period ? <span className="os-kpi__period">{period}</span> : null}
      {Array.isArray(spark) && spark.length > 1 && !empty ? (
        <svg className="os-kpi__spark" width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            fill="none" stroke="var(--data-1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
            points={spark.map((v, i) => {
              const min = Math.min.apply(null, spark), max = Math.max.apply(null, spark);
              const y = max === min ? 16 : 29 - ((v - min) / (max - min)) * 26;
              return (i / (spark.length - 1)) * 100 + ',' + y.toFixed(1);
            }).join(' ')}
          />
        </svg>
      ) : null}
    </div>
  );
}
