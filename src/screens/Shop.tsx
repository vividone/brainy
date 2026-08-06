/** The shop — spend earned coins on characters, pets and things to wear. */

import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { Character } from '../components/Character'
import { Pet } from '../components/Pet'
import { Btn, Card, IconBtn, Pill, Screen } from '../components/ui'
import { COSMETICS, SLOT_LABEL, type CosmeticSlot } from '../game/cosmetics'
import { CHARACTERS, PETS, characterById, petById } from '../game/characters'
import { sfx } from '../lib/sound'
import { useLearnerData, useStore } from '../state/store'

const SLOTS: CosmeticSlot[] = ['character', 'pet', 'hat', 'eyes', 'neck', 'room']

/** Which equip slot an item id belongs to. Ids are namespaced by slot. */
const slotOf = (id: string): CosmeticSlot =>
  id.startsWith('char.') ? 'character' : (id.split('.')[0] as CosmeticSlot)

export function Shop({ onBack }: { onBack: () => void }) {
  const { economy } = useLearnerData()
  const purchase = useStore((s) => s.purchase)
  const equip = useStore((s) => s.equip)
  const [slot, setSlot] = useState<CosmeticSlot>('character')
  const [preview, setPreview] = useState<string | null>(null)

  /* Rows for the current tab, whichever roster they come from. */
  const rows: { id: string; name: string; price: number }[] =
    slot === 'character'
      ? CHARACTERS.map((c) => ({ id: c.id, name: c.name, price: c.price }))
      : slot === 'pet'
        ? PETS.map((p) => ({ id: p.id, name: p.name, price: p.price }))
        : COSMETICS.filter((c) => c.slot === slot).map((c) => ({
            id: c.id,
            name: c.name,
            price: c.price,
          }))

  /* Show the avatar wearing or being whatever card is under the finger. */
  const worn: Record<string, string | undefined> = {
    character: economy.equipped.character,
    pet: economy.equipped.pet,
    hat: economy.equipped.hat,
    eyes: economy.equipped.eyes,
    neck: economy.equipped.neck,
  }
  if (preview) worn[slotOf(preview)] = preview

  const owned = new Set(economy.owned)
  const collected = rows.filter((r) => owned.has(r.id)).length

  return (
    <Screen>
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label="Back" onClick={onBack}>
          ←
        </IconBtn>
        <h1 className="flex-1 text-2xl font-black text-brand-900">🛍️ Shop</h1>
        <Pill className="bg-amber-100 text-amber-900 text-lg">🪙 {economy.coins}</Pill>
      </header>

      <Card className="mt-4 p-4 flex items-center gap-4">
        <div className="size-32 sm:size-36 shrink-0">
          <Mascot
            characterId={worn.character}
            petId={worn.pet}
            hat={worn.hat}
            eyes={worn.eyes}
            neck={worn.neck}
            mood="happy"
            variant="buddy"
            className="w-full h-full"
          />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black text-brand-900">
            {characterById(worn.character).name} &amp; {petById(worn.pet).name.split(' ')[0]}
          </p>
          <p className="text-sm font-bold text-brand-500">
            Tap anything to try it on. Everything here is just for fun. It never changes the questions
            or makes anything easier.
          </p>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {SLOTS.map((s) => (
          <button
            key={s}
            onClick={() => {
              sfx.tap()
              setSlot(s)
              setPreview(null)
            }}
            className={`min-h-12 rounded-2xl border-3 px-2 text-sm font-black transition
              ${s === slot ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-200 bg-white text-brand-700'}`}
            style={{ borderWidth: 3 }}
          >
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm font-black uppercase tracking-wide text-brand-400">
        {SLOT_LABEL[slot]} · {collected} of {rows.length} collected
      </p>

      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map((item) => {
          const isOwned = owned.has(item.id)
          const itemSlot = slotOf(item.id)
          const isEquipped = economy.equipped[itemSlot] === item.id
          const affordable = economy.coins >= item.price
          const cosmetic = COSMETICS.find((c) => c.id === item.id)

          return (
            <Card
              key={item.id}
              className={`p-3 text-center ${isEquipped ? 'border-emerald-400 bg-emerald-50' : ''}`}
              onClick={() => setPreview(item.id)}
            >
              <div className="h-24 grid place-items-center">
                {itemSlot === 'character' ? (
                  <Character def={characterById(item.id)} mood="happy" className="h-24" />
                ) : itemSlot === 'pet' ? (
                  <Pet def={petById(item.id)} mood="happy" className="h-24" />
                ) : (
                  <span className="text-5xl">{cosmetic?.emoji}</span>
                )}
              </div>

              <p className="mt-1 font-black text-brand-900 text-sm leading-tight truncate">{item.name}</p>

              {isOwned ? (
                <Btn
                  size="sm"
                  full
                  className="mt-2"
                  variant={isEquipped ? 'success' : 'secondary'}
                  onClick={() => {
                    // A child must always have a character and a pet, so those
                    // two can be swapped but never taken off.
                    const removable = itemSlot !== 'character' && itemSlot !== 'pet'
                    equip(itemSlot, isEquipped && removable ? null : item.id)
                  }}
                >
                  {isEquipped ? 'Chosen ✓' : 'Choose'}
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
