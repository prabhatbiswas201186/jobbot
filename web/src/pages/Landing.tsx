import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export function Landing() {
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const goOnboard = () => navigate('/onboarding');
  const goApp = () => navigate(user ? '/app' : '/onboarding');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(900px 500px at 70% -8%,rgba(109,94,252,.30),transparent 60%),radial-gradient(700px 500px at 8% 12%,rgba(52,224,161,.12),transparent 55%)',
            zIndex: 0,
          }}
        />

        {/* nav */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(18px)',
            background: 'color-mix(in srgb,var(--bg) 72%,transparent)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '15px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 6px 18px -6px var(--glow)',
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: 4, background: '#fff', opacity: 0.95 }} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, letterSpacing: '-.02em' }}>JobBot</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  color: 'var(--accent2)',
                  border: '1px solid var(--border2)',
                  padding: '2px 7px',
                  borderRadius: 20,
                }}
              >
                OS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <div style={{ display: 'flex', gap: 26, fontSize: 14, color: 'var(--dim)' }}>
                <span>Product</span>
                <span>Modules</span>
                <span>Pricing</span>
                <span>Manifesto</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={toggleTheme}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border2)',
                    color: 'var(--text)',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                  }}
                >
                  {dark ? '☾' : '☀'}
                </button>
                <button
                  onClick={goOnboard}
                  style={{
                    background: 'var(--text)',
                    color: 'var(--bg)',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 11,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'Manrope',
                  }}
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* hero */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '76px 26px 40px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 15px',
              border: '1px solid var(--border2)',
              borderRadius: 30,
              background: 'var(--surface)',
              fontSize: 13,
              color: 'var(--dim)',
              marginBottom: 30,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--mint)',
                boxShadow: '0 0 10px var(--mint)',
                animation: 'pulseGlow 2s infinite',
              }}
            />
            The AI career operating system · v1 now live
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk'",
              fontWeight: 700,
              fontSize: 'clamp(40px,7vw,84px)',
              lineHeight: 0.98,
              letterSpacing: '-.035em',
              margin: '0 auto',
              maxWidth: '15ch',
            }}
          >
            From{' '}
            <span
              style={{
                background: 'linear-gradient(120deg,var(--accent),var(--accent2) 60%,var(--sky))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              “I need a job”
            </span>{' '}
            to “I accepted.”
          </h1>
          <p style={{ fontSize: 'clamp(16px,2vw,21px)', color: 'var(--dim)', maxWidth: '60ch', margin: '26px auto 0', lineHeight: 1.5 }}>
            One intelligent system that finds, tailors, tracks, and wins your next role. JobBot doesn't wait for prompts — it runs your career while you
            sleep.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 34, flexWrap: 'wrap' }}>
            <button
              onClick={goOnboard}
              style={{
                background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                color: '#fff',
                border: 'none',
                padding: '15px 28px',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 14px 40px -12px var(--glow)',
                fontFamily: 'Manrope',
              }}
            >
              Analyze my resume — free →
            </button>
            <button
              onClick={goApp}
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border2)',
                padding: '15px 24px',
                borderRadius: 14,
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                fontFamily: 'Manrope',
              }}
            >
              See the live dashboard
            </button>
          </div>
          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--faint)' }}>No credit card · Import from LinkedIn, PDF, or GitHub · 40 sec setup</div>
        </div>

        {/* product preview */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '34px auto 0', padding: '0 26px' }}>
          <div
            style={{
              borderRadius: 20,
              border: '1px solid var(--border2)',
              background: 'linear-gradient(180deg,var(--surface),var(--bg2))',
              boxShadow: '0 50px 120px -40px rgba(0,0,0,.7)',
              overflow: 'hidden',
              animation: 'floaty 7s ease-in-out infinite',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
              <div
                style={{
                  marginLeft: 14,
                  flex: 1,
                  maxWidth: 340,
                  height: 24,
                  borderRadius: 7,
                  background: 'var(--surface2)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 11px',
                  fontSize: 12,
                  color: 'var(--faint)',
                }}
              >
                ⌘K Ask JobBot anything…
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '.9fr 1.35fr .95fr', gap: 1, background: 'var(--border)', minHeight: 340 }}>
              <div style={{ background: 'var(--bg2)', padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
                  Career health
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative', width: 76, height: 76 }}>
                    <svg width="76" height="76" viewBox="0 0 76 76">
                      <circle cx="38" cy="38" r="32" fill="none" stroke="var(--surface2)" strokeWidth="8" />
                      <circle
                        cx="38"
                        cy="38"
                        r="32"
                        fill="none"
                        stroke="var(--mint)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="201"
                        strokeDashoffset="42"
                        transform="rotate(-90 38 38)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 20 }}>
                      79
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.4 }}>
                    Strong &amp; rising.
                    <br />
                    <span style={{ color: 'var(--mint)', fontWeight: 600 }}>+6 this week</span>
                  </div>
                </div>
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ height: 9, borderRadius: 6, background: 'linear-gradient(90deg,var(--accent) 72%,var(--surface2) 72%)' }} />
                  <div style={{ height: 9, borderRadius: 6, background: 'linear-gradient(90deg,var(--sky) 54%,var(--surface2) 54%)' }} />
                  <div style={{ height: 9, borderRadius: 6, background: 'linear-gradient(90deg,var(--amber) 88%,var(--surface2) 88%)' }} />
                </div>
              </div>
              <div style={{ background: 'var(--bg2)', padding: 20, position: 'relative' }}>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
                  Next best actions · AI
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div
                    style={{
                      padding: '12px 13px',
                      borderRadius: 11,
                      background: 'linear-gradient(120deg,rgba(109,94,252,.16),transparent)',
                      border: '1px solid var(--border2)',
                      fontSize: 13,
                    }}
                  >
                    <b>Tailor résumé</b> for the Stripe PM role — <span style={{ color: 'var(--mint)' }}>+18% match</span> predicted
                  </div>
                  <div style={{ padding: '12px 13px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13 }}>
                    Send a follow-up to Figma recruiter (3 days silent)
                  </div>
                  <div style={{ padding: '12px 13px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13 }}>
                    Prep behavioral round — mock ready for Vercel
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    right: 14,
                    bottom: 14,
                    pointerEvents: 'none',
                    height: 1,
                    background: 'linear-gradient(90deg,transparent,var(--accent),transparent)',
                    animation: 'pulseGlow 2.4s infinite',
                  }}
                />
              </div>
              <div style={{ background: 'var(--bg2)', padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Pipeline</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                  {[
                    ['Applied', 31, 'var(--text)'],
                    ['Screening', 12, 'var(--text)'],
                    ['Interview', 8, 'var(--sky)'],
                    ['Offer', 2, 'var(--mint)'],
                  ].map(([label, count, color]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dim)' }}>
                      <span>{label}</span>
                      <b style={{ color: color as string }}>{count}</b>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, height: 70, display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                  {[30, 52, 44, 70, 88, 100].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        borderRadius: 4,
                        background:
                          i < 3
                            ? 'var(--surface2)'
                            : i < 5
                            ? 'linear-gradient(var(--accent2),var(--accent))'
                            : 'linear-gradient(var(--mint),#1fae7c)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* trust */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '56px auto 0', padding: '0 26px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--faint)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 20 }}>
            Members have landed offers at
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '34px 46px',
              fontFamily: "'Space Grotesk'",
              fontWeight: 600,
              fontSize: 19,
              color: 'var(--dim)',
              opacity: 0.85,
            }}
          >
            {['Stripe', 'Figma', 'Vercel', 'Notion', 'Linear', 'Ramp', 'Airbnb'].map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>

        {/* features bento */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '88px auto 0', padding: '0 26px' }}>
          <div style={{ textAlign: 'center', marginBottom: 38 }}>
            <div style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              One system · every stage
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.03em', margin: '10px 0 0' }}>
              Your entire career, on autopilot
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gridAutoRows: 'minmax(150px,auto)', gap: 16 }}>
            <div
              style={{
                gridRow: 'span 2',
                padding: 26,
                borderRadius: 18,
                border: '1px solid var(--border)',
                background: 'linear-gradient(160deg,rgba(109,94,252,.14),var(--surface))',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 16,
                  boxShadow: '0 8px 20px -8px var(--glow)',
                }}
              >
                <span style={{ color: '#fff', fontSize: 18 }}>◆</span>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 22, margin: '0 0 8px', letterSpacing: '-.02em' }}>Résumé Intelligence</h3>
              <p style={{ color: 'var(--dim)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>
                Upload once. JobBot rewrites every bullet into quantified, ATS-proof achievements — then keeps a tailored version for each role you touch.
              </p>
              <div style={{ marginTop: 22, border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 8 }}>BEFORE → AFTER</div>
                <div style={{ fontSize: 12.5, color: 'var(--faint)', textDecoration: 'line-through', marginBottom: 6 }}>
                  Worked on the payments team
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  Cut checkout latency 38%, unlocking <span style={{ color: 'var(--mint)' }}>$2.1M</span> ARR across 4 markets
                </div>
              </div>
            </div>
            {[
              ['🎯', 'Job Matching', 'Ranked by real fit — skills, comp, culture, and your odds of an interview.'],
              ['🎙️', 'Interview Coach', 'Live mock rounds with instant feedback on STAR, filler words, and signal.'],
              ['💸', 'Salary Negotiation', null],
            ].map(([icon, title, desc]) => (
              <div key={title as string} style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, margin: '0 0 6px' }}>{title}</h3>
                <p style={{ color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                  {desc ?? (
                    <>
                      Market data + scripts that have added <b style={{ color: 'var(--text)' }}>$14k avg</b> to member offers.
                    </>
                  )}
                </p>
              </div>
            ))}
            <div style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', background: 'linear-gradient(160deg,rgba(52,224,161,.14),var(--surface))' }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>🛰️</div>
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, margin: '0 0 6px' }}>Autopilot Agent</h3>
              <p style={{ color: 'var(--dim)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                Finds roles, drafts tailored applications, and queues them for your one-tap approval.
              </p>
            </div>
          </div>
        </div>

        {/* pricing */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '96px auto 0', padding: '0 26px' }}>
          <div style={{ textAlign: 'center', marginBottom: 38 }}>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.03em', margin: 0 }}>
              Priced to pay for itself
            </h2>
            <p style={{ color: 'var(--dim)', margin: '12px 0 0' }}>One offer covers a decade of membership.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            <div style={{ padding: 26, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dim)' }}>Free</div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 38, fontWeight: 700, margin: '8px 0 2px' }}>₹0</div>
              <div style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 18 }}>Get your score</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, color: 'var(--dim)' }}>
                <span>✓ Résumé + ATS analysis</span>
                <span>✓ 5 tailored versions</span>
                <span>✓ Job matching</span>
              </div>
            </div>
            <div
              style={{
                padding: 26,
                borderRadius: 18,
                border: '1px solid var(--accent)',
                background: 'linear-gradient(180deg,rgba(109,94,252,.16),var(--surface))',
                position: 'relative',
                boxShadow: '0 24px 60px -24px var(--glow)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -11,
                  right: 20,
                  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 11px',
                  borderRadius: 20,
                }}
              >
                MOST POPULAR
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent2)' }}>Pro</div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 38, fontWeight: 700, margin: '8px 0 2px' }}>
                ₹1,999<span style={{ fontSize: 15, color: 'var(--faint)', fontWeight: 500 }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 18 }}>The full OS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, color: 'var(--dim)' }}>
                <span>✓ Unlimited tailoring + agent</span>
                <span>✓ Live mock interviews</span>
                <span>✓ Negotiation war-room</span>
                <span>✓ Full analytics</span>
              </div>
              <button
                onClick={goOnboard}
                style={{
                  marginTop: 20,
                  width: '100%',
                  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                  color: '#fff',
                  border: 'none',
                  padding: 12,
                  borderRadius: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Manrope',
                }}
              >
                Start Pro trial
              </button>
            </div>
            <div style={{ padding: 26, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dim)' }}>Teams</div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 38, fontWeight: 700, margin: '8px 0 2px' }}>Custom</div>
              <div style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 18 }}>Coaches &amp; universities</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, color: 'var(--dim)' }}>
                <span>✓ Cohort dashboards</span>
                <span>✓ Recruiter portal</span>
                <span>✓ SSO + API</span>
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1120,
            margin: '88px auto 0',
            padding: '40px 26px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>JobBot</span>
            <span style={{ color: 'var(--faint)', fontSize: 13 }}>© 2026 · Design the future of work</span>
          </div>
          <div style={{ display: 'flex', gap: 22, color: 'var(--dim)', fontSize: 13.5 }}>
            <span>Manifesto</span>
            <span>Careers</span>
            <span>Privacy</span>
            <span>X / Twitter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
