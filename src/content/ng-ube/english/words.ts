/**
 * Graded word banks for the English Grammar pack.
 *
 * Every skill generator draws from here rather than hard-coding words, which
 * is what turns thirty-odd skills into hundreds of thousands of distinct
 * questions. Words are tagged with a tier (1 = Basic 1–2 reading level,
 * 2 = Basic 3–4, 3 = Basic 5–6) so a Basic 1 child never meets "extraordinary".
 *
 * Spelling is British/Nigerian throughout: colour, neighbour, organise,
 * travelling, and `practise` as a verb against `practice` as a noun.
 *
 * Accuracy rules followed while authoring:
 *  - words with two defensible plurals (mango/mangos, buffalo, scarf) are kept
 *    out of the plural banks entirely;
 *  - words that are both noun and verb (play, work, watch, fish) are kept out
 *    of the part-of-speech banks, where position alone would not settle it;
 *  - two-syllable adjectives that take either -er or "more" (clever, polite,
 *    simple) are excluded from the comparative banks.
 */

import type { Rng } from '../../../engine/rng'

export type Tier = 1 | 2 | 3

const tierCap = (difficulty: number): Tier => (difficulty <= 2 ? 1 : difficulty <= 3 ? 2 : 3)

/** Everything at or below the reading tier this difficulty allows. */
export function graded<T extends { tier: Tier }>(list: readonly T[], difficulty: number): T[] {
  const cap = tierCap(difficulty)
  const out = list.filter((w) => w.tier <= cap)
  return out.length >= 4 ? out : list.slice()
}

/* ------------------------------------------------------------------ *
 * Names — gendered, because pronoun work needs to know
 * ------------------------------------------------------------------ */

export const GIRLS = [
  'Ada', 'Amaka', 'Bisi', 'Ngozi', 'Halima', 'Funke', 'Zainab', 'Ifeoma', 'Chioma', 'Aisha',
  'Folake', 'Kemi', 'Nkechi', 'Hauwa', 'Adaeze', 'Fatima', 'Ebere', 'Sade', 'Maryam', 'Uduak',
]

export const BOYS = [
  'Chidi', 'Tunde', 'Emeka', 'Segun', 'Musa', 'Obi', 'Kunle', 'Yusuf', 'Ibrahim', 'Femi',
  'Bode', 'Sani', 'Chinedu', 'Nnamdi', 'Gbenga', 'Ifeanyi', 'Okon', 'Dele', 'Ekene', 'Bala',
]

export const PLACES = [
  'Lagos', 'Abuja', 'Ibadan', 'Kano', 'Enugu', 'Jos', 'Benin', 'Calabar', 'Kaduna', 'Owerri',
  'Nigeria', 'Africa', 'Aba', 'Uyo', 'Sokoto', 'Warri', 'Ilorin', 'Zaria', 'Onitsha', 'Minna',
]

export const DAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* ------------------------------------------------------------------ *
 * Nouns
 * ------------------------------------------------------------------ */

export interface NounWord {
  s: string
  p: string
  tier: Tier
  /** Extra wrong plurals worth offering — the errors children really write. */
  wrong?: string[]
}

const n = (s: string, p: string, tier: Tier, wrong?: string[]): NounWord => ({ s, p, tier, wrong })

/** Plural is simply + s. */
export const REGULAR_NOUNS: NounWord[] = [
  n('boy', 'boys', 1), n('girl', 'girls', 1), n('cat', 'cats', 1), n('dog', 'dogs', 1),
  n('goat', 'goats', 1), n('hen', 'hens', 1), n('cow', 'cows', 1), n('bird', 'birds', 1),
  n('ball', 'balls', 1), n('cup', 'cups', 1), n('book', 'books', 1), n('bag', 'bags', 1),
  n('hat', 'hats', 1), n('door', 'doors', 1), n('chair', 'chairs', 1), n('table', 'tables', 1),
  n('bed', 'beds', 1), n('car', 'cars', 1), n('tree', 'trees', 1), n('drum', 'drums', 1),
  n('shoe', 'shoes', 1), n('mat', 'mats', 1), n('pen', 'pens', 1), n('egg', 'eggs', 1),
  n('road', 'roads', 1), n('house', 'houses', 1), n('gate', 'gates', 1), n('plate', 'plates', 1),
  n('spoon', 'spoons', 1), n('lamp', 'lamps', 1), n('king', 'kings', 1), n('cap', 'caps', 1),
  n('hill', 'hills', 1), n('seed', 'seeds', 1), n('yam', 'yams', 1), n('cake', 'cakes', 1),
  n('coin', 'coins', 1), n('flag', 'flags', 1), n('farm', 'farms', 1), n('sock', 'socks', 1),
  n('bell', 'bells', 1), n('boat', 'boats', 1), n('rope', 'ropes', 1), n('stone', 'stones', 1),
  n('teacher', 'teachers', 2), n('farmer', 'farmers', 2), n('basket', 'baskets', 2),
  n('window', 'windows', 2), n('garden', 'gardens', 2), n('pencil', 'pencils', 2),
  n('bicycle', 'bicycles', 2), n('letter', 'letters', 2), n('picture', 'pictures', 2),
  n('river', 'rivers', 2), n('village', 'villages', 2), n('cousin', 'cousins', 2),
  n('uniform', 'uniforms', 2), n('blanket', 'blankets', 2), n('doctor', 'doctors', 2),
  n('driver', 'drivers', 2), n('lesson', 'lessons', 2), n('bucket', 'buckets', 2),
  n('kitchen', 'kitchens', 2), n('engine', 'engines', 2), n('market', 'markets', 2),
  n('ladder', 'ladders', 2), n('curtain', 'curtains', 2), n('sandal', 'sandals', 2),
  n('mattress', 'mattresses', 3), n('cupboard', 'cupboards', 2), n('classroom', 'classrooms', 2),
  n('radio', 'radios', 2), n('key', 'keys', 1), n('wall', 'walls', 1), n('floor', 'floors', 2),
  n('roof', 'roofs', 2), n('ruler', 'rulers', 2), n('eraser', 'erasers', 2),
  n('tailor', 'tailors', 2), n('hospital', 'hospitals', 2), n('umbrella', 'umbrellas', 2),
  n('pineapple', 'pineapples', 2), n('groundnut', 'groundnuts', 2), n('chief', 'chiefs', 2),
  n('envelope', 'envelopes', 2), n('calendar', 'calendars', 2), n('palace', 'palaces', 2),
  n('hunter', 'hunters', 2), n('tortoise', 'tortoises', 2), n('neighbour', 'neighbours', 3),
  n('passenger', 'passengers', 3), n('machine', 'machines', 3), n('museum', 'museums', 3),
  n('president', 'presidents', 3), n('mechanic', 'mechanics', 3), n('harvest', 'harvests', 3),
  n('principal', 'principals', 3), n('generator', 'generators', 3), n('stadium', 'stadiums', 3),
  n('announcement', 'announcements', 3), n('invitation', 'invitations', 3),
  n('journalist', 'journalists', 3), n('carpenter', 'carpenters', 3), n('architect', 'architects', 3),
  n('instrument', 'instruments', 3), n('telephone', 'telephones', 3), n('television', 'televisions', 3),
  n('transformer', 'transformers', 3), n('signature', 'signatures', 3), n('adventure', 'adventures', 3),
  n('celebration', 'celebrations', 3), n('treasure', 'treasures', 3), n('magazine', 'magazines', 3),
]

/** Plural takes -es: hissing and hushing endings, and -o words that are settled. */
export const ES_NOUNS: NounWord[] = [
  n('bus', 'buses', 1), n('box', 'boxes', 1), n('dish', 'dishes', 1), n('brush', 'brushes', 1),
  n('church', 'churches', 1), n('bench', 'benches', 2), n('glass', 'glasses', 1),
  n('dress', 'dresses', 1), n('class', 'classes', 1), n('fox', 'foxes', 1), n('match', 'matches', 2),
  n('branch', 'branches', 2), n('sandwich', 'sandwiches', 2), n('bush', 'bushes', 2),
  n('wish', 'wishes', 2), n('beach', 'beaches', 2), n('coach', 'coaches', 2), n('torch', 'torches', 2),
  n('lunch', 'lunches', 2), n('speech', 'speeches', 3), n('peach', 'peaches', 2),
  n('inch', 'inches', 2), n('address', 'addresses', 3), n('princess', 'princesses', 2),
  n('boss', 'bosses', 2), n('ash', 'ashes', 2), n('tomato', 'tomatoes', 2, ['tomatos']),
  n('potato', 'potatoes', 2, ['potatos']), n('hero', 'heroes', 2, ['heros']),
  n('echo', 'echoes', 3, ['echos']),
]

