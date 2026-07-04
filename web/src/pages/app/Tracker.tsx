import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createInterview, listApplications, updateApplicationStage, updateOfferAmount } from '../../data/api';
import type { Application, ApplicationStage } from '../../types';

const columns: { stage: ApplicationStage; label: string; color: string }[] = [
  { stage: 'applied', label: 'Applied', color: 'var(--faint)' },
  { stage: 'screening', label: 'Screening', color: 'var(--sky)' },
  { stage: 'interview', label: 'Interview', color: 'var(--accent2)' },
  { stage: 'offer', label: 'Offer', color: 'var(--mint)' },
];

const interviewKinds = ['Behavioral', 'Technical', 'Hiring manager', 'HR screen', 'Final round'];

function ageLabel(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return 'today';
  return `${days}d`;
}

export function Tracker() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  // Post-drop follow-ups: schedule an interview / record an offer amount.
  const [scheduleFor, setScheduleFor] = useState<Application | null>(null);
  const [when, setWhen] = useState('');
  const [kind, setKind] = useState(interviewKinds[0]);
  const [offerFor, setOfferFor] = useState<Application | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setApps(await listApplications(user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDrop = async (stage: ApplicationStage) => {
    if (!dragId) return;
    const app = apps.find((a) => a.id === dragId);
    setApps((prev) => prev.map((a) => (a.id === dragId ? { ...a, stage } : a)));
    await updateApplicationStage(dragId, stage);
    setDragId(null);
    if (app && stage === 'interview') {
      setWhen('');
      setKind(interviewKinds[0]);
      setScheduleFor({ ...app, stage });
    }
    if (app && stage === 'offer') {
      setOfferAmount(app.offer_amount ? String(app.offer_amount) : '');
      setOfferFor({ ...app, stage });
    }
  };

  const saveInterview = async () => {
    if (!scheduleFor || !user || !when) return;
    setSaving(true);
    try {
      await createInterview({
        user_id: user.id,
        application_id: scheduleFor.id,
        company: scheduleFor.company,
        role: scheduleFor.role,
        kind,
        scheduled_at: new Date(when).toISOString(),
      });
      setScheduleFor(null);
    } finally {
      setSaving(false);
    }
  };

  const saveOffer = async () => {
    if (!offerFor) return;
    const amount = parseInt(offerAmount.replace(/[^\d]/g, ''), 10);
    setSaving(true);
    try {
      await updateOfferAmount(offerFor.id, Number.isFinite(amount) ? amount : null);
      setApps((prev) => prev.map((a) => (a.id === offerFor.id ? { ...a, offer_amount: amount || null } : a)));
      setOfferFor(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fu" style={{ maxWidth: 1220, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Tracker</h1>
      <p style={{ color: 'var(--dim)', margin: '0 0 20px', fontSize: 14 }}>Every application in one board. Drag a card to advance its stage.</p>

      {loading ? (
        <div style={{ color: 'var(--dim)', padding: 40, textAlign: 'center' }}>Loading board…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {columns.map((col) => {
            const cards = apps.filter((a) => a.stage === col.stage);
            return (
              <div
                key={col.stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.stage)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, minHeight: 200 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)', background: 'var(--surface2)', padding: '1px 8px', borderRadius: 20 }}>{cards.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      className="card3d"
                      onDragStart={() => setDragId(c.id)}
                      style={{ padding: 13, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'grab' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
                          {c.logo_text}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.role}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 8 }}>{c.company}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.stage === 'offer' && c.offer_amount ? (
                          <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--mint)', border: '1px solid var(--border)', fontWeight: 600 }}>
                            {c.offer_amount.toLocaleString()}
                          </span>
                        ) : c.tag ? (
                          <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: 'var(--surface2)', color: c.tag_color ?? 'var(--dim)', border: '1px solid var(--border)', fontWeight: 600 }}>
                            {c.tag}
                          </span>
                        ) : null}
                        <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>{ageLabel(c.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && <div style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', padding: '20px 0' }}>Nothing here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* schedule-interview dialog */}
      {scheduleFor && (
        <div style={overlayStyle}>
          <div className="fu" style={dialogStyle}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 19, margin: '0 0 4px' }}>Schedule the interview 🎙️</h3>
            <p style={{ color: 'var(--dim)', fontSize: 13.5, margin: '0 0 16px' }}>
              {scheduleFor.company} · {scheduleFor.role} — it'll appear in your Upcoming list and Interview Coach.
            </p>
            <label style={labelStyle}>When</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={inputStyle} />
            <label style={labelStyle}>Round type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle}>
              {interviewKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setScheduleFor(null)} style={ghostBtnStyle}>
                Skip
              </button>
              <button onClick={saveInterview} disabled={saving || !when} style={{ ...primaryBtnStyle, flex: 1, opacity: saving || !when ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* offer-amount dialog */}
      {offerFor && (
        <div style={overlayStyle}>
          <div className="fu" style={dialogStyle}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 19, margin: '0 0 4px' }}>Congrats — an offer! 🎉</h3>
            <p style={{ color: 'var(--dim)', fontSize: 13.5, margin: '0 0 16px' }}>
              {offerFor.company} · {offerFor.role} — record the amount to unlock the Negotiation war-room.
            </p>
            <label style={labelStyle}>Offer amount (yearly, numbers only)</label>
            <input
              inputMode="numeric"
              placeholder="e.g. 3500000"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setOfferFor(null)} style={ghostBtnStyle}>
                Skip
              </button>
              <button onClick={saveOffer} disabled={saving || !offerAmount.trim()} style={{ ...primaryBtnStyle, flex: 1, opacity: saving || !offerAmount.trim() ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.55)',
  backdropFilter: 'blur(4px)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 80,
};

const dialogStyle: React.CSSProperties = {
  width: 'min(420px, calc(100vw - 40px))',
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  borderRadius: 18,
  padding: 24,
  boxShadow: 'var(--shadow)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--faint)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  margin: '12px 0 6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg2)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  padding: '11px 13px',
  borderRadius: 11,
  fontSize: 14,
  outline: 'none',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'var(--surface2)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  padding: '11px 16px',
  borderRadius: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Manrope',
  fontSize: 13,
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
  color: '#fff',
  border: 'none',
  padding: '11px 16px',
  borderRadius: 11,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Manrope',
  fontSize: 14,
};
