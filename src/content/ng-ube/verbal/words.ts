/**
 * Graded word lists for the Verbal Reasoning pack.
 *
 * Verbal reasoning is the one subject that cannot be generated from thin air:
 * a synonym question needs synonyms. So the vocabulary lives here as data,
 * graded into five tiers, and the generators in the sibling files do the
 * shuffling, the distractor picking and the difficulty ramp.
 *
 * Tiers, roughly:
 *   1  Basic 1–2   three- and four-letter words a child can sound out
 *   2  Basic 2–3   everyday classroom vocabulary
 *   3  Basic 3–4   longer words, first abstract ideas
 *   4  Basic 5     comprehension vocabulary
 *   5  Basic 6     common-entrance level
 *
 * Spelling is British/Nigerian throughout ("colour", "realise", "neighbour")
 * and the nouns lean Nigerian where it reads naturally (pawpaw, okra, zobo,
 * iroko, wrapper) — a child should recognise the world these words describe.
 *
 * Accuracy rule for anyone editing this file: a wrong answer key teaches a
 * child something false. Every synonym, antonym and homophone below has been
 * checked in both directions. Where a pairing was arguable, it was cut.
 */

import type { Rng } from '../../../engine/rng'

export interface Tiered {
  tier: number
}

/* ------------------------------------------------------------------ *
 * Tier helpers
 * ------------------------------------------------------------------ */

/** The tier a skill should draw from, given its floor and the difficulty. */
export const tierFor = (floor: number, difficulty: number): number =>
  Math.max(1, Math.min(5, floor + difficulty - 1))

/**
 * Entries at `tier`, widened to the tier below so every draw is not from the
 * same twenty words. Falls back to the whole list if the band is thin.
 */
export function bandOf<T extends Tiered>(list: readonly T[], tier: number): readonly T[] {
  const band = list.filter((e) => e.tier <= tier && e.tier >= tier - 1)
  return band.length >= 4 ? band : list
}

export const pickTier = <T extends Tiered>(rng: Rng, list: readonly T[], tier: number): T =>
  rng.pick(bandOf(list, tier))

export const sampleTier = <T extends Tiered>(rng: Rng, list: readonly T[], tier: number, n: number): T[] =>
  rng.sample(bandOf(list, tier), n)

/* ------------------------------------------------------------------ *
 * Synonyms
 *
 * `same` are all genuine synonyms of `word`; `wrong` are real words that are
 * definitely NOT synonyms — usually the opposite, or a word from the same
 * area of meaning that a child might grab at.
 * ------------------------------------------------------------------ */

export interface WordPair extends Tiered {
  word: string
  same: string[]
  wrong: string[]
}

type PairSpec = [string, string[], string[]]

const pairs = (tier: number, specs: PairSpec[]): WordPair[] =>
  specs.map(([word, same, wrong]) => ({ tier, word, same, wrong }))

export const SYNONYMS: WordPair[] = [
  ...pairs(1, [
    ['big', ['large', 'huge'], ['small', 'thin', 'short', 'soft']],
    ['small', ['little', 'tiny'], ['big', 'tall', 'wide', 'heavy']],
    ['happy', ['glad', 'cheerful'], ['sad', 'sleepy', 'hungry', 'silly']],
    ['sad', ['unhappy'], ['happy', 'funny', 'kind', 'loud']],
    ['fast', ['quick', 'speedy'], ['slow', 'late', 'heavy', 'quiet']],
    ['begin', ['start'], ['stop', 'end', 'finish', 'close']],
    ['shut', ['close'], ['open', 'push', 'drop', 'break']],
    ['shout', ['yell'], ['whisper', 'listen', 'walk', 'sleep']],
    ['jump', ['leap', 'hop'], ['crawl', 'sit', 'swim', 'stand']],
    ['ill', ['sick', 'unwell'], ['well', 'strong', 'happy', 'hungry']],
    ['neat', ['tidy'], ['dirty', 'messy', 'rough', 'empty']],
    ['cold', ['chilly'], ['hot', 'dry', 'warm', 'wet']],
    ['gift', ['present'], ['box', 'party', 'letter', 'basket']],
    ['rug', ['mat'], ['bed', 'chair', 'table', 'wall']],
    ['hurry', ['rush'], ['wait', 'rest', 'stop', 'walk']],
    ['under', ['below'], ['over', 'above', 'beside', 'behind']],
    ['story', ['tale'], ['song', 'poem', 'film', 'letter']],
    ['stone', ['rock'], ['sand', 'mud', 'water', 'grass']],
  ]),
  ...pairs(2, [
    ['brave', ['bold', 'fearless'], ['afraid', 'weak', 'shy', 'quiet']],
    ['angry', ['cross', 'furious'], ['calm', 'happy', 'gentle', 'kind']],
    ['clever', ['smart', 'bright'], ['silly', 'foolish', 'lazy', 'slow']],
    ['tired', ['weary', 'sleepy'], ['awake', 'fresh', 'lively', 'strong']],
    ['rich', ['wealthy'], ['poor', 'greedy', 'lucky', 'famous']],
    ['quiet', ['silent'], ['noisy', 'loud', 'busy', 'empty']],
    ['strange', ['odd', 'unusual'], ['normal', 'common', 'plain', 'usual']],
    ['hard', ['difficult', 'tough'], ['easy', 'simple', 'soft', 'light']],
    ['easy', ['simple'], ['hard', 'difficult', 'heavy', 'busy']],
    ['wet', ['damp', 'soaked'], ['dry', 'cold', 'clean', 'warm']],
    ['repair', ['mend', 'fix'], ['break', 'spoil', 'damage', 'throw']],
    ['buy', ['purchase'], ['sell', 'pay', 'keep', 'borrow']],
    ['finish', ['complete', 'end'], ['start', 'begin', 'open', 'continue']],
    ['afraid', ['scared', 'frightened'], ['brave', 'angry', 'calm', 'safe']],
    ['laugh', ['giggle', 'chuckle'], ['cry', 'shout', 'frown', 'sob']],
    ['cry', ['weep', 'sob'], ['laugh', 'smile', 'giggle', 'shout']],
    ['road', ['street'], ['river', 'bridge', 'house', 'field']],
    ['shop', ['store'], ['bank', 'house', 'road', 'school']],
  ]),
  ...pairs(3, [
    ['ancient', ['old', 'aged'], ['modern', 'new', 'young', 'recent']],
    ['enormous', ['huge', 'gigantic'], ['tiny', 'small', 'narrow', 'slim']],
    ['gentle', ['mild', 'tender'], ['rough', 'harsh', 'fierce', 'violent']],
    ['calm', ['peaceful', 'still'], ['noisy', 'wild', 'angry', 'busy']],
    ['rapid', ['fast', 'swift'], ['slow', 'steady', 'late', 'gradual']],
    ['tasty', ['delicious'], ['bitter', 'plain', 'sour', 'burnt']],
    ['weary', ['tired', 'exhausted'], ['energetic', 'fresh', 'awake', 'lively']],
    ['select', ['choose', 'pick'], ['refuse', 'drop', 'lose', 'forget']],
    ['reply', ['answer', 'respond'], ['ask', 'question', 'listen', 'ignore']],
    ['permit', ['allow'], ['forbid', 'stop', 'refuse', 'prevent']],
    ['discover', ['find', 'uncover'], ['lose', 'hide', 'bury', 'cover']],
    ['damage', ['harm', 'spoil'], ['repair', 'mend', 'build', 'protect']],
    ['courageous', ['brave', 'daring'], ['cowardly', 'timid', 'fearful', 'weak']],
    ['polite', ['courteous', 'well-mannered'], ['rude', 'cheeky', 'harsh', 'bossy']],
    ['filthy', ['dirty', 'grubby'], ['clean', 'tidy', 'fresh', 'neat']],
    ['valuable', ['precious', 'costly'], ['worthless', 'cheap', 'common', 'useless']],
    ['beautiful', ['lovely', 'pretty'], ['ugly', 'plain', 'dull', 'awful']],
    ['journey', ['trip', 'voyage'], ['road', 'ticket', 'station', 'suitcase']],
    ['shy', ['timid', 'bashful'], ['bold', 'loud', 'rude', 'proud']],
  ]),
  ...pairs(4, [
    ['generous', ['unselfish', 'giving'], ['mean', 'selfish', 'greedy', 'stingy']],
    ['reluctant', ['unwilling', 'hesitant'], ['eager', 'willing', 'keen', 'ready']],
    ['fragile', ['delicate', 'breakable'], ['strong', 'sturdy', 'tough', 'solid']],
    ['anxious', ['worried', 'nervous'], ['calm', 'relaxed', 'confident', 'bored']],
    ['conceal', ['hide', 'cover'], ['reveal', 'show', 'display', 'expose']],
    ['assist', ['help', 'aid'], ['hinder', 'block', 'ignore', 'delay']],
    ['commence', ['begin', 'start'], ['cease', 'finish', 'halt', 'end']],
    ['sufficient', ['enough', 'adequate'], ['lacking', 'scarce', 'empty', 'spare']],
    ['astonished', ['amazed', 'surprised'], ['bored', 'calm', 'unmoved', 'uninterested']],
    ['vacant', ['empty', 'unoccupied'], ['full', 'crowded', 'busy', 'packed']],
    ['observe', ['watch', 'notice'], ['ignore', 'hide', 'forget', 'miss']],
    ['hasty', ['hurried', 'rushed'], ['slow', 'careful', 'patient', 'steady']],
    ['genuine', ['real', 'authentic'], ['fake', 'false', 'copied', 'artificial']],
    ['cautious', ['careful', 'wary'], ['reckless', 'careless', 'hasty', 'bold']],
    ['peculiar', ['strange', 'odd'], ['ordinary', 'normal', 'usual', 'plain']],
    ['summit', ['top', 'peak'], ['bottom', 'base', 'foot', 'valley']],
    ['vanish', ['disappear', 'fade'], ['appear', 'arrive', 'remain', 'stay']],
    ['feeble', ['weak', 'frail'], ['strong', 'mighty', 'powerful', 'tough']],
  ]),
  ...pairs(5, [
    ['abundant', ['plentiful', 'ample'], ['scarce', 'rare', 'sparse', 'limited']],
    ['diligent', ['hard-working', 'industrious'], ['lazy', 'idle', 'careless', 'sloppy']],
    ['tranquil', ['calm', 'peaceful'], ['noisy', 'restless', 'stormy', 'violent']],
    ['obstinate', ['stubborn', 'headstrong'], ['obedient', 'agreeable', 'willing', 'meek']],
    ['courteous', ['polite', 'respectful'], ['rude', 'insolent', 'blunt', 'harsh']],
    ['novice', ['beginner', 'learner'], ['expert', 'master', 'veteran', 'champion']],
    ['terminate', ['end', 'finish'], ['begin', 'launch', 'extend', 'continue']],
    ['seldom', ['rarely'], ['often', 'always', 'usually', 'frequently']],
    ['thrifty', ['economical', 'frugal'], ['wasteful', 'extravagant', 'careless', 'greedy']],
    ['immense', ['enormous', 'vast'], ['minute', 'tiny', 'slight', 'narrow']],
    ['arrogant', ['haughty', 'conceited'], ['humble', 'modest', 'shy', 'meek']],
    ['compulsory', ['required', 'obligatory'], ['optional', 'voluntary', 'free', 'extra']],
    ['perilous', ['dangerous', 'risky'], ['safe', 'secure', 'harmless', 'gentle']],
    ['remedy', ['cure', 'treatment'], ['illness', 'disease', 'wound', 'poison']],
    ['persuade', ['convince', 'coax'], ['forbid', 'prevent', 'discourage', 'compel']],
    ['inevitable', ['unavoidable', 'certain'], ['unlikely', 'avoidable', 'doubtful', 'optional']],
    ['scarce', ['rare', 'uncommon'], ['plentiful', 'common', 'abundant', 'endless']],
    ['meticulous', ['thorough', 'painstaking'], ['sloppy', 'hasty', 'careless', 'rough']],
  ]),
]

/* ------------------------------------------------------------------ *
 * Antonyms
 *
 * `wrong` deliberately includes a synonym of the head word — the classic
 * trap in an opposites question is grabbing a word that means the same.
 * ------------------------------------------------------------------ */

export interface OppositePair extends Tiered {
  word: string
  opposite: string[]
  wrong: string[]
}

const opps = (tier: number, specs: PairSpec[]): OppositePair[] =>
  specs.map(([word, opposite, wrong]) => ({ tier, word, opposite, wrong }))