/** Consonant + y, so the y turns into -ies. */
export const IES_NOUNS: NounWord[] = [
  n('baby', 'babies', 1), n('lady', 'ladies', 1), n('city', 'cities', 2), n('story', 'stories', 1),
  n('party', 'parties', 2), n('family', 'families', 2), n('country', 'countries', 2),
  n('puppy', 'puppies', 1), n('lorry', 'lorries', 2), n('army', 'armies', 2), n('pony', 'ponies', 2),
  n('berry', 'berries', 2), n('diary', 'diaries', 3), n('factory', 'factories', 3),
  n('library', 'libraries', 3), n('laboratory', 'laboratories', 3), n('copy', 'copies', 2),
  n('body', 'bodies', 2), n('duty', 'duties', 3), n('ceremony', 'ceremonies', 3),
  n('butterfly', 'butterflies', 2), n('cherry', 'cherries', 2), n('hobby', 'hobbies', 3),
  n('university', 'universities', 3), n('dictionary', 'dictionaries', 3), n('activity', 'activities', 3),
  n('community', 'communities', 3),
]

/** Vowel + y, so the y stays and we simply add -s. The trap for -ies. */
export const YS_NOUNS: NounWord[] = [
  n('boy', 'boys', 1), n('day', 'days', 1), n('toy', 'toys', 1), n('tray', 'trays', 2),
  n('monkey', 'monkeys', 1), n('donkey', 'donkeys', 2), n('valley', 'valleys', 3),
  n('journey', 'journeys', 3), n('chimney', 'chimneys', 3), n('trolley', 'trolleys', 3),
  n('turkey', 'turkeys', 2), n('essay', 'essays', 3), n('birthday', 'birthdays', 2),
  n('holiday', 'holidays', 2), n('key', 'keys', 1),
]

/** -f / -fe becomes -ves. */
export const VES_NOUNS: NounWord[] = [
  n('leaf', 'leaves', 1, ['leafs']), n('knife', 'knives', 2, ['knifes']),
  n('wife', 'wives', 2, ['wifes']), n('life', 'lives', 2, ['lifes']),
  n('thief', 'thieves', 2, ['thiefs']), n('shelf', 'shelves', 2, ['shelfs']),
  n('wolf', 'wolves', 2, ['wolfs']), n('half', 'halves', 2, ['halfs']),
  n('loaf', 'loaves', 2, ['loafs']), n('calf', 'calves', 3, ['calfs']),
  n('self', 'selves', 3, ['selfs']), n('elf', 'elves', 3, ['elfs']),
  n('housewife', 'housewives', 3, ['housewifes']), n('sheaf', 'sheaves', 3, ['sheafs']),
  n('penknife', 'penknives', 3, ['penknifes']),
]

/** -f words that stay regular. Good contrast, and good distractor fodder. */
export const F_REGULAR_NOUNS: NounWord[] = [
  n('roof', 'roofs', 2, ['rooves']), n('chief', 'chiefs', 2, ['chieves']),
  n('cliff', 'cliffs', 3, ['clives']), n('belief', 'beliefs', 3, ['believes']),
  n('proof', 'proofs', 3, ['prooves']),
]

/** No rule at all — these simply have to be known. */
export const IRREGULAR_NOUNS: NounWord[] = [
  n('man', 'men', 1, ['mans', 'mens']),
  n('woman', 'women', 1, ['womans', 'womens']),
  n('child', 'children', 1, ['childs', 'childrens']),
  n('foot', 'feet', 1, ['foots', 'feets']),
  n('tooth', 'teeth', 1, ['tooths', 'teeths']),
  n('mouse', 'mice', 2, ['mouses', 'mices']),
  n('goose', 'geese', 2, ['gooses', 'geeses']),
  n('ox', 'oxen', 3, ['oxes', 'oxens']),
  n('sheep', 'sheep', 1, ['sheeps', 'sheepes']),
  n('deer', 'deer', 2, ['deers', 'deeres']),
  n('policeman', 'policemen', 2, ['policemans', 'policemens']),
  n('postman', 'postmen', 2, ['postmans', 'postmens']),
  n('fisherman', 'fishermen', 3, ['fishermans', 'fishermens']),
  n('gentleman', 'gentlemen', 3, ['gentlemans', 'gentlemens']),
  n('chairman', 'chairmen', 3, ['chairmans', 'chairmens']),
]

/** Deduped: a few words (boy, key, roof) legitimately sit in two classes. */
export const ALL_PLURAL_NOUNS: NounWord[] = (() => {
  const seen = new Set<string>()
  return [
    ...REGULAR_NOUNS, ...ES_NOUNS, ...IES_NOUNS, ...YS_NOUNS, ...VES_NOUNS,
    ...F_REGULAR_NOUNS, ...IRREGULAR_NOUNS,
  ].filter((w) => {
    if (seen.has(w.s)) return false
    seen.add(w.s)
    return true
  })
})()

