import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generateCareerPath, getCareerPath, saveSkillProgress } from '../../data/api';
import type { CareerPathData, SkillRoadmapItem } from '../../types';

export function CareerPath() {
  const { user } = useAuth();
  const [data, setData] = useState<CareerPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getCareerPath(user.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      setData(await generateCareerPath());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleSkill = async (index: number) => {
    if (!data) return;
    const updated: SkillRoadmapItem[] = data.skill_roadmap.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    setData({ ...data, skill_roadmap: updated });
    await saveSkillProgress(data.id, updated);
  };

  if (loading) return <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Loading your map…</div>;

  const doneCount = data?.skill_roadmap.filter((s) => s.done).length ?? 0;

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Career Path</h1>
          <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14 }}>
            {data ? 'Three realistic futures, mapped from your résumé.' : 'Where your résumé can take you — mapped by AI.'}
          </p>
        </div>
        <button onClick={generate} disabled={generating} style={{ ...primaryBtnStyle, opacity: generating ? 0.7 : 1 }}>
          {generating ? 'Mapping your future…' : data ? '↻ Regenerate map' : '✦ Map my career'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {!data && !generating && (
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧭</div>
          <p style={{ color: 'var(--dim)', fontSize: 14.5, lineHeight: 1.6 }}>
            One click and Gemini reads your résumé to chart 3 realistic career paths — with milestones, timelines, and a skill
            roadmap you can tick off as you grow.
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>
            {data.paths.map((p, i) => (
              <div
                key={i}
                className="card3d"
                style={{
                  padding: 20,
                  borderRadius: 18,
                  border: '1px solid var(--border)',
                  background: i === 0 ? 'linear-gradient(160deg,rgba(109,94,252,.12),var(--surface))' : 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', border: '1px solid var(--border2)', padding: '2px 8px', borderRadius: 14 }}>
                    {p.timeline}
                  </span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 17, fontWeight: 700, marginBottom: 6, letterSpacing: '-.01em' }}>{p.title}</div>
                <p style={{ color: 'var(--dim)', fontSize: 13, lineHeight: 1.55, margin: '0 0 14px' }}>{p.summary}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {p.milestones.map((m, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 4 }} />
                        {j < p.milestones.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '2px 0' }} />}
                      </div>
                      <div style={{ paddingBottom: j < p.milestones.length - 1 ? 12 : 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--faint)' }}>{m.when}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Skill roadmap</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--mint)', fontWeight: 600 }}>
                {doneCount}/{data.skill_roadmap.length} done
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
              {data.skill_roadmap.map((s, i) => (
                <div
                  key={i}
                  onClick={() => toggleSkill(i)}
                  style={{
                    display: 'flex',
                    gap: 11,
                    padding: 13,
                    borderRadius: 12,
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    opacity: s.done ? 0.55 : 1,
                    transition: 'opacity .2s',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${s.done ? 'var(--mint)' : 'var(--border2)'}`,
                      background: s.done ? 'var(--mint)' : 'transparent',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      marginTop: 2,
                    }}
                  >
                    {s.done && <span style={{ color: '#04121c', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: s.done ? 'line-through' : 'none' }}>{s.skill}</div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.45, margin: '3px 0' }}>{s.why}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--sky)' }}>→ {s.resource}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
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
