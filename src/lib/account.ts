/**
 * The parent's account: signing in, and what that unlocks.
 *
 * Signing in *is* signing up — a parent proves they can read an inbox and that
 * both creates the account and returns them to an existing one. There is no
 * password, so there is nothing to forget and no reset flow to build; the code
 * that arrives by email is the same mechanism a reset would have used anyway.
 *
 * The token this returns is the answer to "I installed the app and lost
 * everything". It is held in the save so a device stays signed in, and it is
 * revocable per device from the server — losing a tablet does not mean rotating
 * anything for the tablets still in the house.
 *
 * Same rule as the licence: **the network is never allowed to take something
 * away.** A failed request leaves the device exactly as it was. Only a definite
 * 401 from the server clears a token, because only that means it is genuinely
 * dead rather than briefly unreachable.
 */

import type { Licence, StoredLicence } from './licence'

const TIMEOUT_MS = 12_000

const OFFLINE = 'Could not reach us just now. Check the connection and try again.'

export interface Account {
  email: string
  name: string | null
  /** Whether this account keeps a child's progress. False for every new one. */
  keepProgress: boolean
  /** True only on the request that created the account. */
  isNew?: boolean
}

export interface SignInResult {
  ok: boolean
  error?: string
  token?: string
  account?: Account
  licence?: StoredLicence
}

async function send(
  url: string,
  init?: { method?: string; body?: unknown; token?: string | null },
): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {}
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json'
    if (init?.token) headers.Authorization = `Bearer ${init.token}`

    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
    return { status: res.status, data }
  } finally {
    clearTimeout(timer)
  }
}

const stored = (licence: Licence): StoredLicence => ({ ...licence, checkedAt: Date.now() })

/**
 * Something the parent can recognise in a list of their own devices.
 *
 * Coarse on purpose — "Chrome on Android", not a fingerprint. Its whole job is
 * letting somebody tell the tablet they still have from the one they lost.
 */
export function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'A device'
  const ua = navigator.userAgent
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iPhone or iPad'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'A device'
  const browser = /EdgA?\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'a browser'
  const installed = isStandalone() ? ', installed' : ''
  return `${browser} on ${os}${installed}`
}

/** Whether we are running as an installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    /* iOS Safari's own flag, which predates the standard and is still the only
       way to detect a home-screen app there. */
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

/* ------------------------------------------------------------------ *
 * Signing in
 * ------------------------------------------------------------------ */

/**
 * Ask for a six-digit code.
 *
 * Answers `ok` for any well-formed address, including one with no account,
 * because the server will not say which addresses it knows — so the app must not
 * imply it can either. The copy tells parents to check the spelling if nothing
 * arrives, which is the honest consequence.
 */
export async function requestCode(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { status, data } = await send('/api/auth/code', { method: 'POST', body: { email } })
    if (status === 200 && data?.ok) return { ok: true }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/** Exchange the code for a device token. Creates the account if it is new. */
export async function verifyCode(email: string, code: string, name?: string): Promise<SignInResult> {
  try {
    const { status, data } = await send('/api/auth/verify', {
      method: 'POST',
      body: { email, code, name, label: deviceLabel() },
    })
    if (status === 200 && data?.ok) {
      return {
        ok: true,
        token: data.token as string,
        account: data.account as Account,
        licence: data.licence ? stored(data.licence as Licence) : undefined,
      }
    }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/* ------------------------------------------------------------------ *
 * Using the account
 * ------------------------------------------------------------------ */

export interface AccountSnapshot {
  account: Account
  licence: StoredLicence
  children: { id: string; name: string | null; age: number | null; updatedAt: string }[]
}

/**
 * Everything the server holds for this account.
 *
 * `gone: true` means the token is genuinely dead — signed out elsewhere, or
 * revoked — and is the only answer that should clear it locally.
 */
export async function fetchAccount(
  token: string,
): Promise<{ ok: boolean; snapshot?: AccountSnapshot; gone?: boolean; error?: string }> {
  try {
    const { status, data } = await send('/api/account', { token })
    if (status === 200 && data?.ok) {
      return {
        ok: true,
        snapshot: {
          account: data.account as Account,
          licence: stored(data.licence as Licence),
          children: (data.children as AccountSnapshot['children']) ?? [],
        },
      }
    }
    if (status === 401) return { ok: false, gone: true, error: (data?.error as string) ?? 'Signed out.' }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}

/** Revoke this device's token. Best-effort: the local clear happens regardless. */
export async function signOut(token: string): Promise<void> {
  try {
    await send('/api/auth/signout', { method: 'POST', token })
  } catch {
    /*
     * Nothing to do. The parent asked to sign out and the local token is being
     * dropped either way — leaving a revocable token on the server is a smaller
     * problem than refusing to sign someone out because the network is down.
     */
  }
}

/** Turn keeping a child's progress on or off. Off also deletes what was kept. */
export async function setKeepProgress(
  token: string,
  on: boolean,
): Promise<{ ok: boolean; keepProgress?: boolean; error?: string }> {
  try {
    const { status, data } = await send('/api/account/keep-progress', {
      method: 'POST',
      token,
      body: { on },
    })
    if (status === 200 && data?.ok) return { ok: true, keepProgress: Boolean(data.keepProgress) }
    return { ok: false, error: (data?.error as string) ?? `Server returned ${status}.` }
  } catch {
    return { ok: false, error: OFFLINE }
  }
}