export const ANTONYMS: OppositePair[] = [
  ...opps(1, [
    ['hot', ['cold'], ['warm', 'wet', 'dry', 'sunny']],
    ['big', ['small', 'little'], ['large', 'huge', 'tall', 'wide']],
    ['up', ['down'], ['over', 'top', 'high', 'above']],
    ['day', ['night'], ['morning', 'noon', 'week', 'sun']],
    ['open', ['shut', 'closed'], ['door', 'push', 'wide', 'gate']],
    ['wet', ['dry'], ['damp', 'water', 'rain', 'soaked']],
    ['old', ['new', 'young'], ['ancient', 'elderly', 'used', 'aged']],
    ['fast', ['slow'], ['quick', 'speedy', 'rapid', 'swift']],
    ['happy', ['sad', 'unhappy'], ['glad', 'cheerful', 'funny', 'silly']],
    ['tall', ['short'], ['high', 'long', 'big', 'thin']],
    ['full', ['empty'], ['heavy', 'whole', 'packed', 'deep']],
    ['clean', ['dirty'], ['tidy', 'neat', 'fresh', 'washed']],
    ['push', ['pull'], ['press', 'shove', 'lift', 'drop']],
    ['give', ['take'], ['hand', 'share', 'send', 'offer']],
    ['in', ['out'], ['on', 'inside', 'under', 'within']],
    ['front', ['back'], ['side', 'top', 'near', 'forward']],
    ['laugh', ['cry'], ['giggle', 'smile', 'chuckle', 'grin']],
    ['more', ['less', 'fewer'], ['many', 'most', 'plenty', 'extra']],
    ['begin', ['end', 'finish'], ['start', 'open', 'first', 'commence']],
  ]),
  ...opps(2, [
    ['brave', ['afraid', 'cowardly'], ['bold', 'fearless', 'strong', 'daring']],
    ['rich', ['poor'], ['wealthy', 'greedy', 'lucky', 'grand']],
    ['loud', ['quiet', 'silent'], ['noisy', 'shouting', 'busy', 'deafening']],
    ['heavy', ['light'], ['hard', 'solid', 'big', 'weighty']],
    ['rough', ['smooth'], ['bumpy', 'coarse', 'hard', 'sharp']],
    ['early', ['late'], ['soon', 'quick', 'first', 'morning']],
    ['remember', ['forget'], ['recall', 'think', 'learn', 'know']],
    ['buy', ['sell'], ['purchase', 'pay', 'shop', 'spend']],
    ['friend', ['enemy'], ['pal', 'mate', 'neighbour', 'cousin']],
    ['war', ['peace'], ['fight', 'battle', 'army', 'soldier']],
    ['true', ['false'], ['correct', 'right', 'real', 'honest']],
    ['lose', ['win'], ['play', 'draw', 'beat', 'score']],
    ['asleep', ['awake'], ['sleepy', 'tired', 'dreaming', 'resting']],
    ['same', ['different'], ['alike', 'equal', 'similar', 'matching']],
    ['above', ['below'], ['over', 'high', 'top', 'upper']],
    ['wide', ['narrow'], ['broad', 'large', 'thick', 'open']],
    ['hard', ['soft'], ['tough', 'firm', 'solid', 'stiff']],
    ['always', ['never'], ['often', 'sometimes', 'usually', 'ever']],
  ]),
  ...opps(3, [
    ['ancient', ['modern'], ['old', 'aged', 'antique', 'historic']],
    ['enormous', ['tiny'], ['huge', 'giant', 'massive', 'vast']],
    ['arrive', ['depart', 'leave'], ['come', 'reach', 'enter', 'land']],
    ['accept', ['refuse', 'reject'], ['agree', 'receive', 'take', 'allow']],
    ['increase', ['decrease', 'reduce'], ['grow', 'rise', 'add', 'expand']],
    ['gather', ['scatter'], ['collect', 'group', 'pile', 'join']],
    ['wild', ['tame'], ['fierce', 'savage', 'rough', 'free']],
    ['cruel', ['kind'], ['harsh', 'mean', 'nasty', 'unkind']],
    ['shallow', ['deep'], ['flat', 'thin', 'low', 'narrow']],
    ['success', ['failure'], ['victory', 'prize', 'win', 'luck']],
    ['praise', ['blame', 'criticise'], ['applaud', 'cheer', 'admire', 'thank']],
    ['permit', ['forbid'], ['allow', 'let', 'accept', 'agree']],
    ['entrance', ['exit'], ['doorway', 'gate', 'hall', 'porch']],
    ['innocent', ['guilty'], ['honest', 'harmless', 'pure', 'blameless']],
    ['tighten', ['loosen'], ['fasten', 'secure', 'grip', 'pull']],
    ['victory', ['defeat'], ['win', 'triumph', 'success', 'prize']],
    ['borrow', ['lend'], ['take', 'owe', 'buy', 'beg']],
    ['artificial', ['natural'], ['fake', 'false', 'plastic', 'copied']],
  ]),
  ...opps(4, [
    ['generous', ['mean', 'stingy', 'selfish'], ['kind', 'giving', 'helpful', 'rich']],
    ['reluctant', ['willing', 'eager'], ['unwilling', 'slow', 'hesitant', 'doubtful']],
    ['ascend', ['descend'], ['climb', 'rise', 'mount', 'soar']],
    ['expand', ['shrink', 'contract'], ['grow', 'stretch', 'widen', 'swell']],
    ['transparent', ['opaque'], ['clear', 'glassy', 'see-through', 'thin']],
    ['temporary', ['permanent'], ['brief', 'short', 'passing', 'quick']],
    ['include', ['exclude', 'omit'], ['contain', 'add', 'hold', 'join']],
    ['maximum', ['minimum'], ['most', 'largest', 'total', 'highest']],
    ['superior', ['inferior'], ['better', 'higher', 'greater', 'finer']],
    ['voluntary', ['compulsory', 'forced'], ['willing', 'free', 'chosen', 'optional']],
    ['attack', ['defend'], ['fight', 'strike', 'charge', 'invade']],
    ['major', ['minor'], ['large', 'chief', 'main', 'great']],
    ['vacant', ['occupied'], ['empty', 'free', 'bare', 'unused']],
    ['conceal', ['reveal', 'show'], ['hide', 'cover', 'mask', 'bury']],
    ['sharp', ['blunt'], ['pointed', 'keen', 'fine', 'cutting']],
    ['fragile', ['sturdy', 'tough'], ['delicate', 'weak', 'brittle', 'thin']],
    ['gradual', ['sudden'], ['slow', 'steady', 'creeping', 'gentle']],
    ['familiar', ['strange', 'unknown'], ['known', 'common', 'usual', 'ordinary']],
  ]),
  ...opps(5, [
    ['abundant', ['scarce'], ['plentiful', 'ample', 'many', 'rich']],
    ['diligent', ['lazy', 'idle'], ['hard-working', 'busy', 'eager', 'careful']],
    ['optimist', ['pessimist'], ['dreamer', 'believer', 'thinker', 'joker']],
    ['humble', ['arrogant', 'proud'], ['modest', 'meek', 'quiet', 'gentle']],
    ['condemn', ['approve', 'praise'], ['blame', 'criticise', 'punish', 'scold']],
    ['tranquil', ['turbulent', 'stormy'], ['calm', 'peaceful', 'still', 'silent']],
    ['frequent', ['rare', 'seldom'], ['often', 'regular', 'common', 'usual']],
    ['exterior', ['interior'], ['outside', 'outer', 'surface', 'edge']],
    ['mourn', ['rejoice', 'celebrate'], ['grieve', 'weep', 'lament', 'sorrow']],
    ['deliberate', ['accidental'], ['planned', 'intended', 'careful', 'chosen']],
    ['hostile', ['friendly'], ['angry', 'aggressive', 'unkind', 'fierce']],
    ['flexible', ['rigid', 'stiff'], ['bendy', 'elastic', 'soft', 'supple']],
    ['barren', ['fertile'], ['empty', 'bare', 'dry', 'dusty']],
    ['amateur', ['professional'], ['beginner', 'learner', 'novice', 'fan']],
    ['surplus', ['shortage'], ['extra', 'excess', 'plenty', 'spare']],
    ['commence', ['conclude', 'cease'], ['begin', 'start', 'launch', 'open']],
    ['ally', ['enemy', 'foe'], ['friend', 'partner', 'helper', 'mate']],
    ['genuine', ['fake', 'counterfeit'], ['real', 'true', 'authentic', 'honest']],
  ]),
]

/* ------------------------------------------------------------------ *
 * Categories
 *
 * `family` stops the odd-one-out generator pairing two groups that overlap
 * (a parrot is a bird AND an animal). Groups in the same family are never
 * used against each other. `avoid` handles the odd one-off clash — gold is
 * both a metal and a colour.
 * ------------------------------------------------------------------ */

export interface Category extends Tiered {
  id: string
  /** Plural, shown as a group label: "Fruits". */
  name: string
  /** Singular umbrella word: "a fruit". Used by the general-word skill. */
  general: string
  family: string
  members: string[]
  avoid?: string[]
}

