/**
 * Where a parent lands after paying.
 *
 * Paystack sends them back to the app rather than to a receipt page, so this is
 * the only confirmation they get from us — which makes two things non-optional:
 * it must say plainly what they now have, and it must show the access code,
 * because that code is how they unlock a second tablet and there is no email
 * going out to remind them.
 *
 * Addressed to the grown-up, not the child: nobody hands the tablet over
 * mid-payment.
 */

import { useState } from 'react'
import { Btn, Card, Screen } from '../components/ui'
import type { StoredLicence } from '../lib/licence'

interface Props {
  licence: StoredLicence | null
  /** Set when the payment could not be confirmed. Never both. */
  problem?: string | null
  onDone: () => void
}

export function Unlocked({ licence, problem, onDone }: Props) {
  const [copied, setCopied] = useState(false)

  /*
   * Paystack only sends a parent back here after a charge, so an unconfirmed
   * return is nearly always a verification that has not caught up rather than a
   * failure. Say that, rather than implying the money went nowhere — and point
   * at the one place they can check.
   */
  if (!licence) {
    return (
      <Screen bg="bg-slate-50" className="max-w-lg">
        <div className="pt-10 text-center">
          <div className="text-6xl" aria-hidden>
            ⏳
          </div>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Not confirmed yet</h1>
          <p className="mt-2 font-bold text-slate-500">{problem}</p>
        </div>
        <Card className="mt-6 p-5 border-slate-200">
          <p className="font-semibold text-slate-600">
            If you completed the payment, it will land shortly, and nothing is lost. Open the grown-up area,
            then <b>Settings → Access</b>, and tap <b>Check again</b>. If it is still not there in a few
            minutes, send us a message from the same screen and we will sort it out by hand.
          </p>
        </Card>
        <Btn size="lg" full className="mt-6" onClick={onDone}>
          Back to Brainy
        </Btn>
      </Screen>
    )
  }

  const expiry = licence.expiresAt
    ? `Runs until ${new Date(licence.expiresAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}.`
    : 'It never expires.'

  return (
    <Screen bg="bg-slate-50" className="max-w-lg">
      <div className="pt-10 text-center">
        <div className="text-6xl" aria-hidden>
          🎉
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Everything is unlocked</h1>
        <p className="mt-2 font-bold text-slate-500">
          Thank you. {licence.planLabel ? `${licence.planLabel}. ` : ''}
          {expiry}
        </p>
      </div>

      <Card className="mt-6 p-5 border-slate-200">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Your family code</p>
        <p className="mt-1 text-2xl font-black tracking-wider text-slate-900">{licence.code}</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Keep this. It is how you unlock another tablet, or this one again after a reset. There is no
          account and no password to remember, just the code.
        </p>
        <Btn
          variant="secondary"
          size="md"
          className="mt-3"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(licence.code)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? '✓ Copied' : '📋 Copy code'}
        </Btn>
        {licence.email && (
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Attached to {licence.email}. Paystack has your receipt.
          </p>
        )}
      </Card>

      <Btn size="lg" full className="mt-6" onClick={onDone}>
        Back to Brainy ▶
      </Btn>
    </Screen>
  )
}
