import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScoreRing } from '../../components/ScoreRing';
import {
  getMasterResume,
  getProfile,
  listApplications,
  listJobsWithMatches,
  listUpcomingInterviews,
} from '../../data/api';
import type { Application, Interview, JobWithMatch, Profile, Resume } from '../../types';

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<JobWithMatch[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProfile(), getMasterResume(), listApplications(), listUpcomingInterviews(), listJobsWithMatches()])
      .then(([p, r, a, i, j]) => {
        setProfile(p);
        setResume(r);
        setApplications(a);
        setInterviews(i);
        setJobs(j);
      })
      .finally(() => setLoading(false));
  }, []);

  const stageCounts = useMemo(() => {
    const counts: Record<string, Application[]> = { applied: [], screening: [], interview: [], offer: [] };
    for (const a of applications) if (counts[a.stage]) counts[a.stage].push(a);
    return counts;
  }, [applications]);

  const totalApps = applications.length;
  const advanced = applications.filter((a) => a.stage !== 'applied').length;
  const offers = stageCounts.offer.length;
  const responseRate = totalApps ? Math.round((advanced / totalApps) * 100) : 0;

  const resumeScore = resume?.ats_score ?? 0;
  const pipelineScore = totalApps ? Math.min(100, Math.round((advanced / totalApps) * 60 + Math.min(totalApps, 20) * 2)) : 15;
  const interviewScore = interviews.length ? 60 : 30;
  const careerHealth = Math.round((resumeScore + pipelineScore + interviewScore) / 3);

  const nextActions = useMemo(() => {
    const actions: { icon: string; title: string; sub: string; gain: string }[] = [];
    if (!resume) {
      actions.push({ icon: '📄', title: 'Upload your résumé', sub: 'Unlocks ATS scoring and tailored rewrites', gain: '+40%' });
    } else if (resumeScore < 85) {
      actions.push({ icon: '✦', title: 'Tailor your résumé', sub: `ATS score is ${resumeScore} — quick wins available`, gain: '+15%' });
    }
    const staleScreening = stageCounts.screening.filter((a) => (Date.now() - new Date(a.updated_at).getTime()) / 86400000 >= 3);
    if (staleScreening.length) {
      actions.push({ icon: '✉', title: `Follow up with ${staleScreening[0].company}`, sub: 'Silent 3+ days — momentum fading', gain: '+9%' });
    }
    if (interviews.length) {
      actions.push({ icon: '🎙', title: `Prep for ${interviews[0].company}`, sub: `${interviews[0].kind} round coming up`, gain: '+12%' });
    } else if (jobs.length) {
      actions.push({ icon: '🎯', title: 'Apply to your top match', sub: `${jobs[0].role} at ${jobs[0].company}`, gain: `${jobs[0].match_score ?? '—'}%` });
    }
    return actions.slice(0, 3);
  }, [resume, resumeScore, stageCounts, interviews, jobs]);

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  if (loading) {
    return <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Loading your mission control…</div>;
  }

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, letterSpacing: '-.03em', margin: '0 0 4px' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14.5 }}>
            {totalApps
              ? `${totalApps} applications tracked · ${offers} offer${offers === 1 ? '' : 's'} on the table.`
              : "You're just getting started — let's build your pipeline."}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 22, borderRadius: 18, border: '1px solid var(--border)', background: 'linear-gradient(160deg,rgba(52,224,161,.10),var(--surface))' }}>
          <div style={{ fontSize: 12, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>Career Health Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ScoreRing
              size={96}
              strokeWidth={9}
              score={careerHealth}
              color="var(--mint)"
              label={<div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 28, lineHeight: 1 }}>{careerHealth}</div>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {[
                ['Résumé', resumeScore, 'var(--accent)'],
                ['Pipeline', pipelineScore, 'var(--sky)'],
                ['Interview', interviewScore, 'var(--amber)'],
              ].map(([label, val, color]) => (
                <div key={label as string}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dim)', marginBottom: 3 }}>
                    <span>{label}</span>
                    <span>{val}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'var(--surface2)' }}>
                    <div style={{ width: `${val}%`, height: '100%', borderRadius: 4, background: color as string }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Applications', value: totalApps, delta: totalApps ? `${totalApps} tracked` : 'none yet', color: 'var(--accent2)' },
            { label: 'Interviews', value: interviews.length, delta: interviews.length ? 'upcoming' : 'none scheduled', color: 'var(--sky)' },
            { label: 'Response rate', value: `${responseRate}%`, delta: totalApps ? 'of applications' : '—', color: 'var(--mint)' },
            { label: 'Offers', value: offers, delta: offers ? 'compare now' : 'keep pushing', color: 'var(--amber)' },
          ].map((s) => (
            <div key={s.label} style={{ padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12.5, color: 'var(--dim)' }}>{s.label}</div>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 30, margin: '10px 0 2px' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: s.color, fontWeight: 600 }}>{s.delta}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border2)', background: 'linear-gradient(160deg,rgba(109,94,252,.12),var(--surface))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Next best actions</span>
            <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>ranked by impact</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nextActions.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>You're all caught up. 🎉</div>}
            {nextActions.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 13, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'grid', placeItems: 'center', fontSize: 15, flex: 'none' }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>{a.sub}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mint)', whiteSpace: 'nowrap' }}>{a.gain}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Application pipeline</span>
            <span onClick={() => navigate('/app/tracker')} style={{ fontSize: 12, color: 'var(--accent2)', marginLeft: 'auto', cursor: 'pointer' }}>
              Open board →
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {(['applied', 'screening', 'interview', 'offer'] as const).map((stage) => (
              <div key={stage} style={{ padding: 12, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--dim)', textTransform: 'capitalize' }}>{stage}</span>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 15 }}>{stageCounts[stage]?.length ?? 0}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(stageCounts[stage] ?? []).slice(0, 2).map((app) => (
                    <div key={app.id} style={{ fontSize: 11, padding: '5px 7px', borderRadius: 7, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {app.company}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {interviews.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>Nothing scheduled yet.</div>}
            {interviews.slice(0, 3).map((u) => {
              const d = new Date(u.scheduled_at);
              return (
                <div key={u.id} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <div style={{ fontSize: 9, color: 'var(--faint)', textTransform: 'uppercase' }}>{d.toLocaleString('en', { month: 'short' })}</div>
                    <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.company} · {u.kind}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>{d.toLocaleString('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Fresh matches</span>
            <span onClick={() => navigate('/app/jobs')} style={{ fontSize: 12, color: 'var(--accent2)', marginLeft: 'auto', cursor: 'pointer' }}>
              All →
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>No matches yet.</div>}
            {jobs.slice(0, 3).map((j) => (
              <div key={j.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flex: 'none' }}>
                  {j.logo_text}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.role}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>{j.company}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mint)' }}>{j.match_score != null ? `${j.match_score}%` : '—'}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Target comp</div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700 }}>
            {profile?.target_comp_min && profile?.target_comp_max
              ? `${profile.target_currency} ${Math.round(profile.target_comp_min / 1000)}k–${Math.round(profile.target_comp_max / 1000)}k`
              : 'Upload résumé for an estimate'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8 }}>Based on your résumé and current market data.</div>
        </div>
      </div>
    </div>
  );
}
