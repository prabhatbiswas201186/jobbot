import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { computeJobMatches, createApplication, listJobsWithMatches, searchLiveJobs } from '../../data/api';
import type { JobRegion, JobWithMatch } from '../../types';

const regions: { value: JobRegion | 'all'; label: string }[] = [
  { value: 'all', label: 'All regions' },
  { value: 'india', label: 'India' },
  { value: 'uae', label: 'UAE' },
  { value: 'saudi', label: 'Saudi Arabia' },
  { value: 'remote-intl', label: 'Remote (Intl)' },
];

export function JobMatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithMatch[]>([]);
  const [region, setRegion] = useState<JobRegion | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [searchRole, setSearchRole] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const j = await listJobsWithMatches(user.id, region === 'all' ? undefined : region);
    setJobs(j);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, region]);

  const handleSearch = async () => {
    if (!searchRole.trim()) return;
    setSearching(true);
    setSearchErr(null);
    setSearchMsg(null);
    try {
      const res = await searchLiveJobs({ query: searchRole, location: searchLocation });
      setSearchMsg(`Found ${res.count} live job${res.count === 1 ? '' : 's'} for "${res.query}". Hit "Refresh AI match scores" to rank them.`);
      setRegion('all');
      await load();
    } catch (err) {
      setSearchErr((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleComputeMatches = async () => {
    setMatching(true);
    try {
      await computeJobMatches(region === 'all' ? undefined : region);
      await load();
    } finally {
      setMatching(false);
    }
  };

  const handleApply = async (job: JobWithMatch) => {
    if (!user) return;
    setApplyingId(job.id);
    try {
      await createApplication({
        user_id: user.id,
        job_id: job.id,
        role: job.role,
        company: job.company,
        logo_text: job.logo_text,
        stage: 'applied',
        tag: 'New',
        tag_color: 'var(--sky)',
        source: 'manual',
        offer_amount: null,
      });
      navigate('/app/tracker');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Job Match</h1>
          <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14 }}>
            {jobs.length} live roles across India, UAE, Saudi Arabia &amp; remote — ranked by your real odds.
          </p>
        </div>
        <button onClick={handleComputeMatches} disabled={matching} style={{ ...primaryBtnStyle, opacity: matching ? 0.7 : 1 }}>
          {matching ? 'Scoring with Gemini…' : '✦ Refresh AI match scores'}
        </button>
      </div>

      {/* live search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={searchRole}
          onChange={(e) => setSearchRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search a role — e.g. Product Manager"
          style={{ flex: '2 1 240px', background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '11px 14px', borderRadius: 11, fontSize: 14, outline: 'none' }}
        />
        <input
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Location (optional) — e.g. Bangalore, Dubai, Remote"
          style={{ flex: '1 1 180px', background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '11px 14px', borderRadius: 11, fontSize: 14, outline: 'none' }}
        />
        <button onClick={handleSearch} disabled={searching} style={{ ...primaryBtnStyle, opacity: searching ? 0.7 : 1 }}>
          {searching ? 'Searching…' : 'Search live jobs'}
        </button>
      </div>
      {searchMsg && <div style={{ color: 'var(--mint)', fontSize: 13, marginBottom: 14 }}>{searchMsg}</div>}
      {searchErr && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 14 }}>{searchErr}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {regions.map((r) => (
          <button
            key={r.value}
            onClick={() => setRegion(r.value)}
            style={{
              padding: '7px 13px',
              borderRadius: 20,
              fontSize: 12.5,
              cursor: 'pointer',
              border: `1px solid ${region === r.value ? 'var(--accent)' : 'var(--border2)'}`,
              background: region === r.value ? 'color-mix(in srgb,var(--accent) 16%,transparent)' : 'var(--surface)',
              color: region === r.value ? 'var(--text)' : 'var(--dim)',
              fontFamily: 'Manrope',
              fontWeight: 600,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Loading jobs…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map((j) => (
            <div key={j.id} className="card3d" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17, flex: 'none' }}>
                {j.logo_text}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{j.role}</span>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                    {j.company} · {j.location}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                  {j.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontSize: 13, color: 'var(--sky)', fontWeight: 600 }}>
                  {j.salary_min && j.salary_max ? `${j.currency} ${j.salary_min.toLocaleString()}–${j.salary_max.toLocaleString()}` : 'Comp on request'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end', marginTop: 5 }}>
                  <div style={{ width: 52, height: 6, borderRadius: 4, background: 'var(--surface2)' }}>
                    <div style={{ width: `${j.match_score ?? 0}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),var(--mint))' }} />
                  </div>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 14 }}>{j.match_score != null ? `${j.match_score}%` : '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                {j.url && (
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: 'var(--text)', color: 'var(--bg)', border: 'none', padding: '10px 15px', borderRadius: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Apply →
                  </a>
                )}
                <button
                  onClick={() => handleApply(j)}
                  disabled={applyingId === j.id}
                  style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border2)', padding: '10px 15px', borderRadius: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope', whiteSpace: 'nowrap' }}
                >
                  {applyingId === j.id ? 'Adding…' : 'Track'}
                </button>
              </div>
            </div>
          ))}
          {jobs.length === 0 && <div style={{ color: 'var(--dim)', textAlign: 'center', padding: 40 }}>No listings in this region yet.</div>}
        </div>
      )}
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
  color: '#fff',
  border: 'none',
  padding: '11px 18px',
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Manrope',
  boxShadow: '0 12px 30px -12px var(--glow)',
};