export const CATEGORIES: Category[] = [
  {
    tier: 1,
    id: 'fruits',
    name: 'Fruits',
    general: 'fruit',
    family: 'plant',
    members: ['mango', 'orange', 'banana', 'pawpaw', 'guava', 'pineapple', 'apple', 'cashew', 'lemon', 'coconut'],
    avoid: ['colours'],
  },
  {
    tier: 1,
    id: 'animals',
    name: 'Animals',
    general: 'animal',
    family: 'creature',
    members: ['goat', 'dog', 'cow', 'sheep', 'cat', 'horse', 'donkey', 'rabbit', 'lion', 'elephant'],
  },
  {
    tier: 1,
    id: 'colours',
    name: 'Colours',
    general: 'colour',
    family: 'shade',
    members: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'purple', 'grey', 'pink'],
    avoid: ['metals', 'gems', 'fruits'],
  },
  {
    tier: 1,
    id: 'body',
    name: 'Parts of the body',
    general: 'body part',
    family: 'body',
    members: ['hand', 'leg', 'head', 'nose', 'ear', 'eye', 'foot', 'arm', 'mouth', 'finger'],
  },
  {
    tier: 1,
    id: 'vehicles',
    name: 'Vehicles',
    general: 'vehicle',
    family: 'machine',
    members: ['car', 'bus', 'lorry', 'bicycle', 'aeroplane', 'canoe', 'train', 'motorcycle', 'ship', 'tractor'],
  },
  {
    tier: 1,
    id: 'clothes',
    name: 'Clothes',
    general: 'garment',
    family: 'wear',
    members: ['shirt', 'trousers', 'skirt', 'cap', 'dress', 'blouse', 'wrapper', 'jacket', 'gown', 'shorts'],
    avoid: ['fabrics'],
  },
  {
    tier: 1,
    id: 'furniture',
    name: 'Furniture',
    general: 'furniture',
    family: 'household',
    members: ['chair', 'table', 'bed', 'cupboard', 'bench', 'stool', 'shelf', 'wardrobe', 'sofa', 'desk'],
  },
  {
    tier: 1,
    id: 'birds',
    name: 'Birds',
    general: 'bird',
    family: 'creature',
    members: ['hen', 'duck', 'parrot', 'pigeon', 'eagle', 'owl', 'turkey', 'vulture', 'ostrich', 'peacock'],
  },
  {
    tier: 2,
    id: 'insects',
    name: 'Insects',
    general: 'insect',
    family: 'creature',
    members: ['ant', 'bee', 'fly', 'mosquito', 'butterfly', 'grasshopper', 'cockroach', 'beetle', 'termite', 'locust'],
  },
  {
    tier: 2,
    id: 'vegetables',
    name: 'Vegetables',
    general: 'vegetable',
    family: 'plant',
    members: ['onion', 'okra', 'carrot', 'cabbage', 'spinach', 'lettuce', 'pumpkin', 'beetroot'],
  },
  {
    tier: 2,
    id: 'drinks',
    name: 'Drinks',
    general: 'drink',
    family: 'food',
    members: ['water', 'milk', 'tea', 'juice', 'coffee', 'zobo', 'kunu', 'cocoa'],
    avoid: ['spices'],
  },
  {
    tier: 2,
    id: 'school',
    name: 'School things',
    general: 'stationery',
    family: 'kit',
    members: ['pencil', 'ruler', 'eraser', 'chalk', 'crayon', 'sharpener', 'satchel', 'textbook'],
  },
  {
    tier: 2,
    id: 'jobs',
    name: 'Jobs',
    general: 'occupation',
    family: 'person',
    members: ['teacher', 'doctor', 'farmer', 'tailor', 'driver', 'nurse', 'carpenter', 'trader', 'barber', 'cook'],
  },
  {
    tier: 2,
    id: 'rooms',
    name: 'Rooms in a house',
    general: 'room',
    family: 'place',
    members: ['kitchen', 'bedroom', 'bathroom', 'parlour', 'study', 'pantry', 'hall', 'cellar'],
  },
  {
    tier: 2,
    id: 'instruments',
    name: 'Musical instruments',
    general: 'instrument',
    family: 'music',
    members: ['drum', 'flute', 'guitar', 'piano', 'trumpet', 'violin', 'saxophone', 'xylophone'],
  },
  {
    tier: 2,
    id: 'sports',
    name: 'Sports',
    general: 'sport',
    family: 'game',
    members: ['football', 'tennis', 'cricket', 'hockey', 'boxing', 'swimming', 'athletics', 'basketball'],
  },
  {
    tier: 3,
    id: 'metals',
    name: 'Metals',
    general: 'metal',
    family: 'material',
    members: ['gold', 'silver', 'iron', 'copper', 'tin', 'zinc', 'lead', 'aluminium'],
    avoid: ['colours', 'gems', 'tools', 'planets'],
  },
  {
    tier: 3,
    id: 'weather',
    name: 'Weather words',
    general: 'weather',
    family: 'sky',
    members: ['rain', 'sunshine', 'wind', 'cloud', 'storm', 'fog', 'snow', 'hail'],
  },
  {
    tier: 3,
    id: 'water',
    name: 'Bodies of water',
    general: 'waterway',
    family: 'place',
    members: ['river', 'lake', 'sea', 'ocean', 'stream', 'pond', 'lagoon', 'creek'],
  },
  {
    tier: 3,
    id: 'land',
    name: 'Land features',
    general: 'landform',
    family: 'place',
    members: ['hill', 'mountain', 'valley', 'plateau', 'cliff', 'plain', 'desert', 'island'],
  },
  {
    tier: 3,
    id: 'buildings',
    name: 'Buildings',
    general: 'building',
    family: 'place',
    members: ['church', 'mosque', 'school', 'hospital', 'library', 'factory', 'museum', 'palace'],
  },
  {
    tier: 3,
    id: 'shapes',
    name: 'Shapes',
    general: 'shape',
    family: 'figure',
    members: ['circle', 'square', 'triangle', 'rectangle', 'oval', 'hexagon', 'pentagon', 'rhombus'],
  },
  {
    tier: 3,
    id: 'tools',
    name: 'Tools',
    general: 'tool',
    family: 'kit',
    members: ['hammer', 'saw', 'spanner', 'screwdriver', 'chisel', 'pliers', 'drill', 'file'],
  },
  {
    tier: 3,
    id: 'relatives',
    name: 'Relatives',
    general: 'relative',
    family: 'person',
    members: ['mother', 'father', 'uncle', 'aunt', 'cousin', 'brother', 'sister', 'nephew'],
  },
  {
    tier: 3,
    id: 'reptiles',
    name: 'Reptiles',
    general: 'reptile',
    family: 'creature',
    members: ['snake', 'lizard', 'crocodile', 'tortoise', 'chameleon', 'gecko', 'python', 'alligator'],
  },
  {
    tier: 4,
    id: 'emotions',
    name: 'Feelings',
    general: 'feeling',
    family: 'abstract',
    members: ['joy', 'anger', 'fear', 'sorrow', 'pride', 'envy', 'hope', 'shame'],
  },
  {
    tier: 4,
    id: 'gems',
    name: 'Precious stones',
    general: 'gem',
    family: 'material',
    members: ['diamond', 'ruby', 'emerald', 'sapphire', 'pearl', 'opal', 'topaz', 'jade'],
    avoid: ['colours', 'metals'],
  },
  {
    tier: 4,
    id: 'trees',
    name: 'Trees',
    general: 'tree',
    family: 'plant',
    members: ['mahogany', 'iroko', 'baobab', 'oak', 'pine', 'cedar', 'teak', 'eucalyptus'],
  },
  {
    tier: 4,
    id: 'planets',
    name: 'Planets',
    general: 'planet',
    family: 'space',
    members: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
  },
  {
    tier: 4,
    id: 'time',
    name: 'Units of time',
    general: 'unit of time',
    family: 'time',
    members: ['second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade'],
  },
  {
    tier: 4,
    id: 'fabrics',
    name: 'Fabrics',
    general: 'fabric',
    family: 'material',
    members: ['cotton', 'silk', 'wool', 'linen', 'lace', 'denim', 'satin', 'nylon'],
    avoid: ['clothes'],
  },
  {
    tier: 4,
    id: 'spices',
    name: 'Spices',
    general: 'spice',
    family: 'food',
    members: ['pepper', 'ginger', 'garlic', 'curry', 'thyme', 'nutmeg', 'cinnamon', 'clove'],
    avoid: ['drinks'],
  },
  {
    tier: 4,
    id: 'continents',
    name: 'Continents',
    general: 'continent',
    family: 'place',
    members: ['Africa', 'Europe', 'Asia', 'Australia', 'Antarctica'],
  },
  {
    tier: 5,
    id: 'qualities',
    name: 'Good qualities',
    general: 'quality',
    family: 'abstract',
    members: ['honesty', 'courage', 'wisdom', 'freedom', 'justice', 'kindness', 'loyalty', 'patience'],
  },
  {
    tier: 5,
    id: 'leaders',
    name: 'Leaders',
    general: 'leader',
    family: 'person',
    members: ['president', 'governor', 'senator', 'mayor', 'minister', 'monarch', 'councillor', 'ambassador'],
  },
  {
    tier: 5,
    id: 'measuring',
    name: 'Measuring instruments',
    general: 'device',
    family: 'kit',
    members: ['thermometer', 'barometer', 'stopwatch', 'odometer', 'speedometer', 'balance', 'protractor', 'gauge'],
  },
  {
    tier: 5,
    id: 'subjects',
    name: 'School subjects',
    general: 'subject',
    family: 'study',
    members: ['biology', 'chemistry', 'physics', 'geography', 'mathematics', 'economics', 'history', 'agriculture'],
  },
  {
    tier: 5,
    id: 'professions',
    name: 'Professions',
    general: 'profession',
    family: 'person',
    members: ['architect', 'engineer', 'pharmacist', 'surveyor', 'accountant', 'journalist', 'lawyer', 'dentist'],
  },
]

/** True when two groups may safely be used against each other. */
export function categoriesClash(a: Category, b: Category): boolean {
  if (a.id === b.id) return true
  if (a.family === b.family) return true
  if (a.avoid?.includes(b.id) || b.avoid?.includes(a.id)) return true
  return a.members.some((m) => b.members.includes(m))
}

/* ------------------------------------------------------------------ *
 * Rhymes — one family per sound, every spelling of that sound together,
 * so two families can never accidentally rhyme with each other.
 * ------------------------------------------------------------------ */

export interface RhymeFamily extends Tiered {
  /** How the ending is written on screen. */
  sound: string
  words: string[]
}

const rhyme = (tier: number, sound: string, words: string[]): RhymeFamily => ({ tier, sound, words })

export const RHYMES: RhymeFamily[] = [
  rhyme(1, '-at', ['cat', 'hat', 'mat', 'rat', 'bat', 'sat', 'flat', 'chat', 'that']),
  rhyme(1, '-og', ['dog', 'log', 'fog', 'jog', 'frog', 'cog']),
  rhyme(1, '-an', ['man', 'can', 'pan', 'ran', 'van', 'fan', 'plan', 'than']),
  rhyme(1, '-ot', ['hot', 'pot', 'not', 'got', 'spot', 'dot', 'knot', 'cot']),
  rhyme(1, '-un', ['sun', 'fun', 'run', 'one', 'won', 'bun', 'done', 'none']),
  rhyme(1, '-ed', ['bed', 'red', 'head', 'bread', 'said', 'fed', 'led', 'thread']),
  rhyme(1, '-in', ['pin', 'win', 'thin', 'chin', 'spin', 'grin', 'tin', 'bin']),
  rhyme(1, '-op', ['top', 'stop', 'shop', 'hop', 'drop', 'mop', 'crop']),
  rhyme(1, '-ug', ['bug', 'rug', 'mug', 'hug', 'jug', 'plug', 'tug']),
  rhyme(1, '-ap', ['cap', 'map', 'clap', 'tap', 'nap', 'trap', 'snap']),
  rhyme(2, '-ee', ['tree', 'bee', 'see', 'sea', 'key', 'tea', 'free', 'three', 'knee']),
  rhyme(2, '-ing', ['king', 'sing', 'ring', 'wing', 'thing', 'bring', 'spring', 'swing']),
  rhyme(2, '-y', ['sky', 'fly', 'cry', 'why', 'high', 'buy', 'eye', 'pie', 'dry', 'tie']),
  rhyme(2, '-o', ['go', 'no', 'so', 'slow', 'grow', 'snow', 'low', 'toe', 'flow', 'dough']),
  rhyme(2, '-all', ['ball', 'call', 'tall', 'wall', 'fall', 'small', 'hall', 'crawl']),
  rhyme(2, '-ill', ['hill', 'mill', 'fill', 'will', 'still', 'spill', 'bill', 'chill']),
  rhyme(2, '-ip', ['ship', 'lip', 'trip', 'drip', 'clip', 'tip', 'skip', 'whip']),
  rhyme(2, '-ick', ['stick', 'kick', 'sick', 'thick', 'brick', 'trick', 'quick', 'click']),
  rhyme(2, '-ock', ['rock', 'sock', 'lock', 'clock', 'block', 'knock', 'shock']),
  rhyme(2, '-ook', ['book', 'look', 'cook', 'took', 'hook', 'shook']),
  rhyme(3, '-ight', ['light', 'night', 'right', 'bright', 'kite', 'white', 'sight', 'fight', 'write', 'quite']),
  rhyme(3, '-ake', ['cake', 'lake', 'make', 'snake', 'bake', 'shake', 'break', 'steak']),
  rhyme(3, '-own', ['town', 'down', 'brown', 'crown', 'gown', 'frown', 'noun']),
  rhyme(3, '-oon', ['moon', 'spoon', 'soon', 'noon', 'balloon', 'afternoon']),
  rhyme(3, '-ouse', ['house', 'mouse', 'blouse']),
  rhyme(3, '-air', ['hair', 'chair', 'bear', 'pear', 'share', 'care', 'air', 'stare', 'there', 'where']),
  rhyme(3, '-eat', ['feet', 'meet', 'street', 'sweet', 'treat', 'seat', 'eat', 'beat', 'neat', 'heat']),
  rhyme(3, '-eep', ['sleep', 'keep', 'deep', 'sheep', 'jeep', 'weep', 'steep', 'cheap']),
  rhyme(4, '-ain', ['rain', 'train', 'plain', 'chain', 'brain', 'main', 'pain', 'cane', 'plane']),
  rhyme(4, '-eel', ['wheel', 'feel', 'meal', 'steal', 'heel', 'peel', 'real', 'seal']),
  rhyme(4, '-ird', ['bird', 'word', 'heard', 'third', 'herd']),
  rhyme(4, '-ound', ['round', 'ground', 'sound', 'found', 'pound', 'hound']),
  rhyme(4, '-ark', ['dark', 'park', 'mark', 'shark', 'bark', 'spark']),
  rhyme(5, '-alk', ['talk', 'walk', 'chalk', 'stalk']),
  rhyme(5, '-ation', ['nation', 'station', 'relation', 'creation', 'donation', 'vacation']),
  rhyme(5, '-ention', ['attention', 'invention', 'intention', 'mention', 'convention']),
]

/* ------------------------------------------------------------------ *
 * Compound words
 * ------------------------------------------------------------------ */

export interface Compound extends Tiered {
  a: string
  b: string
}

const compounds = (tier: number, specs: string[]): Compound[] =>
  specs.map((s) => {
    const [a, b] = s.split('+')
    return { tier, a, b }
  })

export const COMPOUNDS: Compound[] = [
  ...compounds(1, [
    'foot+ball', 'bed+room', 'rain+bow', 'sun+shine', 'moon+light', 'tooth+brush',
    'hair+cut', 'book+shop', 'door+bell', 'gold+fish', 'hand+bag', 'pop+corn',
    'snow+man', 'tea+pot', 'week+end', 'play+ground', 'foot+path', 'arm+chair',
    'bath+room', 'camp+fire', 'day+light', 'ear+ring', 'farm+yard', 'fire+wood',
    'note+book', 'out+side', 'pan+cake', 'rain+coat', 'school+boy', 'sun+flower',
  ]),
  ...compounds(2, [
    'black+board', 'class+room', 'birth+day', 'butter+fly', 'key+board', 'news+paper',
    'sea+side', 'water+fall', 'motor+cycle', 'over+coat', 'under+ground', 'cup+board',
    'air+port', 'break+fast', 'butter+milk', 'card+board', 'grand+mother', 'hand+shake',
    'head+master', 'home+work', 'lip+stick', 'mid+night', 'pass+port', 'pine+apple',
    'post+card', 'sand+paper', 'sign+post', 'straw+berry', 'sun+rise', 'table+cloth',
  ]),
  ...compounds(3, [
    'time+table', 'tooth+ache', 'up+stairs', 'wall+paper', 'wheel+chair', 'wind+screen',
    'foot+print', 'fire+place', 'back+bone', 'black+smith', 'bull+dog', 'cross+road',
    'door+way', 'egg+plant', 'eye+brow', 'finger+print', 'foot+step', 'hair+brush',
    'hand+writing', 'land+lord', 'life+time', 'mail+box', 'milk+man', 'night+fall',
    'rail+way', 'sea+shore', 'shoe+lace', 'tea+cup', 'water+melon', 'wind+mill',
  ]),
  ...compounds(4, [
    'work+shop', 'bed+side', 'black+bird', 'book+case', 'day+dream', 'farm+house',
    'god+father', 'grand+father', 'gun+powder', 'hair+dresser', 'hand+ball', 'head+ache',
    'house+hold', 'key+hole', 'lady+bird', 'life+boat', 'match+box', 'motor+way',
    'neck+lace', 'oat+meal', 'pea+cock', 'pen+knife', 'rain+fall', 'sea+food',
  ]),
  ...compounds(5, [
    'skate+board', 'super+market', 'sword+fish', 'tooth+paste', 'under+stand', 'water+proof',
    'week+day', 'wheel+barrow', 'wood+work', 'court+yard', 'light+house', 'main+land',
    'master+piece', 'news+reader', 'over+throw', 'para+chute', 'photo+graph', 'sand+castle',
    'scare+crow', 'ship+wreck', 'short+hand', 'thunder+storm', 'water+colour', 'wind+screen',
  ]),
]