/** The wrong plurals a child actually writes: over-applied rules and the grocer's apostrophe. */
export function pluralWrongs(word: NounWord): string[] {
  const out: string[] = []
  const seen = new Set([word.p])
  const add = (w: string) => {
    if (!w || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }
  for (const w of word.wrong ?? []) add(w)
  // Skip the forms that would come out as "glasss" or "treees" — a child never
  // writes those, so they are noise rather than a real confusion.
  if (!/s$/.test(word.s)) add(`${word.s}s`)
  if (!/e$/.test(word.s)) add(`${word.s}es`)
  add(`${word.s}'s`)
  add(word.s)
  return out
}

/* ------------------------------------------------------------------ *
 * Verbs
 * ------------------------------------------------------------------ */

export interface VerbWord {
  base: string
  /** Third person singular: he/she/it ___ */
  s: string
  ing: string
  past: string
  tier: Tier
  irregular?: boolean
  /** Overrides the computed "what a child would write" wrong past. */
  wrong?: string[]
}

const v = (base: string, s: string, ing: string, past: string, tier: Tier): VerbWord =>
  ({ base, s, ing, past, tier })

const iv = (base: string, s: string, ing: string, past: string, tier: Tier, wrong?: string[]): VerbWord =>
  ({ base, s, ing, past, tier, irregular: true, wrong })

export const REGULAR_VERBS: VerbWord[] = [
  v('walk', 'walks', 'walking', 'walked', 1),
  v('jump', 'jumps', 'jumping', 'jumped', 1),
  v('talk', 'talks', 'talking', 'talked', 1),
  v('wash', 'washes', 'washing', 'washed', 1),
  v('push', 'pushes', 'pushing', 'pushed', 1),
  v('open', 'opens', 'opening', 'opened', 1),
  v('close', 'closes', 'closing', 'closed', 1),
  v('clean', 'cleans', 'cleaning', 'cleaned', 1),
  v('cook', 'cooks', 'cooking', 'cooked', 1),
  v('pull', 'pulls', 'pulling', 'pulled', 1),
  v('want', 'wants', 'wanting', 'wanted', 1),
  v('ask', 'asks', 'asking', 'asked', 1),
  v('shout', 'shouts', 'shouting', 'shouted', 1),
  v('paint', 'paints', 'painting', 'painted', 1),
  v('plant', 'plants', 'planting', 'planted', 1),
  v('fix', 'fixes', 'fixing', 'fixed', 1),
  v('dance', 'dances', 'dancing', 'danced', 1),
  v('smile', 'smiles', 'smiling', 'smiled', 1),
  v('move', 'moves', 'moving', 'moved', 1),
  v('share', 'shares', 'sharing', 'shared', 1),
  v('fill', 'fills', 'filling', 'filled', 1),
  v('count', 'counts', 'counting', 'counted', 1),
  v('laugh', 'laughs', 'laughing', 'laughed', 1),
  v('climb', 'climbs', 'climbing', 'climbed', 1),
  v('listen', 'listens', 'listening', 'listened', 1),
  v('answer', 'answers', 'answering', 'answered', 2),
  v('follow', 'follows', 'following', 'followed', 2),
  v('finish', 'finishes', 'finishing', 'finished', 2),
  v('start', 'starts', 'starting', 'started', 1),
  v('carry', 'carries', 'carrying', 'carried', 2),
  v('hurry', 'hurries', 'hurrying', 'hurried', 2),
  v('study', 'studies', 'studying', 'studied', 2),
  v('cry', 'cries', 'crying', 'cried', 1),
  v('try', 'tries', 'trying', 'tried', 2),
  v('copy', 'copies', 'copying', 'copied', 2),
  v('stop', 'stops', 'stopping', 'stopped', 1),
  v('clap', 'claps', 'clapping', 'clapped', 1),
  v('drop', 'drops', 'dropping', 'dropped', 2),
  v('beg', 'begs', 'begging', 'begged', 2),
  v('plan', 'plans', 'planning', 'planned', 2),
  v('travel', 'travels', 'travelling', 'travelled', 2),
  v('tidy', 'tidies', 'tidying', 'tidied', 2),
  v('borrow', 'borrows', 'borrowing', 'borrowed', 2),
  v('return', 'returns', 'returning', 'returned', 2),
  v('collect', 'collects', 'collecting', 'collected', 2),
  v('arrange', 'arranges', 'arranging', 'arranged', 2),
  v('greet', 'greets', 'greeting', 'greeted', 2),
  v('thank', 'thanks', 'thanking', 'thanked', 2),
  v('mend', 'mends', 'mending', 'mended', 2),
  v('deliver', 'delivers', 'delivering', 'delivered', 3),
  v('whisper', 'whispers', 'whispering', 'whispered', 3),
  v('promise', 'promises', 'promising', 'promised', 2),
  v('prepare', 'prepares', 'preparing', 'prepared', 2),
  v('practise', 'practises', 'practising', 'practised', 3),
  v('visit', 'visits', 'visiting', 'visited', 2),
  v('knock', 'knocks', 'knocking', 'knocked', 2),
  v('empty', 'empties', 'emptying', 'emptied', 2),
  v('hug', 'hugs', 'hugging', 'hugged', 2),
  v('grab', 'grabs', 'grabbing', 'grabbed', 2),
  v('chase', 'chases', 'chasing', 'chased', 2),
  v('wrap', 'wraps', 'wrapping', 'wrapped', 2),
  v('taste', 'tastes', 'tasting', 'tasted', 2),
  v('describe', 'describes', 'describing', 'described', 3),
  v('decorate', 'decorates', 'decorating', 'decorated', 3),
  v('celebrate', 'celebrates', 'celebrating', 'celebrated', 3),
  v('announce', 'announces', 'announcing', 'announced', 3),
  v('complete', 'completes', 'completing', 'completed', 3),
  v('discover', 'discovers', 'discovering', 'discovered', 3),
  v('examine', 'examines', 'examining', 'examined', 3),
  v('measure', 'measures', 'measuring', 'measured', 3),
  v('organise', 'organises', 'organising', 'organised', 3),
  v('realise', 'realises', 'realising', 'realised', 3),
  v('apologise', 'apologises', 'apologising', 'apologised', 3),
  v('recognise', 'recognises', 'recognising', 'recognised', 3),
  v('encourage', 'encourages', 'encouraging', 'encouraged', 3),
  v('imagine', 'imagines', 'imagining', 'imagined', 3),
  v('interrupt', 'interrupts', 'interrupting', 'interrupted', 3),
  v('repair', 'repairs', 'repairing', 'repaired', 3),
  v('rescue', 'rescues', 'rescuing', 'rescued', 3),
  v('suggest', 'suggests', 'suggesting', 'suggested', 3),
]

export const IRREGULAR_VERBS: VerbWord[] = [
  iv('go', 'goes', 'going', 'went', 1, ['goed', 'gone', 'wented']),
  iv('do', 'does', 'doing', 'did', 1, ['doed', 'done', 'didded']),
  iv('eat', 'eats', 'eating', 'ate', 1, ['eated', 'eaten']),
  iv('drink', 'drinks', 'drinking', 'drank', 1, ['drinked', 'drunk']),
  iv('run', 'runs', 'running', 'ran', 1, ['runned', 'runed']),
  iv('sing', 'sings', 'singing', 'sang', 1, ['singed', 'sung']),
  iv('swim', 'swims', 'swimming', 'swam', 2, ['swimmed', 'swum']),
  iv('write', 'writes', 'writing', 'wrote', 2, ['writed', 'written']),
  iv('ride', 'rides', 'riding', 'rode', 2, ['rided', 'ridden']),
  iv('drive', 'drives', 'driving', 'drove', 2, ['drived', 'driven']),
  iv('give', 'gives', 'giving', 'gave', 1, ['gived', 'given']),
  iv('take', 'takes', 'taking', 'took', 1, ['taked', 'taken']),
  iv('see', 'sees', 'seeing', 'saw', 1, ['seen', 'sawed', 'seeed']),
  iv('come', 'comes', 'coming', 'came', 1, ['comed', 'camed']),
  iv('buy', 'buys', 'buying', 'bought', 2, ['buyed', 'boughted']),
  iv('bring', 'brings', 'bringing', 'brought', 2, ['bringed', 'brung']),
  iv('think', 'thinks', 'thinking', 'thought', 2, ['thinked', 'thunk']),
  iv('teach', 'teaches', 'teaching', 'taught', 2, ['teached', 'taughted']),
  iv('catch', 'catches', 'catching', 'caught', 2, ['catched', 'caughted']),
  iv('fight', 'fights', 'fighting', 'fought', 2, ['fighted', 'foughted']),
  iv('sit', 'sits', 'sitting', 'sat', 1, ['sitted', 'satted']),
  iv('stand', 'stands', 'standing', 'stood', 2, ['standed', 'stooded']),
  iv('sleep', 'sleeps', 'sleeping', 'slept', 1, ['sleeped', 'slepted']),
  iv('keep', 'keeps', 'keeping', 'kept', 2, ['keeped', 'kepted']),
  iv('sweep', 'sweeps', 'sweeping', 'swept', 2, ['sweeped', 'swepted']),
  iv('send', 'sends', 'sending', 'sent', 2, ['sended', 'sented']),
  iv('spend', 'spends', 'spending', 'spent', 2, ['spended', 'spented']),
  iv('build', 'builds', 'building', 'built', 2, ['builded', 'builted']),
  iv('find', 'finds', 'finding', 'found', 2, ['finded', 'founded']),
  iv('feed', 'feeds', 'feeding', 'fed', 2, ['feeded', 'fedded']),
  iv('speak', 'speaks', 'speaking', 'spoke', 2, ['speaked', 'spoken']),
  iv('break', 'breaks', 'breaking', 'broke', 2, ['breaked', 'broken']),
  iv('wear', 'wears', 'wearing', 'wore', 2, ['weared', 'worn']),
  iv('tell', 'tells', 'telling', 'told', 1, ['telled', 'telt']),
  iv('sell', 'sells', 'selling', 'sold', 2, ['selled', 'selt']),
  iv('fall', 'falls', 'falling', 'fell', 1, ['falled', 'fallen']),
  iv('feel', 'feels', 'feeling', 'felt', 2, ['feeled', 'felted']),
  iv('meet', 'meets', 'meeting', 'met', 2, ['meeted', 'metted']),
  iv('lose', 'loses', 'losing', 'lost', 2, ['losed', 'losted']),
  iv('make', 'makes', 'making', 'made', 1, ['maked', 'maded']),
  iv('know', 'knows', 'knowing', 'knew', 2, ['knowed', 'known']),
  iv('grow', 'grows', 'growing', 'grew', 2, ['growed', 'grown']),
  iv('throw', 'throws', 'throwing', 'threw', 2, ['throwed', 'thrown']),
  iv('fly', 'flies', 'flying', 'flew', 2, ['flied', 'flown']),
  iv('draw', 'draws', 'drawing', 'drew', 2, ['drawed', 'drawn']),
  iv('begin', 'begins', 'beginning', 'began', 3, ['beginned', 'begun']),
  iv('forget', 'forgets', 'forgetting', 'forgot', 3, ['forgetted', 'forgotten']),
  iv('hide', 'hides', 'hiding', 'hid', 2, ['hided', 'hidden']),
  iv('hold', 'holds', 'holding', 'held', 2, ['holded', 'helded']),
  iv('hear', 'hears', 'hearing', 'heard', 2, ['heared', 'hearded']),
  iv('leave', 'leaves', 'leaving', 'left', 2, ['leaved', 'lefted']),
  iv('win', 'wins', 'winning', 'won', 2, ['winned', 'wonned']),
  iv('wake', 'wakes', 'waking', 'woke', 2, ['waked', 'woken']),
  iv('pay', 'pays', 'paying', 'paid', 2, ['payed', 'paided']),
  iv('say', 'says', 'saying', 'said', 1, ['sayed', 'saided']),
  iv('choose', 'chooses', 'choosing', 'chose', 3, ['choosed', 'chosen']),
]

export const ALL_VERBS: VerbWord[] = [...REGULAR_VERBS, ...IRREGULAR_VERBS]

/* ------------------------------------------------------------------ *
 * Adjectives and adverbs
 * ------------------------------------------------------------------ */

export type CompareMode = 'er' | 'more' | 'irregular'

export interface AdjWord {
  base: string
  er: string
  est: string
  mode: CompareMode
  tier: Tier
}

const a = (base: string, er: string, est: string, mode: CompareMode, tier: Tier): AdjWord =>
  ({ base, er, est, mode, tier })

export const ER_ADJECTIVES: AdjWord[] = [
  a('big', 'bigger', 'biggest', 'er', 1), a('small', 'smaller', 'smallest', 'er', 1),
  a('tall', 'taller', 'tallest', 'er', 1), a('short', 'shorter', 'shortest', 'er', 1),
  a('long', 'longer', 'longest', 'er', 1), a('fast', 'faster', 'fastest', 'er', 1),
  a('slow', 'slower', 'slowest', 'er', 1), a('cold', 'colder', 'coldest', 'er', 1),
  a('hot', 'hotter', 'hottest', 'er', 1), a('old', 'older', 'oldest', 'er', 1),
  a('young', 'younger', 'youngest', 'er', 1), a('strong', 'stronger', 'strongest', 'er', 1),
  a('weak', 'weaker', 'weakest', 'er', 2), a('dark', 'darker', 'darkest', 'er', 2),
  a('soft', 'softer', 'softest', 'er', 1), a('deep', 'deeper', 'deepest', 'er', 2),
  a('high', 'higher', 'highest', 'er', 2), a('low', 'lower', 'lowest', 'er', 2),
  a('loud', 'louder', 'loudest', 'er', 2), a('rich', 'richer', 'richest', 'er', 2),
  a('poor', 'poorer', 'poorest', 'er', 2), a('thin', 'thinner', 'thinnest', 'er', 2),
  a('fat', 'fatter', 'fattest', 'er', 1), a('sad', 'sadder', 'saddest', 'er', 1),
  a('wet', 'wetter', 'wettest', 'er', 1), a('nice', 'nicer', 'nicest', 'er', 1),
  a('large', 'larger', 'largest', 'er', 2), a('wide', 'wider', 'widest', 'er', 2),
  a('brave', 'braver', 'bravest', 'er', 2), a('safe', 'safer', 'safest', 'er', 2),
  a('new', 'newer', 'newest', 'er', 1), a('bright', 'brighter', 'brightest', 'er', 2),
  a('sharp', 'sharper', 'sharpest', 'er', 2), a('smooth', 'smoother', 'smoothest', 'er', 3),
  a('rough', 'rougher', 'roughest', 'er', 3), a('quick', 'quicker', 'quickest', 'er', 1),
  a('sweet', 'sweeter', 'sweetest', 'er', 1), a('warm', 'warmer', 'warmest', 'er', 1),
  a('happy', 'happier', 'happiest', 'er', 1), a('easy', 'easier', 'easiest', 'er', 2),
  a('busy', 'busier', 'busiest', 'er', 2), a('heavy', 'heavier', 'heaviest', 'er', 2),
  a('tidy', 'tidier', 'tidiest', 'er', 2), a('funny', 'funnier', 'funniest', 'er', 1),
  a('dirty', 'dirtier', 'dirtiest', 'er', 1), a('hungry', 'hungrier', 'hungriest', 'er', 1),
  a('angry', 'angrier', 'angriest', 'er', 2), a('noisy', 'noisier', 'noisiest', 'er', 2),
  a('pretty', 'prettier', 'prettiest', 'er', 2), a('lucky', 'luckier', 'luckiest', 'er', 2),
  a('early', 'earlier', 'earliest', 'er', 2), a('healthy', 'healthier', 'healthiest', 'er', 3),
  a('friendly', 'friendlier', 'friendliest', 'er', 3), a('lazy', 'lazier', 'laziest', 'er', 2),
  a('tasty', 'tastier', 'tastiest', 'er', 2), a('thirsty', 'thirstier', 'thirstiest', 'er', 2),
  a('sleepy', 'sleepier', 'sleepiest', 'er', 2), a('silly', 'sillier', 'silliest', 'er', 2),
  a('dusty', 'dustier', 'dustiest', 'er', 3), a('sunny', 'sunnier', 'sunniest', 'er', 2),
  a('windy', 'windier', 'windiest', 'er', 2), a('muddy', 'muddier', 'muddiest', 'er', 2),
]

export const MORE_ADJECTIVES: AdjWord[] = [
  a('beautiful', 'more beautiful', 'most beautiful', 'more', 2),
  a('expensive', 'more expensive', 'most expensive', 'more', 2),
  a('important', 'more important', 'most important', 'more', 3),
  a('careful', 'more careful', 'most careful', 'more', 2),
  a('difficult', 'more difficult', 'most difficult', 'more', 2),
  a('interesting', 'more interesting', 'most interesting', 'more', 3),
  a('dangerous', 'more dangerous', 'most dangerous', 'more', 3),
  a('delicious', 'more delicious', 'most delicious', 'more', 2),
  a('comfortable', 'more comfortable', 'most comfortable', 'more', 3),
  a('intelligent', 'more intelligent', 'most intelligent', 'more', 3),
  a('popular', 'more popular', 'most popular', 'more', 3),
  a('wonderful', 'more wonderful', 'most wonderful', 'more', 2),
  a('colourful', 'more colourful', 'most colourful', 'more', 2),
  a('helpful', 'more helpful', 'most helpful', 'more', 2),
  a('generous', 'more generous', 'most generous', 'more', 3),
  a('famous', 'more famous', 'most famous', 'more', 2),
  a('useful', 'more useful', 'most useful', 'more', 2),
  a('peaceful', 'more peaceful', 'most peaceful', 'more', 3),
  a('honest', 'more honest', 'most honest', 'more', 3),
  a('crowded', 'more crowded', 'most crowded', 'more', 3),
  a('exciting', 'more exciting', 'most exciting', 'more', 2),
  a('powerful', 'more powerful', 'most powerful', 'more', 3),
  a('valuable', 'more valuable', 'most valuable', 'more', 3),
  a('sensible', 'more sensible', 'most sensible', 'more', 3),
  a('obedient', 'more obedient', 'most obedient', 'more', 3),
  a('cheerful', 'more cheerful', 'most cheerful', 'more', 3),
  a('thoughtful', 'more thoughtful', 'most thoughtful', 'more', 3),
]

export const IRREGULAR_ADJECTIVES: AdjWord[] = [
  a('good', 'better', 'best', 'irregular', 1),
  a('bad', 'worse', 'worst', 'irregular', 1),
]

export const ALL_ADJECTIVES: AdjWord[] = [
  ...ER_ADJECTIVES, ...MORE_ADJECTIVES, ...IRREGULAR_ADJECTIVES,
]

export interface AdverbWord {
  /** The adjective it is built from. */
  from: string
  word: string
  tier: Tier
}

const ad = (from: string, word: string, tier: Tier): AdverbWord => ({ from, word, tier })

export const ADVERBS: AdverbWord[] = [
  ad('quick', 'quickly', 1), ad('slow', 'slowly', 1), ad('loud', 'loudly', 1),
  ad('soft', 'softly', 1), ad('brave', 'bravely', 2), ad('careful', 'carefully', 1),
  ad('neat', 'neatly', 2), ad('sad', 'sadly', 1), ad('glad', 'gladly', 2),
  ad('kind', 'kindly', 1), ad('bright', 'brightly', 2), ad('sudden', 'suddenly', 2),
  ad('silent', 'silently', 2), ad('polite', 'politely', 2), ad('calm', 'calmly', 2),
  ad('safe', 'safely', 2), ad('quiet', 'quietly', 1), ad('cheerful', 'cheerfully', 3),
  ad('beautiful', 'beautifully', 3), ad('careless', 'carelessly', 3), ad('wise', 'wisely', 3),
  ad('rude', 'rudely', 3), ad('honest', 'honestly', 3), ad('proud', 'proudly', 2),
  ad('strange', 'strangely', 3), ad('happy', 'happily', 1), ad('angry', 'angrily', 2),
  ad('easy', 'easily', 2), ad('noisy', 'noisily', 2), ad('hungry', 'hungrily', 2),
  ad('lazy', 'lazily', 2), ad('busy', 'busily', 3), ad('merry', 'merrily', 2),
  ad('gentle', 'gently', 2), ad('simple', 'simply', 3), ad('terrible', 'terribly', 3),
  ad('true', 'truly', 3), ad('full', 'fully', 3),
]

/** The misspelling a child produces when the -y or -le rule is missed. */
export function adverbWrongs(word: AdverbWord): string[] {
  const out: string[] = []
  const seen = new Set([word.word])
  const add = (w: string) => {
    if (!w || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }
  add(`${word.from}ly`)
  add(word.from)
  add(`${word.from}fully`)
  add(`${word.word}ly`)
  return out
}

/* ------------------------------------------------------------------ *
 * Closed classes
 * ------------------------------------------------------------------ */

export const PREPOSITIONS = [
  'in', 'on', 'under', 'behind', 'beside', 'between', 'above', 'below', 'near', 'inside',
  'outside', 'over', 'across', 'through', 'into', 'onto', 'towards', 'among', 'around', 'beneath',
]

/** Safe inside a generated sentence: never ambiguous with another part of speech. */
export const SAFE_PREPOSITIONS = [
  'in', 'on', 'under', 'behind', 'beside', 'above', 'near', 'inside', 'across', 'towards',
  'into', 'through', 'beneath', 'around',
]

export const CONJUNCTIONS = ['and', 'but', 'or', 'because', 'so', 'although', 'while', 'until']

export const ARTICLES = ['a', 'an', 'the']

export const SUBJECT_PRONOUNS = ['I', 'you', 'he', 'she', 'it', 'we', 'they']
export const OBJECT_PRONOUNS = ['me', 'you', 'him', 'her', 'it', 'us', 'them']
export const POSSESSIVE_ADJECTIVES = ['my', 'your', 'his', 'her', 'its', 'our', 'their']
export const POSSESSIVE_PRONOUNS = ['mine', 'yours', 'his', 'hers', 'ours', 'theirs']

/* ------------------------------------------------------------------ *
 * Articles
 * ------------------------------------------------------------------ */

/** Vowel *sound*, not vowel letter — which is where "an hour" and "a uniform" live. */
const AN_EXCEPTIONS = new Set(['hour', 'honest', 'honour', 'heir', 'honourable'])
const A_EXCEPTIONS = new Set(['uniform', 'university', 'union', 'useful', 'user', 'european', 'one'])

export function articleFor(phrase: string): 'a' | 'an' {
  // Only the first word decides it: "a useful tool", not "an useful tool".
  const w = phrase.trim().toLowerCase().split(/\s+/)[0] ?? ''
  if (AN_EXCEPTIONS.has(w)) return 'an'
  if (A_EXCEPTIONS.has(w)) return 'a'
  return /^[aeiou]/.test(w) ? 'an' : 'a'
}

/** Nouns chosen so the a/an choice is worth asking about. */
export const ARTICLE_NOUNS: { word: string; tier: Tier }[] = [
  { word: 'orange', tier: 1 }, { word: 'egg', tier: 1 }, { word: 'apple', tier: 1 },
  { word: 'umbrella', tier: 1 }, { word: 'elephant', tier: 1 }, { word: 'engine', tier: 2 },
  { word: 'envelope', tier: 2 }, { word: 'onion', tier: 1 }, { word: 'ant', tier: 1 },
  { word: 'aeroplane', tier: 2 }, { word: 'island', tier: 2 }, { word: 'idea', tier: 2 },
  { word: 'invitation', tier: 3 }, { word: 'animal', tier: 1 }, { word: 'artist', tier: 2 },
  { word: 'book', tier: 1 }, { word: 'goat', tier: 1 }, { word: 'chair', tier: 1 },
  { word: 'basket', tier: 1 }, { word: 'pencil', tier: 1 }, { word: 'lorry', tier: 2 },
  { word: 'bicycle', tier: 2 }, { word: 'teacher', tier: 1 }, { word: 'mango', tier: 1 },
  { word: 'drum', tier: 1 }, { word: 'yam', tier: 1 }, { word: 'window', tier: 2 },
  { word: 'hour', tier: 3 }, { word: 'honest man', tier: 3 }, { word: 'uniform', tier: 3 },
  { word: 'university', tier: 3 }, { word: 'useful tool', tier: 3 },
]

/* ------------------------------------------------------------------ *
 * Prefixes and suffixes
 * ------------------------------------------------------------------ */

export interface AffixWord {
  root: string
  built: string
  affix: string
  /** Plain-English meaning of the built word, used in the question stem. */
  gloss: string
  tier: Tier
}

const af = (root: string, built: string, affix: string, gloss: string, tier: Tier): AffixWord =>
  ({ root, built, affix, gloss, tier })

export const PREFIX_WORDS: AffixWord[] = [
  af('happy', 'unhappy', 'un', 'not happy', 1),
  af('kind', 'unkind', 'un', 'not kind', 1),
  af('fair', 'unfair', 'un', 'not fair', 2),
  af('safe', 'unsafe', 'un', 'not safe', 2),
  af('tidy', 'untidy', 'un', 'not tidy', 2),
  af('lucky', 'unlucky', 'un', 'not lucky', 2),
  af('well', 'unwell', 'un', 'not well', 2),
  af('usual', 'unusual', 'un', 'not usual', 3),
  af('lock', 'unlock', 'un', 'to open a lock', 1),
  af('tie', 'untie', 'un', 'to undo a knot', 2),
  af('write', 'rewrite', 're', 'to write again', 2),
  af('read', 'reread', 're', 'to read again', 2),
  af('build', 'rebuild', 're', 'to build again', 2),
  af('fill', 'refill', 're', 'to fill again', 2),
  af('open', 'reopen', 're', 'to open again', 2),
  af('use', 'reuse', 're', 'to use again', 2),
  af('pay', 'repay', 're', 'to pay back', 3),
  af('tell', 'retell', 're', 'to tell again', 2),
  af('like', 'dislike', 'dis', 'to not like something', 2),
  af('agree', 'disagree', 'dis', 'to not agree', 2),
  af('obey', 'disobey', 'dis', 'to not obey', 2),
  af('honest', 'dishonest', 'dis', 'not honest', 3),
  af('appear', 'disappear', 'dis', 'to go out of sight', 3),
  af('behave', 'misbehave', 'mis', 'to behave badly', 3),
  af('spell', 'misspell', 'mis', 'to spell wrongly', 3),
  af('use', 'misuse', 'mis', 'to use wrongly', 3),
  af('lead', 'mislead', 'mis', 'to lead someone the wrong way', 3),
  af('view', 'preview', 'pre', 'to look at before', 3),
  af('school', 'preschool', 'pre', 'before school age', 3),
  af('possible', 'impossible', 'im', 'not possible', 3),
  af('polite', 'impolite', 'im', 'not polite', 3),
  af('correct', 'incorrect', 'in', 'not correct', 3),
  af('visible', 'invisible', 'in', 'not able to be seen', 3),
  af('regular', 'irregular', 'ir', 'not regular', 3),
  af('legal', 'illegal', 'il', 'not allowed by law', 3),
]

export const SUFFIX_WORDS: AffixWord[] = [
  af('care', 'careful', 'ful', 'full of care', 1),
  af('help', 'helpful', 'ful', 'full of help', 1),
  af('use', 'useful', 'ful', 'full of use', 2),
  af('colour', 'colourful', 'ful', 'full of colour', 2),
  af('power', 'powerful', 'ful', 'full of power', 2),
  af('hope', 'hopeful', 'ful', 'full of hope', 2),
  af('pain', 'painful', 'ful', 'full of pain', 2),
  af('thank', 'thankful', 'ful', 'full of thanks', 2),
  af('joy', 'joyful', 'ful', 'full of joy', 2),
  af('play', 'playful', 'ful', 'full of play', 2),
  af('care', 'careless', 'less', 'without care', 1),
  af('help', 'helpless', 'less', 'without help', 2),
  af('use', 'useless', 'less', 'without use', 2),
  af('hope', 'hopeless', 'less', 'without hope', 2),
  af('pain', 'painless', 'less', 'without pain', 3),
  af('fear', 'fearless', 'less', 'without fear', 3),
  af('home', 'homeless', 'less', 'without a home', 3),
  af('end', 'endless', 'less', 'without an end', 3),
  af('harm', 'harmless', 'less', 'without harm', 3),
  af('kind', 'kindness', 'ness', 'being kind', 2),
  af('dark', 'darkness', 'ness', 'being dark', 2),
  af('sad', 'sadness', 'ness', 'being sad', 2),
  af('happy', 'happiness', 'ness', 'being happy', 2),
  af('ill', 'illness', 'ness', 'being ill', 2),
  af('weak', 'weakness', 'ness', 'being weak', 3),
  af('good', 'goodness', 'ness', 'being good', 2),
  af('teach', 'teacher', 'er', 'a person who teaches', 1),
  af('farm', 'farmer', 'er', 'a person who farms', 1),
  af('sing', 'singer', 'er', 'a person who sings', 1),
  af('dance', 'dancer', 'er', 'a person who dances', 2),
  af('write', 'writer', 'er', 'a person who writes', 2),
  af('paint', 'painter', 'er', 'a person who paints', 2),
  af('drive', 'driver', 'er', 'a person who drives', 1),
  af('bake', 'baker', 'er', 'a person who bakes', 2),
  af('trade', 'trader', 'er', 'a person who trades', 2),
  af('pay', 'payment', 'ment', 'the act of paying', 3),
  af('move', 'movement', 'ment', 'the act of moving', 3),
  af('enjoy', 'enjoyment', 'ment', 'the act of enjoying', 3),
  af('agree', 'agreement', 'ment', 'the act of agreeing', 3),
  af('punish', 'punishment', 'ment', 'the act of punishing', 3),
  af('excite', 'excitement', 'ment', 'the state of being excited', 3),
]

export const PREFIX_MEANINGS: { affix: string; meaning: string; wrong: string[] }[] = [
  { affix: 're-', meaning: 'again', wrong: ['un-', 'mis-', 'pre-'] },
  { affix: 'mis-', meaning: 'wrongly', wrong: ['re-', 'un-', 'pre-'] },
  { affix: 'pre-', meaning: 'before', wrong: ['re-', 'un-', 'mis-'] },
]

export const SUFFIX_MEANINGS: { affix: string; meaning: string; wrong: string[] }[] = [
  { affix: '-ful', meaning: 'full of', wrong: ['-less', '-ness', '-ly'] },
  { affix: '-less', meaning: 'without', wrong: ['-ful', '-ness', '-er'] },
  { affix: '-er', meaning: 'a person who does it', wrong: ['-ful', '-less', '-ness'] },
  { affix: '-ly', meaning: 'how something is done', wrong: ['-ful', '-less', '-er'] },
]

/* ------------------------------------------------------------------ *
 * Contractions
 * ------------------------------------------------------------------ */

export interface Contraction {
  full: string
  short: string
  tier: Tier
}

const c = (full: string, short: string, tier: Tier): Contraction => ({ full, short, tier })

export const CONTRACTIONS: Contraction[] = [
  c('is not', "isn't", 1), c('are not', "aren't", 1), c('was not', "wasn't", 2),
  c('were not', "weren't", 2), c('do not', "don't", 1), c('does not', "doesn't", 2),
  c('did not', "didn't", 2), c('cannot', "can't", 1), c('could not', "couldn't", 2),
  c('would not', "wouldn't", 3), c('should not', "shouldn't", 3), c('have not', "haven't", 2),
  c('has not', "hasn't", 2), c('had not', "hadn't", 3), c('will not', "won't", 2),
  c('I am', "I'm", 1), c('you are', "you're", 1), c('he is', "he's", 1), c('she is', "she's", 1),
  c('it is', "it's", 1), c('we are', "we're", 1), c('they are', "they're", 1),
  c('I have', "I've", 2), c('we have', "we've", 2), c('they have', "they've", 2),
  c('I will', "I'll", 2), c('we will', "we'll", 2), c('they will', "they'll", 2),
  c('he will', "he'll", 2), c('she will', "she'll", 2), c('I would', "I'd", 3),
  c('let us', "let's", 2), c('that is', "that's", 1), c('there is', "there's", 2),
  c('what is', "what's", 1), c('who is', "who's", 2),
]

/** Apostrophe in the wrong place, or missing altogether. */
export function contractionWrongs(short: string): string[] {
  const out: string[] = []
  const seen = new Set([short])
  const add = (w: string) => {
    if (!w || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }
  const plain = short.replace("'", '')
  const at = short.indexOf("'")
  if (at > 1) add(`${plain.slice(0, at - 1)}'${plain.slice(at - 1)}`)
  if (at + 1 < plain.length) add(`${plain.slice(0, at + 1)}'${plain.slice(at + 1)}`)
  add(plain)
  add(`${plain}'`)
  return out
}

/* ------------------------------------------------------------------ *
 * Words safe to use inside generated sentences
 *
 * A word like "watch", "play" or "cook" is both noun and verb, so a
 * part-of-speech question built on it has two defensible answers. Everything
 * below is settled by its form or its meaning.
 * ------------------------------------------------------------------ */

export interface Tagged<T> { value: T; tier: Tier }

export const SAFE_SENTENCE_NOUNS: NounWord[] = [
  n('boy', 'boys', 1), n('girl', 'girls', 1), n('teacher', 'teachers', 1),
  n('basket', 'baskets', 1), n('table', 'tables', 1), n('chair', 'chairs', 1),
  n('door', 'doors', 1), n('window', 'windows', 1), n('book', 'books', 1),
  n('pencil', 'pencils', 1), n('bag', 'bags', 1), n('goat', 'goats', 1),
  n('market', 'markets', 1), n('river', 'rivers', 2), n('village', 'villages', 2),
  n('kitchen', 'kitchens', 2), n('garden', 'gardens', 2), n('bicycle', 'bicycles', 2),
  n('uniform', 'uniforms', 2), n('lorry', 'lorries', 2), n('bucket', 'buckets', 2),
  n('blanket', 'blankets', 2), n('letter', 'letters', 2), n('picture', 'pictures', 2),
  n('cupboard', 'cupboards', 2), n('road', 'roads', 1), n('gate', 'gates', 1),
  n('plate', 'plates', 1), n('spoon', 'spoons', 1), n('lamp', 'lamps', 2),
  n('ladder', 'ladders', 2), n('drum', 'drums', 1), n('shirt', 'shirts', 1),
  n('tree', 'trees', 1), n('house', 'houses', 1), n('classroom', 'classrooms', 2),
  n('envelope', 'envelopes', 3), n('calendar', 'calendars', 3), n('mattress', 'mattresses', 3),
  n('yam', 'yams', 1), n('cup', 'cups', 1), n('torch', 'torches', 2), n('key', 'keys', 1),
  n('wall', 'walls', 1), n('bench', 'benches', 2), n('sandal', 'sandals', 2),
  n('curtain', 'curtains', 2), n('generator', 'generators', 3), n('mechanic', 'mechanics', 3),
  n('neighbour', 'neighbours', 3), n('passenger', 'passengers', 3), n('museum', 'museums', 3),
]

/** Past-tense forms only: an inflected verb cannot be mistaken for a noun. */
export const SAFE_SENTENCE_VERBS: { past: string; base: string; tier: Tier }[] = [
  { past: 'washed', base: 'wash', tier: 1 }, { past: 'carried', base: 'carry', tier: 1 },
  { past: 'opened', base: 'open', tier: 1 }, { past: 'closed', base: 'close', tier: 1 },
  { past: 'cooked', base: 'cook', tier: 1 }, { past: 'cleaned', base: 'clean', tier: 1 },
  { past: 'pushed', base: 'push', tier: 1 }, { past: 'pulled', base: 'pull', tier: 1 },
  { past: 'mended', base: 'mend', tier: 2 }, { past: 'followed', base: 'follow', tier: 2 },
  { past: 'greeted', base: 'greet', tier: 2 }, { past: 'thanked', base: 'thank', tier: 2 },
  { past: 'counted', base: 'count', tier: 1 }, { past: 'filled', base: 'fill', tier: 1 },
  { past: 'emptied', base: 'empty', tier: 2 }, { past: 'borrowed', base: 'borrow', tier: 2 },
  { past: 'returned', base: 'return', tier: 2 }, { past: 'delivered', base: 'deliver', tier: 3 },
  { past: 'collected', base: 'collect', tier: 2 }, { past: 'arranged', base: 'arrange', tier: 2 },
  { past: 'decorated', base: 'decorate', tier: 3 }, { past: 'described', base: 'describe', tier: 3 },
  { past: 'finished', base: 'finish', tier: 2 }, { past: 'dropped', base: 'drop', tier: 2 },
  { past: 'grabbed', base: 'grab', tier: 2 }, { past: 'chased', base: 'chase', tier: 2 },
  { past: 'wrapped', base: 'wrap', tier: 2 }, { past: 'tasted', base: 'taste', tier: 2 },
  { past: 'bought', base: 'buy', tier: 2 }, { past: 'brought', base: 'bring', tier: 2 },
  { past: 'took', base: 'take', tier: 1 }, { past: 'found', base: 'find', tier: 2 },
  { past: 'held', base: 'hold', tier: 2 }, { past: 'sold', base: 'sell', tier: 2 },
  { past: 'ate', base: 'eat', tier: 1 }, { past: 'wrote', base: 'write', tier: 2 },
  { past: 'gave', base: 'give', tier: 1 }, { past: 'made', base: 'make', tier: 1 },
  { past: 'built', base: 'build', tier: 2 }, { past: 'sent', base: 'send', tier: 2 },
  { past: 'kept', base: 'keep', tier: 2 }, { past: 'caught', base: 'catch', tier: 2 },
  { past: 'taught', base: 'teach', tier: 2 }, { past: 'threw', base: 'throw', tier: 2 },
  { past: 'drew', base: 'draw', tier: 2 }, { past: 'broke', base: 'break', tier: 2 },
  { past: 'wore', base: 'wear', tier: 2 }, { past: 'swept', base: 'sweep', tier: 2 },
]

/** No noun or verb readings: these can only be describing words in a sentence. */
export const SAFE_SENTENCE_ADJECTIVES: { word: string; tier: Tier }[] = [
  { word: 'big', tier: 1 }, { word: 'small', tier: 1 }, { word: 'tall', tier: 1 },
  { word: 'old', tier: 1 }, { word: 'young', tier: 1 }, { word: 'heavy', tier: 1 },
  { word: 'tidy', tier: 2 }, { word: 'dirty', tier: 1 }, { word: 'happy', tier: 1 },
  { word: 'angry', tier: 2 }, { word: 'hungry', tier: 1 }, { word: 'tired', tier: 1 },
  { word: 'noisy', tier: 2 }, { word: 'brave', tier: 2 }, { word: 'lucky', tier: 2 },
  { word: 'bright', tier: 2 }, { word: 'wide', tier: 2 }, { word: 'sweet', tier: 1 },
  { word: 'tasty', tier: 2 }, { word: 'beautiful', tier: 2 }, { word: 'expensive', tier: 3 },
  { word: 'colourful', tier: 2 }, { word: 'wooden', tier: 2 }, { word: 'broken', tier: 2 },
  { word: 'empty', tier: 2 }, { word: 'hot', tier: 1 }, { word: 'sharp', tier: 2 },
  { word: 'thirsty', tier: 2 }, { word: 'lazy', tier: 2 }, { word: 'delicious', tier: 3 },
  { word: 'friendly', tier: 3 }, { word: 'healthy', tier: 3 }, { word: 'muddy', tier: 2 },
  { word: 'dusty', tier: 3 }, { word: 'narrow', tier: 3 }, { word: 'strange', tier: 3 },
]

export const SAFE_SENTENCE_ADVERBS: { word: string; tier: Tier }[] = [
  { word: 'quickly', tier: 1 }, { word: 'slowly', tier: 1 }, { word: 'quietly', tier: 1 },
  { word: 'loudly', tier: 1 }, { word: 'carefully', tier: 1 }, { word: 'happily', tier: 1 },
  { word: 'sadly', tier: 1 }, { word: 'neatly', tier: 2 }, { word: 'bravely', tier: 2 },
  { word: 'politely', tier: 2 }, { word: 'gently', tier: 2 }, { word: 'softly', tier: 1 },
  { word: 'badly', tier: 1 }, { word: 'suddenly', tier: 2 }, { word: 'silently', tier: 2 },
  { word: 'angrily', tier: 2 }, { word: 'cheerfully', tier: 3 }, { word: 'carelessly', tier: 3 },
  { word: 'eagerly', tier: 3 }, { word: 'gladly', tier: 2 }, { word: 'proudly', tier: 2 },
]

/* ------------------------------------------------------------------ *
 * Sentence ingredients that also have to make sense
 *
 * Tagging every word correctly is not enough. "The hot window pushed a lorry"
 * is perfectly taggable and completely absurd, so subjects, actions, objects
 * and places are drawn from banks that fit each other.
 * ------------------------------------------------------------------ */

/** Nouns that can be the subject of an action. */
export const PEOPLE_NOUNS: NounWord[] = [
  n('boy', 'boys', 1), n('girl', 'girls', 1), n('teacher', 'teachers', 1),
  n('farmer', 'farmers', 1), n('pupil', 'pupils', 2), n('driver', 'drivers', 2),
  n('doctor', 'doctors', 2), n('tailor', 'tailors', 2), n('hunter', 'hunters', 2),
  n('trader', 'traders', 2), n('cousin', 'cousins', 2), n('visitor', 'visitors', 2),
  n('carpenter', 'carpenters', 3), n('neighbour', 'neighbours', 3),
  n('passenger', 'passengers', 3), n('mechanic', 'mechanics', 3),
]

/** A past-tense verb bolted to something it can sensibly be done to. */
export interface Action { past: string; objS: string; objP: string; tier: Tier }

const act = (past: string, objS: string, objP: string, tier: Tier): Action => ({ past, objS, objP, tier })

export const ACTIONS: Action[] = [
  act('washed', 'plate', 'plates', 1), act('carried', 'basket', 'baskets', 1),
  act('opened', 'gate', 'gates', 1), act('closed', 'window', 'windows', 1),
  act('swept', 'floor', 'floors', 1), act('cooked', 'yam', 'yams', 1),
  act('mended', 'shirt', 'shirts', 2), act('painted', 'wall', 'walls', 1),
  act('collected', 'book', 'books', 2), act('arranged', 'chair', 'chairs', 2),
  act('delivered', 'letter', 'letters', 3), act('borrowed', 'pencil', 'pencils', 2),
  act('filled', 'bucket', 'buckets', 1), act('climbed', 'ladder', 'ladders', 2),
  act('folded', 'blanket', 'blankets', 2), act('wrapped', 'parcel', 'parcels', 2),
  act('pushed', 'bicycle', 'bicycles', 1), act('counted', 'coin', 'coins', 1),
  act('cleaned', 'classroom', 'classrooms', 1), act('locked', 'cupboard', 'cupboards', 2),
  act('watered', 'garden', 'gardens', 2), act('decorated', 'classroom', 'classrooms', 3),
  act('drew', 'picture', 'pictures', 2), act('wrote', 'letter', 'letters', 2),
  act('sold', 'mango', 'mangoes', 2), act('bought', 'sandal', 'sandals', 2),
  act('built', 'house', 'houses', 2), act('broke', 'plate', 'plates', 2),
  act('found', 'key', 'keys', 2), act('kept', 'torch', 'torches', 2),
  act('brought', 'broom', 'brooms', 2), act('took', 'bucket', 'buckets', 1),
  act('held', 'torch', 'torches', 2), act('ate', 'mango', 'mangoes', 1),
  act('sent', 'parcel', 'parcels', 3), act('caught', 'ball', 'balls', 2),
  act('threw', 'ball', 'balls', 2), act('wore', 'uniform', 'uniforms', 2),
]

/** Places a "near the …" phrase can point at without sounding strange. */
export const PLACE_NOUNS: { word: string; tier: Tier }[] = [
  { word: 'kitchen', tier: 1 }, { word: 'garden', tier: 1 }, { word: 'market', tier: 1 },
  { word: 'river', tier: 1 }, { word: 'village', tier: 2 }, { word: 'classroom', tier: 1 },
  { word: 'road', tier: 1 }, { word: 'house', tier: 1 }, { word: 'school', tier: 1 },
  { word: 'table', tier: 1 }, { word: 'cupboard', tier: 2 }, { word: 'gate', tier: 1 },
  { word: 'wall', tier: 1 }, { word: 'bench', tier: 2 }, { word: 'door', tier: 1 },
  { word: 'tree', tier: 1 }, { word: 'window', tier: 1 }, { word: 'stadium', tier: 3 },
]

/** Prepositions that work with any of the places above. */
export const PLACE_PREPOSITIONS = ['near', 'beside', 'behind']

/** Things a person can own — for apostrophe work. */
export const BELONGINGS: NounWord[] = [
  n('bag', 'bags', 1), n('book', 'books', 1), n('pencil', 'pencils', 1),
  n('cap', 'caps', 1), n('shoe', 'shoes', 1), n('torch', 'torches', 2),
  n('blanket', 'blankets', 2), n('uniform', 'uniforms', 2), n('sandal', 'sandals', 2),
  n('bicycle', 'bicycles', 2), n('drum', 'drums', 1), n('plate', 'plates', 1),
  n('cup', 'cups', 1), n('ruler', 'rulers', 2), n('biro', 'biros', 1),
  n('basket', 'baskets', 1), n('key', 'keys', 1), n('radio', 'radios', 2),
  n('umbrella', 'umbrellas', 2), n('textbook', 'textbooks', 2),
]

/** Things you can plausibly buy at a market — for list and comma work. */
export const SHOPPING: NounWord[] = [
  n('yam', 'yams', 1), n('orange', 'oranges', 1), n('mango', 'mangoes', 1),
  n('banana', 'bananas', 1), n('plantain', 'plantains', 1), n('tomato', 'tomatoes', 1),
  n('egg', 'eggs', 1), n('onion', 'onions', 1), n('groundnut', 'groundnuts', 2),
  n('biro', 'biros', 1), n('pencil', 'pencils', 1), n('textbook', 'textbooks', 2),
  n('sandal', 'sandals', 2), n('broom', 'brooms', 1), n('bucket', 'buckets', 1),
  n('sweet', 'sweets', 1), n('cup', 'cups', 1), n('plate', 'plates', 1),
  n('spoon', 'spoons', 1), n('blanket', 'blankets', 2), n('sock', 'socks', 1),
  n('cap', 'caps', 1), n('candle', 'candles', 2), n('mat', 'mats', 1),
  n('pineapple', 'pineapples', 2), n('lantern', 'lanterns', 3),
]

/** Adjectives that describe people, and adjectives that describe objects. */
export const PERSON_ADJECTIVES: { word: string; tier: Tier }[] = [
  { word: 'tall', tier: 1 }, { word: 'young', tier: 1 }, { word: 'old', tier: 1 },
  { word: 'kind', tier: 1 }, { word: 'happy', tier: 1 }, { word: 'tired', tier: 1 },
  { word: 'hungry', tier: 1 }, { word: 'brave', tier: 2 }, { word: 'friendly', tier: 3 },
  { word: 'lazy', tier: 2 }, { word: 'clever', tier: 2 }, { word: 'thirsty', tier: 2 },
  { word: 'careful', tier: 2 }, { word: 'cheerful', tier: 3 }, { word: 'polite', tier: 2 },
]

export const THING_ADJECTIVES: { word: string; tier: Tier }[] = [
  { word: 'big', tier: 1 }, { word: 'small', tier: 1 }, { word: 'heavy', tier: 1 },
  { word: 'dirty', tier: 1 }, { word: 'empty', tier: 2 }, { word: 'broken', tier: 2 },
  { word: 'wooden', tier: 2 }, { word: 'colourful', tier: 2 }, { word: 'sharp', tier: 2 },
  { word: 'wide', tier: 2 }, { word: 'bright', tier: 2 }, { word: 'expensive', tier: 3 },
  { word: 'beautiful', tier: 2 }, { word: 'muddy', tier: 2 }, { word: 'dusty', tier: 3 },
  { word: 'narrow', tier: 3 }, { word: 'sweet', tier: 1 }, { word: 'hot', tier: 1 },
]

/* ------------------------------------------------------------------ *
 * Tagged sentence builder
 *
 * Several skills need a sentence where the part of speech of every word is
 * known for certain. Building it from the safe banks above guarantees that.
 * ------------------------------------------------------------------ */

export type Pos =
  | 'noun' | 'proper' | 'verb' | 'adjective' | 'adverb'
  | 'preposition' | 'pronoun' | 'article' | 'conjunction'

export interface TaggedWord { w: string; pos: Pos }

export interface TaggedSentence {
  text: string
  words: TaggedWord[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * A sentence whose every word carries a certain part of speech.
 *
 * `need` forces a template that contains at least one word of that class, so
 * a caller asking "which word is the adverb?" always gets one.
 */
export function taggedSentence(rng: Rng, difficulty: number, need?: Pos): TaggedSentence {
  const name = rng.pick([...GIRLS, ...BOYS])
  const person = rng.pick(graded(PEOPLE_NOUNS, difficulty))
  const action = rng.pick(graded(ACTIONS, difficulty))
  const adv = rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty)).word
  const personAdj = rng.pick(graded(PERSON_ADJECTIVES, difficulty)).word
  const thingAdj = rng.pick(graded(THING_ADJECTIVES, difficulty)).word
  // "watered the gardens beside the garden" reads like a mistake, so the place
  // is never the same word as the thing being acted on.
  const place = rng.pick(graded(PLACE_NOUNS, difficulty).filter((p) => p.word !== action.objS)).word
  const prep = rng.pick(PLACE_PREPOSITIONS)

  const templates: (() => TaggedWord[])[] = [
    // Ada washed the dirty plates.
    () => [
      { w: name, pos: 'proper' },
      { w: action.past, pos: 'verb' },
      { w: 'the', pos: 'article' },
      { w: thingAdj, pos: 'adjective' },
      { w: action.objP, pos: 'noun' },
    ],
    // The old teacher carried the baskets.
    () => [
      { w: 'The', pos: 'article' },
      { w: personAdj, pos: 'adjective' },
      { w: person.s, pos: 'noun' },
      { w: action.past, pos: 'verb' },
      { w: 'the', pos: 'article' },
      { w: action.objP, pos: 'noun' },
    ],
    // Musa quietly opened the gate.
    () => [
      { w: name, pos: 'proper' },
      { w: adv, pos: 'adverb' },
      { w: action.past, pos: 'verb' },
      { w: 'the', pos: 'article' },
      { w: action.objS, pos: 'noun' },
    ],
    // The traders counted the coins beside the market.
    () => [
      { w: 'The', pos: 'article' },
      { w: person.p, pos: 'noun' },
      { w: action.past, pos: 'verb' },
      { w: 'the', pos: 'article' },
      { w: action.objP, pos: 'noun' },
      { w: prep, pos: 'preposition' },
      { w: 'the', pos: 'article' },
      { w: place, pos: 'noun' },
    ],
    // She carefully wrapped a small parcel.
    () => [
      { w: rng.pick(['She', 'He', 'They', 'We']), pos: 'pronoun' },
      { w: adv, pos: 'adverb' },
      { w: action.past, pos: 'verb' },
      { w: articleFor(thingAdj), pos: 'article' },
      { w: thingAdj, pos: 'adjective' },
      { w: action.objS, pos: 'noun' },
    ],
    // Ada washed the plates behind the house.
    () => [
      { w: name, pos: 'proper' },
      { w: action.past, pos: 'verb' },
      { w: 'the', pos: 'article' },
      { w: action.objP, pos: 'noun' },
      { w: prep, pos: 'preposition' },
      { w: 'the', pos: 'article' },
      { w: place, pos: 'noun' },
    ],
  ]

  const has = (ws: TaggedWord[], p: Pos) => ws.some((x) => x.pos === p)
  const candidates = need ? templates.filter((t) => has(t(), need)) : templates
  const words = rng.pick(candidates.length ? candidates : templates)()

  words[0] = { ...words[0], w: cap(words[0].w) }
  return { text: `${words.map((x) => x.w).join(' ')}.`, words }
}

/** Human-readable name for a part of speech, for choice labels. */
export const POS_LABEL: Record<Pos, string> = {
  noun: 'Noun',
  proper: 'Proper noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  preposition: 'Preposition',
  pronoun: 'Pronoun',
  article: 'Article',
  conjunction: 'Conjunction',
}

/** Drop repeats so a tap-many board never shows the same word twice. */
export function uniqueWords(words: TaggedWord[]): TaggedWord[] {
  const seen = new Set<string>()
  return words.filter((w) => {
    const k = w.w.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
