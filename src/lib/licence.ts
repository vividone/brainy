/**
 * The app's side of access: redeeming a code, unlocking, and checking later.
 *
 * The design rule everything here follows: **the network is never allowed to
 * take access away from a child in the moment.** A licence is stored on the
 * device and believed; the server is asked again occasionally, and only a
 * definite answer — this code is revoked, this code does not exist — changes
 * anything. A failed request, a flat signal, a tablet in a car: all of those
 * leave the licence exactly as it was.
 *
 * The cost of that is a revoked licence can keep working offline for a while.
 * That is the right trade for a practice app: the alternative punishes the one
 * user who did nothing wrong.
 */

const TIMEOUT_MS = 10_000

export type Plan = 'none' | 'free-forever' | 'annual' | 'lifetime'
export type LicenceStatus = 'pending' | 'active' | 'expired' | 'revoked'

/** Exactly what the server sends back, and nothing the client invents. */
export interface Licence {
  code: string
  plan: Plan
  status: LicenceStatus
  /** The server's own verdict at the moment it answered. */
  full: boolean
  /**
   * How many children the family has told us about. Informational only: access
   * is per family, so this grants and limits nothing. See state/entitlement.ts.
   */
  children: number
  email: string | null
  name: string | null
  startedAt: string | null
  /** ISO timestamp, or null for a licence that never expires. */
  expiresAt: string | null
  planLabel: string | null
}

export interface StoredLicence extends Licence {
  /** When we last had a straight answer from the server, in ms. */
  checkedAt: number
}

export interface Attempt {
  ok: boolean
  licence?: StoredLicence
  error?: string
  /** The code was a coupon and we still need an address to attach it to. */
  needsEmail?: boolean
  /** The server does not know this code. Safe to forget it locally. */
  gone?: boolean
  /**
   * An email really went out. Only ever true when the server sent one, so the
   * app never tells a parent to check an inbox that will stay empty.
   */
  emailed?: boolean
}

const store = (licence: Licence): StoredLicence => ({ ...licence, checkedAt: Date.now() })

async function send(
  url: string,
  init?: { method: 'POST'; body: unknown },
): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init ? { 'Content-Type': 'application/json' } : undefined,
      body: init ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
    return { status: res.status, data }
  } finally {
    clearTimeout(timer)
  }
}

const OFFLINE = 'Could not reach us just now. Check the connection and try again.'

export interface PlanOffer {
  id: 'annual' | 'lifetime'
  label: string
  /** Minor units — kobo. Divide by 100 to show it. */
  amount: number
  months: number | null
}

/** Where to send a bank transfer, when card checkout is not how a family pays. */
export interface TransferDetails {
  enabled: boolean
  bank: string | null
  accountName: string | null
  accountNumber: string | null
  instructions: string | null
}

export interface Prices {
  enabled: boolean
  currency: string
  plans: PlanOffer[]
  transfer: TransferDetails
}

/**
 * What the plans cost, from the server.
 *
 * Never hardcoded in the app: a price in the bundle is a price that goes stale
 * on every tablet that has not updated, and the amount actually charged is
 * decided server-side anyway.
 */
export async function prices(): Promise<Prices | null> {
  try {
    const { status, data } = await send('/api/pay/initialise')
    if (status !== 200 || !data?.ok) return null
    return {
      enabled: Boolean(data.enabled),
      currency: (data.currency as string) ?? 'NGN',
      plans: (data.plans as PlanOffer[]) ?? [],
      transfer: (data.transfer as TransferDetails) ?? {
        enabled: false,
        bank: null,
        accountName: null,
        accountNumber: null,
        instructions: null,
      },
    }
  } catch {
    return null
  }
}

/**
 * Tell us a bank transfer has been made.
 *
 * Grants nothing — see server/routes/pay/request.js. The parent is told so plainly, because
 * an interface that implies "paid, therefore unlocked" and then does not unlock
 * is worse than one that says "we will check and email you".
 */