/* ------------------------------------------------------------------ *
 * Hidden words — a small word spelled by consecutive letters of a bigger
 * one. Distractors are checked against the big word at generation time, so
 * only the `hidden` field here has to be right.
 * ------------------------------------------------------------------ */

export interface Hidden extends Tiered {
  word: string
  hidden: string
}

const hides = (tier: number, specs: string[]): Hidden[] =>
  specs.map((s) => {
    const [word, hidden] = s.split('/')
    return { tier, word, hidden }
  })

export const HIDDEN_WORDS: Hidden[] = [
  ...hides(1, [
    'carpet/pet', 'basket/ask', 'monkey/key', 'banana/ban', 'pencil/pen', 'rainbow/rain',
    'garden/den', 'window/win', 'father/fat', 'mother/moth', 'corner/corn', 'carrot/car',
    'yellow/low', 'island/land', 'kitchen/hen', 'letter/let', 'friend/end', 'planet/net',
  ]),
  ...hides(2, [
    'teacher/tea', 'brother/broth', 'machine/chin', 'history/story', 'because/cause',
    'another/other', 'present/sent', 'village/age', 'chicken/chick', 'feather/eat',
    'thunder/under', 'blanket/blank', 'captain/cap', 'children/child', 'number/numb',
    'shepherd/herd', 'crocodile/cod', 'elephant/ant', 'pineapple/apple', 'something/thing',
  ]),
  ...hides(3, [
    'understand/stand', 'afternoon/noon', 'breakfast/fast', 'butterfly/utter', 'carpenter/enter',
    'grandmother/grand', 'hospital/pit', 'language/age', 'restaurant/rant', 'telephone/phone',
    'television/vision', 'vegetable/table', 'wonderful/wonder', 'dangerous/anger', 'mountain/mount',
    'chocolate/late', 'character/act', 'knowledge/know', 'geography/graph', 'furniture/urn',
  ]),
  ...hides(4, [
    'equipment/men', 'principal/pal', 'appointment/point', 'temperature/rat', 'important/port',
    'separate/rate', 'everything/very', 'discovery/cover', 'yesterday/yes', 'sometimes/time',
    'stationery/station', 'population/pop', 'university/sit', 'signature/nature', 'passenger/pass',
    'compassion/passion', 'friendship/friend', 'department/part', 'management/manage', 'appearance/pear',
  ]),
  ...hides(5, [
    'championship/champion', 'consideration/side', 'entertainment/enter', 'independent/depend',
    'introduction/duct', 'measurement/sure', 'photograph/graph', 'refreshment/fresh',
    'transparent/parent', 'underground/round', 'celebration/rat', 'competition/pet',
    'examination/exam', 'information/format', 'arrangement/range', 'punishment/punish',
    'government/govern', 'discussion/discus', 'preparation/ration', 'engineering/engine',
  ]),
]

/* ------------------------------------------------------------------ *
 * Plurals
 * ------------------------------------------------------------------ */

export interface Plural extends Tiered {
  one: string
  many: string
}

const plurals = (tier: number, specs: string[]): Plural[] =>
  specs.map((s) => {
    const [one, many] = s.split('/')
    return { tier, one, many }
  })

export const PLURALS: Plural[] = [
  ...plurals(1, [
    'book/books', 'chair/chairs', 'pencil/pencils', 'desk/desks', 'dog/dogs', 'cup/cups',
    'boy/boys', 'girl/girls', 'table/tables', 'door/doors', 'hand/hands', 'shoe/shoes',
  ]),
  ...plurals(2, [
    'bus/buses', 'box/boxes', 'church/churches', 'brush/brushes', 'glass/glasses', 'dish/dishes',
    'watch/watches', 'fox/foxes', 'match/matches', 'class/classes', 'bench/benches', 'branch/branches',
    'baby/babies', 'lady/ladies', 'city/cities', 'story/stories', 'party/parties', 'puppy/puppies',
  ]),
  ...plurals(3, [
    'leaf/leaves', 'knife/knives', 'wife/wives', 'thief/thieves', 'half/halves', 'shelf/shelves',
    'wolf/wolves', 'loaf/loaves', 'calf/calves', 'life/lives', 'family/families', 'country/countries',
    'lorry/lorries', 'berry/berries', 'potato/potatoes', 'tomato/tomatoes', 'hero/heroes', 'echo/echoes',
  ]),
  ...plurals(4, [
    'man/men', 'woman/women', 'child/children', 'foot/feet', 'tooth/teeth', 'goose/geese',
    'mouse/mice', 'ox/oxen', 'person/people', 'sheep/sheep', 'deer/deer', 'aircraft/aircraft',
    'photo/photos', 'piano/pianos', 'radio/radios', 'factory/factories', 'army/armies', 'diary/diaries',
  ]),
  ...plurals(5, [
    'crisis/crises', 'axis/axes', 'basis/bases', 'oasis/oases', 'thesis/theses', 'nucleus/nuclei',
    'stimulus/stimuli', 'bacterium/bacteria', 'criterion/criteria', 'phenomenon/phenomena',
    'analysis/analyses', 'louse/lice', 'trout/trout', 'salmon/salmon', 'hypothesis/hypotheses',
    'passer-by/passers-by', 'son-in-law/sons-in-law', 'commander-in-chief/commanders-in-chief',
  ]),
]

/* ------------------------------------------------------------------ *
 * Analogies — pairs sharing one relationship.
 * ------------------------------------------------------------------ */

export interface AnalogyGroup extends Tiered {
  relation: string
  pairs: [string, string][]
}

