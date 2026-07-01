import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getProfile } from '../../data/api';
import { Copilot } from '../../components/Copilot';
import type { Profile } from '../../types';

const navItems = [
  { to: '/app', icon: '📊', label: 'Mission Control', end: true },
  { to: '/app/resume', icon: '📄', label: 'Résumé Studio' },
  { to: '/app/jobs', icon: '🎯', label: 'Job Match' },
  { to: '/app/interview', icon: '🎙️', label: 'Interview Coach' },
  { to: '/app/tracker', icon: '🗂️', label: 'Tracker' },
];

const titleByPath: Record<string, string> = {
  '/app': 'Mission Control',
  '/app/resume': 'Résumé Studio',
  '/app/jobs': 'Job Match',
  '/app/interview': 'Interview Coach',
  '/app/tracker': 'Tracker',
};

export function AppShell() {
  const { dark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const title = titleByPath[location.pathname] ?? 'JobBot';

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        style={{
          width: 238,
          flex: 'none',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', boxShadow: '0 6px 16px -6px var(--glow)' }} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17 }}>JobBot</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--accent2)', border: '1px solid var(--border2)', padding: '2px 6px', borderRadius: 14 }}>
            PRO
          </span>
        </div>
        <div style={{ padding: '6px 12px 4px', fontSize: 10.5, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Workspace</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 10px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: '9px 11px',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                transition: '.15s',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text)' : 'var(--dim)',
                background: isActive ? 'color-mix(in srgb,var(--accent) 16%,transparent)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border2)' : 'transparent'}`,
              })}
            >
              {item.icon} <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div style={{ padding: '14px 12px 4px', fontSize: 10.5, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Grow</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 10px' }}>
          {['💸 Negotiation', '📈 Analytics', '🧭 Career Path'].map((label) => (
            <div key={label} style={{ padding: '9px 11px', borderRadius: 10, color: 'var(--dim)', fontSize: 14, cursor: 'default', display: 'flex', gap: 10, alignItems: 'center', opacity: 0.6 }}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: 14 }}>
          <div style={{ padding: 13, borderRadius: 14, background: 'linear-gradient(150deg,rgba(109,94,252,.18),var(--surface))', border: '1px solid var(--border2)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>Autopilot is on 🟢</div>
            <div style={{ fontSize: 11.5, color: 'var(--dim)', lineHeight: 1.4 }}>JobBot watches your pipeline and drafts follow-ups for review.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--sky),var(--accent))', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: '#fff' }}>
              {(profile?.full_name || 'J').charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'Your career'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--faint)' }}>Running locally</div>
            </div>
            <div
              onClick={toggleTheme}
              style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: 15, width: 30, height: 30, borderRadius: 9, border: '1px solid var(--border2)', display: 'grid', placeItems: 'center' }}
            >
              {dark ? '☾' : '☀'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 60,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            background: 'color-mix(in srgb,var(--bg) 80%,transparent)',
            backdropFilter: 'blur(16px)',
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk'" }}>{title}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 13px',
                border: '1px solid var(--border2)',
                borderRadius: 11,
                background: 'var(--surface)',
                color: 'var(--faint)',
                fontSize: 13,
                minWidth: 220,
              }}
            >
              ⌘K <span>Ask or command JobBot…</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 26 }}>
          <Outlet />
        </div>
      </div>

      <Copilot />
    </div>
  );
}
