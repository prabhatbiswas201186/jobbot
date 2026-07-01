import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractResumeText } from '../lib/resumeParser';
import { analyzeResume, computeJobMatches, getProfile, updateProfile, type AnalyzeResumeResult } from '../data/api';

type Step = 'upload' | 'analyzing' | 'results';

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');

  const [fullName, setFullName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ghUsername, setGhUsername] = useState('');
  const [ghBusy, setGhBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pct, setPct] = useState(0);
  const [result, setResult] = useState<AnalyzeResumeResult | null>(null);
  const [matchedJobCount, setMatchedJobCount] = useState<number | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setFullName(p.full_name || '');
        if (p.onboarding_stage === 'results' || p.onboarding_stage === 'done') navigate('/app');
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async (resumeText: string) => {
    setUploadError(null);
    if (fullName.trim()) await updateProfile({ full_name: fullName.trim() }).catch(() => {});
    setStep('analyzing');
    setPct(0);
    progressTimer.current = setInterval(() => {
      setPct((p) => (p < 90 ? p + Math.random() * 6 : p));
    }, 250);

    try {
      const analysis = await analyzeResume({ resumeText });
      setResult(analysis);
      computeJobMatches()
        .then((r) => setMatchedJobCount(r.matches.length))
        .catch(() => setMatchedJobCount(null));
      if (progressTimer.current) clearInterval(progressTimer.current);
      setPct(100);
      setTimeout(() => setStep('results'), 500);
    } catch (err) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setUploadError((err as Error).message);
      setStep('upload');
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await extractResumeText(file);
      if (text.trim().length < 20) {
        setUploadError("Couldn't read enough text from that file — try pasting your résumé text instead.");
        return;
      }
      await runAnalysis(text);
    } catch {
      setUploadError("Couldn't parse that file — try pasting your résumé text instead.");
    }
  };

  const handleGithubImport = async () => {
    if (!ghUsername.trim()) return;
    setGhBusy(true);
    setUploadError(null);
    try {
      const [profileRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(ghUsername.trim())}`),
        fetch(`https://api.github.com/users/${encodeURIComponent(ghUsername.trim())}/repos?sort=stars&per_page=15`),
      ]);
      if (!profileRes.ok) throw new Error('GitHub user not found.');
      const ghProfile = await profileRes.json();
      const repos = reposRes.ok ? await reposRes.json() : [];
      const repoLines = (repos as { name: string; description: string | null; language: string | null; stargazers_count: number }[])
        .slice(0, 12)
        .map((r) => `- ${r.name}${r.language ? ` (${r.language})` : ''}: ${r.description ?? 'no description'} · ${r.stargazers_count} stars`)
        .join('\n');
      if (!fullName.trim() && ghProfile.name) setFullName(ghProfile.name);
      const text = `${ghProfile.name ?? ghUsername}
${ghProfile.bio ?? ''}
Location: ${ghProfile.location ?? 'n/a'}
Public repos: ${ghProfile.public_repos ?? 0}
Followers: ${ghProfile.followers ?? 0}

Projects:
${repoLines}`;
      await runAnalysis(text);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setGhBusy(false);
    }
  };

  const dot1 = step === 'upload' ? 'var(--surface2)' : 'var(--accent)';
  const dot2 = step === 'results' ? 'var(--accent)' : 'var(--surface2)';
  const circ = 327;
  const analyzeOffset = circ - circ * (pct / 100);
  const analyzeLabel = pct < 40 ? 'Reading your experience…' : pct < 80 ? 'Benchmarking against the market…' : 'Finding your best-fit roles…';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(700px 500px at 50% 0%,rgba(109,94,252,.22),transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', width: '100%', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 26 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17 }}>JobBot</span>
        </div>

        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 34, height: 4, borderRadius: 3, background: 'var(--accent)' }} />
          <div style={{ width: 34, height: 4, borderRadius: 3, background: dot1 }} />
          <div style={{ width: 34, height: 4, borderRadius: 3, background: dot2 }} />
        </div>

        <div style={{ border: '1px solid var(--border2)', borderRadius: 22, background: 'var(--surface)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {step === 'upload' && (
            <div style={{ padding: 36 }} className="fu">
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 6px' }}>Let's meet your career</h2>
              <p style={{ color: 'var(--dim)', margin: '0 0 18px', fontSize: 14.5 }}>Drop your résumé and JobBot builds your entire profile in seconds.</p>

              <input
                placeholder="Your name (optional, personalizes the dashboard)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ ...inputStyle, width: '100%', marginBottom: 16 }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed var(--border2)',
                  borderRadius: 16,
                  padding: 38,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--surface2)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 15,
                    background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 14px',
                    boxShadow: '0 12px 30px -10px var(--glow)',
                  }}
                >
                  <span style={{ fontSize: 22, color: '#fff' }}>↑</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Drop PDF / DOCX — or click to analyze</div>
                <div style={{ color: 'var(--faint)', fontSize: 13, marginTop: 6 }}>Everything stays on your laptop</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowPaste((s) => !s)} style={ghostBtnStyle}>
                  Paste text instead
                </button>
              </div>

              {showPaste && (
                <div style={{ marginTop: 14 }}>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your résumé text here…"
                    rows={6}
                    style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => pastedText.trim() && runAnalysis(pastedText)} style={{ ...primaryBtnStyle, marginTop: 10, width: '100%' }}>
                    Analyze pasted résumé →
                  </button>
                </div>
              )}

              <div style={{ marginTop: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Or import from GitHub</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="github username"
                    value={ghUsername}
                    onChange={(e) => setGhUsername(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={handleGithubImport} disabled={ghBusy} style={{ ...primaryBtnStyle, opacity: ghBusy ? 0.7 : 1 }}>
                    {ghBusy ? '…' : 'Import'}
                  </button>
                </div>
              </div>

              {uploadError && <div style={{ color: 'var(--rose)', fontSize: 13, marginTop: 12 }}>{uploadError}</div>}
            </div>
          )}

          {step === 'analyzing' && (
            <div style={{ padding: '44px 36px', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 22px' }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface2)" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={analyzeOffset}
                    style={{ transition: 'stroke-dashoffset .3s' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 30 }}>
                  {Math.round(pct)}%
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Space Grotesk'" }}>{analyzeLabel}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22, textAlign: 'left', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
                {[
                  ['Reading your résumé with Gemini', 20],
                  ['Scoring ATS match & keywords', 55],
                  ['Ranking live openings for you', 85],
                ].map(([label, threshold]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: pct > (threshold as number) ? 'var(--mint)' : 'var(--faint)' }}>
                    <span>{pct > (threshold as number) ? '✓' : '○'}</span> {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'results' && result && (
            <div style={{ padding: 36 }} className="fu">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
                <div style={{ position: 'relative', width: 84, height: 84, flex: 'none' }}>
                  <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="42" cy="42" r="36" fill="none" stroke="var(--surface2)" strokeWidth="8" />
                    <circle
                      cx="42"
                      cy="42"
                      r="36"
                      fill="none"
                      stroke="var(--mint)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="226"
                      strokeDashoffset={226 - 226 * (result.atsScore / 100)}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 24 }}>
                    {result.atsScore}
                  </div>
                </div>
                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 23, margin: '0 0 4px', letterSpacing: '-.02em' }}>
                    Meet your baseline{fullName ? `, ${fullName.split(' ')[0]}` : ''}
                  </h2>
                  <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14 }}>
                    {result.atsScore >= 60 ? 'Above average' : 'A solid start'} — and JobBot sees{' '}
                    <b style={{ color: 'var(--mint)' }}>{result.skillGaps.length} quick wins</b>.
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700 }}>{matchedJobCount ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>matched jobs</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>{result.skillGaps.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>skill gaps</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, color: 'var(--sky)' }}>
                    ${Math.round(result.targetCompMax / 1000)}k
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>target comp</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/app')}
                style={{ ...primaryBtnStyle, width: '100%', padding: 15, fontSize: 16, boxShadow: '0 14px 36px -12px var(--glow)' }}
              >
                Enter Mission Control →
              </button>
            </div>
          )}
        </div>
        {step === 'upload' && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <span onClick={() => navigate('/app')} style={{ color: 'var(--faint)', fontSize: 13, cursor: 'pointer' }}>
              Skip — explore the workspace
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg2)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  padding: '12px 14px',
  borderRadius: 11,
  fontSize: 14,
  outline: 'none',
};

const ghostBtnStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  padding: 12,
  borderRadius: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Manrope',
  fontSize: 13,
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
  color: '#fff',
  border: 'none',
  padding: '12px 16px',
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Manrope',
};
