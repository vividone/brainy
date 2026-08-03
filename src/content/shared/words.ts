/** Number-to-words for 0–9999, plus Roman numerals. Used across content packs. */

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
]

export function numberToWords(n: number): string {
  if (n < 0) return `minus ${numberToWords(-n)}`
  if (n < 20) return ONES[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const rest = n % 100
    return rest === 0 ? `${ONES[h]} hundred` : `${ONES[h]} hundred and ${numberToWords(rest)}`
  }
  const th = Math.floor(n / 1000)
  const rest = n % 1000
  const head = `${numberToWords(th)} thousand`
  if (rest === 0) return head
  return rest < 100 ? `${head} and ${numberToWords(rest)}` : `${head}, ${numberToWords(rest)}`
}

export const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

const ORDINALS = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
  'twentieth',
]

export const ordinalWord = (n: number): string => ORDINALS[n] ?? `${n}th`

export function ordinalShort(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

const ROMAN_PAIRS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(n: number): string {
  let out = ''
  let rest = n
  for (const [value, glyph] of ROMAN_PAIRS) {
    while (rest >= value) {
      out += glyph
      rest -= value
    }
  }
  return out
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
