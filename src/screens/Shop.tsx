/** The Kolo — spend coins on things that are purely for fun. */

import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { Btn, Card, IconBtn, Pill, Screen } from '../components/ui'
import { COSMETICS, SLOT_LABEL, type CosmeticSlot } from '../game/cosmetics'
import { sfx } from '../lib/sound'
import { useStore } from '../state/store'

const SLOTS: CosmeticSlot[] = ['hat', 'eyes', 'neck', 'room']

export function Shop({ onBack }: { onBack: () => void }) {
  const { profile, economy, purchase, equip } = useStore()
  const [slot, setSlot] = useState<CosmeticSlot>('hat')
  const [preview, setPreview] = useState<string | null>(null)

  const items = COSMETICS.filter((c) => c.slot === slot)
  const previewItem = preview ? COSMETICS.find((c) => c.id === preview) : undefined

  /* Show the mascot wearing whatever card is being looked at. */
  const worn = {
    hat: economy.equipped.hat,
    eyes: economy.equipped.eyes,
    neck: economy.equipped.neck,
  }
  if (previewItem && previewItem.slot !== 'room') {
    worn[previewItem.slot as 'hat' | 'eyes' | 'neck'] = previewItem.id
  }

  return (
    <Screen>
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label="Back" onClick={onBack}>
          ←
        </IconBtn>
        <h1 className="flex-1 text-2xl font-black text-brand-900">🛍️ The Kolo Shop</h1>
        <Pill className="bg-amber-100 text-amber-900 text-lg">🪙 {economy.coins}</Pill>
      </header>

      <Card className="mt-4 p-4 flex items-center gap-4">
        <div className="size-28 sm:size-32 shrink-0">
          <Mascot colour={profile.colour} mood="happy" {...worn} className="w-full h-full" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black text-brand-900">Dress up Kolo</p>
          <p className="text-sm font-bold text-brand-500">
            Everything here is just for fun — it never changes the questions or makes anything easier.
          </p>
        </div>
      </Card>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {SLOTS.map((s) => (
          <button
            key={s}
            onClick={() => {
              sfx.tap()
              setSlot(s)
              setPreview(null)
            }}
            className={`shrink-0 min-h-12 rounded-2xl border-3 px-5 font-black transition
              ${s === slot ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-200 bg-white text-brand-700'}`}
            style={{ borderWidth: 3 }}
          >
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const owned = economy.owned.includes(item.id)
          const equipped = economy.equipped[item.slot] === item.id
          const affordable = economy.coins >= item.price

          return (
            <Card
              key={item.id}
              className={`p-3 text-center ${equipped ? 'border-emerald-400 bg-emerald-50' : ''}`}
              onClick={() => setPreview(item.id)}
            >
              <div className="text-4xl sm:text-5xl">{item.emoji}</div>
              <p className="mt-1 font-black text-brand-900 text-sm sm:text-base leading-tight">{item.name}</p>

              {owned ? (
                <Btn
                  size="sm"
                  full
                  className="mt-2"
                  variant={equipped ? 'success' : 'secondary'}
                  onClick={() => equip(item.slot, equipped ? null : item.id)}
                >
                  {equipped ? 'Wearing ✓' : 'Wear'}
                </Btn>
              ) : (
                <Btn
                  size="sm"
                  full
                  className="mt-2"
                  variant={affordable ? 'gold' : 'secondary'}
                  disabled={!affordable}
                  onClick={() => {
                    if (purchase(item.id)) sfx.unlock()
                  }}
                >
                  🪙 {item.price}
                </Btn>
              )}
            </Card>
          )
        })}
      </div>

      <p className="mt-6 text-center text-sm font-bold text-brand-400">
        Earn coins by finishing quests. Every quest pays, however it goes.
      </p>
    </Screen>
  )
}
