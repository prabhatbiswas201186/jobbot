import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ScoreRing } from '../../components/ScoreRing';
import { getQuestionBank, latestMockSession, listUpcomingInterviews, scoreMockAnswer, type ScoreAnswerResult } from '../../data/api';
import type { Interview, MockSession } from '../../types';

const tagColors: Record<string, string> = {
  BEHAV: 'var(--sky)',
  PRODUCT: 'var(--accent2)',
  METRICS: 'var(--mint)',
  LEAD: 'var(--amber)',
  TECH: 'var(--rose)',
};

export function InterviewCoach() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [questions, setQuestions] = useState<{ tag: string; question: string }[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [lastSession, setLastSession] = useState<MockSession | null>(null);

  const [activeQuestion, setActiveQuestion] = useState('Tell me about a time you shipped under a hard deadline.');
  const [answer, setAnswer] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    latestMockSession(user.id).then(setLastSession);
    listUpcomingInterviews(user.id).then((list) => {
      setInterviews(list);
      const nextInterview = list[0];
      getQuestionBank({ targetRole: nextInterview?.role, targetCompany: nextInterview?.company })
        .then((r) => setQuestions(r.questions))
        .catch(() => setQuestions([]))
        .finally(() => setLoadingQuestions(false));
    });
  }, [user]);

  const handleScore = async () => {
    if (!answer.trim() || answer.trim().length < 10) {
      setError('Write a bit more so JobBot has something to grade.');
      return;
    }
    setScoring(true);
    setError(null);
    try {
      const result = await scoreMockAnswer({ question: activeQuestion, answerText: answer });
      setScoreResult(result);
      if (user) latestMockSession(user.id).then(setLastSession);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScoring(false);
    }
  };

  const readiness = lastSession?.readiness_score ?? 0;
  const nextInterview = interviews[0];

  return (
    <div className="fu" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, letterSpacing: '-.02em', margin: '0 0 4px' }}>Interview Coach</h1>
          <p style={{ color: 'var(--dim)', margin: 0, fontSize: 14 }}>
            {nextInterview ? (
              <>
                Next up · <b style={{ color: 'var(--text)' }}>{nextInterview.company} · {nextInterview.kind}</b>
              </>
            ) : (
              'No interview scheduled yet — practice anytime.'
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 22, borderRadius: 18, border: '1px solid var(--border2)', background: 'linear-gradient(150deg,rgba(87,199,255,.1),var(--surface))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>STAR answer builder</span>
              <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>✦ live Gemini coaching</span>
            </div>
            <input
              value={activeQuestion}
              onChange={(e) => setActiveQuestion(e.target.value)}
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: 'var(--text)', marginBottom: 10, fontStyle: 'italic' }}
            />
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type or paste your answer…"
              rows={5}
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: 'var(--text)', marginBottom: 10, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleScore}
              disabled={scoring}
              style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope', fontSize: 13, opacity: scoring ? 0.7 : 1 }}
            >
              {scoring ? 'Scoring…' : 'Score my answer'}
            </button>
            {error && <div style={{ color: 'var(--rose)', fontSize: 13, marginTop: 8 }}>{error}</div>}
            {scoreResult && (
              <>
                <div style={{ fontSize: 12.5, color: 'var(--mint)', margin: '12px 0 8px' }}>{scoreResult.feedback}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scoreResult.star.map((s) => (
                    <div key={s.key} style={{ display: 'flex', gap: 10, padding: 11, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--sky)', color: '#04121c', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flex: 'none' }}>
                        {s.key}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.4 }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Question bank · tailored</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingQuestions && <div style={{ color: 'var(--dim)', fontSize: 13 }}>Generating with Gemini…</div>}
              {questions.map((q, i) => (
                <div
                  key={i}
                  onClick={() => setActiveQuestion(q.question)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: 'var(--bg2)', color: tagColors[q.tag] ?? 'var(--dim)', fontWeight: 700, border: '1px solid var(--border)' }}>{q.tag}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{q.question}</span>
                  <span style={{ color: 'var(--faint)' }}>↗</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Interview readiness</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScoreRing size={120} strokeWidth={10} score={readiness} color="var(--amber)" label={<div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 32 }}>{readiness}</div>} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 8 }}>{lastSession ? 'From your last scored mock answer' : 'Score an answer to see your readiness'}</div>
          </div>
          {lastSession && (
            <div style={{ padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Last mock · feedback</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {[
                  ['Structure', lastSession.structure_score ?? 0, 'var(--mint)'],
                  ['Specificity', lastSession.specificity_score ?? 0, 'var(--amber)'],
                ].map(([label, val, color]) => (
                  <div key={label as string}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dim)', marginBottom: 3 }}>
                      <span>{label}</span>
                      <span>{val}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'var(--surface2)' }}>
                      <div style={{ width: `${val}%`, height: '100%', borderRadius: 4, background: color as string }} />
                    </div>
                  </div>
                ))}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dim)', marginBottom: 3 }}>
                    <span>Filler words</span>
                    <span style={{ color: 'var(--rose)' }}>{lastSession.filler_word_count ?? 0}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'var(--surface2)' }}>
                    <div style={{ width: `${Math.min(100, (lastSession.filler_word_count ?? 0) * 7)}%`, height: '100%', borderRadius: 4, background: 'var(--rose)' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
