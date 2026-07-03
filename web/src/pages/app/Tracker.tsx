import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listApplications, updateApplicationStage } from '../../data/api';
import type { Application, ApplicationStage } from '../../types';

const columns: { stage: ApplicationStage; label: string; color: string }[] = [
  { stage: 'applied', label: 'Applied', color: 'var(--faint)' },
  { stage: 'screening', label: 'Screening', color: 'var(--sky)' },
  { stage: 'interview', label: 'Interview', color: 'var(--accent2)' },
  { stage: 'offer', label: 'Offer', color: 'var(--mint)' },
];

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
    setApps((prev) => prev.map((a) => (a.id === dragId ? { ...a, stage } : a)));
    await updateApplicationStage(dragId, stage);
    setDragId(null);
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
                        {c.tag && (
                          <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 6, background: 'var(--surface2)', color: c.tag_color ?? 'var(--dim)', border: '1px solid var(--border)', fontWeight: 600 }}>
                            {c.tag}
                          </span>
                        )}
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
    </div>
  );
}
