/**
 * "Add Brainy to the home screen, then set up."
 *
 * Shown before setup, sign-in and play on a device that has nothing saved yet.
 *
 * The reason is the one thing about web apps that surprises everybody: an
 * installed app gets its own storage. On iOS that is absolute — a home-screen
 * app cannot see anything Safari saved, and never will. So a parent who
 * registers in the browser, adds the icon and opens it finds a blank first run
 * and has to sign in again to get their own account back. Progress sync makes
 * that recoverable, but recoverable is not the same as good: they have already
 * been confused by then.
 *
 * Installing first makes the problem impossible rather than survivable. Every
 * keystroke of setup lands in the container the family will actually use.
 *
 * It is a gate, not a wall. Some browsers cannot install anything — desktop
 * Firefox, and the in-app browsers inside WhatsApp and Instagram — and a parent
 * who cannot get past this screen is a parent lost for no reason. So there is
 * always a way through, kept deliberately quiet: one line, at the bottom,
 * below the route we would rather they took.
 */

import { useEffect, useState } from 'react'
import { Btn } from '../components/ui'
import { installState, isIOS } from '../lib/install'

export const BROWSER_ANYWAY_KEY = 'kolo.setup.browser-anyway'

export function InstallFirst({ onContinueAnyway }: { onContinueAnyway: () => void }) {
  const [state, setState] = useState(installState)
  const [dismissed, setDismissed] = useState(false)
  const [done, setDone] = useState(false)

  /* The install event can arrive a second or two after this mounts. */
  useEffect(() => installState().subscribe(() => setState(installState())), [])

  /*
   * On a desktop the installed app opens in its own window and *this* tab is
   * never standalone, so nothing here would otherwise notice the install had
   * happened. Without this the tab falls through to "your browser cannot
   * install it" one second after the browser installed it.
   */
  useEffect(() => {
    const onInstalled = () => setDone(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  /*
   * One state at a time. `beforeinstallprompt` is single-use, so after a prompt
   * is accepted or declined `canPrompt` goes false — which must not be read as
   * "this browser cannot install", the message a parent would then be staring
   * at having just declined a dialogue that plainly could.
   */
  const phase = done
    ? 'done'
    : state.canPrompt
      ? 'prompt'
      : state.needsManual || isIOS()
        ? 'manual'
        : dismissed
          ? 'declined'
          : 'unsupported'

  return (
    <div className="min-h-dvh bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          {/* Vite's base, so this resolves under /play/ wherever the route is. */}
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            width={72}
            height={72}
            className="mx-auto rounded-2xl"
          />
          <h1 className="mt-3 text-3xl font-black text-brand-900">Add Brainy first</h1>
          <p className="mt-2 font-bold text-brand-600">
            Then set up inside it, once. The installed app keeps its own progress, separate from this
            browser tab, so setting up here first would mean doing it twice.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border-3 border-brand-200 bg-white p-5" style={{ borderWidth: 3 }}>
          {phase === 'done' && (
            <>
              <p className="font-black text-emerald-700">✓ Installed</p>
              <p className="mt-0.5 text-sm font-semibold text-brand-500">
                Open Brainy from its new icon and set up there. You can close this tab.
              </p>
            </>
          )}

          {phase === 'prompt' && (
            <>
              <p className="font-black text-brand-900">One tap</p>
              <p className="mt-0.5 text-sm font-semibold text-brand-500">
                It goes on your home screen and opens full screen, with no internet needed once it has
                loaded.
              </p>
              <Btn
                size="lg"
                full
                className="mt-4"
                onClick={async () => {
                  const accepted = await state.prompt()
                  if (accepted) setDone(true)
                  else setDismissed(true)
                }}
              >
                ⬇ Install Brainy
              </Btn>
            </>
          )}

          {phase === 'declined' && (
            <>
              <p className="font-black text-brand-900">The offer is still there</p>
              <p className="mt-0.5 text-sm font-semibold text-brand-500">
                Your browser keeps it in its menu, under <b>Install app</b> or <b>Add to Home screen</b>.
                Reload this page and the button comes back too.
              </p>
            </>
          )}

          {phase === 'manual' && (
            <>
              <p className="font-black text-brand-900">Three taps in Safari</p>
              <ol className="mt-3 space-y-2 font-bold text-brand-800">
                <li>
                  1. Tap{' '}
                  <span className="rounded-lg border-2 border-brand-200 bg-brand-50 px-2 py-0.5">Share</span>{' '}
                  at the bottom of the screen
                </li>
                <li>2. Scroll down and choose &ldquo;Add to Home Screen&rdquo;</li>
                <li>3. Open Brainy from the new icon, and set up there</li>
              </ol>
              <p className="mt-3 text-sm font-semibold text-brand-500">
                Safari has no button we can offer for this, so it has to be done by hand. It is worth it:
                on an iPhone or iPad, this is the difference between setting up once and setting up
                twice.
              </p>
            </>
          )}

          {phase === 'unsupported' && (
            <>
              <p className="font-black text-brand-900">This browser cannot install it</p>
              <p className="mt-0.5 text-sm font-semibold text-brand-500">
                Two common reasons. If you opened this from a link inside another app, such as WhatsApp
                or Instagram, open it in <b>Chrome</b> or <b>Safari</b> instead and the option appears.
                Some desktop browsers, Firefox among them, simply have no install button.
              </p>
              <p className="mt-2 text-sm font-semibold text-brand-500">
                Carrying on in this browser is perfectly fine. Everything works, and signing in on
                another device brings your access with you.
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm font-bold text-brand-500">
          Already added it? Open Brainy from the new icon and carry on there.
        </p>

        <div className="mt-6 text-center">
          <button
            onClick={onContinueAnyway}
            className="min-h-11 text-sm font-bold text-brand-400 underline decoration-2 underline-offset-2"
          >
            {phase === 'unsupported' ? 'Continue in this browser' : 'Set up in this browser instead'}
          </button>
        </div>
      </div>
    </div>
  )
}
