import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ScoreRing } from '../../components/ScoreRing';
import { getMasterResume, listResumeVersions, tailorResume } from '../../data/api';
import type { Resume, ResumeVersion } from '../../types';

export function ResumeStudio() {
  const { user, profile } = useAuth();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [master, setMaster] = useState<Resume | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTailorForm, setShowTailorForm] = useState(false);
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [v, m] = await Promise.all([listResumeVersions(user.id), getMasterResume(user.id)]);
    setVersions(v);
    setMaster(m);
    setSelectedId((prev) => prev ?? v[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selected = versions.find((v) => v.id === selectedId) ?? versions[0] ?? null;

  const downloadPdf = () => {
    if (!selected) return;
    const name = profile?.full_name || 'Your Name';
    const roles = master?.parsed?.roles ?? [];
    const skills = selected.keyword_have ?? [];
    const bullets = selected.bullets ?? [];
    const title = selected.target_role || roles[0]?.title || '';
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — Résumé</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.45; }
  h1 { font-family: Helvetica, Arial, sans-serif; font-size: 26px; margin: 0 0 2px; letter-spacing: -0.01em; }
  .sub { color: #444; font-size: 13px; margin-bottom: 18px; }
  h2 { font-family: Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin: 20px 0 10px; }
  .role { margin-bottom: 10px; }
  .role b { font-size: 14px; }
  .role span { color: #555; font-size: 12.5px; }
  ul { margin: 8px 0 0 18px; padding: 0; }
  li { font-size: 13px; margin-bottom: 6px; }
  .skills { font-size: 13px; }
  .print-hint { text-align:center; font-family: Helvetica, Arial, sans-serif; background:#f3f3f3; padding:10px; border-radius:8px; font-size:12px; color:#555; margin-bottom: 20px; }
  @media print { .print-hint { display: none; } }
</style></head><body>
<div class="print-hint">Press Ctrl+P (or Cmd+P) and choose "Save as PDF" — this box won't be printed.</div>
<h1>${esc(name)}</h1>
<div class="sub">${esc(title)}${selected.target_company ? ' · tailored for ' + esc(selected.target_company) : ''}</div>
${roles.length ? '<h2>Experience</h2>' + roles.map((r) => `<div class="role"><b>${esc(r.title)}</b> — ${esc(r.company)}<br><span>${esc(r.period)}</span></div>`).join('') : ''}
<h2>Key Achievements</h2>
<ul>${bullets.map((b) => `<li>${esc(b.rewrite)}</li>`).join('')}</ul>
${skills.length ? '<h2>Skills</h2><div class="skills">' + skills.map(esc).join(' · ') + '</div>' : ''}
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const handleTailor = async () => {
    if (!role.trim() || !company.trim()) return;
    setTailoring(true);
    setError(null);
    try {
      const version = await tailorResume({ targetRole: role, targetCompany: company });
      setVersions((v) => [version, ...v]);
      setSelectedId(version.id);
      setShowTailorForm(false);
      setRole('');
      setCompany('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTailoring(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Loading Résumé Studio…</div>;

  if (versions.length === 0) {
    return (
      <div className="fu" style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Space Grotesk'" }}>No résumé yet</h2>
        <p style={{ color: 'var(--dim)' }}>Upload a résumé from onboarding to unlock Résumé Studio.</p>
      </div>
    );
  }

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Résumé Studio</h1>
          <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14 }}>
            Viewing · <b style={{ color: 'var(--text)' }}>{selected?.name}</b>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            onClick={downloadPdf}
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '10px 15px', borderRadius: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope' }}
          >
            ⬇ Download PDF
          </button>
          <button
            onClick={() => setShowTailorForm((s) => !s)}
            style={{
              background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
              color: '#fff',
              border: 'none',
              padding: '10px 17px',
              borderRadius: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Manrope',
            }}
          >
            ✦ Auto-tailor
          </button>
        </div>
      </div>

      {showTailorForm && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 14, border: '1px solid var(--border2)', background: 'var(--surface)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Target role e.g. Senior PM" value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle} />
          <input placeholder="Company e.g. Stripe" value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
          <button onClick={handleTailor} disabled={tailoring} style={{ ...primaryBtnStyle, opacity: tailoring ? 0.7 : 1 }}>
            {tailoring ? 'Tailoring with Gemini…' : 'Generate tailored version'}
          </button>
          {error && <div style={{ color: 'var(--rose)', fontSize: 13, width: '100%' }}>{error}</div>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 300px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Versions</div>
          {versions.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              style={{
                padding: '11px 12px',
                borderRadius: 12,
                cursor: 'pointer',
                background: v.id === selected?.id ? 'color-mix(in srgb,var(--accent) 14%,var(--surface))' : 'var(--surface)',
                border: `1px solid ${v.id === selected?.id ? 'var(--border2)' : 'var(--border)'}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                ATS {v.ats_score} · {v.status}
              </div>
            </div>
          ))}
          <div
            onClick={() => setShowTailorForm(true)}
            style={{ padding: 11, borderRadius: 12, border: '1px dashed var(--border2)', color: 'var(--dim)', fontSize: 12.5, textAlign: 'center', cursor: 'pointer' }}
          >
            + New tailored version
          </div>
        </div>

        <div style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', padding: 26, position: 'relative' }}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700 }}>Résumé preview</div>
          <div style={{ color: 'var(--dim)', fontSize: 13, marginBottom: 16 }}>{selected?.target_company ? `Tailored for ${selected.target_company}` : 'Master version'}</div>
          <div style={{ fontSize: 12, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            AI rewrites
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(selected?.bullets ?? []).length === 0 && <div style={{ color: 'var(--dim)', fontSize: 13 }}>No bullets extracted yet.</div>}
            {(selected?.bullets ?? []).map((b, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 12.5, color: 'var(--faint)', textDecoration: 'line-through', paddingLeft: 14 }}>{b.original}</div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: '9px 12px',
                    borderRadius: 9,
                    background: 'linear-gradient(120deg,rgba(52,224,161,.12),transparent)',
                    border: '1px solid rgba(52,224,161,.3)',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'var(--mint)', fontWeight: 700, letterSpacing: '.05em' }}>✦ AI REWRITE</span>
                  <br />
                  {b.rewrite}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>ATS Match</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScoreRing
                size={110}
                strokeWidth={9}
                score={selected?.ats_score ?? 0}
                color="var(--accent)"
                label={<div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 30 }}>{selected?.ats_score ?? 0}</div>}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: -4 }}>of 100</div>
          </div>
          <div style={{ padding: 16, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Keyword coverage</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(selected?.keyword_have ?? []).map((k) => (
                <span key={k} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 20, background: 'rgba(52,224,161,.12)', border: '1px solid rgba(52,224,161,.3)', color: 'var(--mint)' }}>
                  ✓ {k}
                </span>
              ))}
              {(selected?.keyword_missing ?? []).map((k) => (
                <span key={k} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 20, background: 'var(--surface2)', border: '1px dashed var(--border2)', color: 'var(--dim)' }}>
                  + {k}
                </span>
              ))}
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 16, border: '1px solid var(--border2)', background: 'linear-gradient(160deg,rgba(109,94,252,.1),var(--surface))' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>✦ Recruiter's eye</div>
            <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>{selected?.recruiter_tip || 'Tailor a version to get a specific recruiter tip.'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg2)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
  outline: 'none',
  flex: 1,
  minWidth: 160,
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
  color: '#fff',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 10,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Manrope',
  fontSize: 13,
};
