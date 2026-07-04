import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNegotiationPlan, listApplications } from '../../data/api';
import type { Application, NegotiationPlan } from '../../types';

export function Negotiation() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [plan, setPlan] = useState<NegotiationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    listApplications(user.id)
      .then((apps) => {
        const offerApps = apps.filter((a) => a.stage === 'offer');
        setOffers(offerApps);
        setSelected(offerApps[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setPlan(null);
    try {
      setPlan(await getNegotiationPlan({ applicationId: selected.id }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const copyEmail = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(plan.emailDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (loading) return <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Loading your offers…</div>;

  if (offers.length === 0) {
    return (
      <div className="fu" style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
        <h2 style={{ fontFamily: "'Space Grotesk'", margin: '0 0 8px' }}>The war-room opens when an offer lands</h2>
        <p style={{ color: 'var(--dim)', fontSize: 14.5, lineHeight: 1.6 }}>
          Drag an application into the <b style={{ color: 'var(--text)' }}>Offer</b> column on the Tracker (and record the amount) —
          then come back here for a market verdict, a counter-offer number, and a word-for-word script.
        </p>
      </div>
    );
  }

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Negotiation</h1>
          <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14 }}>
            {offers.length} offer{offers.length === 1 ? '' : 's'} on the table. Never take the first number.
          </p>
        </div>
        <button onClick={generate} disabled={generating || !selected} style={{ ...primaryBtnStyle, opacity: generating ? 0.7 : 1 }}>
          {generating ? 'Building your war-room…' : '✦ Build negotiation plan'}
        </button>
      </div>

      {/* offer cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {offers.map((o) => (
          <div
            key={o.id}
            className="card3d"
            onClick={() => {
              setSelected(o);
              setPlan(null);
            }}
            style={{
              padding: 18,
              borderRadius: 16,
              cursor: 'pointer',
              border: `1px solid ${selected?.id === o.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selected?.id === o.id ? 'color-mix(in srgb,var(--accent) 10%,var(--surface))' : 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>
                {o.logo_text}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.company}</div>
                <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>{o.role}</div>
              </div>
            </div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, color: 'var(--mint)' }}>
              {o.offer_amount ? o.offer_amount.toLocaleString() : 'Amount not set'}
            </div>
          </div>
        ))}
      </div>

      {error && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {plan && (
        <div className="fu" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border2)', background: 'linear-gradient(160deg,rgba(52,224,161,.10),var(--surface))' }}>
              <div style={{ fontSize: 12, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Market verdict</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>{plan.marketVerdict}</div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--dim)' }}>Counter with</span>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 30, fontWeight: 700, color: 'var(--mint)' }}>
                  {plan.currency} {plan.counterOffer.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Say this on the call</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.script.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: 11, borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11, flex: 'none' }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{line}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Counter-offer email</span>
                <button onClick={copyEmail} style={{ ...ghostBtnStyle, marginLeft: 'auto', padding: '7px 12px', fontSize: 12 }}>
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--dim)', whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>{plan.emailDraft}</div>
            </div>
            <div style={{ padding: 18, borderRadius: 16, border: '1px solid var(--border2)', background: 'linear-gradient(160deg,rgba(109,94,252,.1),var(--surface))' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>✦ Your leverage</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {plan.leveragePoints.map((p, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                    • {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!plan && !generating && (
        <div style={{ color: 'var(--faint)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>
          Pick an offer above and hit <b style={{ color: 'var(--dim)' }}>Build negotiation plan</b> — Gemini reads your offers, target comp, and résumé to arm you.
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

const ghostBtnStyle: React.CSSProperties = {
  background: 'var(--surface2)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  borderRadius: 9,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Manrope',
};
