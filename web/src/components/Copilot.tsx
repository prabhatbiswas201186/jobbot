import { useEffect, useRef, useState } from 'react';
import { getCopilotGreeting, listCopilotHistory, sendCopilotMessage } from '../data/api';
import type { CopilotMessage } from '../types';

export function Copilot() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [insight, setInsight] = useState<{ title: string; body: string; cta?: string } | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    listCopilotHistory().then(async (history) => {
      if (history.length > 0) {
        setMessages(history as CopilotMessage[]);
        return;
      }
      try {
        const greeting = await getCopilotGreeting();
        setMessages([{ id: 'greeting', role: 'assistant', content: greeting.reply, is_insight: false, cta_label: null, created_at: new Date().toISOString() }]);
        if (greeting.insightTitle) {
          setInsight({ title: greeting.insightTitle, body: greeting.insightBody ?? '', cta: greeting.ctaLabel });
        }
      } catch {
        setMessages([
          {
            id: 'greeting-fallback',
            role: 'assistant',
            content: "Hi — I'm JobBot's co-pilot. Upload a résumé and I'll start watching your pipeline.",
            is_insight: false,
            cta_label: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    });
  }, [loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', content: text, is_insight: false, cta_label: null, created_at: new Date().toISOString() }]);
    setBusy(true);
    try {
      const res = await sendCopilotMessage(text);
      setMessages((m) => [...m, { id: `reply-${Date.now()}`, role: 'assistant', content: res.reply, is_insight: Boolean(res.insightTitle), cta_label: res.ctaLabel ?? null, created_at: new Date().toISOString() }]);
      if (res.insightTitle) setInsight({ title: res.insightTitle, body: res.insightBody ?? '', cta: res.ctaLabel });
    } catch (err) {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'assistant', content: `Something went wrong: ${(err as Error).message}`, is_insight: false, cta_label: null, created_at: new Date().toISOString() }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 22,
          bottom: 22,
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 16px 40px -12px var(--glow)',
          zIndex: 60,
          animation: 'floaty 5s ease-in-out infinite',
        }}
      >
        <span style={{ color: '#fff', fontSize: 22 }}>✦</span>
      </div>
    );
  }

  return (
    <div
      className="fu"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        width: 352,
        maxHeight: '78vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 20,
        border: '1px solid var(--border2)',
        background: 'color-mix(in srgb,var(--surface) 92%,transparent)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 30px 80px -30px rgba(0,0,0,.6)',
        zIndex: 60,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px -6px var(--glow)' }}>
          <span style={{ color: '#fff', fontSize: 14 }}>✦</span>
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>JobBot Co-pilot</div>
          <div style={{ fontSize: 11, color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', animation: 'pulseGlow 2s infinite' }} />
            watching your pipeline
          </div>
        </div>
        <div onClick={() => setOpen(false)} style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--faint)', width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
          —
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insight && (
          <div style={{ padding: 13, borderRadius: 13, background: 'linear-gradient(150deg,rgba(255,181,71,.12),var(--surface2))', border: '1px solid rgba(255,181,71,.28)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 5 }}>⚡ PROACTIVE INSIGHT</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>{insight.title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{insight.body}</div>
            {insight.cta && (
              <button
                onClick={() => setInsight(null)}
                style={{ marginTop: 10, background: 'var(--text)', color: 'var(--bg)', border: 'none', padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope' }}
              >
                {insight.cta}
              </button>
            )}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: m.role === 'user' ? '82%' : '88%',
              padding: '11px 13px',
              borderRadius: 14,
              borderBottomLeftRadius: m.role === 'assistant' ? 4 : 14,
              borderBottomRightRadius: m.role === 'user' ? 4 : 14,
              background: m.role === 'user' ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--faint)', animation: 'blink 1.2s infinite' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--faint)', animation: 'blink 1.2s infinite .2s' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--faint)', animation: 'blink 1.2s infinite .4s' }} />
          </div>
        )}
      </div>
      <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message or command…"
          style={{ flex: 1, padding: '11px 13px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
        />
        <div onClick={send} style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <span style={{ color: '#fff' }}>↑</span>
        </div>
      </div>
    </div>
  );
}