export async function submitTransfer(input: {
  email: string
  plan: 'annual' | 'lifetime'
  name?: string
  phone?: string
  amount?: number
  senderName?: string
  reference?: string
  paidOn?: string
  note?: string
  /** Base64 of the receipt, without the data-URL prefix. */
  proof?: string
  proofType?: string
}): Promise<{ ok: boolean; emailed?: boolean; error?: string }> {
  try {
    const { status, data } = await send('/api/pay/request', { method: 'POST', body: input })
    if (status === 200 && data?.ok) return { ok: true, emailed: Boolean(data.emailed) }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/** A file input's contents as base64, ready to post. */
export function readAsBase64(file: File): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      /* `data:image/png;base64,AAA…` — the server wants only the tail. */
      resolve({ base64: result.slice(result.indexOf(',') + 1), type: file.type })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * `₦5,000` from 500000 kobo.
 *
 * `narrowSymbol` matters more than it looks: left to the device's own locale, a
 * browser set to anything other than Nigerian English renders NGN as the letters
 * "NGN 5,000" rather than the symbol. A Nigerian parent seeing a currency code
 * where a naira sign belongs reads it as a foreign price, which is the opposite
 * of the intended impression. The locale is still the device's, so grouping and
 * decimals stay familiar — only the symbol is pinned.
 */
export function formatMoney(minor: number, currency: string): string {
  const value = minor / 100
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }
  try {
    return value.toLocaleString(undefined, options)
  } catch {
    /* `narrowSymbol` throws on older engines rather than degrading. */
    try {
      return value.toLocaleString(undefined, { ...options, currencyDisplay: 'symbol' })
    } catch {
      return `${currency} ${value.toLocaleString()}`
    }
  }
}

/** Redeem a coupon, or re-attach a family's own access code on a new device. */
export async function activate(input: {
  code: string
  email?: string
  name?: string
  installId?: string | null
}): Promise<Attempt> {
  try {
    const { status, data } = await send('/api/activate', {
      method: 'POST',
      body: {
        code: input.code,
        email: input.email,
        name: input.name,
        installId: input.installId ?? undefined,
      },
    })
    if (status === 200 && data?.ok) {
      return { ok: true, licence: store(data.licence as Licence), emailed: Boolean(data.emailed) }
    }
    return {
      ok: false,
      needsEmail: Boolean(data?.needsEmail),
      error: (data?.error as string) ?? 'That did not work. Check the code and try again.',
    }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/**
 * Ask whether a stored licence still holds.
 *
 * Returns `gone` only for a code the server positively does not recognise —
 * every other failure is treated as "ask again later".
 */
export async function revalidate(code: string, installId?: string | null): Promise<Attempt> {
  const params = new URLSearchParams({ code })
  if (installId) params.set('installId', installId)
  try {
    const { status, data } = await send(`/api/activate?${params.toString()}`)
    if (status === 200 && data?.ok) return { ok: true, licence: store(data.licence as Licence) }
    if (status === 404) return { ok: false, gone: true, error: (data?.error as string) ?? 'Unknown code.' }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/** Leave an email address without unlocking anything. */
export async function signUp(input: {
  email: string
  name?: string
  phone?: string
  children?: number
  code?: string
  installId?: string | null
}): Promise<Attempt & { note?: string }> {
  try {
    const { status, data } = await send('/api/signup', {
      method: 'POST',
      body: { ...input, installId: input.installId ?? undefined, source: 'app' },
    })
    if (status === 200 && data?.ok) {
      return {
        ok: true,
        licence: store(data.licence as Licence),
        note: (data.note as string) ?? undefined,
        emailed: Boolean(data.emailed),
      }
    }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/**
 * Start a checkout and hand back where to send the parent.
 *
 * Deliberately returns the URL rather than navigating: the caller is inside the
 * grown-up area and gets to decide, and a redirect fired from a library is the
 * kind of thing that happens to a parent who tapped something else.
 */
export async function checkout(input: {
  email: string
  plan: 'annual' | 'lifetime'
  name?: string
  installId?: string | null
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const { status, data } = await send('/api/pay/initialise', {
      method: 'POST',
      body: { ...input, installId: input.installId ?? undefined },
    })
    if (status === 200 && data?.ok) return { ok: true, url: data.authorizationUrl as string }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/** Finish a checkout the parent has just come back from. */
export async function claim(reference: string, installId?: string | null): Promise<Attempt> {
  const params = new URLSearchParams({ reference })
  if (installId) params.set('installId', installId)
  try {
    const { status, data } = await send(`/api/activate?${params.toString()}`)
    if (status === 200 && data?.ok) return { ok: true, licence: store(data.licence as Licence) }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/**
 * Whether a stored licence entitles this device right now.
 *
 * Evaluated locally against the dates rather than trusting the `full` flag
 * from whenever it was last checked — otherwise a year that ran out while the
 * tablet was offline would never actually run out.
 */
export function entitled(licence: StoredLicence | null | undefined): boolean {
  if (!licence) return false
  if (licence.status !== 'active') return false
  if (!licence.expiresAt) return true
  return new Date(licence.expiresAt).getTime() > Date.now()
}

/** How long since the licence was last confirmed, in days. */
export const daysSinceCheck = (licence: StoredLicence | null | undefined): number =>
  licence ? Math.floor((Date.now() - licence.checkedAt) / 86_400_000) : 0
