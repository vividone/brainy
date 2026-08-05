/* Throwaway: seeds a save, opens the grown-up area, and screenshots Settings. */
import { writeFile } from 'node:fs/promises'
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const mine = ++id; pending.set(mine, res); ws.send(JSON.stringify({ id: mine, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception))
  return r.result?.result?.value
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await send('Page.enable'); await send('Runtime.enable')

const BASE = 'http://127.0.0.1:4340/play/'
await send('Page.navigate', { url: BASE })
await wait(1200)

/* A save with one child, already onboarded, PIN 1234. `merge` fills the rest. */
const save = {
  state: {
    version: 3, onboarded: true,
    learners: [{ id: 'L1', name: 'Tunde', curriculumId: 'ng-ube', yearBand: 'b3', age: 7, colour: 'violet', createdAt: 0 }],
    activeLearnerId: 'L1', data: { L1: {} },
    device: { parentPin: '1234', sound: false },
  },
  version: 3,
}
await evaluate(`localStorage.setItem('kolo.save.v1', ${JSON.stringify(JSON.stringify(save))}); 'seeded'`)
await send('Page.navigate', { url: BASE })
await wait(1800)
console.log('home for:', await evaluate(`(document.body.innerText.match(/Hi \w+/) || ['?'])[0]`))

/* Grown-ups button, then the PIN pad, then Settings. */
await evaluate(`[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Grown-ups')?.click(); 'x'`)
await wait(800)
for (const d of ['1', '2', '3', '4']) {
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === '${d}')?.click(); 'x'`)
  await wait(150)
}
await wait(900)
console.log('in parent zone:', await evaluate(`document.body.innerText.includes('Progress')`))
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Settings'))?.click(); 'x'`)
await wait(1000)

const field = `document.querySelector('input[aria-label="Grown-up code"]')`
console.log('field type      :', await evaluate(`${field}.type`))
console.log('value present   :', await evaluate(`${field}.value`))
const eye = `[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').includes('the code'))`
console.log('eye label       :', await evaluate(`${eye}.getAttribute('aria-label')`))
/* Scroll it into view so the screenshot shows the field, not the top of the page. */
await evaluate(`${field}.scrollIntoView({ block: 'center' }); 'x'`)
await wait(400)
const before = await send('Page.captureScreenshot', {})
await writeFile(process.argv[2], Buffer.from(before.result.data, 'base64'))
await evaluate(`${eye}.click(); 'x'`)
await wait(400)
console.log('after click     :', await evaluate(`${field}.type`))
console.log('eye label now   :', await evaluate(`${eye}.getAttribute('aria-label')`))
console.log('value intact    :', await evaluate(`${field}.value`))
const after = await send('Page.captureScreenshot', {})
await writeFile(process.argv[3], Buffer.from(after.result.data, 'base64'))
ws.close()