export const ANALOGIES: AnalogyGroup[] = [
  {
    tier: 1,
    relation: 'the opposite of',
    pairs: [
      ['hot', 'cold'], ['big', 'small'], ['up', 'down'], ['day', 'night'], ['open', 'shut'],
      ['wet', 'dry'], ['happy', 'sad'], ['fast', 'slow'], ['full', 'empty'], ['young', 'old'],
    ],
  },
  {
    tier: 1,
    relation: 'the young of',
    pairs: [
      ['cow', 'calf'], ['dog', 'puppy'], ['cat', 'kitten'], ['goat', 'kid'], ['sheep', 'lamb'],
      ['hen', 'chick'], ['horse', 'foal'], ['duck', 'duckling'], ['lion', 'cub'], ['frog', 'tadpole'],
    ],
  },
  {
    tier: 2,
    relation: 'the sound made by',
    pairs: [
      ['dog', 'bark'], ['cow', 'moo'], ['lion', 'roar'], ['snake', 'hiss'], ['bird', 'chirp'],
      ['horse', 'neigh'], ['sheep', 'bleat'], ['duck', 'quack'], ['donkey', 'bray'], ['cat', 'mew'],
    ],
  },
  {
    tier: 2,
    relation: 'the home of',
    pairs: [
      ['bird', 'nest'], ['bee', 'hive'], ['dog', 'kennel'], ['horse', 'stable'], ['pig', 'sty'],
      ['lion', 'den'], ['rabbit', 'burrow'], ['spider', 'web'], ['fish', 'water'],
    ],
  },
  {
    tier: 2,
    relation: 'the female of',
    pairs: [
      ['boy', 'girl'], ['man', 'woman'], ['king', 'queen'], ['uncle', 'aunt'], ['father', 'mother'],
      ['son', 'daughter'], ['cock', 'hen'], ['bull', 'cow'], ['nephew', 'niece'], ['husband', 'wife'],
    ],
  },
  {
    tier: 3,
    relation: 'the workplace of',
    pairs: [
      ['teacher', 'school'], ['doctor', 'hospital'], ['farmer', 'farm'], ['cook', 'kitchen'],
      ['pilot', 'aeroplane'], ['judge', 'court'], ['trader', 'market'], ['actor', 'stage'],
      ['baker', 'bakery'], ['librarian', 'library'],
    ],
  },
  {
    tier: 3,
    relation: 'the tool used by',
    pairs: [
      ['farmer', 'hoe'], ['carpenter', 'hammer'], ['tailor', 'needle'], ['painter', 'brush'],
      ['doctor', 'stethoscope'], ['mechanic', 'spanner'], ['barber', 'clippers'], ['artist', 'pencil'],
    ],
  },
  {
    tier: 3,
    relation: 'a part of',
    pairs: [
      ['hand', 'finger'], ['foot', 'toe'], ['tree', 'leaf'], ['book', 'page'], ['car', 'wheel'],
      ['house', 'room'], ['flower', 'petal'], ['keyboard', 'key'], ['kite', 'tail'],
    ],
  },
  {
    tier: 4,
    relation: 'the source of',
    pairs: [
      ['milk', 'cow'], ['egg', 'hen'], ['honey', 'bee'], ['wool', 'sheep'], ['bread', 'flour'],
      ['paper', 'tree'], ['cloth', 'cotton'], ['palm oil', 'palm'],
    ],
  },
  {
    tier: 4,
    relation: 'the material of',
    pairs: [
      ['table', 'wood'], ['window', 'glass'], ['shirt', 'cotton'], ['knife', 'steel'],
      ['tyre', 'rubber'], ['wall', 'brick'], ['book', 'paper'], ['bottle', 'plastic'],
    ],
  },
  {
    tier: 4,
    relation: 'the plural of',
    pairs: [
      ['child', 'children'], ['man', 'men'], ['foot', 'feet'], ['tooth', 'teeth'],
      ['mouse', 'mice'], ['goose', 'geese'], ['knife', 'knives'], ['leaf', 'leaves'],
    ],
  },
  {
    tier: 5,
    relation: 'the past tense of',
    pairs: [
      ['go', 'went'], ['eat', 'ate'], ['see', 'saw'], ['run', 'ran'], ['write', 'wrote'],
      ['buy', 'bought'], ['teach', 'taught'], ['bring', 'brought'], ['catch', 'caught'],
    ],
  },
  {
    tier: 5,
    relation: 'a stronger word for',
    pairs: [
      ['warm', 'hot'], ['cool', 'cold'], ['big', 'enormous'], ['small', 'minute'],
      ['good', 'excellent'], ['bad', 'terrible'], ['like', 'adore'], ['sad', 'heartbroken'],
    ],
  },
  {
    tier: 5,
    relation: 'the capital city of',
    pairs: [
      ['Nigeria', 'Abuja'], ['Ghana', 'Accra'], ['Kenya', 'Nairobi'], ['Egypt', 'Cairo'],
      ['France', 'Paris'], ['England', 'London'], ['Japan', 'Tokyo'], ['Italy', 'Rome'],
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Homophones — grouped by sound, with a sentence that only one member fits.
 * ------------------------------------------------------------------ */

export interface HomophoneSet extends Tiered {
  words: string[]
  clues: { word: string; sentence: string }[]
}

export const HOMOPHONES: HomophoneSet[] = [
  {
    tier: 1,
    words: ['hear', 'here'],
    clues: [
      { word: 'hear', sentence: 'Can you ___ the bell ringing?' },
      { word: 'here', sentence: 'Please come ___ and sit beside me.' },
    ],
  },
  {
    tier: 1,
    words: ['see', 'sea'],
    clues: [
      { word: 'see', sentence: 'I can ___ the hill from my window.' },
      { word: 'sea', sentence: 'We swam in the ___ at Bar Beach.' },
    ],
  },
  {
    tier: 1,
    words: ['son', 'sun'],
    clues: [
      { word: 'sun', sentence: 'The ___ was very hot at noon.' },
      { word: 'son', sentence: 'Mr Bello came with his ___ and his daughter.' },
    ],
  },
  {
    tier: 1,
    words: ['one', 'won'],
    clues: [
      { word: 'won', sentence: 'Our school ___ the football match.' },
      { word: 'one', sentence: 'There is only ___ mango left in the bowl.' },
    ],
  },
  {
    tier: 1,
    words: ['two', 'too', 'to'],
    clues: [
      { word: 'two', sentence: 'I bought ___ loaves of bread.' },
      { word: 'too', sentence: 'The soup is ___ salty to eat.' },
    ],
  },
  {
    tier: 1,
    words: ['no', 'know'],
    clues: [
      { word: 'know', sentence: 'Do you ___ the answer?' },
      { word: 'no', sentence: 'There is ___ water in the tank.' },
    ],
  },
  {
    tier: 2,
    words: ['there', 'their', "they're"],
    clues: [
      { word: 'their', sentence: 'The pupils collected ___ books.' },
      { word: 'there', sentence: 'Put the basket over ___ by the door.' },
    ],
  },
  {
    tier: 2,
    words: ['write', 'right'],
    clues: [
      { word: 'write', sentence: 'Please ___ your name at the top.' },
      { word: 'right', sentence: 'Turn ___ at the junction.' },
    ],
  },
  {
    tier: 2,
    words: ['new', 'knew'],
    clues: [
      { word: 'knew', sentence: 'Ada ___ the answer at once.' },
      { word: 'new', sentence: 'He wore his ___ uniform to school.' },
    ],
  },
  {
    tier: 2,
    words: ['meet', 'meat'],
    clues: [
      { word: 'meet', sentence: 'Let us ___ at the library after school.' },
      { word: 'meat', sentence: 'The stew has plenty of ___ in it.' },
    ],
  },
  {
    tier: 2,
    words: ['pair', 'pear'],
    clues: [
      { word: 'pair', sentence: 'She bought a ___ of shoes.' },
      { word: 'pear', sentence: 'He ate a juicy ___ after lunch.' },
    ],
  },
  {
    tier: 2,
    words: ['tail', 'tale'],
    clues: [
      { word: 'tail', sentence: 'The dog wagged its ___.' },
      { word: 'tale', sentence: 'Grandmother told us a ___ about the tortoise.' },
    ],
  },
  {
    tier: 2,
    words: ['blue', 'blew'],
    clues: [
      { word: 'blew', sentence: 'The wind ___ the papers off the desk.' },
      { word: 'blue', sentence: 'The sky is a lovely ___ today.' },
    ],
  },
  {
    tier: 2,
    words: ['week', 'weak'],
    clues: [
      { word: 'week', sentence: 'There are seven days in a ___.' },
      { word: 'weak', sentence: 'He felt ___ after his illness.' },
    ],
  },
  {
    tier: 2,
    words: ['hole', 'whole'],
    clues: [
      { word: 'hole', sentence: 'There is a ___ in my sock.' },
      { word: 'whole', sentence: 'He ate the ___ loaf by himself.' },
    ],
  },
  {
    tier: 3,
    words: ['flour', 'flower'],
    clues: [
      { word: 'flour', sentence: 'Bread is made from ___ and water.' },
      { word: 'flower', sentence: 'A bee landed on the yellow ___.' },
    ],
  },
  {
    tier: 3,
    words: ['piece', 'peace'],
    clues: [
      { word: 'piece', sentence: 'May I have a ___ of cake?' },
      { word: 'peace', sentence: 'After the quarrel the two friends made ___.' },
    ],
  },
  {
    tier: 3,
    words: ['plain', 'plane'],
    clues: [
      { word: 'plane', sentence: 'The ___ landed safely in Abuja.' },
      { word: 'plain', sentence: 'Her dress was ___, with no pattern on it.' },
    ],
  },
  {
    tier: 3,
    words: ['road', 'rode'],
    clues: [
      { word: 'rode', sentence: 'Tunde ___ his bicycle to school.' },
      { word: 'road', sentence: 'Look both ways before crossing the ___.' },
    ],
  },
  {
    tier: 3,
    words: ['sail', 'sale'],
    clues: [
      { word: 'sail', sentence: 'The boat will ___ across the lagoon.' },
      { word: 'sale', sentence: 'The shop is having a big ___ this week.' },
    ],
  },
  {
    tier: 3,
    words: ['some', 'sum'],
    clues: [
      { word: 'sum', sentence: 'Find the ___ of 24 and 36.' },
      { word: 'some', sentence: 'Please give me ___ water.' },
    ],
  },
  {
    tier: 3,
    words: ['wait', 'weight'],
    clues: [
      { word: 'wait', sentence: 'Please ___ for me at the gate.' },
      { word: 'weight', sentence: 'The ___ of the bag is five kilograms.' },
    ],
  },
  {
    tier: 3,
    words: ['buy', 'by'],
    clues: [
      { word: 'buy', sentence: 'I want to ___ a new pencil.' },
      { word: 'by', sentence: 'The letter was written ___ my sister.' },
    ],
  },
  {
    tier: 3,
    words: ['sell', 'cell'],
    clues: [
      { word: 'sell', sentence: 'Traders ___ yams in the market.' },
      { word: 'cell', sentence: 'The prisoner was locked in a ___.' },
    ],
  },
  {
    tier: 3,
    words: ['made', 'maid'],
    clues: [
      { word: 'made', sentence: 'She ___ a cake for the party.' },
      { word: 'maid', sentence: 'The ___ swept the parlour this morning.' },
    ],
  },
  {
    tier: 3,
    words: ['our', 'hour'],
    clues: [
      { word: 'hour', sentence: 'The lesson lasted one ___.' },
      { word: 'our', sentence: 'This is ___ classroom.' },
    ],
  },
  {
    tier: 3,
    words: ['night', 'knight'],
    clues: [
      { word: 'night', sentence: 'The stars come out at ___.' },
      { word: 'knight', sentence: 'The ___ wore heavy armour and carried a sword.' },
    ],
  },
  {
    tier: 4,
    words: ['mail', 'male'],
    clues: [
      { word: 'mail', sentence: 'The postman delivered the ___ before noon.' },
      { word: 'male', sentence: 'A cock is a ___ bird.' },
    ],
  },
  {
    tier: 4,
    words: ['nose', 'knows'],
    clues: [
      { word: 'knows', sentence: 'Everyone ___ that water boils at 100 degrees.' },
      { word: 'nose', sentence: 'He blew his ___ into a handkerchief.' },
    ],
  },
  {
    tier: 4,
    words: ['rain', 'reign'],
    clues: [
      { word: 'rain', sentence: 'The ___ fell heavily all night.' },
      { word: 'reign', sentence: "The king's ___ lasted forty years." },
    ],
  },
  {
    tier: 4,
    words: ['steel', 'steal'],
    clues: [
      { word: 'steel', sentence: 'The gate is made of strong ___.' },
      { word: 'steal', sentence: 'It is wrong to ___ from others.' },
    ],
  },
  {
    tier: 4,
    words: ['threw', 'through'],
    clues: [
      { word: 'threw', sentence: 'He ___ the ball over the wall.' },
      { word: 'through', sentence: 'The train went ___ the tunnel.' },
    ],
  },
  {
    tier: 4,
    words: ['waist', 'waste'],
    clues: [
      { word: 'waist', sentence: 'The belt was too tight round his ___.' },
      { word: 'waste', sentence: 'Do not ___ water while brushing your teeth.' },
    ],
  },
  {
    tier: 4,
    words: ['way', 'weigh'],
    clues: [
      { word: 'weigh', sentence: 'Please ___ the rice before you cook it.' },
      { word: 'way', sentence: 'Show me the ___ to the market.' },
    ],
  },
  {
    tier: 4,
    words: ['wood', 'would'],
    clues: [
      { word: 'wood', sentence: 'The table is made of ___.' },
      { word: 'would', sentence: 'I ___ like a glass of water, please.' },
    ],
  },
  {
    tier: 4,
    words: ['bare', 'bear'],
    clues: [
      { word: 'bare', sentence: 'The room was ___, with no furniture in it.' },
      { word: 'bear', sentence: 'A ___ sleeps through the whole winter.' },
    ],
  },
  {
    tier: 4,
    words: ['brake', 'break'],
    clues: [
      { word: 'brake', sentence: 'Press the ___ to stop the car.' },
      { word: 'break', sentence: 'Be careful not to ___ the glass.' },
    ],
  },
  {
    tier: 4,
    words: ['fair', 'fare'],
    clues: [
      { word: 'fare', sentence: 'The bus ___ to Ibadan has gone up.' },
      { word: 'fair', sentence: 'The referee was ___ to both teams.' },
    ],
  },
  {
    tier: 4,
    words: ['heal', 'heel'],
    clues: [
      { word: 'heal', sentence: 'The wound will ___ in a few days.' },
      { word: 'heel', sentence: 'There is a hole in the ___ of my shoe.' },
    ],
  },
  {
    tier: 4,
    words: ['ate', 'eight'],
    clues: [
      { word: 'ate', sentence: 'She ___ all her beans.' },
      { word: 'eight', sentence: 'A spider has ___ legs.' },
    ],
  },
  {
    tier: 5,
    words: ['aloud', 'allowed'],
    clues: [
      { word: 'aloud', sentence: 'The teacher asked her to read the poem ___.' },
      { word: 'allowed', sentence: 'We are not ___ to run in the corridor.' },
    ],
  },
  {
    tier: 5,
    words: ['board', 'bored'],
    clues: [
      { word: 'board', sentence: 'The teacher wrote the date on the ___.' },
      { word: 'bored', sentence: 'He was ___ with nothing at all to do.' },
    ],
  },
  {
    tier: 5,
    words: ['scene', 'seen'],
    clues: [
      { word: 'seen', sentence: 'Have you ___ my pencil anywhere?' },
      { word: 'scene', sentence: 'The last ___ of the play was very funny.' },
    ],
  },
  {
    tier: 5,
    words: ['stare', 'stair'],
    clues: [
      { word: 'stare', sentence: 'It is rude to ___ at people.' },
      { word: 'stair', sentence: 'He climbed the last ___ slowly.' },
    ],
  },
  {
    tier: 5,
    words: ['sight', 'site'],
    clues: [
      { word: 'sight', sentence: 'The ___ of the waterfall amazed us.' },
      { word: 'site', sentence: 'They are building a school on that ___.' },
    ],
  },
  {
    tier: 5,
    words: ['sole', 'soul'],
    clues: [
      { word: 'sole', sentence: 'The ___ of my shoe is worn out.' },
      { word: 'soul', sentence: 'Not a single ___ was in the street.' },
    ],
  },
  {
    tier: 5,
    words: ['vain', 'vein'],
    clues: [
      { word: 'vein', sentence: 'The nurse found a ___ in his arm.' },
      { word: 'vain', sentence: 'She is very ___ about her looks.' },
    ],
  },
  {
    tier: 5,
    words: ['weather', 'whether'],
    clues: [
      { word: 'weather', sentence: 'The ___ is cloudy today.' },
      { word: 'whether', sentence: 'I do not know ___ he will come or not.' },
    ],
  },
  {
    tier: 5,
    words: ['which', 'witch'],
    clues: [
      { word: 'which', sentence: '___ of these books is yours?' },
      { word: 'witch', sentence: 'The story was about a wicked ___.' },
    ],
  },
  {
    tier: 5,
    words: ['course', 'coarse'],
    clues: [
      { word: 'coarse', sentence: 'The sand felt ___ under my feet.' },
      { word: 'course', sentence: 'The main ___ was rice and stew.' },
    ],
  },
  {
    tier: 5,
    words: ['lesson', 'lessen'],
    clues: [
      { word: 'lesson', sentence: 'Our first ___ today is mathematics.' },
      { word: 'lessen', sentence: 'The tablets will ___ the pain.' },
    ],
  },
  {
    tier: 5,
    words: ['prey', 'pray'],
    clues: [
      { word: 'prey', sentence: 'The eagle swooped down on its ___.' },
      { word: 'pray', sentence: 'They ___ together every morning.' },
    ],
  },
  {
    tier: 5,
    words: ['guest', 'guessed'],
    clues: [
      { word: 'guest', sentence: 'We had a ___ for dinner last night.' },
      { word: 'guessed', sentence: 'She ___ the answer correctly.' },
    ],
  },
  {
    tier: 5,
    words: ['mist', 'missed'],
    clues: [
      { word: 'mist', sentence: 'A thick ___ covered the hill at dawn.' },
      { word: 'missed', sentence: 'He ___ the bus this morning.' },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Homonyms — one spelling, two meanings.
 * ------------------------------------------------------------------ */

export interface Homonym extends Tiered {
  word: string
  meanings: [string, string]
}

const homs = (tier: number, specs: [string, string, string][]): Homonym[] =>
  specs.map(([word, m1, m2]) => ({ tier, word, meanings: [m1, m2] }))

export const HOMONYMS: Homonym[] = [
  ...homs(2, [
    ['bank', 'a place where money is kept', 'the side of a river'],
    ['bat', 'an animal that flies at night', 'a stick used to hit a ball'],
    ['bark', 'the sound a dog makes', 'the outer covering of a tree'],
    ['match', 'a game between two teams', 'a small stick that makes fire'],
    ['light', 'not heavy', 'what helps us to see'],
    ['ring', 'jewellery worn on a finger', 'the sound a bell makes'],
    ['watch', 'a small clock worn on the wrist', 'to look at something carefully'],
    ['palm', 'the inside of your hand', 'a tall tree with big leaves'],
    ['trunk', "an elephant's long nose", 'the thick main stem of a tree'],
    ['fly', 'a small buzzing insect', 'to move through the air'],
  ]),
  ...homs(3, [
    ['park', 'a green place where children play', 'to leave a car somewhere'],
    ['rock', 'a large hard stone', 'to move gently to and fro'],
    ['spring', 'the season after winter', 'to jump up suddenly'],
    ['star', 'a bright light in the night sky', 'a very famous performer'],
    ['tie', 'a strip of cloth worn round the neck', 'to fasten with a knot'],
    ['train', 'a vehicle that runs on rails', 'to teach a skill by practice'],
    ['wave', 'moving water on the sea', 'to move your hand in greeting'],
    ['well', 'in good health', 'a deep hole dug for water'],
    ['kind', 'friendly and caring', 'a type or sort of thing'],
    ['left', 'the opposite of right', 'went away from a place'],
    ['date', 'the day, month and year', 'a sweet brown fruit'],
    ['pupil', 'a learner in a school', 'the dark centre of the eye'],
  ]),
  ...homs(4, [
    ['fine', 'very good indeed', 'money paid as a punishment'],
    ['block', 'a solid lump of something', 'to stop something passing'],
    ['change', 'the coins you get back', 'to make something different'],
    ['letter', 'a message you post', 'a symbol of the alphabet'],
    ['present', 'a gift you are given', 'here, and not absent'],
    ['second', 'the one that comes after the first', 'a very short unit of time'],
    ['board', 'a flat piece of wood', 'to get on a bus or an aeroplane'],
    ['coach', 'a bus used for long journeys', 'a person who trains a team'],
    ['crane', 'a tall long-legged bird', 'a machine that lifts heavy loads'],
    ['note', 'a short written message', 'a piece of paper money'],
    ['ruler', 'a person who rules a country', 'a strip used for measuring'],
    ['stick', 'a thin piece of wood', 'to fix one thing to another'],
  ]),
  ...homs(5, [
    ['current', 'happening at this time', 'the flow of water or electricity'],
    ['mine', 'the one belonging to me', 'a place where coal is dug out'],
    ['pound', 'a unit of weight', 'to hit something again and again'],
    ['record', 'the best performance ever achieved', 'to store sound so it can be played again'],
    ['season', 'a part of the year', 'to add salt and spices to food'],
    ['store', 'a shop that sells goods', 'to keep something for later use'],
    ['tip', 'the pointed end of something', 'extra money given for good service'],
    ['yard', 'an open space beside a house', 'a unit of length just under a metre'],
    ['bear', 'a large furry wild animal', 'to carry or put up with something'],
    ['fair', 'just and honest to everyone', 'an outdoor show with stalls and rides'],
    ['content', 'happy with what you have', 'what is inside something'],
    ['object', 'a thing you can see and touch', 'to speak against something'],
  ]),
]

/* ------------------------------------------------------------------ *
 * Sentence completion
 * ------------------------------------------------------------------ */

export interface SentenceGap extends Tiered {
  text: string
  answer: string
  wrong: string[]
}

const gaps = (tier: number, specs: [string, string, string[]][]): SentenceGap[] =>
  specs.map(([text, answer, wrong]) => ({ tier, text, answer, wrong }))

export const SENTENCES: SentenceGap[] = [
  ...gaps(1, [
    ['We use our ___ to see.', 'eyes', ['ears', 'nose', 'hands']],
    ["An animal that says 'moo' is a ___.", 'cow', ['hen', 'goat', 'fish']],
    ['We wear ___ on our feet.', 'shoes', ['hats', 'gloves', 'belts']],
    ['Fish live in ___.', 'water', ['sand', 'air', 'fire']],
    ['Birds can ___ in the sky.', 'fly', ['swim', 'crawl', 'dig']],
    ['We eat rice with a spoon or a ___.', 'fork', ['comb', 'brush', 'pencil']],
    ['Ice feels very ___.', 'cold', ['hot', 'sweet', 'loud']],
    ['Honey tastes ___.', 'sweet', ['bitter', 'sour', 'salty']],
    ['A doctor works in a ___.', 'hospital', ['bakery', 'garage', 'farm']],
    ['The sun rises in the ___.', 'east', ['west', 'north', 'south']],
    ['We read a ___ in the library.', 'book', ['spoon', 'chair', 'shoe']],
    ['A ___ gives us milk.', 'cow', ['dog', 'cat', 'hen']],
    ['We sleep on a ___ at night.', 'bed', ['table', 'chair', 'shelf']],
    ['A ___ is used to sweep the floor.', 'broom', ['spoon', 'pillow', 'towel']],
    ['We hear with our ___.', 'ears', ['eyes', 'toes', 'knees']],
    ['A baby goat drinks ___.', 'milk', ['petrol', 'ink', 'soap']],
  ]),
  ...gaps(2, [
    ['She was so tired that she fell ___.', 'asleep', ['awake', 'hungry', 'angry']],
    ['A person who mends shoes is a ___.', 'cobbler', ['butcher', 'plumber', 'barber']],
    ['We open an umbrella when it ___.', 'rains', ['shines', 'dries', 'sleeps']],
    ['Bees make ___ in their hive.', 'honey', ['milk', 'butter', 'bread']],
    ['A young goat is called a ___.', 'kid', ['calf', 'lamb', 'foal']],
    ['We buy bread from a ___.', 'bakery', ['library', 'pharmacy', 'garage']],
    ['Water boils at one hundred ___ Celsius.', 'degrees', ['metres', 'litres', 'grams']],
    ['The thief was arrested by the ___.', 'police', ['teacher', 'driver', 'farmer']],
    ['We keep our money in a ___.', 'bank', ['basket', 'kitchen', 'garden']],
    ['The teacher wrote on the ___ with chalk.', 'blackboard', ['window', 'ceiling', 'carpet']],
    ['Plants need sunlight and ___ to grow.', 'water', ['petrol', 'sand', 'paper']],
    ['A ___ has twelve months in it.', 'year', ['week', 'day', 'hour']],
    ['The tailor used a needle and ___.', 'thread', ['hammer', 'ladder', 'kettle']],
    ['A ___ carries passengers along the road.', 'bus', ['canoe', 'kite', 'trolley']],
    ['We wash our hands with soap and ___.', 'water', ['sand', 'chalk', 'flour']],
    ['The farmer keeps his yams in a ___.', 'barn', ['pocket', 'wallet', 'kettle']],
    ['A ___ tells us the time.', 'clock', ['mirror', 'kettle', 'basket']],
    ['Cows, goats and sheep all eat ___.', 'grass', ['meat', 'fish', 'stones']],
  ]),
  ...gaps(3, [
    ['The soup was too hot, so Ada waited for it to ___.', 'cool', ['boil', 'burn', 'freeze']],
    ['The old man walked ___ because his legs hurt.', 'slowly', ['quickly', 'loudly', 'brightly']],
    ['The desert is very ___.', 'dry', ['damp', 'muddy', 'swampy']],
    ['Iron will ___ if it is left out in the rain.', 'rust', ['melt', 'burn', 'float']],
    ['The judge sat quietly in the ___.', 'court', ['clinic', 'studio', 'garage']],
    ['The ___ repaired our leaking tap.', 'plumber', ['carpenter', 'electrician', 'painter']],
    ['A book of maps is called an ___.', 'atlas', ['album', 'index', 'almanac']],
    ['A person who writes books is an ___.', 'author', ['editor', 'printer', 'actor']],
    ['The ___ flew the aeroplane safely to Kano.', 'pilot', ['driver', 'sailor', 'guard']],
    ['We keep food fresh in a ___.', 'refrigerator', ['cupboard', 'wardrobe', 'basket']],
    ['A group of sheep is called a ___.', 'flock', ['pride', 'shoal', 'swarm']],
    ['A group of lions is called a ___.', 'pride', ['flock', 'herd', 'swarm']],
    ['A group of fish swimming together is a ___.', 'shoal', ['herd', 'flock', 'pride']],
  ]),
  ...gaps(4, [
    ['Because he was ___, he shared his lunch with everyone.', 'generous', ['greedy', 'selfish', 'lazy']],
    ['The glass is ___, so carry it carefully.', 'fragile', ['heavy', 'sturdy', 'cheap']],
    ['She was ___ to leave her friends behind.', 'reluctant', ['eager', 'delighted', 'keen']],
    ['The ___ of the story is that honesty pays.', 'moral', ['title', 'author', 'chapter']],
    ['He spoke so ___ that nobody at the back could hear him.', 'softly', ['loudly', 'angrily', 'clearly']],
    ['An animal that eats only plants is a ___.', 'herbivore', ['carnivore', 'omnivore', 'predator']],
    ['Words that mean the same thing are called ___.', 'synonyms', ['antonyms', 'homophones', 'prefixes']],
    ['The library was ___, so we studied in peace.', 'silent', ['noisy', 'crowded', 'festive']],
    ['An ___ is a person who designs buildings.', 'architect', ['engineer', 'artist', 'builder']],
    ['A ___ measures how hot or cold something is.', 'thermometer', ['barometer', 'speedometer', 'telescope']],
    ['The stubborn boy ___ to apologise.', 'refused', ['agreed', 'promised', 'offered']],
    ['He gave a ___ answer that told us nothing at all.', 'vague', ['clear', 'honest', 'precise']],
  ]),
  ...gaps(5, [
    ['The medicine will ___ the pain in your head.', 'relieve', ['increase', 'worsen', 'cause']],
    ['Despite the heavy rain, the match ___ as planned.', 'proceeded', ['cancelled', 'postponed', 'delayed']],
    ['Her handwriting was so ___ that nobody could read it.', 'illegible', ['neat', 'elegant', 'bold']],
    ['The witness gave a ___ account of what he had seen.', 'truthful', ['false', 'invented', 'imaginary']],
    ['The drought made food very ___ in the village.', 'scarce', ['plentiful', 'abundant', 'cheap']],
    ['He was ___ for the crime he did not commit.', 'blamed', ['praised', 'rewarded', 'thanked']],
    ['A person who cannot read or write is ___.', 'illiterate', ['ignorant', 'careless', 'foolish']],
    ['The two brothers bore a striking ___ to each other.', 'resemblance', ['difference', 'distance', 'argument']],
    ['She spoke ___ and everyone listened carefully.', 'confidently', ['nervously', 'silently', 'rudely']],
    ['The council will ___ the new market next month.', 'inaugurate', ['demolish', 'abandon', 'forget']],
    ['His story was so ___ that we all believed it.', 'convincing', ['doubtful', 'confusing', 'silly']],
    ['The teacher praised her for her ___ work.', 'diligent', ['careless', 'untidy', 'hurried']],
  ]),
]

/* ------------------------------------------------------------------ *
 * Definitions — "which word means…?"
 * ------------------------------------------------------------------ */

export interface Definition extends Tiered {
  word: string
  meaning: string
  /** Distractors are drawn from the same kind, so they stay plausible. */
  kind: 'person' | 'place' | 'thing' | 'group'
}

const defs = (tier: number, kind: Definition['kind'], specs: [string, string][]): Definition[] =>
  specs.map(([word, meaning]) => ({ tier, kind, word, meaning }))

export const DEFINITIONS: Definition[] = [
  ...defs(2, 'person', [
    ['pilot', 'a person who flies an aeroplane'],
    ['author', 'a person who writes books'],
    ['chef', 'a person who cooks food in a restaurant'],
    ['carpenter', 'a person who makes things out of wood'],
    ['cobbler', 'a person who mends shoes'],
    ['butcher', 'a person who sells meat'],
    ['tailor', 'a person who sews clothes'],
    ['librarian', 'a person who looks after a library'],
  ]),
  ...defs(3, 'person', [
    ['plumber', 'a person who fixes water pipes'],
    ['electrician', 'a person who repairs electric wiring'],
    ['florist', 'a person who sells flowers'],
    ['goldsmith', 'a person who makes things out of gold'],
    ['referee', 'a person who controls a football match'],
    ['passenger', 'a person travelling in a vehicle'],
    ['pedestrian', 'a person walking along the road'],
    ['orphan', 'a child whose parents have died'],
  ]),
  ...defs(4, 'person', [
    ['surgeon', 'a doctor who performs operations'],
    ['pharmacist', 'a person who prepares and sells medicine'],
    ['architect', 'a person who designs buildings'],
    ['journalist', 'a person who writes for a newspaper'],
    ['spectator', 'a person who watches a game'],
    ['widow', 'a woman whose husband has died'],
    ['burglar', 'a person who breaks into houses to steal'],
    ['volunteer', 'a person who works without being paid'],
  ]),
  ...defs(5, 'person', [
    ['novice', 'a person who is new to something'],
    ['immigrant', 'a person who comes to live in another country'],
    ['ancestor', 'a member of your family who lived long ago'],
    ['optician', 'a person who tests eyes and sells glasses'],
    ['veterinarian', 'a doctor who treats sick animals'],
    ['surveyor', 'a person who measures and maps out land'],
    ['ambassador', 'a person who represents a country abroad'],
    ['spendthrift', 'a person who wastes money'],
  ]),
  ...defs(2, 'place', [
    ['kennel', 'a small house built for a dog'],
    ['garage', 'a place where cars are kept or repaired'],
    ['bakery', 'a place where bread is baked'],
    ['orchard', 'a place where fruit trees are grown'],
  ]),
  ...defs(4, 'place', [
    ['aquarium', 'a glass tank in which fish are kept'],
    ['dormitory', 'a large room where many people sleep'],
    ['laboratory', 'a room used for scientific experiments'],
    ['nursery', 'a place where young plants are raised'],
    ['cemetery', 'a place where the dead are buried'],
    ['reservoir', 'a large store of water for a town'],
    ['sanctuary', 'a safe place where animals are protected'],
    ['harbour', 'a sheltered place where ships anchor'],
  ]),
  ...defs(3, 'thing', [
    ['atlas', 'a book of maps'],
    ['calendar', 'a chart showing the days of the year'],
    ['dictionary', 'a book that explains what words mean'],
    ['thermometer', 'an instrument for measuring temperature'],
    ['telescope', 'an instrument for seeing distant things'],
    ['microscope', 'an instrument for seeing very small things'],
  ]),
  ...defs(5, 'thing', [
    ['biography', 'the life story of a person written by someone else'],
    ['autobiography', 'the life story of a person written by that person'],
    ['manuscript', 'a book or paper written by hand'],
    ['barometer', 'an instrument that measures air pressure'],
    ['stethoscope', 'the instrument a doctor uses to listen to your heart'],
    ['pendulum', 'a weight that swings to and fro in a clock'],
  ]),
  ...defs(3, 'group', [
    ['herd', 'a group of cattle'],
    ['flock', 'a group of sheep or birds'],
    ['swarm', 'a group of bees'],
    ['shoal', 'a group of fish'],
    ['pride', 'a group of lions'],
    ['bunch', 'a group of bananas or keys'],
    ['fleet', 'a group of ships'],
    ['crowd', 'a large group of people packed together'],
  ]),
]

/* ------------------------------------------------------------------ *
 * Degrees of meaning
 *
 * Words on the same scale, written weakest first. Knowing that "warm", "hot"
 * and "boiling" are not interchangeable is a different piece of vocabulary
 * knowledge from knowing they are related, and it is the one that lets a
 * child choose the right word rather than any near-enough word.
 *
 * The ordering must be beyond argument, because the `order` interaction marks
 * one sequence and one sequence only. Any scale where two words could swap
 * places was cut. `wrong` holds real words that sit off the scale entirely.
 * ------------------------------------------------------------------ */

export interface DegreeScale extends Tiered {
  /** Label for the weak end: "coldest". */
  low: string
  /** Label for the strong end: "hottest". */
  high: string
  /** Weakest first. Strictly ordered — no two may be swapped. */
  words: string[]
  /** Real words that are not on this scale at all. */
  wrong: string[]
}

const scale = (tier: number, specs: [string, string, string[], string[]][]): DegreeScale[] =>
  specs.map(([low, high, words, wrong]) => ({ tier, low, high, words, wrong }))

export const DEGREES: DegreeScale[] = [
  ...scale(1, [
    ['coldest', 'hottest', ['cold', 'warm', 'hot'], ['wet', 'dry', 'windy']],
    ['smallest', 'biggest', ['small', 'big', 'huge'], ['long', 'round', 'flat']],
    ['quietest', 'loudest', ['whisper', 'talk', 'shout'], ['listen', 'write', 'sleep']],
    ['driest', 'wettest', ['dry', 'damp', 'soaked'], ['clean', 'rough', 'new']],
    ['slowest', 'fastest', ['crawl', 'walk', 'run'], ['sit', 'stand', 'stop']],
    ['coolest', 'coldest', ['cool', 'cold', 'freezing'], ['sunny', 'bright', 'dusty']],
    ['smallest', 'biggest', ['tiny', 'small', 'large'], ['thin', 'short', 'wide']],
  ]),
  ...scale(2, [
    ['warmest', 'hottest', ['warm', 'hot', 'boiling'], ['cool', 'cold', 'icy']],
    ['calmest', 'angriest', ['calm', 'cross', 'furious'], ['happy', 'tired', 'kind']],
    ['most awake', 'most tired', ['awake', 'sleepy', 'exhausted'], ['hungry', 'busy', 'early']],
    ['quietest', 'loudest', ['silent', 'quiet', 'noisy'], ['busy', 'empty', 'bright']],
    ['coldest', 'hottest', ['ice', 'water', 'steam'], ['sand', 'stone', 'wood']],
    ['shortest', 'longest', ['second', 'minute', 'hour'], ['metre', 'litre', 'gram']],
    ['smallest', 'largest', ['village', 'town', 'city'], ['river', 'market', 'bridge']],
    ['smallest', 'biggest', ['drop', 'cup', 'bucket'], ['plate', 'tray', 'lid']],
  ]),
  ...scale(3, [
    ['shortest', 'longest', ['day', 'week', 'month'], ['metre', 'litre', 'kilogram']],
    ['smallest', 'largest', ['stream', 'river', 'ocean'], ['desert', 'mountain', 'forest']],
    ['gentlest', 'fiercest', ['gentle', 'rough', 'violent'], ['quiet', 'clean', 'narrow']],
    ['smallest', 'largest', ['small', 'large', 'enormous'], ['narrow', 'shallow', 'light']],
    ['coolest', 'hottest', ['cool', 'warm', 'scorching'], ['damp', 'windy', 'cloudy']],
    ['lightest', 'heaviest', ['gram', 'kilogram', 'tonne'], ['metre', 'litre', 'hour']],
    ['shortest', 'tallest', ['grass', 'bush', 'tree'], ['stone', 'pond', 'path']],
  ]),
  ...scale(4, [
    ['smallest', 'largest', ['town', 'city', 'country'], ['street', 'market', 'school']],
    ['least certain', 'most certain', ['possible', 'probable', 'certain'], ['strange', 'sudden', 'useful']],
    ['smallest', 'largest', ['millimetre', 'centimetre', 'metre'], ['gram', 'litre', 'second']],
    ['quietest', 'loudest', ['murmur', 'shout', 'roar'], ['nod', 'pause', 'listen']],
    ['gentlest', 'strongest', ['breeze', 'wind', 'gale'], ['cloud', 'shower', 'rainbow']],
  ]),
  ...scale(5, [
    ['smallest', 'largest', ['hamlet', 'village', 'metropolis'], ['harbour', 'junction', 'estate']],
    ['least angry', 'angriest', ['annoyed', 'angry', 'furious'], ['puzzled', 'curious', 'amused']],
    ['shortest', 'longest', ['decade', 'century', 'millennium'], ['kilometre', 'litre', 'degree']],
    ['dimmest', 'brightest', ['dim', 'bright', 'dazzling'], ['narrow', 'hollow', 'distant']],
    ['gentlest', 'strongest', ['suggest', 'urge', 'demand'], ['refuse', 'forget', 'wonder']],
    ['newest', 'oldest', ['recent', 'old', 'ancient'], ['sturdy', 'hollow', 'narrow']],
  ]),
]

/* ------------------------------------------------------------------ *
 * Words in use
 *
 * A synonym or an opposite met only in a list is half-learned. These two
 * lists put the same words in a sentence, which is where a child actually
 * has to choose between them.
 *
 * CONTRASTS: the gap wants the opposite of a word already in the sentence.
 * SWAPS: the capitalised word is to be replaced by one that means the same.
 *
 * Both were written so exactly one option can be defended. Where a second
 * choice also read naturally, the sentence was rewritten or dropped.
 * ------------------------------------------------------------------ */

export interface Contrast extends Tiered {
  /** Contains `___` where the opposite belongs. */
  text: string
  /** The word in the sentence that the gap is the opposite of. */
  cue: string
  answer: string
  wrong: string[]
}

const contrasts = (tier: number, specs: [string, string, string, string[]][]): Contrast[] =>
  specs.map(([text, cue, answer, wrong]) => ({ tier, text, cue, answer, wrong }))

export const CONTRASTS: Contrast[] = [
  ...contrasts(1, [
    ['The elephant is big but the mouse is ___.', 'big', 'small', ['huge', 'large', 'tall']],
    ['Fire is hot but ice is ___.', 'hot', 'cold', ['warm', 'wet', 'dry']],
    ['Father is tall but the baby is ___.', 'tall', 'short', ['thin', 'wide', 'old']],
    ['We work in the day and sleep at ___.', 'day', 'night', ['noon', 'morning', 'week']],
    ['The stone is heavy but the feather is ___.', 'heavy', 'light', ['heavy', 'wide', 'thick']],
    ['The tortoise is slow but the hare is ___.', 'slow', 'fast', ['slow', 'lazy', 'tired']],
    ['Sugar is sweet but bitter leaf is ___.', 'sweet', 'bitter', ['sweet', 'salty', 'fresh']],
    ['The well is deep but the puddle is ___.', 'deep', 'shallow', ['deep', 'wide', 'clean']],
    ['Ada came first and Bola came ___.', 'first', 'last', ['first', 'early', 'soon']],
    ['The room was dirty, so we made it ___.', 'dirty', 'clean', ['dirty', 'dark', 'empty']],
    ['The bag is empty but the basket is ___.', 'empty', 'full', ['empty', 'wide', 'new']],
    ['We push the gate in and ___ it out.', 'push', 'pull', ['push', 'open', 'lock']],
    ['My shirt is old but my shoes are ___.', 'old', 'new', ['old', 'black', 'clean']],
    ['Grandmother is old and the baby is ___.', 'old', 'young', ['old', 'tall', 'tired']],
    ['The window was closed, so Chidi ___ it.', 'closed', 'opened', ['closed', 'washed', 'painted']],
  ]),
  ...contrasts(2, [
    ['The market is noisy in the day but ___ at night.', 'noisy', 'quiet', ['noisy', 'busy', 'long']],
    ['He was brave at first, but later he became ___.', 'brave', 'afraid', ['brave', 'bold', 'angry']],
    ['The first sum was easy but the last one was ___.', 'easy', 'difficult', ['easy', 'simple', 'short']],
    ['We buy yams in Lagos and ___ them in Ibadan.', 'buy', 'sell', ['buy', 'pay', 'borrow']],
    ['He remembered my name but ___ my address.', 'remembered', 'forgot', ['remembered', 'knew', 'wrote']],
    ['The parcel arrived early, but the letter arrived ___.', 'early', 'late', ['early', 'soon', 'quickly']],
    ['The knife is sharp but the spoon is ___.', 'sharp', 'blunt', ['sharp', 'clean', 'heavy']],
    ['The film began at four and ___ at six.', 'began', 'ended', ['began', 'started', 'opened']],
    ['Some families are rich and some are ___.', 'rich', 'poor', ['rich', 'happy', 'busy']],
    ['She was asleep all morning and ___ all night.', 'asleep', 'awake', ['asleep', 'busy', 'hungry']],
  ]),
  ...contrasts(3, [
    ['A giant is enormous but an insect is ___.', 'enormous', 'tiny', ['enormous', 'huge', 'gigantic']],
    ['He is generous with his money but his cousin is ___.', 'generous', 'selfish', ['generous', 'kind', 'helpful']],
    ['The floor was filthy, so the cleaner made it ___.', 'filthy', 'spotless', ['filthy', 'dusty', 'muddy']],
    ['She spoke gently to the child but ___ to the thief.', 'gently', 'harshly', ['gently', 'kindly', 'softly']],
    ['The lion is strong but the ant is ___.', 'strong', 'weak', ['strong', 'brave', 'busy']],
    ['The teacher praised Ada and ___ Bola for coming late.', 'praised', 'scolded', ['praised', 'thanked', 'helped']],
  ]),
  ...contrasts(4, [
    ['The witness told the truth, but the thief told a ___.', 'truth', 'lie', ['truth', 'promise', 'greeting']],
    ['Food was plentiful last year but ___ this year.', 'plentiful', 'scarce', ['plentiful', 'abundant', 'cheap']],
    ['Her handwriting is legible but her brother’s is ___.', 'legible', 'illegible', ['legible', 'neat', 'tidy']],
    ['He was reluctant at first but soon became ___.', 'reluctant', 'eager', ['reluctant', 'unwilling', 'hesitant']],
    ['The chairman accepted my idea but ___ hers.', 'accepted', 'rejected', ['accepted', 'approved', 'praised']],
  ]),
  ...contrasts(5, [
    ['A permanent job lasts, but a ___ one does not.', 'permanent', 'temporary', ['permanent', 'lasting', 'steady']],
    ['The ancient church stood beside a ___ office block.', 'ancient', 'modern', ['ancient', 'aged', 'antique']],
    ['She arrived punctually while her brother was ___.', 'punctually', 'late', ['punctual', 'early', 'prompt']],
    ['The medicine will relieve the pain, not ___ it.', 'relieve', 'worsen', ['relieve', 'ease', 'cure']],
    ['His account was truthful; hers was entirely ___.', 'truthful', 'false', ['truthful', 'honest', 'accurate']],
  ]),
]

export interface Swap extends Tiered {
  /** Contains `___` where the word goes; shown with the word in capitals. */
  text: string
  word: string
  /** Words that could stand in the same gap. */
  same: string[]
  wrong: string[]
}

const swaps = (tier: number, specs: [string, string, string[], string[]][]): Swap[] =>
  specs.map(([text, word, same, wrong]) => ({ tier, text, word, same, wrong }))

export const SWAPS: Swap[] = [
  ...swaps(1, [
    ['The lorry was ___.', 'big', ['large', 'huge'], ['small', 'thin', 'empty']],
    ['The puppy was ___.', 'small', ['little', 'tiny'], ['big', 'heavy', 'noisy']],
    ['Ada was ___ when she saw her present.', 'happy', ['glad', 'cheerful'], ['sad', 'sleepy', 'hungry']],
    ['Musa felt ___ when his kite tore.', 'sad', ['unhappy'], ['happy', 'funny', 'kind']],
    ['The okada rider was ___.', 'fast', ['quick', 'speedy'], ['slow', 'late', 'heavy']],
    ['Please ___ the door.', 'shut', ['close'], ['open', 'push', 'break']],
    ['Do not ___ in the classroom.', 'shout', ['yell'], ['whisper', 'listen', 'sleep']],
    ['The goat can ___ over the fence.', 'jump', ['leap', 'hop'], ['crawl', 'sit', 'swim']],
    ['Bola stayed at home because she was ___.', 'ill', ['sick', 'unwell'], ['well', 'strong', 'hungry']],
    ['Keep your desk ___.', 'neat', ['tidy'], ['dirty', 'messy', 'empty']],
    ['Grandmother told us a ___.', 'story', ['tale'], ['song', 'poem', 'letter']],
    ['We must ___ or we will miss the bus.', 'hurry', ['rush'], ['wait', 'rest', 'walk']],
  ]),
  ...swaps(2, [
    ['The hunter was ___.', 'brave', ['bold', 'fearless'], ['afraid', 'weak', 'shy']],
    ['The driver was ___ about the traffic.', 'angry', ['cross', 'furious'], ['calm', 'happy', 'gentle']],
    ['Ngozi is a ___ pupil.', 'clever', ['smart', 'bright'], ['silly', 'foolish', 'lazy']],
    ['The farmers were ___ after the harvest.', 'tired', ['weary'], ['awake', 'fresh', 'lively']],
    ['The trader became ___ after many good years.', 'rich', ['wealthy'], ['poor', 'greedy', 'lucky']],
    ['The library was ___.', 'quiet', ['silent'], ['noisy', 'loud', 'busy']],
    ['The noise we heard at night was ___.', 'strange', ['odd', 'unusual'], ['normal', 'common', 'plain']],
    ['The last question was ___.', 'hard', ['difficult', 'tough'], ['easy', 'simple', 'light']],
    ['My uniform got ___ in the rain.', 'wet', ['damp', 'soaked'], ['dry', 'clean', 'warm']],
    ['The carpenter came to ___ our chair.', 'repair', ['mend', 'fix'], ['break', 'spoil', 'damage']],
    ['We went to ___ rice at the market.', 'buy', ['purchase'], ['sell', 'keep', 'borrow']],
    ['The children began to ___ at the clown.', 'laugh', ['giggle', 'chuckle'], ['cry', 'frown', 'sob']],
  ]),
  ...swaps(3, [
    ['The ___ pot came from her great-grandmother.', 'ancient', ['old'], ['modern', 'new', 'recent']],
    ['The ___ iroko tree shaded the whole compound.', 'enormous', ['huge', 'gigantic'], ['tiny', 'small', 'narrow']],
    ['She was ___ with the injured bird.', 'gentle', ['tender'], ['rough', 'harsh', 'fierce']],
    ['The lagoon was ___ that evening.', 'calm', ['peaceful', 'still'], ['noisy', 'wild', 'angry']],
    ['The jollof rice was ___.', 'tasty', ['delicious'], ['bitter', 'plain', 'burnt']],
    ['You may ___ any book you like.', 'select', ['choose', 'pick'], ['refuse', 'lose', 'forget']],
    ['Please ___ to my letter soon.', 'reply', ['respond'], ['ask', 'listen', 'ignore']],
    ['The rain will ___ the new paint.', 'damage', ['harm', 'spoil'], ['repair', 'mend', 'protect']],
    ['The soldier was ___.', 'courageous', ['brave', 'daring'], ['cowardly', 'timid', 'fearful']],
    ['Chidi is always ___ to visitors.', 'polite', ['courteous'], ['rude', 'cheeky', 'bossy']],
    ['Her beads are ___.', 'valuable', ['precious', 'costly'], ['worthless', 'cheap', 'useless']],
    ['The long ___ tired everyone out.', 'journey', ['trip', 'voyage'], ['ticket', 'station', 'suitcase']],
  ]),
  ...swaps(4, [
    ['Our neighbour is ___ with her food.', 'generous', ['unselfish'], ['mean', 'selfish', 'stingy']],
    ['The glass bowl is ___.', 'fragile', ['delicate', 'breakable'], ['strong', 'sturdy', 'tough']],
    ['Mother looked ___ as the storm grew.', 'anxious', ['worried', 'nervous'], ['calm', 'relaxed', 'bored']],
    ['He tried to ___ the torn page.', 'conceal', ['hide', 'cover'], ['reveal', 'show', 'display']],
    ['The chief was ___ about the new road.', 'reluctant', ['unwilling', 'hesitant'], ['eager', 'willing', 'keen']],
    ['The market was ___ on Saturday morning.', 'crowded', ['packed'], ['empty', 'quiet', 'deserted']],
  ]),
  ...swaps(5, [
    ['The council will ___ the new market next month.', 'inaugurate', ['open'], ['demolish', 'abandon', 'close']],
    ['Her excuse was ___ and nobody believed it.', 'feeble', ['weak', 'flimsy'], ['strong', 'solid', 'honest']],
    ['The two accounts of the crash were ___.', 'identical', ['alike', 'matching'], ['different', 'opposite', 'unequal']],
    ['The head teacher spoke ___ about the broken window.', 'sternly', ['harshly', 'severely'], ['gently', 'kindly', 'softly']],
    ['Rain in August is ___ in this town.', 'frequent', ['common', 'regular'], ['rare', 'unusual', 'strange']],
    ['The tailor did the work ___.', 'diligently', ['carefully'], ['carelessly', 'untidily', 'hastily']],
    ['We must ___ the meeting until Friday.', 'postpone', ['delay'], ['hold', 'cancel', 'attend']],
    ['The soup was ___ after an hour on the fire.', 'ready', ['prepared'], ['raw', 'frozen', 'spoiled']],
  ]),
]

/* ------------------------------------------------------------------ *
 * Anagram pairs — same letters, different word. Checked by sorted letters
 * at generation time, so a typo here fails loudly in the smoke test.
 * ------------------------------------------------------------------ */

export interface Anagram extends Tiered {
  a: string
  b: string
}

const anas = (tier: number, specs: string[]): Anagram[] =>
  specs.map((s) => {
    const [a, b] = s.split('/')
    return { tier, a, b }
  })

export const ANAGRAMS: Anagram[] = [
  ...anas(1, [
    'cat/act', 'dog/god', 'now/own', 'was/saw', 'tea/eat', 'top/pot', 'bat/tab',
    'net/ten', 'pan/nap', 'tar/rat', 'nap/pan', 'dab/bad',
  ]),
  ...anas(2, [
    'meat/team', 'star/rats', 'care/race', 'dear/read', 'felt/left', 'form/from',
    'salt/last', 'shoe/hose', 'stop/tops', 'wasp/swap', 'flow/wolf', 'palm/lamp',
    'pale/leap', 'item/time', 'name/mean',
  ]),
  ...anas(3, [
    'listen/silent', 'earth/heart', 'night/thing', 'lemon/melon', 'angel/angle',
    'below/elbow', 'cheap/peach', 'dusty/study', 'filed/field', 'march/charm',
    'horse/shore', 'ocean/canoe', 'brush/shrub', 'bread/beard', 'diary/dairy',
    'these/sheet', 'stone/notes', 'weird/wider', 'trace/crate',
  ]),
  ...anas(4, [
    'rescue/secure', 'teach/cheat', 'danger/garden', 'master/stream', 'spare/pears',
    'stable/tables', 'silver/livers', 'resent/enters', 'thicken/kitchen', 'wolves/vowels',
  ]),
  ...anas(5, [
    'angered/enraged', 'players/parsley', 'gallery/allergy', 'section/notices',
    'teacher/cheater', 'observe/verbose', 'reserve/reverse', 'creation/reaction',
  ]),
]

/* ------------------------------------------------------------------ *
 * General word pool — the raw material for jumbles, alphabetical order,
 * codes and missing letters. Every entry is lower case and unique.
 * ------------------------------------------------------------------ */

export interface PoolWord extends Tiered {
  word: string
}

const pool = (tier: number, words: string[]): PoolWord[] => words.map((word) => ({ tier, word }))

export const WORD_POOL: PoolWord[] = [
  ...pool(1, [
    'cat', 'dog', 'cup', 'sun', 'hat', 'pen', 'bag', 'box', 'cow', 'egg',
    'fan', 'hen', 'jug', 'key', 'leg', 'man', 'net', 'pot', 'rat', 'van',
    'web', 'yam', 'zip', 'bed', 'bus', 'car', 'arm', 'ear', 'eye', 'ink',
    'jam', 'lip', 'map', 'nut', 'owl', 'pig', 'sea', 'toe', 'wax', 'zoo',
  ]),
  ...pool(2, [
    'tree', 'book', 'fish', 'bird', 'hand', 'milk', 'road', 'star', 'door', 'farm',
    'gate', 'hill', 'king', 'lamp', 'moon', 'nose', 'park', 'rain', 'sand', 'ship',
    'shoe', 'sock', 'wind', 'wood', 'drum', 'frog', 'goat', 'corn', 'coat', 'cake',
    'desk', 'duck', 'fire', 'gold', 'home', 'lake', 'leaf', 'nest', 'rice', 'salt',
  ]),
  ...pool(3, [
    'bread', 'chair', 'cloud', 'dance', 'plant', 'river', 'table', 'water', 'house', 'mango',
    'market', 'orange', 'pencil', 'school', 'sister', 'garden', 'basket', 'cattle', 'church', 'doctor',
    'family', 'forest', 'ground', 'monkey', 'mother', 'palace', 'parrot', 'rabbit', 'silver', 'spider',
    'summer', 'window', 'yellow', 'bottle', 'candle', 'farmer', 'flower', 'ladder', 'letter', 'pocket',
  ]),
  ...pool(4, [
    'balance', 'blanket', 'captain', 'journey', 'kitchen', 'machine', 'mystery', 'picture', 'plastic', 'problem',
    'quarter', 'science', 'teacher', 'village', 'weather', 'whisper', 'bicycle', 'chicken', 'concert', 'country',
    'diamond', 'drawing', 'evening', 'factory', 'harvest', 'holiday', 'husband', 'library', 'measure', 'morning',
    'package', 'pattern', 'present', 'printer', 'promise', 'respect', 'stomach', 'subject', 'thunder', 'uniform',
  ]),
  ...pool(5, [
    'adventure', 'ambulance', 'beautiful', 'celebrate', 'character', 'chocolate', 'community', 'dangerous',
    'difficult', 'education', 'elephant', 'equipment', 'furniture', 'generous', 'important', 'knowledge',
    'mountain', 'necessary', 'orchestra', 'permanent', 'president', 'principal', 'remember', 'restaurant',
    'sculpture', 'telephone', 'television', 'tremendous', 'understand', 'vegetable', 'wonderful', 'geography',
    'hospital', 'industry', 'mechanic', 'opposite', 'parliament', 'temperature',
  ]),
]

/** Pool words of a given length range, for jumbles and missing letters. */
export const poolByLength = (tier: number, min: number, max: number): PoolWord[] =>
  bandOf(WORD_POOL, tier).filter((w) => w.word.length >= min && w.word.length <= max)

/**
 * Same, but never empty: a tier band and a length window can easily miss each
 * other (Basic 6 vocabulary is long, three-letter words are Basic 1), and a
 * generator that falls back to one hard-coded word teaches nothing.
 */
export function wordsOfLength(tier: number, min: number, max: number): string[] {
  const inBand = poolByLength(tier, min, max).map((w) => w.word)
  if (inBand.length >= 6) return inBand
  const anywhere = WORD_POOL.filter((w) => w.word.length >= min && w.word.length <= max).map((w) => w.word)
  if (anywhere.length >= 4) return anywhere
  return WORD_POOL.map((w) => w.word)
}

/* ------------------------------------------------------------------ *
 * Letters
 * ------------------------------------------------------------------ */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** 1-based position, so A is 1 and Z is 26. */
export const letterIndex = (letter: string): number => ALPHABET.indexOf(letter.toUpperCase()) + 1

export const letterAt = (position: number): string => ALPHABET[position - 1]

/** Shift a letter forward (or back) around the alphabet. */
export function shiftLetter(letter: string, by: number): string {
  const i = ALPHABET.indexOf(letter.toUpperCase())
  if (i < 0) return letter
  return ALPHABET[(((i + by) % 26) + 26) % 26]
}

export const shiftWord = (word: string, by: number): string =>
  word
    .toUpperCase()
    .split('')
    .map((c) => shiftLetter(c, by))
    .join('')

export const sortedLetters = (word: string): string => word.toLowerCase().split('').sort().join('')

export const isAnagram = (a: string, b: string): boolean =>
  a.toLowerCase() !== b.toLowerCase() && sortedLetters(a) === sortedLetters(b)

/** Shuffle a word's letters, guaranteeing the result is not the word itself. */
export function scramble(rng: Rng, word: string): string {
  const letters = word.toUpperCase().split('')
  for (let attempt = 0; attempt < 12; attempt++) {
    const out = rng.shuffle(letters).join('')
    if (out !== word.toUpperCase()) return out
  }
  // Every letter identical (never happens with real words) — rotate instead.
  return letters.slice(1).concat(letters[0]).join('')
}

export const VOWELS = ['A', 'E', 'I', 'O', 'U']

export const isVowel = (letter: string): boolean => VOWELS.includes(letter.toUpperCase())

export const countVowels = (word: string): number =>
  word.split('').filter((c) => isVowel(c)).length

/** Spaced-out spelling, so the speech synthesiser reads letters not words. */
export const spell = (word: string): string => word.toUpperCase().split('').join(' ')

export const upper = (word: string): string => word.toUpperCase()

export const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)
