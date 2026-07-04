import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { latestMockSession, listApplications, listResumeVersions } from '../../data/api';
import { supabase } from '../../lib/supabaseClient';
import type { Application, MockSession, ResumeVersion } from '../../types';

// Charts here follow the dataviz method: one series per chart (identity lives in
// the title, so no legend is needed), thin marks with rounded data-ends anchored
// to the baseline, values in text ink rather than series color, recessive grid.

function weekKey(d: Date) {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function Analytics() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [mocks, setMocks] = useState<MockSession[]>([]);
  const [lastMock, setLastMock] = useState<MockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      listApplications(user.id),
      listResumeVersions(user.id),
      supabase.from('mock_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      latestMockSession(user.id),
    ])
      .then(([a, v, m, lm]) => {
        setApps(a);
        setVersions(v);
        setMocks((m.data ?? []) as MockSession[]);
        setLastMock(lm);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Applications per week (last 8 weeks)
  const weekly = useMemo(() => {
    const now = new Date();
    const weeks: { key: string; label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      const key = weekKey(d);
      weeks.push({ key, label: key.slice(5).replace('-', '/'), count: 0 });
    }
    for (const a of apps) {
      const key = weekKey(new Date(a.applied_at));
      const w = weeks.find((x) => x.key === key);
      if (w) w.count++;
    }
    return weeks;
  }, [apps]);

  const funnel = useMemo(() => {
    const total = apps.length;
    const screening = apps.filter((a) => ['screening', 'interview', 'offer'].includes(a.stage)).length;
    const interview = apps.filter((a) => ['interview', 'offer'].includes(a.stage)).length;
    const offer = apps.filter((a) => a.stage === 'offer').length;
    return [
      { label: 'Applied', value: total },
      { label: 'Screening', value: screening },
      { label: 'Interview', value: interview },
      { label: 'Offer', value: offer },
    ];
  }, [apps]);

  const responseRate = apps.length ? Math.round((funnel[1].value / apps.length) * 100) : 0;
  const interviewRate = apps.length ? Math.round((funnel[2].value / apps.length) * 100) : 0;
  const offerRate = apps.length ? Math.round((funnel[3].value / apps.length) * 100) : 0;

  const atsHistory = useMemo(
    () => [...versions].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((v) => v.ats_score),
    [versions]
  );
  const readinessHistory = useMemo(() => mocks.map((m) => m.readiness_score ?? 0), [mocks]);

  if (loading) return <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Crunching your numbers…</div>;

  const maxWeekly = Math.max(1, ...weekly.map((w) => w.count));
  const maxFunnel = Math.max(1, funnel[0].value);

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Analytics</h1>
      <p style={{ color: 'var(--dim)', margin: '0 0 20px', fontSize: 14 }}>Your search, measured — every number computed from your real activity.</p>

      {/* rate tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Applications', value: String(apps.length), note: 'all time' },
          { label: 'Response rate', value: `${responseRate}%`, note: 'reached screening' },
          { label: 'Interview rate', value: `${interviewRate}%`, note: 'reached interviews' },
          { label: 'Offer rate', value: `${offerRate}%`, note: 'converted to offers' },
        ].map((t) => (
          <div key={t.label} className="card3d" style={{ padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--dim)' }}>{t.label}</div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 30, margin: '8px 0 2px' }}>{t.value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{t.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* weekly activity bars */}
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Applications per week</div>
          <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 14 }}>last 8 weeks</div>
          {apps.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>
              Track your first application on the Job Match page and this chart comes alive.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <svg viewBox="0 0 480 150" style={{ width: '100%', height: 'auto', display: 'block' }}>
                {/* recessive baseline */}
                <line x1="0" y1="130" x2="480" y2="130" stroke="var(--border)" strokeWidth="1" />
                {weekly.map((w, i) => {
                  const h = Math.max(4, (w.count / maxWeekly) * 100);
                  const x = 14 + i * 58;
                  return (
                    <g key={w.key} onMouseEnter={() => setHoverBar(i)} onMouseLeave={() => setHoverBar(null)}>
                      {/* invisible hit target taller than the mark */}
                      <rect x={x - 8} y={10} width={46} height={130} fill="transparent" />
                      <rect
                        x={x}
                        y={130 - h}
                        width={30}
                        height={h}
                        rx={4}
                        fill="var(--accent)"
                        opacity={hoverBar === null || hoverBar === i ? 1 : 0.45}
                        style={{ transition: 'opacity .15s' }}
                      />
                      {/* selective direct label: only max week and hovered bar */}
                      {(w.count === maxWeekly || hoverBar === i) && w.count > 0 && (
                        <text x={x + 15} y={124 - h} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
                          {w.count}
                        </text>
                      )}
                      <text x={x + 15} y={145} textAnchor="middle" fontSize="9" fill="var(--faint)">
                        {w.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* funnel */}
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Pipeline funnel</div>
          <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 14 }}>how far applications travel</div>
          {apps.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>No pipeline yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {funnel.map((f) => (
                <div key={f.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>
                    <span>{f.label}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 700 }}>{f.value}</span>
                  </div>
                  <div style={{ height: 14, borderRadius: 5, background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(f.value / maxFunnel) * 100}%`,
                        height: '100%',
                        borderRadius: 5,
                        background: 'var(--accent)',
                        transition: 'width .4s cubic-bezier(.2,.7,.3,1)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ATS score history */}
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>ATS score by résumé version</div>
          <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 14 }}>is each tailoring pass beating the last?</div>
          {atsHistory.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 13, padding: '26px 0', textAlign: 'center' }}>Upload a résumé to start this trend.</div>
          ) : (
            <TrendLine values={atsHistory} color="var(--sky)" />
          )}
        </div>

        {/* readiness trend */}
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Interview readiness over time</div>
          <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 14 }}>
            {lastMock ? `latest: ${lastMock.readiness_score ?? 0}/100` : 'from your scored mock answers'}
          </div>
          {readinessHistory.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 13, padding: '26px 0', textAlign: 'center' }}>
              Score a mock answer in Interview Coach to start this trend.
            </div>
          ) : (
            <TrendLine values={readinessHistory} color="var(--amber)" />
          )}
        </div>
      </div>
    </div>
  );
}

function TrendLine({ values, color }: { values: number[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 440;
  const h = 110;
  const pad = 14;
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const step = (w - pad * 2) / (pts.length - 1);
  const y = (v: number) => h - pad - (Math.max(0, Math.min(100, v)) / 100) * (h - pad * 2);
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${pad + i * step},${y(v)}`).join(' ');
  const last = pts.length - 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* recessive gridline at 50 */}
      <line x1={pad} y1={y(50)} x2={w - pad} y2={y(50)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <circle cx={pad + i * step} cy={y(v)} r={12} fill="transparent" />
          <circle cx={pad + i * step} cy={y(v)} r={hover === i ? 5 : 4} fill={color} stroke="var(--surface)" strokeWidth="2" />
          {/* selective labels: last point always, others on hover */}
          {(i === last || hover === i) && (
            <text x={pad + i * step} y={y(v) - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
              {v}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
