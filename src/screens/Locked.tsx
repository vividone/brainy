/**
 * What the child sees when a parent has paused the app.
 *
 * Deliberately warm rather than punitive. A child who taps in and gets a red
 * "ACCESS DENIED" learns that the app is something that tells them off; the
 * buddy having a nap teaches nothing bad and is just as effective at ending
 * the argument.
 *
 * There is no way past it from this screen except the grown-up code, and no
 * hint of one — a "try again later" countdown would only invite tapping.
 */

import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { PinGate } from '../components/PinGate'
import { Btn, Card, Screen } from '../components/ui'
import { useLearnerData, useProfile, useStore } from '../state/store'

export function Locked() {
  const [asking, setAsking] = useState(false)
  const profile = useProfile()
  const { economy } = useLearnerData()
  const note = useStore((s) => s.device.lockNote)
  const setLocked = useStore((s) => s.setLocked)

  if (asking) {
    return (
      <PinGate
        title="Grown-ups only"
        prompt="Enter the code to unlock Brainy"
        emoji="🔓"
        onBack={() => setAsking(false)}
        onPass={() => setLocked(false)}
      />
    )
  }

  return (
    <Screen className="max-w-lg">
      <div className="pt-10 text-center">
        <div className="mx-auto size-40 sm:size-48 opacity-90">
          <Mascot
            characterId={economy.equipped.character}
            petId={economy.equipped.pet}
            mood="think"
            variant="buddy"
            float
            className="w-full h-full"
          />
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-black text-brand-900">Taking a break</h1>
        <p className="mt-2 text-lg font-bold text-brand-500">
          Brainy is having a rest{profile.name ? `, ${profile.name}` : ''}. Come back a bit later!
        </p>
      </div>

      {note.trim() && (
        <Card className="mt-6 p-5 text-center border-amber-300 bg-amber-50">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            A message for you
          </p>
          <p className="mt-1 text-lg font-black text-amber-900">{note.trim()}</p>
        </Card>
      )}

      <div className="mt-8 text-center">
        <Btn variant="secondary" size="md" onClick={() => setAsking(true)}>
          👤 I&apos;m a grown-up
        </Btn>
      </div>
    </Screen>
  )
}
