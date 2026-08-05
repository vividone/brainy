/**
 * In-app feedback, in the parent zone.
 *
 * Categories first, because "tell us what you think" gets nothing while
 * "a question looks wrong" gets the report that actually fixes content. The
 * anonymous summary is opt-in per message, and there is a clipboard fallback
 * so a parent on a bad connection never loses what they typed.
 */

import { useState } from 'react'
import { Btn, Card } from '../components/ui'
import { APP_VERSION } from '../game/characters'
import { sendReport } from '../lib/report'
import { useStore } from '../state/store'

/**
 * Catch a child's name before it is sent, not after.
 *
 * The notice under the box already asks parents to leave names out, and most
 * do. But asking is not a control, and this is the one place in Brainy where
 * free text can carry a child's personal data off the device — which would
 * break the promise the whole privacy position rests on. We know every name on
 * this tablet, so we can simply check.
 *
 * A warning rather than a block: it is the parent's message, the match may be
 * a coincidence ("Grace" in "with good grace"), and refusing to send feedback
 * over a false positive would cost us the bug report. Word-boundary matched and
 * only for names of three letters or more, so short names do not fire on every
 * other word.
 */
function namesIn(message: string, names: string[]): string[] {
  const escape = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return names
    .map((n) => n.trim())
    .filter((n) => n.length >= 3)
    .filter((n) => new RegExp(`\\b${escape(n)}\\b`, 'i').test(message))
}

const FEEDBACK_KINDS = [
  {
    id: 'wrong',
    emoji: '❗',
    label: 'A question looks wrong',
    hint: 'A wrong answer key, a typo, or two answers that both work.',
  },
  {
    id: 'confusing',
    emoji: '🤔',
    label: 'Something confused my child',
    hint: 'Wording they could not follow, or a screen they got stuck on.',
  },
  { id: 'idea', emoji: '💡', label: 'I have an idea', hint: 'Something you wish it did.' },
  { id: 'broken', emoji: '🐞', label: 'Something is broken', hint: 'It crashed, froze, or did not save.' },
  {
    id: 'praise',
    emoji: '💚',
    label: 'Something is working well',
    hint: 'Genuinely useful — it tells us what not to change.',
  },
] as const

export function FeedbackCard({ summary }: { summary: string }) {
  const [kind, setKind] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [attach, setAttach] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [copyNote, setCopyNote] = useState<string | null>(null)

  const learners = useStore((st) => st.learners)
  const named = namesIn(message, learners.map((l) => l.name))

  const chosen = FEEDBACK_KINDS.find((k) => k.id === kind)
  const canSend = Boolean(kind) && message.trim().length >= 4 && state !== 'sending'

  const asText = () =>
    [
      `Brainy feedback — ${chosen?.label ?? kind}`,
      contact.trim() ? `contact: ${contact.trim()}` : null,
      '',
      message.trim(),
      attach ? `\n---\n${summary}` : null,
    ]
      .filter(Boolean)
      .join('\n')

  if (state === 'sent') {
    return (
      <Card className="p-5 border-emerald-300 bg-emerald-50">
        <p className="text-lg font-black text-emerald-900">Thank you — that came through.</p>
        <p className="text-sm font-semibold text-emerald-800">
          Reports about specific questions are the most useful thing we get.
        </p>
        <Btn
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            setState('idle')
            setKind(null)
            setMessage('')
            setAttach(false)
          }}
        >
          Send another
        </Btn>
      </Card>
    )
  }

  return (
    <Card className="p-5 border-slate-200">
      <h2 className="font-black text-slate-900 mb-1">Tell us something</h2>
      <p className="text-sm font-semibold text-slate-500 mb-3">
        Brainy is early and you are one of the first families using it. What would you change?
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {FEEDBACK_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={`flex items-start gap-2 rounded-2xl border-2 p-3 text-left transition
              ${k.id === kind ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
          >
            <span className="text-xl leading-none">{k.emoji}</span>
            <span className="min-w-0">
              <span className="block font-black text-sm leading-tight">{k.label}</span>
              <span
                className={`block text-xs font-semibold ${k.id === kind ? 'text-slate-300' : 'text-slate-400'}`}
              >
                {k.hint}
              </span>
            </span>
          </button>
        ))}
      </div>

      {kind && (
        <div className="mt-4">
          <label htmlFor="fb" className="block font-black text-slate-800 mb-1">
            {kind === 'wrong'
              ? 'Which question, and what was wrong with it?'
              : kind === 'confusing'
                ? 'What confused them?'
                : 'Tell us more'}
          </label>
          <textarea
            id="fb"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 1200))}
            rows={4}
            placeholder={
              kind === 'wrong'
                ? 'e.g. Quarter to 8 — the clock showed 7:45 but it marked quarter past as correct'
                : 'A sentence or two is plenty.'
            }
            className="w-full rounded-2xl border-2 border-slate-300 p-3 font-semibold text-slate-800 outline-none focus:border-slate-900"
          />
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Please leave out your child&apos;s name or anything personal — we do not need it.
          </p>
          {named.length > 0 && (
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              That mentions {named.join(' and ')}. We would rather not receive a child&apos;s name —
              could you take it out? You can still send it as it is.
            </p>
          )}

          <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={attach}
              onChange={(e) => setAttach(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              Attach the anonymous summary above. It helps us reproduce a problem, and it contains no
              name or identifier.
            </span>
          </label>

          <label htmlFor="fbc" className="mt-3 block font-black text-slate-800">
            Your email, only if you would like a reply
          </label>
          <input
            id="fbc"
            value={contact}
            onChange={(e) => setContact(e.target.value.slice(0, 120))}
            placeholder="Optional"
            className="mt-1 w-full h-12 rounded-2xl border-2 border-slate-300 px-3 font-semibold outline-none focus:border-slate-900"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Btn
              size="md"
              disabled={!canSend}
              onClick={async () => {
                setState('sending')
                const ok = await sendReport({
                  type: 'feedback',
                  app: APP_VERSION,
                  category: kind,
                  message: message.trim(),
                  contact: contact.trim() || undefined,
                  summary: attach ? summary : undefined,
                })
                setState(ok ? 'sent' : 'failed')
              }}
            >
              {state === 'sending' ? 'Sending…' : 'Send'}
            </Btn>
            <Btn
              variant="secondary"
              size="md"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(asText())
                  setCopyNote('Copied. Paste it into WhatsApp or an email to us.')
                } catch {
                  setCopyNote('Could not copy — select the text above instead.')
                }
              }}
            >
              Copy instead
            </Btn>
            {copyNote && <span className="text-sm font-bold text-emerald-700">{copyNote}</span>}
          </div>

          {state === 'failed' && (
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              That did not go through — you may be offline. Nothing you typed is lost: use
              <strong> Copy instead</strong> and send it to us however you like.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
