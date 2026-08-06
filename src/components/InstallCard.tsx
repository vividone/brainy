/**
 * "Put Brainy on the home screen."
 *
 * Offered during setup rather than after it, and that ordering is the whole
 * point. On iOS an installed web app has its own storage container, separate from
 * Safari — so a family who sets everything up in the browser and installs
 * afterwards opens the icon and finds a blank first run. Installing *first* means
 * every keystroke of setup lands in the installed app's own storage, and the
 * problem never happens.
 *
 * Renders nothing when already installed, or when the platform offers no route —
 * an empty card that says "installing is not available" is noise.
 */

import { useEffect, useState } from 'react'
import { Btn, Card } from './ui'
import { installState } from '../lib/install'

export function InstallCard({ compact }: { compact?: boolean }) {
  const [state, setState] = useState(installState)
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null)

  /* The install event can arrive after this mounts, and does on a slow connection. */
  useEffect(() => installState().subscribe(() => setState(installState())), [])

  if (state.installed) {
    return compact ? null : (
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
        <p className="font-black text-emerald-900">✓ Installed</p>
        <p className="mt-0.5 text-sm font-semibold text-emerald-800">
          Brainy is on this home screen, so it opens like an app and works without data.
        </p>
      </div>
    )
  }

  if (!state.canPrompt && !state.needsManual) return null

  return (
    <Card className="border-brand-300 bg-brand-50 p-4">
      <p className="font-black text-brand-900">Add Brainy to the home screen first</p>
      <p className="mt-0.5 text-sm font-semibold text-brand-600">
        It then opens like a normal app, full screen, and plays with no internet at all. Doing this
        before you set up saves you repeating it — on an iPhone or iPad especially, the installed app
        starts with its own fresh storage.
      </p>

      {state.canPrompt && (
        <Btn
          size="md"
          className="mt-3"
          onClick={async () => {
            const accepted = await state.prompt()
            setOutcome(accepted ? 'accepted' : 'dismissed')
          }}
        >
          ⬇ Install Brainy
        </Btn>
      )}

      {state.needsManual && (
        <ol className="mt-3 space-y-1.5 text-sm font-bold text-brand-800">
          <li>
            1. Tap <span className="mx-0.5 rounded-lg bg-white px-2 py-0.5 border-2 border-brand-200">Share</span>
            at the bottom of Safari
          </li>
          <li>2. Scroll and choose “Add to Home Screen”</li>
          <li>3. Open Brainy from the new icon, and carry on there</li>
        </ol>
      )}

      {outcome === 'dismissed' && (
        <p className="mt-2 text-sm font-semibold text-brand-500">
          No problem — you can install it later from your browser’s menu.
        </p>
      )}
    </Card>
  )
}
