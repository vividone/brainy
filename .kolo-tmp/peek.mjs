// src/content/shared/authoring.ts
var norm = (o) => typeof o === "object" && o !== null ? o : { label: String(o) };
var keyOf = (o) => o.label ?? JSON.stringify(o.visual);
function mc(rng, prompt, correct, wrong, extras = {}) {
  const right = norm(correct);
  const seen = /* @__PURE__ */ new Set([keyOf(right)]);
  const distinct = wrong.map(norm).filter((w) => {
    const k = keyOf(w);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 3);
  const tagged = [{ ...right, id: "c0" }, ...distinct.map((w, i) => ({ ...w, id: `c${i + 1}` }))];
  return {
    skillId: "",
    type: "multiple-choice",
    prompt,
    choices: rng.shuffle(tagged),
    answerId: "c0",
    ...extras
  };
}
function entry(prompt, answer, extras = {}) {
  return { skillId: "", type: "numeric-entry", prompt, answer, ...extras };
}
function tf(prompt, answer, extras = {}) {
  return { skillId: "", type: "true-false", prompt, answer, ...extras };
}
function order(rng, prompt, values, extras = {}) {
  const tokens = values.map((v, i) => ({ id: `t${i}`, label: String(v) }));
  return {
    skillId: "",
    type: "order",
    prompt,
    tokens: rng.shuffle(tokens),
    correctOrder: tokens.map((t) => t.id),
    ...extras
  };
}
function tapMany(rng, prompt, options, extras = {}) {
  const tagged = options.map((o, i) => ({ id: `o${i}`, label: String(o.value), correct: o.correct }));
  return {
    skillId: "",
    type: "tap-many",
    prompt,
    options: rng.shuffle(tagged).map(({ id, label }) => ({ id, label })),
    correctIds: tagged.filter((o) => o.correct).map((o) => o.id),
    ...extras
  };
}

// src/content/ng-ube/verbal/words.ts
var tierFor = (floor, difficulty) => Math.max(1, Math.min(5, floor + difficulty - 1));
function bandOf(list, tier) {
  const band = list.filter((e) => e.tier <= tier && e.tier >= tier - 1);
  return band.length >= 4 ? band : list;
}
var pickTier = (rng, list, tier) => rng.pick(bandOf(list, tier));
var pairs = (tier, specs) => specs.map(([word, same, wrong]) => ({ tier, word, same, wrong }));
var SYNONYMS = [
  ...pairs(1, [
    ["big", ["large", "huge"], ["small", "thin", "short", "soft"]],
    ["small", ["little", "tiny"], ["big", "tall", "wide", "heavy"]],
    ["happy", ["glad", "cheerful"], ["sad", "sleepy", "hungry", "silly"]],
    ["sad", ["unhappy"], ["happy", "funny", "kind", "loud"]],
    ["fast", ["quick", "speedy"], ["slow", "late", "heavy", "quiet"]],
    ["begin", ["start"], ["stop", "end", "finish", "close"]],
    ["shut", ["close"], ["open", "push", "drop", "break"]],
    ["shout", ["yell"], ["whisper", "listen", "walk", "sleep"]],
    ["jump", ["leap", "hop"], ["crawl", "sit", "swim", "stand"]],
    ["ill", ["sick", "unwell"], ["well", "strong", "happy", "hungry"]],
    ["neat", ["tidy"], ["dirty", "messy", "rough", "empty"]],
    ["cold", ["chilly"], ["hot", "dry", "warm", "wet"]],
    ["gift", ["present"], ["box", "party", "letter", "basket"]],
    ["rug", ["mat"], ["bed", "chair", "table", "wall"]],
    ["hurry", ["rush"], ["wait", "rest", "stop", "walk"]],
    ["under", ["below"], ["over", "above", "beside", "behind"]],
    ["story", ["tale"], ["song", "poem", "film", "letter"]],
    ["stone", ["rock"], ["sand", "mud", "water", "grass"]]
  ]),
  ...pairs(2, [
    ["brave", ["bold", "fearless"], ["afraid", "weak", "shy", "quiet"]],
    ["angry", ["cross", "furious"], ["calm", "happy", "gentle", "kind"]],
    ["clever", ["smart", "bright"], ["silly", "foolish", "lazy", "slow"]],
    ["tired", ["weary", "sleepy"], ["awake", "fresh", "lively", "strong"]],
    ["rich", ["wealthy"], ["poor", "greedy", "lucky", "famous"]],
    ["quiet", ["silent"], ["noisy", "loud", "busy", "empty"]],
    ["strange", ["odd", "unusual"], ["normal", "common", "plain", "usual"]],
    ["hard", ["difficult", "tough"], ["easy", "simple", "soft", "light"]],
    ["easy", ["simple"], ["hard", "difficult", "heavy", "busy"]],
    ["wet", ["damp", "soaked"], ["dry", "cold", "clean", "warm"]],
    ["repair", ["mend", "fix"], ["break", "spoil", "damage", "throw"]],
    ["buy", ["purchase"], ["sell", "pay", "keep", "borrow"]],
    ["finish", ["complete", "end"], ["start", "begin", "open", "continue"]],
    ["afraid", ["scared", "frightened"], ["brave", "angry", "calm", "safe"]],
    ["laugh", ["giggle", "chuckle"], ["cry", "shout", "frown", "sob"]],
    ["cry", ["weep", "sob"], ["laugh", "smile", "giggle", "shout"]],
    ["road", ["street"], ["river", "bridge", "house", "field"]],
    ["shop", ["store"], ["bank", "house", "road", "school"]]
  ]),
  ...pairs(3, [
    ["ancient", ["old", "aged"], ["modern", "new", "young", "recent"]],
    ["enormous", ["huge", "gigantic"], ["tiny", "small", "narrow", "slim"]],
    ["gentle", ["mild", "tender"], ["rough", "harsh", "fierce", "violent"]],
    ["calm", ["peaceful", "still"], ["noisy", "wild", "angry", "busy"]],
    ["rapid", ["fast", "swift"], ["slow", "steady", "late", "gradual"]],
    ["tasty", ["delicious"], ["bitter", "plain", "sour", "burnt"]],
    ["weary", ["tired", "exhausted"], ["energetic", "fresh", "awake", "lively"]],
    ["select", ["choose", "pick"], ["refuse", "drop", "lose", "forget"]],
    ["reply", ["answer", "respond"], ["ask", "question", "listen", "ignore"]],
    ["permit", ["allow"], ["forbid", "stop", "refuse", "prevent"]],
    ["discover", ["find", "uncover"], ["lose", "hide", "bury", "cover"]],
    ["damage", ["harm", "spoil"], ["repair", "mend", "build", "protect"]],
    ["courageous", ["brave", "daring"], ["cowardly", "timid", "fearful", "weak"]],
    ["polite", ["courteous", "well-mannered"], ["rude", "cheeky", "harsh", "bossy"]],
    ["filthy", ["dirty", "grubby"], ["clean", "tidy", "fresh", "neat"]],
    ["valuable", ["precious", "costly"], ["worthless", "cheap", "common", "useless"]],
    ["beautiful", ["lovely", "pretty"], ["ugly", "plain", "dull", "awful"]],
    ["journey", ["trip", "voyage"], ["road", "ticket", "station", "suitcase"]],
    ["shy", ["timid", "bashful"], ["bold", "loud", "rude", "proud"]]
  ]),
  ...pairs(4, [
    ["generous", ["unselfish", "giving"], ["mean", "selfish", "greedy", "stingy"]],
    ["reluctant", ["unwilling", "hesitant"], ["eager", "willing", "keen", "ready"]],
    ["fragile", ["delicate", "breakable"], ["strong", "sturdy", "tough", "solid"]],
    ["anxious", ["worried", "nervous"], ["calm", "relaxed", "confident", "bored"]],
    ["conceal", ["hide", "cover"], ["reveal", "show", "display", "expose"]],
    ["assist", ["help", "aid"], ["hinder", "block", "ignore", "delay"]],
    ["commence", ["begin", "start"], ["cease", "finish", "halt", "end"]],
    ["sufficient", ["enough", "adequate"], ["lacking", "scarce", "empty", "spare"]],
    ["astonished", ["amazed", "surprised"], ["bored", "calm", "unmoved", "uninterested"]],
    ["vacant", ["empty", "unoccupied"], ["full", "crowded", "busy", "packed"]],
    ["observe", ["watch", "notice"], ["ignore", "hide", "forget", "miss"]],
    ["hasty", ["hurried", "rushed"], ["slow", "careful", "patient", "steady"]],
    ["genuine", ["real", "authentic"], ["fake", "false", "copied", "artificial"]],
    ["cautious", ["careful", "wary"], ["reckless", "careless", "hasty", "bold"]],
    ["peculiar", ["strange", "odd"], ["ordinary", "normal", "usual", "plain"]],
    ["summit", ["top", "peak"], ["bottom", "base", "foot", "valley"]],
    ["vanish", ["disappear", "fade"], ["appear", "arrive", "remain", "stay"]],
    ["feeble", ["weak", "frail"], ["strong", "mighty", "powerful", "tough"]]
  ]),
  ...pairs(5, [
    ["abundant", ["plentiful", "ample"], ["scarce", "rare", "sparse", "limited"]],
    ["diligent", ["hard-working", "industrious"], ["lazy", "idle", "careless", "sloppy"]],
    ["tranquil", ["calm", "peaceful"], ["noisy", "restless", "stormy", "violent"]],
    ["obstinate", ["stubborn", "headstrong"], ["obedient", "agreeable", "willing", "meek"]],
    ["courteous", ["polite", "respectful"], ["rude", "insolent", "blunt", "harsh"]],
    ["novice", ["beginner", "learner"], ["expert", "master", "veteran", "champion"]],
    ["terminate", ["end", "finish"], ["begin", "launch", "extend", "continue"]],
    ["seldom", ["rarely"], ["often", "always", "usually", "frequently"]],
    ["thrifty", ["economical", "frugal"], ["wasteful", "extravagant", "careless", "greedy"]],
    ["immense", ["enormous", "vast"], ["minute", "tiny", "slight", "narrow"]],
    ["arrogant", ["haughty", "conceited"], ["humble", "modest", "shy", "meek"]],
    ["compulsory", ["required", "obligatory"], ["optional", "voluntary", "free", "extra"]],
    ["perilous", ["dangerous", "risky"], ["safe", "secure", "harmless", "gentle"]],
    ["remedy", ["cure", "treatment"], ["illness", "disease", "wound", "poison"]],
    ["persuade", ["convince", "coax"], ["forbid", "prevent", "discourage", "compel"]],
    ["inevitable", ["unavoidable", "certain"], ["unlikely", "avoidable", "doubtful", "optional"]],
    ["scarce", ["rare", "uncommon"], ["plentiful", "common", "abundant", "endless"]],
    ["meticulous", ["thorough", "painstaking"], ["sloppy", "hasty", "careless", "rough"]]
  ])
];
var opps = (tier, specs) => specs.map(([word, opposite, wrong]) => ({ tier, word, opposite, wrong }));
var ANTONYMS = [
  ...opps(1, [
    ["hot", ["cold"], ["warm", "wet", "dry", "sunny"]],
    ["big", ["small", "little"], ["large", "huge", "tall", "wide"]],
    ["up", ["down"], ["over", "top", "high", "above"]],
    ["day", ["night"], ["morning", "noon", "week", "sun"]],
    ["open", ["shut", "closed"], ["door", "push", "wide", "gate"]],
    ["wet", ["dry"], ["damp", "water", "rain", "soaked"]],
    ["old", ["new", "young"], ["ancient", "elderly", "used", "aged"]],
    ["fast", ["slow"], ["quick", "speedy", "rapid", "swift"]],
    ["happy", ["sad", "unhappy"], ["glad", "cheerful", "funny", "silly"]],
    ["tall", ["short"], ["high", "long", "big", "thin"]],
    ["full", ["empty"], ["heavy", "whole", "packed", "deep"]],
    ["clean", ["dirty"], ["tidy", "neat", "fresh", "washed"]],
    ["push", ["pull"], ["press", "shove", "lift", "drop"]],
    ["give", ["take"], ["hand", "share", "send", "offer"]],
    ["in", ["out"], ["on", "inside", "under", "within"]],
    ["front", ["back"], ["side", "top", "near", "forward"]],
    ["laugh", ["cry"], ["giggle", "smile", "chuckle", "grin"]],
    ["more", ["less", "fewer"], ["many", "most", "plenty", "extra"]],
    ["begin", ["end", "finish"], ["start", "open", "first", "commence"]]
  ]),
  ...opps(2, [
    ["brave", ["afraid", "cowardly"], ["bold", "fearless", "strong", "daring"]],
    ["rich", ["poor"], ["wealthy", "greedy", "lucky", "grand"]],
    ["loud", ["quiet", "silent"], ["noisy", "shouting", "busy", "deafening"]],
    ["heavy", ["light"], ["hard", "solid", "big", "weighty"]],
    ["rough", ["smooth"], ["bumpy", "coarse", "hard", "sharp"]],
    ["early", ["late"], ["soon", "quick", "first", "morning"]],
    ["remember", ["forget"], ["recall", "think", "learn", "know"]],
    ["buy", ["sell"], ["purchase", "pay", "shop", "spend"]],
    ["friend", ["enemy"], ["pal", "mate", "neighbour", "cousin"]],
    ["war", ["peace"], ["fight", "battle", "army", "soldier"]],
    ["true", ["false"], ["correct", "right", "real", "honest"]],
    ["lose", ["win"], ["play", "draw", "beat", "score"]],
    ["asleep", ["awake"], ["sleepy", "tired", "dreaming", "resting"]],
    ["same", ["different"], ["alike", "equal", "similar", "matching"]],
    ["above", ["below"], ["over", "high", "top", "upper"]],
    ["wide", ["narrow"], ["broad", "large", "thick", "open"]],
    ["hard", ["soft"], ["tough", "firm", "solid", "stiff"]],
    ["always", ["never"], ["often", "sometimes", "usually", "ever"]]
  ]),
  ...opps(3, [
    ["ancient", ["modern"], ["old", "aged", "antique", "historic"]],
    ["enormous", ["tiny"], ["huge", "giant", "massive", "vast"]],
    ["arrive", ["depart", "leave"], ["come", "reach", "enter", "land"]],
    ["accept", ["refuse", "reject"], ["agree", "receive", "take", "allow"]],
    ["increase", ["decrease", "reduce"], ["grow", "rise", "add", "expand"]],
    ["gather", ["scatter"], ["collect", "group", "pile", "join"]],
    ["wild", ["tame"], ["fierce", "savage", "rough", "free"]],
    ["cruel", ["kind"], ["harsh", "mean", "nasty", "unkind"]],
    ["shallow", ["deep"], ["flat", "thin", "low", "narrow"]],
    ["success", ["failure"], ["victory", "prize", "win", "luck"]],
    ["praise", ["blame", "criticise"], ["applaud", "cheer", "admire", "thank"]],
    ["permit", ["forbid"], ["allow", "let", "accept", "agree"]],
    ["entrance", ["exit"], ["doorway", "gate", "hall", "porch"]],
    ["innocent", ["guilty"], ["honest", "harmless", "pure", "blameless"]],
    ["tighten", ["loosen"], ["fasten", "secure", "grip", "pull"]],
    ["victory", ["defeat"], ["win", "triumph", "success", "prize"]],
    ["borrow", ["lend"], ["take", "owe", "buy", "beg"]],
    ["artificial", ["natural"], ["fake", "false", "plastic", "copied"]]
  ]),
  ...opps(4, [
    ["generous", ["mean", "stingy", "selfish"], ["kind", "giving", "helpful", "rich"]],
    ["reluctant", ["willing", "eager"], ["unwilling", "slow", "hesitant", "doubtful"]],
    ["ascend", ["descend"], ["climb", "rise", "mount", "soar"]],
    ["expand", ["shrink", "contract"], ["grow", "stretch", "widen", "swell"]],
    ["transparent", ["opaque"], ["clear", "glassy", "see-through", "thin"]],
    ["temporary", ["permanent"], ["brief", "short", "passing", "quick"]],
    ["include", ["exclude", "omit"], ["contain", "add", "hold", "join"]],
    ["maximum", ["minimum"], ["most", "largest", "total", "highest"]],
    ["superior", ["inferior"], ["better", "higher", "greater", "finer"]],
    ["voluntary", ["compulsory", "forced"], ["willing", "free", "chosen", "optional"]],
    ["attack", ["defend"], ["fight", "strike", "charge", "invade"]],
    ["major", ["minor"], ["large", "chief", "main", "great"]],
    ["vacant", ["occupied"], ["empty", "free", "bare", "unused"]],
    ["conceal", ["reveal", "show"], ["hide", "cover", "mask", "bury"]],
    ["sharp", ["blunt"], ["pointed", "keen", "fine", "cutting"]],
    ["fragile", ["sturdy", "tough"], ["delicate", "weak", "brittle", "thin"]],
    ["gradual", ["sudden"], ["slow", "steady", "creeping", "gentle"]],
    ["familiar", ["strange", "unknown"], ["known", "common", "usual", "ordinary"]]
  ]),
  ...opps(5, [
    ["abundant", ["scarce"], ["plentiful", "ample", "many", "rich"]],
    ["diligent", ["lazy", "idle"], ["hard-working", "busy", "eager", "careful"]],
    ["optimist", ["pessimist"], ["dreamer", "believer", "thinker", "joker"]],
    ["humble", ["arrogant", "proud"], ["modest", "meek", "quiet", "gentle"]],
    ["condemn", ["approve", "praise"], ["blame", "criticise", "punish", "scold"]],
    ["tranquil", ["turbulent", "stormy"], ["calm", "peaceful", "still", "silent"]],
    ["frequent", ["rare", "seldom"], ["often", "regular", "common", "usual"]],
    ["exterior", ["interior"], ["outside", "outer", "surface", "edge"]],
    ["mourn", ["rejoice", "celebrate"], ["grieve", "weep", "lament", "sorrow"]],
    ["deliberate", ["accidental"], ["planned", "intended", "careful", "chosen"]],
    ["hostile", ["friendly"], ["angry", "aggressive", "unkind", "fierce"]],
    ["flexible", ["rigid", "stiff"], ["bendy", "elastic", "soft", "supple"]],
    ["barren", ["fertile"], ["empty", "bare", "dry", "dusty"]],
    ["amateur", ["professional"], ["beginner", "learner", "novice", "fan"]],
    ["surplus", ["shortage"], ["extra", "excess", "plenty", "spare"]],
    ["commence", ["conclude", "cease"], ["begin", "start", "launch", "open"]],
    ["ally", ["enemy", "foe"], ["friend", "partner", "helper", "mate"]],
    ["genuine", ["fake", "counterfeit"], ["real", "true", "authentic", "honest"]]
  ])
];
var CATEGORIES = [
  {
    tier: 1,
    id: "fruits",
    name: "Fruits",
    general: "fruit",
    family: "plant",
    members: ["mango", "orange", "banana", "pawpaw", "guava", "pineapple", "apple", "cashew", "lemon", "coconut"],
    avoid: ["colours"]
  },
  {
    tier: 1,
    id: "animals",
    name: "Animals",
    general: "animal",
    family: "creature",
    members: ["goat", "dog", "cow", "sheep", "cat", "horse", "donkey", "rabbit", "lion", "elephant"]
  },
  {
    tier: 1,
    id: "colours",
    name: "Colours",
    general: "colour",
    family: "shade",
    members: ["red", "blue", "green", "yellow", "black", "white", "brown", "purple", "grey", "pink"],
    avoid: ["metals", "gems", "fruits"]
  },
  {
    tier: 1,
    id: "body",
    name: "Parts of the body",
    general: "body part",
    family: "body",
    members: ["hand", "leg", "head", "nose", "ear", "eye", "foot", "arm", "mouth", "finger"]
  },
  {
    tier: 1,
    id: "vehicles",
    name: "Vehicles",
    general: "vehicle",
    family: "machine",
    members: ["car", "bus", "lorry", "bicycle", "aeroplane", "canoe", "train", "motorcycle", "ship", "tractor"]
  },
  {
    tier: 1,
    id: "clothes",
    name: "Clothes",
    general: "garment",
    family: "wear",
    members: ["shirt", "trousers", "skirt", "cap", "dress", "blouse", "wrapper", "jacket", "gown", "shorts"],
    avoid: ["fabrics"]
  },
  {
    tier: 1,
    id: "furniture",
    name: "Furniture",
    general: "furniture",
    family: "household",
    members: ["chair", "table", "bed", "cupboard", "bench", "stool", "shelf", "wardrobe", "sofa", "desk"]
  },
  {
    tier: 1,
    id: "birds",
    name: "Birds",
    general: "bird",
    family: "creature",
    members: ["hen", "duck", "parrot", "pigeon", "eagle", "owl", "turkey", "vulture", "ostrich", "peacock"]
  },
  {
    tier: 2,
    id: "insects",
    name: "Insects",
    general: "insect",
    family: "creature",
    members: ["ant", "bee", "fly", "mosquito", "butterfly", "grasshopper", "cockroach", "beetle", "termite", "locust"]
  },
  {
    tier: 2,
    id: "vegetables",
    name: "Vegetables",
    general: "vegetable",
    family: "plant",
    members: ["onion", "okra", "carrot", "cabbage", "spinach", "lettuce", "pumpkin", "beetroot"]
  },
  {
    tier: 2,
    id: "drinks",
    name: "Drinks",
    general: "drink",
    family: "food",
    members: ["water", "milk", "tea", "juice", "coffee", "zobo", "kunu", "cocoa"],
    avoid: ["spices"]
  },
  {
    tier: 2,
    id: "school",
    name: "School things",
    general: "stationery",
    family: "kit",
    members: ["pencil", "ruler", "eraser", "chalk", "crayon", "sharpener", "satchel", "textbook"]
  },
  {
    tier: 2,
    id: "jobs",
    name: "Jobs",
    general: "occupation",
    family: "person",
    members: ["teacher", "doctor", "farmer", "tailor", "driver", "nurse", "carpenter", "trader", "barber", "cook"]
  },
  {
    tier: 2,
    id: "rooms",
    name: "Rooms in a house",
    general: "room",
    family: "place",
    members: ["kitchen", "bedroom", "bathroom", "parlour", "study", "pantry", "hall", "cellar"]
  },
  {
    tier: 2,
    id: "instruments",
    name: "Musical instruments",
    general: "instrument",
    family: "music",
    members: ["drum", "flute", "guitar", "piano", "trumpet", "violin", "saxophone", "xylophone"]
  },
  {
    tier: 2,
    id: "sports",
    name: "Sports",
    general: "sport",
    family: "game",
    members: ["football", "tennis", "cricket", "hockey", "boxing", "swimming", "athletics", "basketball"]
  },
  {
    tier: 3,
    id: "metals",
    name: "Metals",
    general: "metal",
    family: "material",
    members: ["gold", "silver", "iron", "copper", "tin", "zinc", "lead", "aluminium"],
    avoid: ["colours", "gems", "tools", "planets"]
  },
  {
    tier: 3,
    id: "weather",
    name: "Weather words",
    general: "weather",
    family: "sky",
    members: ["rain", "sunshine", "wind", "cloud", "storm", "fog", "snow", "hail"]
  },
  {
    tier: 3,
    id: "water",
    name: "Bodies of water",
    general: "waterway",
    family: "place",
    members: ["river", "lake", "sea", "ocean", "stream", "pond", "lagoon", "creek"]
  },
  {
    tier: 3,
    id: "land",
    name: "Land features",
    general: "landform",
    family: "place",
    members: ["hill", "mountain", "valley", "plateau", "cliff", "plain", "desert", "island"]
  },
  {
    tier: 3,
    id: "buildings",
    name: "Buildings",
    general: "building",
    family: "place",
    members: ["church", "mosque", "school", "hospital", "library", "factory", "museum", "palace"]
  },
  {
    tier: 3,
    id: "shapes",
    name: "Shapes",
    general: "shape",
    family: "figure",
    members: ["circle", "square", "triangle", "rectangle", "oval", "hexagon", "pentagon", "rhombus"]
  },
  {
    tier: 3,
    id: "tools",
    name: "Tools",
    general: "tool",
    family: "kit",
    members: ["hammer", "saw", "spanner", "screwdriver", "chisel", "pliers", "drill", "file"]
  },
  {
    tier: 3,
    id: "relatives",
    name: "Relatives",
    general: "relative",
    family: "person",
    members: ["mother", "father", "uncle", "aunt", "cousin", "brother", "sister", "nephew"]
  },
  {
    tier: 3,
    id: "reptiles",
    name: "Reptiles",
    general: "reptile",
    family: "creature",
    members: ["snake", "lizard", "crocodile", "tortoise", "chameleon", "gecko", "python", "alligator"]
  },
  {
    tier: 4,
    id: "emotions",
    name: "Feelings",
    general: "feeling",
    family: "abstract",
    members: ["joy", "anger", "fear", "sorrow", "pride", "envy", "hope", "shame"]
  },
  {
    tier: 4,
    id: "gems",
    name: "Precious stones",
    general: "gem",
    family: "material",
    members: ["diamond", "ruby", "emerald", "sapphire", "pearl", "opal", "topaz", "jade"],
    avoid: ["colours", "metals"]
  },
  {
    tier: 4,
    id: "trees",
    name: "Trees",
    general: "tree",
    family: "plant",
    members: ["mahogany", "iroko", "baobab", "oak", "pine", "cedar", "teak", "eucalyptus"]
  },
  {
    tier: 4,
    id: "planets",
    name: "Planets",
    general: "planet",
    family: "space",
    members: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]
  },
  {
    tier: 4,
    id: "time",
    name: "Units of time",
    general: "unit of time",
    family: "time",
    members: ["second", "minute", "hour", "day", "week", "month", "year", "decade"]
  },
  {
    tier: 4,
    id: "fabrics",
    name: "Fabrics",
    general: "fabric",
    family: "material",
    members: ["cotton", "silk", "wool", "linen", "lace", "denim", "satin", "nylon"],
    avoid: ["clothes"]
  },
  {
    tier: 4,
    id: "spices",
    name: "Spices",
    general: "spice",
    family: "food",
    members: ["pepper", "ginger", "garlic", "curry", "thyme", "nutmeg", "cinnamon", "clove"],
    avoid: ["drinks"]
  },
  {
    tier: 4,
    id: "continents",
    name: "Continents",
    general: "continent",
    family: "place",
    members: ["Africa", "Europe", "Asia", "Australia", "Antarctica"]
  },
  {
    tier: 5,
    id: "qualities",
    name: "Good qualities",
    general: "quality",
    family: "abstract",
    members: ["honesty", "courage", "wisdom", "freedom", "justice", "kindness", "loyalty", "patience"]
  },
  {
    tier: 5,
    id: "leaders",
    name: "Leaders",
    general: "leader",
    family: "person",
    members: ["president", "governor", "senator", "mayor", "minister", "monarch", "councillor", "ambassador"]
  },
  {
    tier: 5,
    id: "measuring",
    name: "Measuring instruments",
    general: "device",
    family: "kit",
    members: ["thermometer", "barometer", "stopwatch", "odometer", "speedometer", "balance", "protractor", "gauge"]
  },
  {
    tier: 5,
    id: "subjects",
    name: "School subjects",
    general: "subject",
    family: "study",
    members: ["biology", "chemistry", "physics", "geography", "mathematics", "economics", "history", "agriculture"]
  },
  {
    tier: 5,
    id: "professions",
    name: "Professions",
    general: "profession",
    family: "person",
    members: ["architect", "engineer", "pharmacist", "surveyor", "accountant", "journalist", "lawyer", "dentist"]
  }
];
function categoriesClash(a, b) {
  if (a.id === b.id) return true;
  if (a.family === b.family) return true;
  if (a.avoid?.includes(b.id) || b.avoid?.includes(a.id)) return true;
  return a.members.some((m) => b.members.includes(m));
}
var rhyme = (tier, sound, words) => ({ tier, sound, words });
var RHYMES = [
  rhyme(1, "-at", ["cat", "hat", "mat", "rat", "bat", "sat", "flat", "chat", "that"]),
  rhyme(1, "-og", ["dog", "log", "fog", "jog", "frog", "cog"]),
  rhyme(1, "-an", ["man", "can", "pan", "ran", "van", "fan", "plan", "than"]),
  rhyme(1, "-ot", ["hot", "pot", "not", "got", "spot", "dot", "knot", "cot"]),
  rhyme(1, "-un", ["sun", "fun", "run", "one", "won", "bun", "done", "none"]),
  rhyme(1, "-ed", ["bed", "red", "head", "bread", "said", "fed", "led", "thread"]),
  rhyme(1, "-in", ["pin", "win", "thin", "chin", "spin", "grin", "tin", "bin"]),
  rhyme(1, "-op", ["top", "stop", "shop", "hop", "drop", "mop", "crop"]),
  rhyme(1, "-ug", ["bug", "rug", "mug", "hug", "jug", "plug", "tug"]),
  rhyme(1, "-ap", ["cap", "map", "clap", "tap", "nap", "trap", "snap"]),
  rhyme(2, "-ee", ["tree", "bee", "see", "sea", "key", "tea", "free", "three", "knee"]),
  rhyme(2, "-ing", ["king", "sing", "ring", "wing", "thing", "bring", "spring", "swing"]),
  rhyme(2, "-y", ["sky", "fly", "cry", "why", "high", "buy", "eye", "pie", "dry", "tie"]),
  rhyme(2, "-o", ["go", "no", "so", "slow", "grow", "snow", "low", "toe", "flow", "dough"]),
  rhyme(2, "-all", ["ball", "call", "tall", "wall", "fall", "small", "hall", "crawl"]),
  rhyme(2, "-ill", ["hill", "mill", "fill", "will", "still", "spill", "bill", "chill"]),
  rhyme(2, "-ip", ["ship", "lip", "trip", "drip", "clip", "tip", "skip", "whip"]),
  rhyme(2, "-ick", ["stick", "kick", "sick", "thick", "brick", "trick", "quick", "click"]),
  rhyme(2, "-ock", ["rock", "sock", "lock", "clock", "block", "knock", "shock"]),
  rhyme(2, "-ook", ["book", "look", "cook", "took", "hook", "shook"]),
  rhyme(3, "-ight", ["light", "night", "right", "bright", "kite", "white", "sight", "fight", "write", "quite"]),
  rhyme(3, "-ake", ["cake", "lake", "make", "snake", "bake", "shake", "break", "steak"]),
  rhyme(3, "-own", ["town", "down", "brown", "crown", "gown", "frown", "noun"]),
  rhyme(3, "-oon", ["moon", "spoon", "soon", "noon", "balloon", "afternoon"]),
  rhyme(3, "-ouse", ["house", "mouse", "blouse"]),
  rhyme(3, "-air", ["hair", "chair", "bear", "pear", "share", "care", "air", "stare", "there", "where"]),
  rhyme(3, "-eat", ["feet", "meet", "street", "sweet", "treat", "seat", "eat", "beat", "neat", "heat"]),
  rhyme(3, "-eep", ["sleep", "keep", "deep", "sheep", "jeep", "weep", "steep", "cheap"]),
  rhyme(4, "-ain", ["rain", "train", "plain", "chain", "brain", "main", "pain", "cane", "plane"]),
  rhyme(4, "-eel", ["wheel", "feel", "meal", "steal", "heel", "peel", "real", "seal"]),
  rhyme(4, "-ird", ["bird", "word", "heard", "third", "herd"]),
  rhyme(4, "-ound", ["round", "ground", "sound", "found", "pound", "hound"]),
  rhyme(4, "-ark", ["dark", "park", "mark", "shark", "bark", "spark"]),
  rhyme(5, "-alk", ["talk", "walk", "chalk", "stalk"]),
  rhyme(5, "-ation", ["nation", "station", "relation", "creation", "donation", "vacation"]),
  rhyme(5, "-ention", ["attention", "invention", "intention", "mention", "convention"])
];
var compounds = (tier, specs) => specs.map((s) => {
  const [a, b] = s.split("+");
  return { tier, a, b };
});
var COMPOUNDS = [
  ...compounds(1, [
    "foot+ball",
    "bed+room",
    "rain+bow",
    "sun+shine",
    "moon+light",
    "tooth+brush",
    "hair+cut",
    "book+shop",
    "door+bell",
    "gold+fish",
    "hand+bag",
    "pop+corn",
    "snow+man",
    "tea+pot",
    "week+end",
    "play+ground",
    "foot+path",
    "arm+chair",
    "bath+room",
    "camp+fire",
    "day+light",
    "ear+ring",
    "farm+yard",
    "fire+wood",
    "note+book",
    "out+side",
    "pan+cake",
    "rain+coat",
    "school+boy",
    "sun+flower"
  ]),
  ...compounds(2, [
    "black+board",
    "class+room",
    "birth+day",
    "butter+fly",
    "key+board",
    "news+paper",
    "sea+side",
    "water+fall",
    "motor+cycle",
    "over+coat",
    "under+ground",
    "cup+board",
    "air+port",
    "break+fast",
    "butter+milk",
    "card+board",
    "grand+mother",
    "hand+shake",
    "head+master",
    "home+work",
    "lip+stick",
    "mid+night",
    "pass+port",
    "pine+apple",
    "post+card",
    "sand+paper",
    "sign+post",
    "straw+berry",
    "sun+rise",
    "table+cloth"
  ]),
  ...compounds(3, [
    "time+table",
    "tooth+ache",
    "up+stairs",
    "wall+paper",
    "wheel+chair",
    "wind+screen",
    "foot+print",
    "fire+place",
    "back+bone",
    "black+smith",
    "bull+dog",
    "cross+road",
    "door+way",
    "egg+plant",
    "eye+brow",
    "finger+print",
    "foot+step",
    "hair+brush",
    "hand+writing",
    "land+lord",
    "life+time",
    "mail+box",
    "milk+man",
    "night+fall",
    "rail+way",
    "sea+shore",
    "shoe+lace",
    "tea+cup",
    "water+melon",
    "wind+mill"
  ]),
  ...compounds(4, [
    "work+shop",
    "bed+side",
    "black+bird",
    "book+case",
    "day+dream",
    "farm+house",
    "god+father",
    "grand+father",
    "gun+powder",
    "hair+dresser",
    "hand+ball",
    "head+ache",
    "house+hold",
    "key+hole",
    "lady+bird",
    "life+boat",
    "match+box",
    "motor+way",
    "neck+lace",
    "oat+meal",
    "pea+cock",
    "pen+knife",
    "rain+fall",
    "sea+food"
  ]),
  ...compounds(5, [
    "skate+board",
    "super+market",
    "sword+fish",
    "tooth+paste",
    "under+stand",
    "water+proof",
    "week+day",
    "wheel+barrow",
    "wood+work",
    "court+yard",
    "light+house",
    "main+land",
    "master+piece",
    "news+reader",
    "over+throw",
    "para+chute",
    "photo+graph",
    "sand+castle",
    "scare+crow",
    "ship+wreck",
    "short+hand",
    "thunder+storm",
    "water+colour",
    "wind+screen"
  ])
];
var hides = (tier, specs) => specs.map((s) => {
  const [word, hidden] = s.split("/");
  return { tier, word, hidden };
});
var HIDDEN_WORDS = [
  ...hides(1, [
    "carpet/pet",
    "basket/ask",
    "monkey/key",
    "banana/ban",
    "pencil/pen",
    "rainbow/rain",
    "garden/den",
    "window/win",
    "father/fat",
    "mother/moth",
    "corner/corn",
    "carrot/car",
    "yellow/low",
    "island/land",
    "kitchen/hen",
    "letter/let",
    "friend/end",
    "planet/net"
  ]),
  ...hides(2, [
    "teacher/tea",
    "brother/broth",
    "machine/chin",
    "history/story",
    "because/cause",
    "another/other",
    "present/sent",
    "village/age",
    "chicken/chick",
    "feather/eat",
    "thunder/under",
    "blanket/blank",
    "captain/cap",
    "children/child",
    "number/numb",
    "shepherd/herd",
    "crocodile/cod",
    "elephant/ant",
    "pineapple/apple",
    "something/thing"
  ]),
  ...hides(3, [
    "understand/stand",
    "afternoon/noon",
    "breakfast/fast",
    "butterfly/utter",
    "carpenter/enter",
    "grandmother/grand",
    "hospital/pit",
    "language/age",
    "restaurant/rant",
    "telephone/phone",
    "television/vision",
    "vegetable/table",
    "wonderful/wonder",
    "dangerous/anger",
    "mountain/mount",
    "chocolate/late",
    "character/act",
    "knowledge/know",
    "geography/graph",
    "furniture/urn"
  ]),
  ...hides(4, [
    "equipment/men",
    "principal/pal",
    "appointment/point",
    "temperature/rat",
    "important/port",
    "separate/rate",
    "everything/very",
    "discovery/cover",
    "yesterday/yes",
    "sometimes/time",
    "stationery/station",
    "population/pop",
    "university/sit",
    "signature/nature",
    "passenger/pass",
    "compassion/passion",
    "friendship/friend",
    "department/part",
    "management/manage",
    "appearance/pear"
  ]),
  ...hides(5, [
    "championship/champion",
    "consideration/side",
    "entertainment/enter",
    "independent/depend",
    "introduction/duct",
    "measurement/sure",
    "photograph/graph",
    "refreshment/fresh",
    "transparent/parent",
    "underground/round",
    "celebration/rat",
    "competition/pet",
    "examination/exam",
    "information/format",
    "arrangement/range",
    "punishment/punish",
    "government/govern",
    "discussion/discus",
    "preparation/ration",
    "engineering/engine"
  ])
];
var plurals = (tier, specs) => specs.map((s) => {
  const [one, many] = s.split("/");
  return { tier, one, many };
});
var PLURALS = [
  ...plurals(1, [
    "book/books",
    "chair/chairs",
    "pencil/pencils",
    "desk/desks",
    "dog/dogs",
    "cup/cups",
    "boy/boys",
    "girl/girls",
    "table/tables",
    "door/doors",
    "hand/hands",
    "shoe/shoes"
  ]),
  ...plurals(2, [
    "bus/buses",
    "box/boxes",
    "church/churches",
    "brush/brushes",
    "glass/glasses",
    "dish/dishes",
    "watch/watches",
    "fox/foxes",
    "match/matches",
    "class/classes",
    "bench/benches",
    "branch/branches",
    "baby/babies",
    "lady/ladies",
    "city/cities",
    "story/stories",
    "party/parties",
    "puppy/puppies"
  ]),
  ...plurals(3, [
    "leaf/leaves",
    "knife/knives",
    "wife/wives",
    "thief/thieves",
    "half/halves",
    "shelf/shelves",
    "wolf/wolves",
    "loaf/loaves",
    "calf/calves",
    "life/lives",
    "family/families",
    "country/countries",
    "lorry/lorries",
    "berry/berries",
    "potato/potatoes",
    "tomato/tomatoes",
    "hero/heroes",
    "echo/echoes"
  ]),
  ...plurals(4, [
    "man/men",
    "woman/women",
    "child/children",
    "foot/feet",
    "tooth/teeth",
    "goose/geese",
    "mouse/mice",
    "ox/oxen",
    "person/people",
    "sheep/sheep",
    "deer/deer",
    "aircraft/aircraft",
    "photo/photos",
    "piano/pianos",
    "radio/radios",
    "factory/factories",
    "army/armies",
    "diary/diaries"
  ]),
  ...plurals(5, [
    "crisis/crises",
    "axis/axes",
    "basis/bases",
    "oasis/oases",
    "thesis/theses",
    "nucleus/nuclei",
    "stimulus/stimuli",
    "bacterium/bacteria",
    "criterion/criteria",
    "phenomenon/phenomena",
    "analysis/analyses",
    "louse/lice",
    "trout/trout",
    "salmon/salmon",
    "hypothesis/hypotheses",
    "passer-by/passers-by",
    "son-in-law/sons-in-law",
    "commander-in-chief/commanders-in-chief"
  ])
];
var ANALOGIES = [
  {
    tier: 1,
    relation: "the opposite of",
    pairs: [
      ["hot", "cold"],
      ["big", "small"],
      ["up", "down"],
      ["day", "night"],
      ["open", "shut"],
      ["wet", "dry"],
      ["happy", "sad"],
      ["fast", "slow"],
      ["full", "empty"],
      ["young", "old"]
    ]
  },
  {
    tier: 1,
    relation: "the young of",
    pairs: [
      ["cow", "calf"],
      ["dog", "puppy"],
      ["cat", "kitten"],
      ["goat", "kid"],
      ["sheep", "lamb"],
      ["hen", "chick"],
      ["horse", "foal"],
      ["duck", "duckling"],
      ["lion", "cub"],
      ["frog", "tadpole"]
    ]
  },
  {
    tier: 2,
    relation: "the sound made by",
    pairs: [
      ["dog", "bark"],
      ["cow", "moo"],
      ["lion", "roar"],
      ["snake", "hiss"],
      ["bird", "chirp"],
      ["horse", "neigh"],
      ["sheep", "bleat"],
      ["duck", "quack"],
      ["donkey", "bray"],
      ["cat", "mew"]
    ]
  },
  {
    tier: 2,
    relation: "the home of",
    pairs: [
      ["bird", "nest"],
      ["bee", "hive"],
      ["dog", "kennel"],
      ["horse", "stable"],
      ["pig", "sty"],
      ["lion", "den"],
      ["rabbit", "burrow"],
      ["spider", "web"],
      ["fish", "water"]
    ]
  },
  {
    tier: 2,
    relation: "the female of",
    pairs: [
      ["boy", "girl"],
      ["man", "woman"],
      ["king", "queen"],
      ["uncle", "aunt"],
      ["father", "mother"],
      ["son", "daughter"],
      ["cock", "hen"],
      ["bull", "cow"],
      ["nephew", "niece"],
      ["husband", "wife"]
    ]
  },
  {
    tier: 3,
    relation: "the workplace of",
    pairs: [
      ["teacher", "school"],
      ["doctor", "hospital"],
      ["farmer", "farm"],
      ["cook", "kitchen"],
      ["pilot", "aeroplane"],
      ["judge", "court"],
      ["trader", "market"],
      ["actor", "stage"],
      ["baker", "bakery"],
      ["librarian", "library"]
    ]
  },
  {
    tier: 3,
    relation: "the tool used by",
    pairs: [
      ["farmer", "hoe"],
      ["carpenter", "hammer"],
      ["tailor", "needle"],
      ["painter", "brush"],
      ["doctor", "stethoscope"],
      ["mechanic", "spanner"],
      ["barber", "clippers"],
      ["artist", "pencil"]
    ]
  },
  {
    tier: 3,
    relation: "a part of",
    pairs: [
      ["hand", "finger"],
      ["foot", "toe"],
      ["tree", "leaf"],
      ["book", "page"],
      ["car", "wheel"],
      ["house", "room"],
      ["flower", "petal"],
      ["keyboard", "key"],
      ["kite", "tail"]
    ]
  },
  {
    tier: 4,
    relation: "the source of",
    pairs: [
      ["milk", "cow"],
      ["egg", "hen"],
      ["honey", "bee"],
      ["wool", "sheep"],
      ["bread", "flour"],
      ["paper", "tree"],
      ["cloth", "cotton"],
      ["palm oil", "palm"]
    ]
  },
  {
    tier: 4,
    relation: "the material of",
    pairs: [
      ["table", "wood"],
      ["window", "glass"],
      ["shirt", "cotton"],
      ["knife", "steel"],
      ["tyre", "rubber"],
      ["wall", "brick"],
      ["book", "paper"],
      ["bottle", "plastic"]
    ]
  },
  {
    tier: 4,
    relation: "the plural of",
    pairs: [
      ["child", "children"],
      ["man", "men"],
      ["foot", "feet"],
      ["tooth", "teeth"],
      ["mouse", "mice"],
      ["goose", "geese"],
      ["knife", "knives"],
      ["leaf", "leaves"]
    ]
  },
  {
    tier: 5,
    relation: "the past tense of",
    pairs: [
      ["go", "went"],
      ["eat", "ate"],
      ["see", "saw"],
      ["run", "ran"],
      ["write", "wrote"],
      ["buy", "bought"],
      ["teach", "taught"],
      ["bring", "brought"],
      ["catch", "caught"]
    ]
  },
  {
    tier: 5,
    relation: "a stronger word for",
    pairs: [
      ["warm", "hot"],
      ["cool", "cold"],
      ["big", "enormous"],
      ["small", "minute"],
      ["good", "excellent"],
      ["bad", "terrible"],
      ["like", "adore"],
      ["sad", "heartbroken"]
    ]
  },
  {
    tier: 5,
    relation: "the capital city of",
    pairs: [
      ["Nigeria", "Abuja"],
      ["Ghana", "Accra"],
      ["Kenya", "Nairobi"],
      ["Egypt", "Cairo"],
      ["France", "Paris"],
      ["England", "London"],
      ["Japan", "Tokyo"],
      ["Italy", "Rome"]
    ]
  }
];
var HOMOPHONES = [
  {
    tier: 1,
    words: ["hear", "here"],
    clues: [
      { word: "hear", sentence: "Can you ___ the bell ringing?" },
      { word: "here", sentence: "Please come ___ and sit beside me." }
    ]
  },
  {
    tier: 1,
    words: ["see", "sea"],
    clues: [
      { word: "see", sentence: "I can ___ the hill from my window." },
      { word: "sea", sentence: "We swam in the ___ at Bar Beach." }
    ]
  },
  {
    tier: 1,
    words: ["son", "sun"],
    clues: [
      { word: "sun", sentence: "The ___ was very hot at noon." },
      { word: "son", sentence: "Mr Bello came with his ___ and his daughter." }
    ]
  },
  {
    tier: 1,
    words: ["one", "won"],
    clues: [
      { word: "won", sentence: "Our school ___ the football match." },
      { word: "one", sentence: "There is only ___ mango left in the bowl." }
    ]
  },
  {
    tier: 1,
    words: ["two", "too", "to"],
    clues: [
      { word: "two", sentence: "I bought ___ loaves of bread." },
      { word: "too", sentence: "The soup is ___ salty to eat." }
    ]
  },
  {
    tier: 1,
    words: ["no", "know"],
    clues: [
      { word: "know", sentence: "Do you ___ the answer?" },
      { word: "no", sentence: "There is ___ water in the tank." }
    ]
  },
  {
    tier: 2,
    words: ["there", "their", "they're"],
    clues: [
      { word: "their", sentence: "The pupils collected ___ books." },
      { word: "there", sentence: "Put the basket over ___ by the door." }
    ]
  },
  {
    tier: 2,
    words: ["write", "right"],
    clues: [
      { word: "write", sentence: "Please ___ your name at the top." },
      { word: "right", sentence: "Turn ___ at the junction." }
    ]
  },
  {
    tier: 2,
    words: ["new", "knew"],
    clues: [
      { word: "knew", sentence: "Ada ___ the answer at once." },
      { word: "new", sentence: "He wore his ___ uniform to school." }
    ]
  },
  {
    tier: 2,
    words: ["meet", "meat"],
    clues: [
      { word: "meet", sentence: "Let us ___ at the library after school." },
      { word: "meat", sentence: "The stew has plenty of ___ in it." }
    ]
  },
  {
    tier: 2,
    words: ["pair", "pear"],
    clues: [
      { word: "pair", sentence: "She bought a ___ of shoes." },
      { word: "pear", sentence: "He ate a juicy ___ after lunch." }
    ]
  },
  {
    tier: 2,
    words: ["tail", "tale"],
    clues: [
      { word: "tail", sentence: "The dog wagged its ___." },
      { word: "tale", sentence: "Grandmother told us a ___ about the tortoise." }
    ]
  },
  {
    tier: 2,
    words: ["blue", "blew"],
    clues: [
      { word: "blew", sentence: "The wind ___ the papers off the desk." },
      { word: "blue", sentence: "The sky is a lovely ___ today." }
    ]
  },
  {
    tier: 2,
    words: ["week", "weak"],
    clues: [
      { word: "week", sentence: "There are seven days in a ___." },
      { word: "weak", sentence: "He felt ___ after his illness." }
    ]
  },
  {
    tier: 2,
    words: ["hole", "whole"],
    clues: [
      { word: "hole", sentence: "There is a ___ in my sock." },
      { word: "whole", sentence: "He ate the ___ loaf by himself." }
    ]
  },
  {
    tier: 3,
    words: ["flour", "flower"],
    clues: [
      { word: "flour", sentence: "Bread is made from ___ and water." },
      { word: "flower", sentence: "A bee landed on the yellow ___." }
    ]
  },
  {
    tier: 3,
    words: ["piece", "peace"],
    clues: [
      { word: "piece", sentence: "May I have a ___ of cake?" },
      { word: "peace", sentence: "After the quarrel the two friends made ___." }
    ]
  },
  {
    tier: 3,
    words: ["plain", "plane"],
    clues: [
      { word: "plane", sentence: "The ___ landed safely in Abuja." },
      { word: "plain", sentence: "Her dress was ___, with no pattern on it." }
    ]
  },
  {
    tier: 3,
    words: ["road", "rode"],
    clues: [
      { word: "rode", sentence: "Tunde ___ his bicycle to school." },
      { word: "road", sentence: "Look both ways before crossing the ___." }
    ]
  },
  {
    tier: 3,
    words: ["sail", "sale"],
    clues: [
      { word: "sail", sentence: "The boat will ___ across the lagoon." },
      { word: "sale", sentence: "The shop is having a big ___ this week." }
    ]
  },
  {
    tier: 3,
    words: ["some", "sum"],
    clues: [
      { word: "sum", sentence: "Find the ___ of 24 and 36." },
      { word: "some", sentence: "Please give me ___ water." }
    ]
  },
  {
    tier: 3,
    words: ["wait", "weight"],
    clues: [
      { word: "wait", sentence: "Please ___ for me at the gate." },
      { word: "weight", sentence: "The ___ of the bag is five kilograms." }
    ]
  },
  {
    tier: 3,
    words: ["buy", "by"],
    clues: [
      { word: "buy", sentence: "I want to ___ a new pencil." },
      { word: "by", sentence: "The letter was written ___ my sister." }
    ]
  },
  {
    tier: 3,
    words: ["sell", "cell"],
    clues: [
      { word: "sell", sentence: "Traders ___ yams in the market." },
      { word: "cell", sentence: "The prisoner was locked in a ___." }
    ]
  },
  {
    tier: 3,
    words: ["made", "maid"],
    clues: [
      { word: "made", sentence: "She ___ a cake for the party." },
      { word: "maid", sentence: "The ___ swept the parlour this morning." }
    ]
  },
  {
    tier: 3,
    words: ["our", "hour"],
    clues: [
      { word: "hour", sentence: "The lesson lasted one ___." },
      { word: "our", sentence: "This is ___ classroom." }
    ]
  },
  {
    tier: 3,
    words: ["night", "knight"],
    clues: [
      { word: "night", sentence: "The stars come out at ___." },
      { word: "knight", sentence: "The ___ wore heavy armour and carried a sword." }
    ]
  },
  {
    tier: 4,
    words: ["mail", "male"],
    clues: [
      { word: "mail", sentence: "The postman delivered the ___ before noon." },
      { word: "male", sentence: "A cock is a ___ bird." }
    ]
  },
  {
    tier: 4,
    words: ["nose", "knows"],
    clues: [
      { word: "knows", sentence: "Everyone ___ that water boils at 100 degrees." },
      { word: "nose", sentence: "He blew his ___ into a handkerchief." }
    ]
  },
  {
    tier: 4,
    words: ["rain", "reign"],
    clues: [
      { word: "rain", sentence: "The ___ fell heavily all night." },
      { word: "reign", sentence: "The king's ___ lasted forty years." }
    ]
  },
  {
    tier: 4,
    words: ["steel", "steal"],
    clues: [
      { word: "steel", sentence: "The gate is made of strong ___." },
      { word: "steal", sentence: "It is wrong to ___ from others." }
    ]
  },
  {
    tier: 4,
    words: ["threw", "through"],
    clues: [
      { word: "threw", sentence: "He ___ the ball over the wall." },
      { word: "through", sentence: "The train went ___ the tunnel." }
    ]
  },
  {
    tier: 4,
    words: ["waist", "waste"],
    clues: [
      { word: "waist", sentence: "The belt was too tight round his ___." },
      { word: "waste", sentence: "Do not ___ water while brushing your teeth." }
    ]
  },
  {
    tier: 4,
    words: ["way", "weigh"],
    clues: [
      { word: "weigh", sentence: "Please ___ the rice before you cook it." },
      { word: "way", sentence: "Show me the ___ to the market." }
    ]
  },
  {
    tier: 4,
    words: ["wood", "would"],
    clues: [
      { word: "wood", sentence: "The table is made of ___." },
      { word: "would", sentence: "I ___ like a glass of water, please." }
    ]
  },
  {
    tier: 4,
    words: ["bare", "bear"],
    clues: [
      { word: "bare", sentence: "The room was ___, with no furniture in it." },
      { word: "bear", sentence: "A ___ sleeps through the whole winter." }
    ]
  },
  {
    tier: 4,
    words: ["brake", "break"],
    clues: [
      { word: "brake", sentence: "Press the ___ to stop the car." },
      { word: "break", sentence: "Be careful not to ___ the glass." }
    ]
  },
  {
    tier: 4,
    words: ["fair", "fare"],
    clues: [
      { word: "fare", sentence: "The bus ___ to Ibadan has gone up." },
      { word: "fair", sentence: "The referee was ___ to both teams." }
    ]
  },
  {
    tier: 4,
    words: ["heal", "heel"],
    clues: [
      { word: "heal", sentence: "The wound will ___ in a few days." },
      { word: "heel", sentence: "There is a hole in the ___ of my shoe." }
    ]
  },
  {
    tier: 4,
    words: ["ate", "eight"],
    clues: [
      { word: "ate", sentence: "She ___ all her beans." },
      { word: "eight", sentence: "A spider has ___ legs." }
    ]
  },
  {
    tier: 5,
    words: ["aloud", "allowed"],
    clues: [
      { word: "aloud", sentence: "The teacher asked her to read the poem ___." },
      { word: "allowed", sentence: "We are not ___ to run in the corridor." }
    ]
  },
  {
    tier: 5,
    words: ["board", "bored"],
    clues: [
      { word: "board", sentence: "The teacher wrote the date on the ___." },
      { word: "bored", sentence: "He was ___ with nothing at all to do." }
    ]
  },
  {
    tier: 5,
    words: ["scene", "seen"],
    clues: [
      { word: "seen", sentence: "Have you ___ my pencil anywhere?" },
      { word: "scene", sentence: "The last ___ of the play was very funny." }
    ]
  },
  {
    tier: 5,
    words: ["stare", "stair"],
    clues: [
      { word: "stare", sentence: "It is rude to ___ at people." },
      { word: "stair", sentence: "He climbed the last ___ slowly." }
    ]
  },
  {
    tier: 5,
    words: ["sight", "site"],
    clues: [
      { word: "sight", sentence: "The ___ of the waterfall amazed us." },
      { word: "site", sentence: "They are building a school on that ___." }
    ]
  },
  {
    tier: 5,
    words: ["sole", "soul"],
    clues: [
      { word: "sole", sentence: "The ___ of my shoe is worn out." },
      { word: "soul", sentence: "Not a single ___ was in the street." }
    ]
  },
  {
    tier: 5,
    words: ["vain", "vein"],
    clues: [
      { word: "vein", sentence: "The nurse found a ___ in his arm." },
      { word: "vain", sentence: "She is very ___ about her looks." }
    ]
  },
  {
    tier: 5,
    words: ["weather", "whether"],
    clues: [
      { word: "weather", sentence: "The ___ is cloudy today." },
      { word: "whether", sentence: "I do not know ___ he will come or not." }
    ]
  },
  {
    tier: 5,
    words: ["which", "witch"],
    clues: [
      { word: "which", sentence: "___ of these books is yours?" },
      { word: "witch", sentence: "The story was about a wicked ___." }
    ]
  },
  {
    tier: 5,
    words: ["course", "coarse"],
    clues: [
      { word: "coarse", sentence: "The sand felt ___ under my feet." },
      { word: "course", sentence: "The main ___ was rice and stew." }
    ]
  },
  {
    tier: 5,
    words: ["lesson", "lessen"],
    clues: [
      { word: "lesson", sentence: "Our first ___ today is mathematics." },
      { word: "lessen", sentence: "The tablets will ___ the pain." }
    ]
  },
  {
    tier: 5,
    words: ["prey", "pray"],
    clues: [
      { word: "prey", sentence: "The eagle swooped down on its ___." },
      { word: "pray", sentence: "They ___ together every morning." }
    ]
  },
  {
    tier: 5,
    words: ["guest", "guessed"],
    clues: [
      { word: "guest", sentence: "We had a ___ for dinner last night." },
      { word: "guessed", sentence: "She ___ the answer correctly." }
    ]
  },
  {
    tier: 5,
    words: ["mist", "missed"],
    clues: [
      { word: "mist", sentence: "A thick ___ covered the hill at dawn." },
      { word: "missed", sentence: "He ___ the bus this morning." }
    ]
  }
];
var homs = (tier, specs) => specs.map(([word, m1, m2]) => ({ tier, word, meanings: [m1, m2] }));
var HOMONYMS = [
  ...homs(2, [
    ["bank", "a place where money is kept", "the side of a river"],
    ["bat", "an animal that flies at night", "a stick used to hit a ball"],
    ["bark", "the sound a dog makes", "the outer covering of a tree"],
    ["match", "a game between two teams", "a small stick that makes fire"],
    ["light", "not heavy", "what helps us to see"],
    ["ring", "jewellery worn on a finger", "the sound a bell makes"],
    ["watch", "a small clock worn on the wrist", "to look at something carefully"],
    ["palm", "the inside of your hand", "a tall tree with big leaves"],
    ["trunk", "an elephant's long nose", "the thick main stem of a tree"],
    ["fly", "a small buzzing insect", "to move through the air"]
  ]),
  ...homs(3, [
    ["park", "a green place where children play", "to leave a car somewhere"],
    ["rock", "a large hard stone", "to move gently to and fro"],
    ["spring", "the season after winter", "to jump up suddenly"],
    ["star", "a bright light in the night sky", "a very famous performer"],
    ["tie", "a strip of cloth worn round the neck", "to fasten with a knot"],
    ["train", "a vehicle that runs on rails", "to teach a skill by practice"],
    ["wave", "moving water on the sea", "to move your hand in greeting"],
    ["well", "in good health", "a deep hole dug for water"],
    ["kind", "friendly and caring", "a type or sort of thing"],
    ["left", "the opposite of right", "went away from a place"],
    ["date", "the day, month and year", "a sweet brown fruit"],
    ["pupil", "a learner in a school", "the dark centre of the eye"]
  ]),
  ...homs(4, [
    ["fine", "very good indeed", "money paid as a punishment"],
    ["block", "a solid lump of something", "to stop something passing"],
    ["change", "the coins you get back", "to make something different"],
    ["letter", "a message you post", "a symbol of the alphabet"],
    ["present", "a gift you are given", "here, and not absent"],
    ["second", "the one that comes after the first", "a very short unit of time"],
    ["board", "a flat piece of wood", "to get on a bus or an aeroplane"],
    ["coach", "a bus used for long journeys", "a person who trains a team"],
    ["crane", "a tall long-legged bird", "a machine that lifts heavy loads"],
    ["note", "a short written message", "a piece of paper money"],
    ["ruler", "a person who rules a country", "a strip used for measuring"],
    ["stick", "a thin piece of wood", "to fix one thing to another"]
  ]),
  ...homs(5, [
    ["current", "happening at this time", "the flow of water or electricity"],
    ["mine", "the one belonging to me", "a place where coal is dug out"],
    ["pound", "a unit of weight", "to hit something again and again"],
    ["record", "the best performance ever achieved", "to store sound so it can be played again"],
    ["season", "a part of the year", "to add salt and spices to food"],
    ["store", "a shop that sells goods", "to keep something for later use"],
    ["tip", "the pointed end of something", "extra money given for good service"],
    ["yard", "an open space beside a house", "a unit of length just under a metre"],
    ["bear", "a large furry wild animal", "to carry or put up with something"],
    ["fair", "just and honest to everyone", "an outdoor show with stalls and rides"],
    ["content", "happy with what you have", "what is inside something"],
    ["object", "a thing you can see and touch", "to speak against something"]
  ])
];
var gaps = (tier, specs) => specs.map(([text, answer, wrong]) => ({ tier, text, answer, wrong }));
var SENTENCES = [
  ...gaps(1, [
    ["We use our ___ to see.", "eyes", ["ears", "nose", "hands"]],
    ["An animal that says 'moo' is a ___.", "cow", ["hen", "goat", "fish"]],
    ["We wear ___ on our feet.", "shoes", ["hats", "gloves", "belts"]],
    ["Fish live in ___.", "water", ["sand", "air", "fire"]],
    ["Birds can ___ in the sky.", "fly", ["swim", "crawl", "dig"]],
    ["We eat rice with a spoon or a ___.", "fork", ["comb", "brush", "pencil"]],
    ["Ice feels very ___.", "cold", ["hot", "sweet", "loud"]],
    ["Honey tastes ___.", "sweet", ["bitter", "sour", "salty"]],
    ["A doctor works in a ___.", "hospital", ["bakery", "garage", "farm"]],
    ["The sun rises in the ___.", "east", ["west", "north", "south"]],
    ["We read a ___ in the library.", "book", ["spoon", "chair", "shoe"]],
    ["A ___ gives us milk.", "cow", ["dog", "cat", "hen"]],
    ["We sleep on a ___ at night.", "bed", ["table", "chair", "shelf"]],
    ["A ___ is used to sweep the floor.", "broom", ["spoon", "pillow", "towel"]],
    ["We hear with our ___.", "ears", ["eyes", "toes", "knees"]],
    ["A baby goat drinks ___.", "milk", ["petrol", "ink", "soap"]]
  ]),
  ...gaps(2, [
    ["She was so tired that she fell ___.", "asleep", ["awake", "hungry", "angry"]],
    ["A person who mends shoes is a ___.", "cobbler", ["butcher", "plumber", "barber"]],
    ["We open an umbrella when it ___.", "rains", ["shines", "dries", "sleeps"]],
    ["Bees make ___ in their hive.", "honey", ["milk", "butter", "bread"]],
    ["A young goat is called a ___.", "kid", ["calf", "lamb", "foal"]],
    ["We buy bread from a ___.", "bakery", ["library", "pharmacy", "garage"]],
    ["Water boils at one hundred ___ Celsius.", "degrees", ["metres", "litres", "grams"]],
    ["The thief was arrested by the ___.", "police", ["teacher", "driver", "farmer"]],
    ["We keep our money in a ___.", "bank", ["basket", "kitchen", "garden"]],
    ["The teacher wrote on the ___ with chalk.", "blackboard", ["window", "ceiling", "carpet"]],
    ["Plants need sunlight and ___ to grow.", "water", ["petrol", "sand", "paper"]],
    ["A ___ has twelve months in it.", "year", ["week", "day", "hour"]],
    ["The tailor used a needle and ___.", "thread", ["hammer", "ladder", "kettle"]],
    ["A ___ carries passengers along the road.", "bus", ["canoe", "kite", "trolley"]],
    ["We wash our hands with soap and ___.", "water", ["sand", "chalk", "flour"]],
    ["The farmer keeps his yams in a ___.", "barn", ["pocket", "wallet", "kettle"]],
    ["A ___ tells us the time.", "clock", ["mirror", "kettle", "basket"]],
    ["Cows, goats and sheep all eat ___.", "grass", ["meat", "fish", "stones"]]
  ]),
  ...gaps(3, [
    ["The soup was too hot, so Ada waited for it to ___.", "cool", ["boil", "burn", "freeze"]],
    ["The old man walked ___ because his legs hurt.", "slowly", ["quickly", "loudly", "brightly"]],
    ["The desert is very ___.", "dry", ["damp", "muddy", "swampy"]],
    ["Iron will ___ if it is left out in the rain.", "rust", ["melt", "burn", "float"]],
    ["The judge sat quietly in the ___.", "court", ["clinic", "studio", "garage"]],
    ["The ___ repaired our leaking tap.", "plumber", ["carpenter", "electrician", "painter"]],
    ["A book of maps is called an ___.", "atlas", ["album", "index", "almanac"]],
    ["A person who writes books is an ___.", "author", ["editor", "printer", "actor"]],
    ["The ___ flew the aeroplane safely to Kano.", "pilot", ["driver", "sailor", "guard"]],
    ["We keep food fresh in a ___.", "refrigerator", ["cupboard", "wardrobe", "basket"]],
    ["A group of sheep is called a ___.", "flock", ["pride", "shoal", "swarm"]],
    ["A group of lions is called a ___.", "pride", ["flock", "herd", "swarm"]],
    ["A group of fish swimming together is a ___.", "shoal", ["herd", "flock", "pride"]]
  ]),
  ...gaps(4, [
    ["Because he was ___, he shared his lunch with everyone.", "generous", ["greedy", "selfish", "lazy"]],
    ["The glass is ___, so carry it carefully.", "fragile", ["heavy", "sturdy", "cheap"]],
    ["She was ___ to leave her friends behind.", "reluctant", ["eager", "delighted", "keen"]],
    ["The ___ of the story is that honesty pays.", "moral", ["title", "author", "chapter"]],
    ["He spoke so ___ that nobody at the back could hear him.", "softly", ["loudly", "angrily", "clearly"]],
    ["An animal that eats only plants is a ___.", "herbivore", ["carnivore", "omnivore", "predator"]],
    ["Words that mean the same thing are called ___.", "synonyms", ["antonyms", "homophones", "prefixes"]],
    ["The library was ___, so we studied in peace.", "silent", ["noisy", "crowded", "festive"]],
    ["An ___ is a person who designs buildings.", "architect", ["engineer", "artist", "builder"]],
    ["A ___ measures how hot or cold something is.", "thermometer", ["barometer", "speedometer", "telescope"]],
    ["The stubborn boy ___ to apologise.", "refused", ["agreed", "promised", "offered"]],
    ["He gave a ___ answer that told us nothing at all.", "vague", ["clear", "honest", "precise"]]
  ]),
  ...gaps(5, [
    ["The medicine will ___ the pain in your head.", "relieve", ["increase", "worsen", "cause"]],
    ["Despite the heavy rain, the match ___ as planned.", "proceeded", ["cancelled", "postponed", "delayed"]],
    ["Her handwriting was so ___ that nobody could read it.", "illegible", ["neat", "elegant", "bold"]],
    ["The witness gave a ___ account of what he had seen.", "truthful", ["false", "invented", "imaginary"]],
    ["The drought made food very ___ in the village.", "scarce", ["plentiful", "abundant", "cheap"]],
    ["He was ___ for the crime he did not commit.", "blamed", ["praised", "rewarded", "thanked"]],
    ["A person who cannot read or write is ___.", "illiterate", ["ignorant", "careless", "foolish"]],
    ["The two brothers bore a striking ___ to each other.", "resemblance", ["difference", "distance", "argument"]],
    ["She spoke ___ and everyone listened carefully.", "confidently", ["nervously", "silently", "rudely"]],
    ["The council will ___ the new market next month.", "inaugurate", ["demolish", "abandon", "forget"]],
    ["His story was so ___ that we all believed it.", "convincing", ["doubtful", "confusing", "silly"]],
    ["The teacher praised her for her ___ work.", "diligent", ["careless", "untidy", "hurried"]]
  ])
];
var defs = (tier, kind, specs) => specs.map(([word, meaning]) => ({ tier, kind, word, meaning }));
var DEFINITIONS = [
  ...defs(2, "person", [
    ["pilot", "a person who flies an aeroplane"],
    ["author", "a person who writes books"],
    ["chef", "a person who cooks food in a restaurant"],
    ["carpenter", "a person who makes things out of wood"],
    ["cobbler", "a person who mends shoes"],
    ["butcher", "a person who sells meat"],
    ["tailor", "a person who sews clothes"],
    ["librarian", "a person who looks after a library"]
  ]),
  ...defs(3, "person", [
    ["plumber", "a person who fixes water pipes"],
    ["electrician", "a person who repairs electric wiring"],
    ["florist", "a person who sells flowers"],
    ["goldsmith", "a person who makes things out of gold"],
    ["referee", "a person who controls a football match"],
    ["passenger", "a person travelling in a vehicle"],
    ["pedestrian", "a person walking along the road"],
    ["orphan", "a child whose parents have died"]
  ]),
  ...defs(4, "person", [
    ["surgeon", "a doctor who performs operations"],
    ["pharmacist", "a person who prepares and sells medicine"],
    ["architect", "a person who designs buildings"],
    ["journalist", "a person who writes for a newspaper"],
    ["spectator", "a person who watches a game"],
    ["widow", "a woman whose husband has died"],
    ["burglar", "a person who breaks into houses to steal"],
    ["volunteer", "a person who works without being paid"]
  ]),
  ...defs(5, "person", [
    ["novice", "a person who is new to something"],
    ["immigrant", "a person who comes to live in another country"],
    ["ancestor", "a member of your family who lived long ago"],
    ["optician", "a person who tests eyes and sells glasses"],
    ["veterinarian", "a doctor who treats sick animals"],
    ["surveyor", "a person who measures and maps out land"],
    ["ambassador", "a person who represents a country abroad"],
    ["spendthrift", "a person who wastes money"]
  ]),
  ...defs(2, "place", [
    ["kennel", "a small house built for a dog"],
    ["garage", "a place where cars are kept or repaired"],
    ["bakery", "a place where bread is baked"],
    ["orchard", "a place where fruit trees are grown"]
  ]),
  ...defs(4, "place", [
    ["aquarium", "a glass tank in which fish are kept"],
    ["dormitory", "a large room where many people sleep"],
    ["laboratory", "a room used for scientific experiments"],
    ["nursery", "a place where young plants are raised"],
    ["cemetery", "a place where the dead are buried"],
    ["reservoir", "a large store of water for a town"],
    ["sanctuary", "a safe place where animals are protected"],
    ["harbour", "a sheltered place where ships anchor"]
  ]),
  ...defs(3, "thing", [
    ["atlas", "a book of maps"],
    ["calendar", "a chart showing the days of the year"],
    ["dictionary", "a book that explains what words mean"],
    ["thermometer", "an instrument for measuring temperature"],
    ["telescope", "an instrument for seeing distant things"],
    ["microscope", "an instrument for seeing very small things"]
  ]),
  ...defs(5, "thing", [
    ["biography", "the life story of a person written by someone else"],
    ["autobiography", "the life story of a person written by that person"],
    ["manuscript", "a book or paper written by hand"],
    ["barometer", "an instrument that measures air pressure"],
    ["stethoscope", "the instrument a doctor uses to listen to your heart"],
    ["pendulum", "a weight that swings to and fro in a clock"]
  ]),
  ...defs(3, "group", [
    ["herd", "a group of cattle"],
    ["flock", "a group of sheep or birds"],
    ["swarm", "a group of bees"],
    ["shoal", "a group of fish"],
    ["pride", "a group of lions"],
    ["bunch", "a group of bananas or keys"],
    ["fleet", "a group of ships"],
    ["crowd", "a large group of people packed together"]
  ])
];
var anas = (tier, specs) => specs.map((s) => {
  const [a, b] = s.split("/");
  return { tier, a, b };
});
var ANAGRAMS = [
  ...anas(1, [
    "cat/act",
    "dog/god",
    "now/own",
    "was/saw",
    "tea/eat",
    "top/pot",
    "bat/tab",
    "net/ten",
    "pan/nap",
    "tar/rat",
    "nap/pan",
    "dab/bad"
  ]),
  ...anas(2, [
    "meat/team",
    "star/rats",
    "care/race",
    "dear/read",
    "felt/left",
    "form/from",
    "salt/last",
    "shoe/hose",
    "stop/tops",
    "wasp/swap",
    "flow/wolf",
    "palm/lamp",
    "pale/leap",
    "item/time",
    "name/mean"
  ]),
  ...anas(3, [
    "listen/silent",
    "earth/heart",
    "night/thing",
    "lemon/melon",
    "angel/angle",
    "below/elbow",
    "cheap/peach",
    "dusty/study",
    "filed/field",
    "march/charm",
    "horse/shore",
    "ocean/canoe",
    "brush/shrub",
    "bread/beard",
    "diary/dairy",
    "these/sheet",
    "stone/notes",
    "weird/wider",
    "trace/crate"
  ]),
  ...anas(4, [
    "rescue/secure",
    "teach/cheat",
    "danger/garden",
    "master/stream",
    "spare/pears",
    "stable/tables",
    "silver/livers",
    "resent/enters",
    "thicken/kitchen",
    "wolves/vowels"
  ]),
  ...anas(5, [
    "angered/enraged",
    "players/parsley",
    "gallery/allergy",
    "section/notices",
    "teacher/cheater",
    "observe/verbose",
    "reserve/reverse",
    "creation/reaction"
  ])
];
var pool = (tier, words) => words.map((word) => ({ tier, word }));
var WORD_POOL = [
  ...pool(1, [
    "cat",
    "dog",
    "cup",
    "sun",
    "hat",
    "pen",
    "bag",
    "box",
    "cow",
    "egg",
    "fan",
    "hen",
    "jug",
    "key",
    "leg",
    "man",
    "net",
    "pot",
    "rat",
    "van",
    "web",
    "yam",
    "zip",
    "bed",
    "bus",
    "car",
    "arm",
    "ear",
    "eye",
    "ink",
    "jam",
    "lip",
    "map",
    "nut",
    "owl",
    "pig",
    "sea",
    "toe",
    "wax",
    "zoo"
  ]),
  ...pool(2, [
    "tree",
    "book",
    "fish",
    "bird",
    "hand",
    "milk",
    "road",
    "star",
    "door",
    "farm",
    "gate",
    "hill",
    "king",
    "lamp",
    "moon",
    "nose",
    "park",
    "rain",
    "sand",
    "ship",
    "shoe",
    "sock",
    "wind",
    "wood",
    "drum",
    "frog",
    "goat",
    "corn",
    "coat",
    "cake",
    "desk",
    "duck",
    "fire",
    "gold",
    "home",
    "lake",
    "leaf",
    "nest",
    "rice",
    "salt"
  ]),
  ...pool(3, [
    "bread",
    "chair",
    "cloud",
    "dance",
    "plant",
    "river",
    "table",
    "water",
    "house",
    "mango",
    "market",
    "orange",
    "pencil",
    "school",
    "sister",
    "garden",
    "basket",
    "cattle",
    "church",
    "doctor",
    "family",
    "forest",
    "ground",
    "monkey",
    "mother",
    "palace",
    "parrot",
    "rabbit",
    "silver",
    "spider",
    "summer",
    "window",
    "yellow",
    "bottle",
    "candle",
    "farmer",
    "flower",
    "ladder",
    "letter",
    "pocket"
  ]),
  ...pool(4, [
    "balance",
    "blanket",
    "captain",
    "journey",
    "kitchen",
    "machine",
    "mystery",
    "picture",
    "plastic",
    "problem",
    "quarter",
    "science",
    "teacher",
    "village",
    "weather",
    "whisper",
    "bicycle",
    "chicken",
    "concert",
    "country",
    "diamond",
    "drawing",
    "evening",
    "factory",
    "harvest",
    "holiday",
    "husband",
    "library",
    "measure",
    "morning",
    "package",
    "pattern",
    "present",
    "printer",
    "promise",
    "respect",
    "stomach",
    "subject",
    "thunder",
    "uniform"
  ]),
  ...pool(5, [
    "adventure",
    "ambulance",
    "beautiful",
    "celebrate",
    "character",
    "chocolate",
    "community",
    "dangerous",
    "difficult",
    "education",
    "elephant",
    "equipment",
    "furniture",
    "generous",
    "important",
    "knowledge",
    "mountain",
    "necessary",
    "orchestra",
    "permanent",
    "president",
    "principal",
    "remember",
    "restaurant",
    "sculpture",
    "telephone",
    "television",
    "tremendous",
    "understand",
    "vegetable",
    "wonderful",
    "geography",
    "hospital",
    "industry",
    "mechanic",
    "opposite",
    "parliament",
    "temperature"
  ])
];
var poolByLength = (tier, min, max) => bandOf(WORD_POOL, tier).filter((w) => w.word.length >= min && w.word.length <= max);
function wordsOfLength(tier, min, max) {
  const inBand = poolByLength(tier, min, max).map((w) => w.word);
  if (inBand.length >= 6) return inBand;
  const anywhere = WORD_POOL.filter((w) => w.word.length >= min && w.word.length <= max).map((w) => w.word);
  if (anywhere.length >= 4) return anywhere;
  return WORD_POOL.map((w) => w.word);
}
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var letterIndex = (letter) => ALPHABET.indexOf(letter.toUpperCase()) + 1;
var letterAt = (position2) => ALPHABET[position2 - 1];
function shiftLetter(letter, by) {
  const i = ALPHABET.indexOf(letter.toUpperCase());
  if (i < 0) return letter;
  return ALPHABET[((i + by) % 26 + 26) % 26];
}
var shiftWord = (word, by) => word.toUpperCase().split("").map((c) => shiftLetter(c, by)).join("");
var sortedLetters = (word) => word.toLowerCase().split("").sort().join("");
var isAnagram = (a, b) => a.toLowerCase() !== b.toLowerCase() && sortedLetters(a) === sortedLetters(b);
function scramble(rng, word) {
  const letters = word.toUpperCase().split("");
  for (let attempt = 0; attempt < 12; attempt++) {
    const out = rng.shuffle(letters).join("");
    if (out !== word.toUpperCase()) return out;
  }
  return letters.slice(1).concat(letters[0]).join("");
}
var VOWELS = ["A", "E", "I", "O", "U"];
var isVowel = (letter) => VOWELS.includes(letter.toUpperCase());
var countVowels = (word) => word.split("").filter((c) => isVowel(c)).length;
var spell = (word) => word.toUpperCase().split("").join(" ");
var upper = (word) => word.toUpperCase();
var capitalise = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// src/content/ng-ube/verbal/games.ts
var COMPOUND_SET = new Set(COMPOUNDS.map((c) => c.a + c.b));
var simpleWords = (tier, min, max) => wordsOfLength(tier, min, max).filter((w) => !COMPOUND_SET.has(w));
function nonRhymes(rng, keep, tier, n2) {
  const others = bandOf(RHYMES, tier).filter((f) => f.sound !== keep);
  const out = [];
  let guard = 0;
  while (out.length < n2 && guard++ < 40) {
    const word = rng.pick(rng.pick(others).words);
    if (!out.includes(word)) out.push(word);
  }
  return out;
}
var rhymes = {
  id: "ng.vr.games.rhymes",
  title: "Words that rhyme",
  yearBand: "b1",
  concepts: ["rhyme"],
  hint: "Say the words out loud. Rhyming words end with the same sound.",
  helpAtHome: "Sing songs and clap out rhymes \u2014 cat, hat, mat, that.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const family = pickTier(rng, RHYMES, tier);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const [cue2, answer] = rng.sample(family.words, 2);
      return mc(rng, `Which word rhymes with "${cue2}"?`, answer, nonRhymes(rng, family.sound, tier, 3), {
        explanation: `"${cue2}" and "${answer}" both end with the ${family.sound} sound.`
      });
    }
    if (variant === 2) {
      const picked = rng.sample(family.words, 3);
      const cue2 = picked[0];
      const right = picked.slice(1);
      const wrong = nonRhymes(rng, family.sound, tier, 3);
      return tapMany(
        rng,
        `Tap every word that rhymes with "${cue2}"`,
        [
          ...right.map((v) => ({ value: v, correct: true })),
          ...wrong.map((v) => ({ value: v, correct: false }))
        ],
        { explanation: `${right.join(" and ")} rhyme with "${cue2}" \u2014 they all end ${family.sound}.` }
      );
    }
    const same = rng.chance(0.5);
    const [cue, partner] = rng.sample(family.words, 2);
    const other = nonRhymes(rng, family.sound, tier, 1)[0];
    return tf(`Do "${cue}" and "${same ? partner : other}" rhyme?`, same, {
      trueLabel: "Yes",
      falseLabel: "No",
      explanation: same ? `Yes \u2014 "${cue}" and "${partner}" both end ${family.sound}.` : `No \u2014 "${cue}" ends ${family.sound}, but "${other}" does not.`
    });
  }
};
var missingLetters = {
  id: "ng.vr.games.missing-letters",
  title: "Missing letters",
  yearBand: "b1",
  concepts: ["word-completion"],
  hint: "Say the word slowly and listen for the sound that is missing.",
  helpAtHome: "Write a familiar word with one letter rubbed out and let them fill it in.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const group = pickTier(rng, CATEGORIES, tier);
    const long = group.members.filter((m) => m.length >= 4 && /^[a-z]+$/.test(m));
    const pool2 = long.length >= 3 ? long : group.members.filter((m) => m.length >= 3);
    const word = rng.pick(pool2);
    if (difficulty >= 4 && word.length >= 5 && /^[a-z]+$/.test(word)) {
      const skeleton = word.replace(/[aeiou]/g, "_");
      const matches = (w) => w.length === word.length && w.replace(/[aeiou]/g, "_") === skeleton;
      const wrong2 = group.members.filter((m) => m !== word && !matches(m)).slice(0, 3);
      if (wrong2.length >= 2) {
        return mc(
          rng,
          `The vowels have fallen out of a word.
${group.name}: ${upper(skeleton).split("").join(" ")}`,
          word,
          wrong2,
          {
            speak: `Which of these words fits the pattern? It is one of the ${group.name.toLowerCase()}.`,
            explanation: `${upper(word)} fits, because its consonants are ${upper(word.replace(/[aeiou]/g, ""))}.`
          }
        );
      }
    }
    const at = rng.int(0, word.length - 1);
    const shown = word.split("").map((c, i) => i === at ? "_" : c.toUpperCase()).join(" ");
    const answer = word[at].toUpperCase();
    const wrong = rng.shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")).filter((c) => c !== answer).slice(0, 3);
    return mc(rng, `Which letter is missing?
${group.name}: ${shown}`, answer, wrong, {
      speak: `Which letter is missing from this word? It is one of the ${group.name.toLowerCase()}.`,
      explanation: `The word is ${upper(word)}.`
    });
  }
};
function jumbleItem(rng, word, clue, wrongPool) {
  const mixed = scramble(rng, word);
  const wrong = wrongPool.filter((w) => w !== word && !isAnagram(w, word) && sortedLetters(w) !== sortedLetters(word)).slice(0, 3);
  return mc(
    rng,
    clue ? `Rearrange the letters to make a word.
${clue}: ${spell(mixed)}` : `Rearrange the letters to make a word.
${spell(mixed)}`,
    word,
    wrong,
    {
      speak: `Rearrange these letters to make a word: ${mixed.split("").join(" ")}`,
      explanation: `${mixed} rearranges to ${upper(word)}.`
    }
  );
}
var jumbled = {
  id: "ng.vr.games.jumbled",
  title: "Jumbled words",
  yearBand: "b2",
  concepts: ["anagram-basic"],
  hint: "Look for a letter that could start a word, then try the rest.",
  helpAtHome: "Write a word on scraps of paper, one letter each, and mix them up.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const maxLen = [4, 4, 5, 6, 6][difficulty - 1];
    const chosen = rng.pick(wordsOfLength(tier, 3, maxLen));
    const others = rng.shuffle(wordsOfLength(tier, chosen.length, chosen.length)).filter((w) => w !== chosen);
    const backup = rng.shuffle(WORD_POOL.map((w) => w.word)).filter((w) => w !== chosen);
    return jumbleItem(rng, chosen, null, [...others, ...backup]);
  }
};
var jumbledHard = {
  id: "ng.vr.games.jumbled-hard",
  title: "Jumbled words \u2014 longer",
  yearBand: "b4",
  prerequisites: ["ng.vr.games.jumbled"],
  concepts: ["anagram-advanced"],
  hint: "The clue tells you what kind of word it is. Try the likely first letter.",
  helpAtHome: "Jumble the name of something in the room and race to unscramble it.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const useClue = rng.chance(0.5);
    if (useClue) {
      const group = pickTier(rng, CATEGORIES, tier);
      const members = group.members.filter((m) => /^[a-z]+$/.test(m) && m.length >= 4);
      if (members.length >= 4) {
        const word = rng.pick(members);
        return jumbleItem(rng, word, group.name, members.filter((m) => m !== word));
      }
    }
    const minLen = [4, 5, 5, 6, 6][difficulty - 1];
    const chosen = rng.pick(wordsOfLength(tier, minLen, 9));
    const sameLength = rng.shuffle(wordsOfLength(tier, chosen.length - 1, chosen.length + 1)).filter((w) => w !== chosen);
    return jumbleItem(rng, chosen, null, sameLength);
  }
};
var anagrams = {
  id: "ng.vr.games.anagrams",
  title: "Same letters, new word",
  yearBand: "b5",
  prerequisites: ["ng.vr.games.jumbled-hard"],
  concepts: ["anagram-pairs"],
  hint: "Count the letters first \u2014 an anagram must use every letter exactly once.",
  helpAtHome: "LISTEN and SILENT use the same six letters. Hunt for more together.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(2, difficulty);
    const entry2 = pickTier(rng, ANAGRAMS, tier);
    const flip = rng.chance(0.5);
    const cue = flip ? entry2.b : entry2.a;
    const answer = flip ? entry2.a : entry2.b;
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const near = wordsOfLength(tier, cue.length - 1, cue.length + 1);
      const pool2 = near.length >= 6 ? near : wordsOfLength(tier, cue.length - 2, cue.length + 2);
      const wrong = rng.shuffle(pool2).filter((w) => w !== cue && w !== answer && !isAnagram(w, cue)).slice(0, 3);
      if (wrong.length >= 2) {
        return mc(rng, `Which word uses exactly the same letters as "${cue}"?`, answer, wrong, {
          explanation: `${upper(cue)} and ${upper(answer)} both use the letters ${spell(sortedLetters(cue))}.`
        });
      }
    }
    if (variant === 2) {
      const fakes = [];
      let guard = 0;
      while (fakes.length < 3 && guard++ < 40) {
        const [x, y] = rng.sample(bandOf(ANAGRAMS, tier), 2);
        if (!x || !y) break;
        const pair = `${x.a} \u2014 ${y.b}`;
        if (isAnagram(x.a, y.b) || fakes.includes(pair)) continue;
        fakes.push(pair);
      }
      if (fakes.length >= 2) {
        return mc(rng, "Which pair of words use exactly the same letters?", `${entry2.a} \u2014 ${entry2.b}`, fakes, {
          explanation: `${upper(entry2.a)} and ${upper(entry2.b)} are made from the very same letters.`
        });
      }
    }
    const other = rng.pick(bandOf(ANAGRAMS, tier)).b;
    const partner = rng.chance(0.5) || other === cue ? answer : other;
    const truth = isAnagram(cue, partner);
    return tf(`"${cue}" and "${partner}" use exactly the same letters.`, truth, {
      explanation: truth ? `True \u2014 both are made from ${spell(sortedLetters(cue))}.` : `False \u2014 "${cue}" and "${partner}" do not use the same letters.`
    });
  }
};
var compound = {
  id: "ng.vr.games.compound",
  title: "Two words in one",
  yearBand: "b3",
  concepts: ["compound-words"],
  hint: "Cover half the word with your finger. Is what is left a word on its own?",
  helpAtHome: "Spot compound words on signs: bus stop, football, motorway, classroom.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, COMPOUNDS, tier);
    const whole = entry2.a + entry2.b;
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const plain = rng.shuffle(simpleWords(tier + 1, 4, 9)).slice(0, 3);
      return mc(rng, "Which of these words is made from TWO smaller words?", whole, plain, {
        explanation: `${upper(whole)} is "${entry2.a}" and "${entry2.b}" joined together.`
      });
    }
    if (variant === 2) {
      const [other1, other2] = rng.sample(bandOf(COMPOUNDS, tier), 2);
      const wrong2 = [
        `${other1.a} + ${entry2.b}`,
        `${entry2.a} + ${other1.b}`,
        `${other2.a} + ${other2.b}`
      ].filter((w) => w !== `${entry2.a} + ${entry2.b}`);
      return mc(rng, `Which two words make ${upper(whole)}?`, `${entry2.a} + ${entry2.b}`, wrong2, {
        explanation: `${upper(whole)} = ${entry2.a} + ${entry2.b}.`
      });
    }
    const wantStart = rng.chance(0.5);
    const answer = wantStart ? entry2.a : entry2.b;
    const other = rng.pick(bandOf(COMPOUNDS, tier));
    const wrong = [wantStart ? entry2.b : entry2.a, other.a, other.b].filter((w) => w !== answer);
    return mc(
      rng,
      `Which small word is hidden at the ${wantStart ? "START" : "END"} of ${upper(whole)}?`,
      answer,
      wrong,
      { explanation: `${upper(whole)} is ${entry2.a} + ${entry2.b}, so the ${wantStart ? "first" : "last"} part is "${answer}".` }
    );
  }
};
var hiddenWords = {
  id: "ng.vr.games.hidden-words",
  title: "Words inside words",
  yearBand: "b4",
  prerequisites: ["ng.vr.games.compound"],
  concepts: ["hidden-words"],
  hint: "The hidden letters sit side by side, in the same order, without skipping any.",
  helpAtHome: "Look at long words on packets and find the little words hiding inside them.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, HIDDEN_WORDS, tier);
    const variant = rng.int(1, 2);
    if (variant === 1) {
      const near = rng.shuffle(WORD_POOL.map((w) => w.word)).filter(
        (w) => !entry2.word.includes(w) && w !== entry2.hidden && Math.abs(w.length - entry2.hidden.length) <= 1
      );
      const any = rng.shuffle(WORD_POOL.map((w) => w.word)).filter((w) => !entry2.word.includes(w));
      const wrong = [...near, ...any].slice(0, 3);
      return mc(rng, `Which small word is hidden inside ${upper(entry2.word)}?`, entry2.hidden, wrong, {
        speak: `Which small word is hidden inside the word ${entry2.word}?`,
        explanation: `${upper(entry2.word)} \u2014 the letters ${upper(entry2.hidden)} sit together inside it.`
      });
    }
    const others = rng.shuffle(bandOf(HIDDEN_WORDS, tier)).filter((h) => !h.word.includes(entry2.hidden) && h.word !== entry2.word).slice(0, 3).map((h) => h.word);
    return mc(rng, `In which word is "${entry2.hidden}" hiding?`, entry2.word, others, {
      explanation: `${upper(entry2.word)} contains the letters ${upper(entry2.hidden)} side by side.`
    });
  }
};
function wrongPlurals(one, many) {
  const stem = one.replace(/y$/, "");
  const candidates = [
    `${one}s`,
    `${one}es`,
    `${stem}ies`,
    `${one}ies`,
    `${one}en`,
    one.replace(/f$/, "ves")
  ];
  const seen = /* @__PURE__ */ new Set([one, many]);
  const out = [];
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
var plurals2 = {
  id: "ng.vr.games.plurals",
  title: "One and many",
  yearBand: "b2",
  concepts: ["plurals"],
  hint: "Most words just add -s, but some change completely: one child, two children.",
  helpAtHome: 'Point at things and ask for "one\u2026 two\u2026": one knife, two knives.',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, PLURALS, tier);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      return mc(rng, `What is the plural of "${entry2.one}"?`, entry2.many, wrongPlurals(entry2.one, entry2.many), {
        explanation: entry2.one === entry2.many ? `"${entry2.one}" does not change \u2014 one ${entry2.one}, two ${entry2.many}.` : `One ${entry2.one}, two ${entry2.many}.`
      });
    }
    if (variant === 2) {
      const others = rng.sample(bandOf(PLURALS, tier), 4).filter((p) => p.one !== entry2.one).slice(0, 3).map((p) => p.one);
      return mc(rng, `"${entry2.many}" is the plural of which word?`, entry2.one, others, {
        explanation: `One ${entry2.one}, two ${entry2.many}.`
      });
    }
    const truth = rng.chance(0.5);
    const shown = truth ? entry2.many : wrongPlurals(entry2.one, entry2.many)[0] ?? `${entry2.one}s`;
    return tf(`The plural of "${entry2.one}" is "${shown}".`, truth, {
      explanation: `The plural of "${entry2.one}" is "${entry2.many}".`
    });
  }
};
var gamesStrand = {
  id: "ng.vr.games",
  name: "Word Market",
  blurb: "Rhymes, jumbles, hidden words and words made of two words",
  theme: "market",
  skills: [rhymes, missingLetters, jumbled, plurals2, compound, hiddenWords, jumbledHard, anagrams]
};

// src/content/ng-ube/verbal/letters.ts
function letterDistractors(rng, answer, n2) {
  const i = ALPHABET.indexOf(answer.toUpperCase());
  const near = [i - 1, i + 1, i - 2, i + 2, i + 3, i - 3].filter((j) => j >= 0 && j < 26).map((j) => ALPHABET[j]);
  const out = [];
  for (const c of [...rng.shuffle(near), ...rng.shuffle(ALPHABET)]) {
    if (c === answer.toUpperCase() || out.includes(c)) continue;
    out.push(c);
    if (out.length >= n2) break;
  }
  return out;
}
var wordsFor = (rng, tier, n2, min = 3, max = 9) => {
  return rng.sample(wordsOfLength(tier, min, max), n2);
};
var alphabetically = (words) => [...words].sort((a, b) => a < b ? -1 : 1);
var alphabet = {
  id: "ng.vr.letters.alphabet",
  title: "The alphabet",
  yearBand: "b1",
  concepts: ["alphabet-order"],
  hint: "Sing the alphabet quietly in your head until you reach that letter.",
  helpAtHome: "Sing the alphabet, then stop halfway and ask what comes next.",
  generate: ({ rng, difficulty }) => {
    const variant = rng.int(1, difficulty >= 3 ? 4 : 3);
    if (variant === 1) {
      const i2 = rng.int(0, 24);
      const answer2 = ALPHABET[i2 + 1];
      return mc(rng, `Which letter comes just AFTER ${ALPHABET[i2]}?`, answer2, letterDistractors(rng, answer2, 3), {
        speak: `Which letter comes just after ${ALPHABET[i2]}?`,
        explanation: `${ALPHABET[i2]} then ${answer2}.`
      });
    }
    if (variant === 2) {
      const i2 = rng.int(1, 25);
      const answer2 = ALPHABET[i2 - 1];
      return mc(rng, `Which letter comes just BEFORE ${ALPHABET[i2]}?`, answer2, letterDistractors(rng, answer2, 3), {
        speak: `Which letter comes just before ${ALPHABET[i2]}?`,
        explanation: `${answer2} then ${ALPHABET[i2]}.`
      });
    }
    if (variant === 3) {
      const start = rng.int(0, 21);
      const hole = rng.int(1, 3);
      const run = [0, 1, 2, 3, 4].map((k) => ALPHABET[start + k]);
      const shown = run.map((c, k) => k === hole ? "?" : c).join(" ");
      const answer2 = run[hole];
      return mc(rng, `Which letter is missing?
${shown}`, answer2, letterDistractors(rng, answer2, 3), {
        speak: `Which letter is missing from ${run.map((c, k) => k === hole ? "blank" : c).join(", ")}?`,
        explanation: `The alphabet runs ${run.join(", ")}.`
      });
    }
    const jump = rng.int(2, difficulty >= 4 ? 5 : 3);
    const forward = rng.chance(0.6);
    const i = forward ? rng.int(0, 25 - jump) : rng.int(jump, 25);
    const answer = ALPHABET[forward ? i + jump : i - jump];
    return mc(
      rng,
      `Which letter is ${jump} places ${forward ? "AFTER" : "BEFORE"} ${ALPHABET[i]}?`,
      answer,
      letterDistractors(rng, answer, 3),
      { explanation: `Count ${jump} ${forward ? "forwards" : "backwards"} from ${ALPHABET[i]} to reach ${answer}.` }
    );
  }
};
var vowels = {
  id: "ng.vr.letters.vowels",
  title: "Vowels and consonants",
  yearBand: "b1",
  concepts: ["vowels-consonants"],
  hint: "The five vowels are A, E, I, O and U. Every other letter is a consonant.",
  helpAtHome: "Ask them to count the vowels in their own name.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const variant = rng.int(1, 4);
    if (variant === 1) {
      const letter = rng.pick(ALPHABET);
      const answer = isVowel(letter) ? "Vowel" : "Consonant";
      return mc(rng, `Is the letter ${letter} a vowel or a consonant?`, answer, [
        isVowel(letter) ? "Consonant" : "Vowel"
      ], {
        explanation: `The vowels are A, E, I, O and U, so ${letter} is a ${answer.toLowerCase()}.`
      });
    }
    if (variant === 2) {
      const right = rng.sample(VOWELS, 2);
      const wrong = rng.shuffle(ALPHABET.filter((c) => !isVowel(c))).slice(0, 4);
      return tapMany(
        rng,
        "Tap every VOWEL",
        [
          ...right.map((v) => ({ value: v, correct: true })),
          ...wrong.map((v) => ({ value: v, correct: false }))
        ],
        { explanation: "The vowels are A, E, I, O and U." }
      );
    }
    if (variant === 3) {
      const [word] = wordsFor(rng, tier, 1, 3, 9);
      const target = word ?? "mango";
      return entry(`How many vowels are in the word ${upper(target)}?`, countVowels(target), {
        maxDigits: 1,
        speak: `How many vowels are in the word ${target}?`,
        explanation: `${upper(target)} has the vowels ${upper(target.split("").filter(isVowel).join(" "))}.`
      });
    }
    const picks = wordsFor(rng, tier, 4, 4, 9);
    if (picks.length < 2) {
      const fallback = "banana";
      return entry(`How many vowels are in the word ${upper(fallback)}?`, countVowels(fallback), {
        maxDigits: 1,
        explanation: "BANANA has three vowels: A, A, A."
      });
    }
    const best = picks.reduce((a, b) => countVowels(b) > countVowels(a) ? b : a);
    const tie = picks.filter((w) => countVowels(w) === countVowels(best)).length > 1;
    if (tie) {
      return entry(`How many vowels are in the word ${upper(best)}?`, countVowels(best), {
        maxDigits: 1,
        explanation: `${upper(best)} has ${countVowels(best)} vowels.`
      });
    }
    return mc(rng, "Which word has the MOST vowels?", best, picks.filter((w) => w !== best), {
      explanation: `${upper(best)} has ${countVowels(best)} vowels.`
    });
  }
};
var alphaOrder = {
  id: "ng.vr.letters.alpha-order",
  title: "Alphabetical order",
  yearBand: "b2",
  prerequisites: ["ng.vr.letters.alphabet"],
  concepts: ["alphabetical-order"],
  hint: "Look at the first letter of each word and work through the alphabet.",
  helpAtHome: "Put five things from the kitchen in alphabetical order together.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const count = difficulty >= 4 ? 5 : 4;
    const pool2 = wordsOfLength(tier, 3, 9);
    const chosen = [];
    const used = /* @__PURE__ */ new Set();
    for (const w of rng.shuffle(pool2)) {
      if (used.has(w[0])) continue;
      used.add(w[0]);
      chosen.push(w);
      if (chosen.length === count) break;
    }
    for (const w of rng.shuffle(pool2)) {
      if (chosen.length >= count) break;
      if (!chosen.includes(w)) chosen.push(w);
    }
    const sorted = alphabetically(chosen);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      return order(rng, "Put these words in alphabetical order", sorted, {
        explanation: `In alphabetical order: ${sorted.join(", ")}.`
      });
    }
    if (variant === 2) {
      return mc(rng, "Which word comes FIRST in the dictionary?", sorted[0], sorted.slice(1), {
        explanation: `${sorted[0]} starts with ${sorted[0][0].toUpperCase()}, which comes first.`
      });
    }
    const last = sorted[sorted.length - 1];
    return mc(rng, "Which word comes LAST in the dictionary?", last, sorted.slice(0, -1), {
      explanation: `${last} starts with ${last[0].toUpperCase()}, the latest letter here.`
    });
  }
};
var alphaOrderHard = {
  id: "ng.vr.letters.alpha-order-hard",
  title: "Alphabetical order \u2014 same first letter",
  yearBand: "b4",
  prerequisites: ["ng.vr.letters.alpha-order"],
  concepts: ["alphabetical-order-deep"],
  hint: "If the first letters match, compare the second. If those match too, compare the third.",
  helpAtHome: "Open a dictionary at any page and ask which of two words comes first.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(2, difficulty);
    const count = difficulty >= 4 ? 4 : 3;
    const pool2 = wordsOfLength(tier, 4, 11);
    const byLetter = /* @__PURE__ */ new Map();
    for (const w of pool2) {
      const list = byLetter.get(w[0]) ?? [];
      list.push(w);
      byLetter.set(w[0], list);
    }
    const groups = [...byLetter.values()].filter((g) => g.length >= count);
    const chosen = groups.length ? rng.sample(rng.pick(groups), count) : rng.sample(pool2, count);
    const sorted = alphabetically(chosen);
    if (rng.chance(0.5)) {
      return order(rng, "Put these words in alphabetical order", sorted, {
        explanation: `In alphabetical order: ${sorted.join(", ")}.`
      });
    }
    const first = rng.chance(0.5);
    const answer = first ? sorted[0] : sorted[sorted.length - 1];
    const rest = sorted.filter((w) => w !== answer);
    return mc(rng, `Which word comes ${first ? "FIRST" : "LAST"} in the dictionary?`, answer, rest, {
      explanation: `In order: ${sorted.join(", ")}.`
    });
  }
};
var position = {
  id: "ng.vr.letters.position",
  title: "Letter positions",
  yearBand: "b3",
  prerequisites: ["ng.vr.letters.alphabet"],
  concepts: ["letter-position"],
  hint: "A is 1, and every letter after it is one more. M is right in the middle at 13.",
  helpAtHome: "Write the alphabet with numbers underneath and quiz each other.",
  generate: ({ rng, difficulty }) => {
    const max = [10, 14, 20, 26, 26][difficulty - 1];
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const n2 = rng.int(1, max);
      return entry(`What position is the letter ${letterAt(n2)} in the alphabet?`, n2, {
        maxDigits: 2,
        explanation: `A is 1, so ${letterAt(n2)} is ${n2}.`
      });
    }
    if (variant === 2) {
      const n2 = rng.int(1, max);
      const answer2 = letterAt(n2);
      return mc(rng, `Which letter is number ${n2} in the alphabet?`, answer2, letterDistractors(rng, answer2, 3), {
        explanation: `Counting from A, letter ${n2} is ${answer2}.`
      });
    }
    const a = rng.int(1, Math.max(2, max - 1));
    let b = rng.int(1, max);
    while (b === a) b = rng.int(1, max);
    const answer = Math.abs(letterIndex(letterAt(a)) - letterIndex(letterAt(b)));
    return entry(
      `How many places apart are ${letterAt(a)} and ${letterAt(b)} in the alphabet?`,
      answer,
      {
        maxDigits: 2,
        explanation: `${letterAt(a)} is ${a} and ${letterAt(b)} is ${b}, so they are ${answer} apart.`
      }
    );
  }
};
var sequences = {
  id: "ng.vr.letters.sequences",
  title: "Letter sequences",
  yearBand: "b4",
  prerequisites: ["ng.vr.letters.alphabet"],
  concepts: ["letter-sequences"],
  hint: "Count the steps between the first two letters, then check it happens again.",
  helpAtHome: "Write A C E G on paper and ask what comes next, then invent your own.",
  generate: ({ rng, difficulty }) => {
    const style = difficulty <= 2 ? 1 : difficulty <= 3 ? rng.int(1, 2) : rng.int(1, 4);
    if (style === 1) {
      const step = rng.pick(difficulty <= 2 ? [1, 2] : [1, 2, 3, -1, -2, -3]);
      const span = step * 4;
      const start2 = step > 0 ? rng.int(0, 25 - span) : rng.int(-span, 25);
      const run2 = [0, 1, 2, 3, 4].map((k) => ALPHABET[start2 + k * step]);
      const answer2 = run2[4];
      return mc(rng, `What comes next?
${run2.slice(0, 4).join("  ")}  ?`, answer2, letterDistractors(rng, answer2, 3), {
        speak: `What letter comes next after ${run2.slice(0, 4).join(", ")}?`,
        explanation: `Each letter jumps ${Math.abs(step)} ${step > 0 ? "forward" : "back"}: ${run2.join(", ")}.`
      });
    }
    if (style === 2) {
      const step = rng.pick([1, 2]);
      const gap = rng.int(1, 2);
      const start2 = rng.int(0, 25 - (step * 2 * 3 + gap));
      const pair = (k) => `${ALPHABET[start2 + k * step * 2]}${ALPHABET[start2 + k * step * 2 + gap]}`;
      const run2 = [0, 1, 2, 3].map(pair);
      const answer2 = run2[3];
      const wrong = [
        `${shiftLetter(answer2[0], 1)}${answer2[1]}`,
        `${answer2[0]}${shiftLetter(answer2[1], 1)}`,
        `${shiftLetter(answer2[0], -1)}${shiftLetter(answer2[1], -1)}`
      ];
      return mc(rng, `What comes next?
${run2.slice(0, 3).join("  ")}  ?`, answer2, wrong, {
        speak: `What comes next after ${run2.slice(0, 3).map(spell).join(", ")}?`,
        explanation: `The pattern goes ${run2.join(", ")}.`
      });
    }
    if (style === 3) {
      const start2 = rng.int(0, 20);
      const from = rng.int(5, 25);
      const pair = (k) => `${ALPHABET[start2 + k]}${ALPHABET[from - k]}`;
      const run2 = [0, 1, 2, 3].map(pair);
      const answer2 = run2[3];
      const wrong = [
        `${answer2[0]}${shiftLetter(answer2[1], -1)}`,
        `${shiftLetter(answer2[0], 1)}${answer2[1]}`,
        `${shiftLetter(answer2[0], -1)}${shiftLetter(answer2[1], 1)}`
      ];
      return mc(rng, `What comes next?
${run2.slice(0, 3).join("  ")}  ?`, answer2, wrong, {
        speak: `What comes next after ${run2.slice(0, 3).map(spell).join(", ")}?`,
        explanation: `The first letter moves forward and the second moves back: ${run2.join(", ")}.`
      });
    }
    const a = rng.int(1, 2);
    const b = rng.int(3, 4);
    const start = rng.int(0, 25 - (a * 2 + b * 2));
    const run = [ALPHABET[start]];
    let at = start;
    for (let k = 0; k < 4; k++) {
      at += k % 2 === 0 ? a : b;
      run.push(ALPHABET[at]);
    }
    const answer = run[4];
    return mc(rng, `What comes next?
${run.slice(0, 4).join("  ")}  ?`, answer, letterDistractors(rng, answer, 3), {
      speak: `What letter comes next after ${run.slice(0, 4).join(", ")}?`,
      explanation: `The jumps go ${a}, ${b}, ${a}, ${b}: ${run.join(", ")}.`
    });
  }
};
var codes = {
  id: "ng.vr.letters.codes",
  title: "Secret letter codes",
  yearBand: "b4",
  prerequisites: ["ng.vr.letters.alphabet"],
  concepts: ["letter-codes"],
  hint: "Work out how far each letter has moved in the example, then move the same way.",
  helpAtHome: "Send each other notes where every letter is moved one place along.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const maxShift = [1, 2, 3, 4, 5][difficulty - 1];
    const shift = rng.int(1, maxShift) * (difficulty >= 4 && rng.chance(0.4) ? -1 : 1);
    const [sample, target] = rng.sample(wordsOfLength(tier, 3, 5), 2);
    const coded = shiftWord(target, shift);
    const direction = shift > 0 ? "forward" : "back";
    const clue = `${upper(sample)} is written as ${shiftWord(sample, shift)}.`;
    if (rng.chance(0.5)) {
      const wrong2 = [
        shiftWord(target, shift + 1),
        shiftWord(target, shift - 1),
        shiftWord(target, -shift)
      ].filter((w) => w !== coded);
      return mc(rng, `In a code, ${clue}
How is ${upper(target)} written?`, coded, wrong2, {
        speak: `In a code, ${sample} is written as ${spell(shiftWord(sample, shift))}. How is ${target} written?`,
        explanation: `Every letter moves ${Math.abs(shift)} place${Math.abs(shift) === 1 ? "" : "s"} ${direction}, so ${upper(target)} becomes ${coded}.`
      });
    }
    const wrong = [
      shiftWord(coded, -shift + 1),
      shiftWord(coded, -shift - 1),
      shiftWord(coded, shift)
    ].filter((w) => w !== upper(target));
    return mc(rng, `In a code, ${clue}
What does ${coded} mean?`, upper(target), wrong, {
      speak: `In a code, ${sample} is written as ${spell(shiftWord(sample, shift))}. What does ${spell(coded)} mean?`,
      explanation: `Move every letter ${Math.abs(shift)} place${Math.abs(shift) === 1 ? "" : "s"} back the other way to get ${upper(target)}.`
    });
  }
};
var codesHard = {
  id: "ng.vr.letters.codes-hard",
  title: "Breaking harder codes",
  yearBand: "b6",
  prerequisites: ["ng.vr.letters.codes"],
  concepts: ["letter-codes-advanced"],
  hint: "Check the first letter, then the last. Sometimes the whole word is turned round.",
  helpAtHome: "Give them a coded word and let them work out the rule with no clues.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const [sample, target] = rng.sample(wordsOfLength(tier, 4, 8), 2);
    const rule = rng.int(1, difficulty >= 4 ? 3 : 2);
    const shift = rng.int(2, 5) * (rng.chance(0.4) ? -1 : 1);
    const apply = (w) => {
      if (rule === 1) return shiftWord(w, shift);
      if (rule === 2) return upper(w).split("").reverse().join("");
      return shiftWord(w, shift).split("").reverse().join("");
    };
    const describe = rule === 1 ? `every letter moves ${Math.abs(shift)} place${Math.abs(shift) === 1 ? "" : "s"} ${shift > 0 ? "forward" : "back"}` : rule === 2 ? "the word is written backwards" : `every letter moves ${Math.abs(shift)} ${shift > 0 ? "forward" : "back"} and then the word is written backwards`;
    const answer = apply(target);
    const wrong = [
      shiftWord(target, shift),
      upper(target).split("").reverse().join(""),
      shiftWord(target, -shift),
      shiftWord(target, shift + 1)
    ].filter((w) => w !== answer);
    return mc(
      rng,
      `In a code, ${upper(sample)} is written as ${apply(sample)}.
How is ${upper(target)} written?`,
      answer,
      wrong,
      {
        speak: `In a code, ${sample} is written as ${spell(apply(sample))}. How is ${target} written?`,
        explanation: `In this code ${describe}, so ${upper(target)} becomes ${answer}.`
      }
    );
  }
};
var numberCodes = {
  id: "ng.vr.letters.number-codes",
  title: "Letters as numbers",
  yearBand: "b5",
  prerequisites: ["ng.vr.letters.position"],
  concepts: ["letter-number-codes"],
  hint: "A is 1, B is 2, and so on all the way to Z, which is 26.",
  helpAtHome: "Work out the number value of each other\u2019s names and see whose is biggest.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const maxLen = difficulty >= 4 ? 5 : 4;
    const pool2 = wordsOfLength(tier, 3, maxLen);
    const word = rng.pick(pool2);
    const values = word.split("").map(letterIndex);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const codeText = values.join(" ");
      const wrong = [
        values.map((v) => v + 1).join(" "),
        values.map((v) => v - 1).join(" "),
        [...values].reverse().join(" ")
      ].filter((w) => w !== codeText);
      return mc(rng, `If A = 1 and B = 2, what is the code for ${upper(word)}?`, codeText, wrong, {
        speak: `If A is 1 and B is 2, what is the code for ${word}?`,
        explanation: `${word.split("").map((c, i) => `${c.toUpperCase()}=${values[i]}`).join(", ")}.`
      });
    }
    if (variant === 2) {
      const others = rng.sample(pool2.filter((w) => w !== word && w.length === word.length), 3).filter((w) => w !== word);
      return mc(rng, `If A = 1 and B = 2, which word is written ${values.join(" ")}?`, word, others, {
        speak: `If A is 1 and B is 2, which word is coded ${values.join(", ")}?`,
        explanation: `${values.join(", ")} spells ${upper(word)}.`
      });
    }
    const total = values.reduce((a, b) => a + b, 0);
    return entry(`If A = 1 and B = 2, what do the letters of ${upper(word)} add up to?`, total, {
      maxDigits: 3,
      speak: `If A is 1 and B is 2, what do the letters of ${word} add up to?`,
      explanation: `${values.join(" + ")} = ${total}.`
    });
  }
};
var lettersStrand = {
  id: "ng.vr.letters",
  name: "Letter City",
  blurb: "The alphabet, sequences and secret codes",
  theme: "city",
  skills: [
    alphabet,
    vowels,
    alphaOrder,
    position,
    sequences,
    codes,
    alphaOrderHard,
    numberCodes,
    codesHard
  ]
};

// src/content/ng-ube/verbal/links.ts
function foreignEnds(rng, group, tier, avoid, n2) {
  const others = bandOf(ANALOGIES, tier).filter((g) => g.relation !== group.relation);
  const out = [];
  let guard = 0;
  while (out.length < n2 && guard++ < 40) {
    if (!others.length) break;
    const g = rng.pick(others);
    const pair = rng.pick(g.pairs);
    const word = rng.chance(0.5) ? pair[1] : pair[0];
    if (avoid.includes(word) || out.includes(word)) continue;
    out.push(word);
  }
  return out;
}
function analogyItem(rng, group, tier) {
  const [p1, p2] = rng.sample(group.pairs, 2);
  const backwards = rng.chance(0.35);
  const [a1, b1] = backwards ? [p1[1], p1[0]] : p1;
  const [a2, b2] = backwards ? [p2[1], p2[0]] : p2;
  const sameRelation = backwards ? p1[0] : p1[1];
  const near = sameRelation === b2 ? [] : [sameRelation];
  const wrong = [...near, ...foreignEnds(rng, group, tier, [b2, a2, a1, b1, ...near], 3)].slice(0, 3);
  return mc(rng, `${capitalise(a1)} is to ${b1} as ${a2} is to ___`, b2, wrong, {
    speak: `${a1} is to ${b1} as ${a2} is to what?`,
    // Always described in the pair's natural direction, whichever way round
    // the question was asked.
    explanation: `${capitalise(p1[1])} is ${group.relation} ${p1[0]}, and ${p2[1]} is ${group.relation} ${p2[0]}.`
  });
}
var analogies = {
  id: "ng.vr.links.analogies",
  title: "Word pairs",
  yearBand: "b3",
  concepts: ["analogies-basic"],
  hint: "Work out how the first two words are joined, then do the same to the third.",
  helpAtHome: 'Play it out loud: "cow is to calf as dog is to\u2026?"',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const group = pickTier(rng, ANALOGIES, tier);
    return analogyItem(rng, group, tier);
  }
};
var analogiesHard = {
  id: "ng.vr.links.analogies-hard",
  title: "Word pairs \u2014 harder",
  yearBand: "b5",
  prerequisites: ["ng.vr.links.analogies"],
  concepts: ["analogies-advanced"],
  hint: 'Say the link out loud in words: "a calf is the young of a cow".',
  helpAtHome: "Ask them to explain the link, not just the answer \u2014 that is the real skill.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const group = pickTier(rng, ANALOGIES, tier);
    if (rng.chance(0.4)) {
      const [p1, p2] = rng.sample(group.pairs, 2);
      const others = bandOf(ANALOGIES, tier).filter((g) => g.relation !== group.relation);
      const fakes = [];
      let guard = 0;
      while (fakes.length < 3 && guard++ < 30) {
        if (!others.length) break;
        const g = rng.pick(others);
        const pair = rng.pick(g.pairs);
        const label = `${pair[0]} : ${pair[1]}`;
        if (fakes.includes(label)) continue;
        fakes.push(label);
      }
      return mc(rng, `Which pair goes together in the SAME way as
${p1[0]} : ${p1[1]}`, `${p2[0]} : ${p2[1]}`, fakes, {
        speak: `Which pair goes together in the same way as ${p1[0]} and ${p1[1]}?`,
        explanation: `${capitalise(p1[1])} is ${group.relation} ${p1[0]}, and ${p2[1]} is ${group.relation} ${p2[0]}.`
      });
    }
    return analogyItem(rng, group, tier);
  }
};
var homophones = {
  id: "ng.vr.links.homophones",
  title: "Sound the same, spelled differently",
  yearBand: "b3",
  concepts: ["homophones"],
  hint: "Read the whole sentence first. Which spelling makes sense there?",
  helpAtHome: 'Say a word like "pair" and ask for the other spelling and what it means.',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const set = pickTier(rng, HOMOPHONES, tier);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const clue = rng.pick(set.clues);
      const wrong = set.words.filter((w) => w !== clue.word);
      return mc(rng, `Which word completes the sentence?
${clue.sentence}`, clue.word, wrong, {
        speak: `Which word completes this sentence? ${clue.sentence.replace("___", "blank")}`,
        explanation: `"${clue.word}" is the spelling that fits: ${clue.sentence.replace("___", clue.word)}`
      });
    }
    if (variant === 2) {
      const [cue2, answer] = rng.sample(set.words, 2);
      const others2 = bandOf(HOMOPHONES, tier).filter((s) => s.words[0] !== set.words[0]);
      const wrong = [];
      let guard = 0;
      while (wrong.length < 3 && guard++ < 30) {
        const w = rng.pick(rng.pick(others2).words);
        if (set.words.includes(w) || wrong.includes(w)) continue;
        wrong.push(w);
      }
      return mc(rng, `Which word sounds exactly the same as "${cue2}"?`, answer, wrong, {
        explanation: `"${cue2}" and "${answer}" sound the same but mean different things.`
      });
    }
    const truth = rng.chance(0.5);
    const [cue, partner] = rng.sample(set.words, 2);
    const others = bandOf(HOMOPHONES, tier).filter((s) => s.words[0] !== set.words[0]);
    const stranger = others.length ? rng.pick(rng.pick(others).words) : "market";
    const shown = truth ? partner : stranger;
    const actually = set.words.includes(shown) && shown !== cue;
    return tf(`"${cue}" and "${shown}" sound exactly the same.`, actually, {
      trueLabel: "Yes",
      falseLabel: "No",
      explanation: actually ? `Yes \u2014 they sound the same but are spelled differently.` : `No \u2014 "${cue}" sounds like "${set.words.find((w) => w !== cue)}", not "${shown}".`
    });
  }
};
var homonyms = {
  id: "ng.vr.links.homonyms",
  title: "One word, two meanings",
  yearBand: "b5",
  prerequisites: ["ng.vr.links.homophones"],
  concepts: ["homonyms"],
  hint: "The same word can do two jobs. Think of the word in two different sentences.",
  helpAtHome: 'Say "bat" and see how many different meanings you can find between you.',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, HOMONYMS, tier);
    const flip = rng.chance(0.5);
    const [first, second] = flip ? [entry2.meanings[1], entry2.meanings[0]] : entry2.meanings;
    if (rng.chance(0.5)) {
      const wrong2 = rng.sample(bandOf(HOMONYMS, tier), 4).filter((h) => h.word !== entry2.word).slice(0, 3).map((h) => h.word);
      return mc(rng, `Which word can mean BOTH
"${first}" and "${second}"?`, entry2.word, wrong2, {
        speak: `Which word can mean both ${first}, and ${second}?`,
        explanation: `"${entry2.word}" has both meanings.`
      });
    }
    const wrong = rng.sample(bandOf(HOMONYMS, tier), 4).filter((h) => h.word !== entry2.word).slice(0, 3).map((h) => rng.pick(h.meanings));
    return mc(rng, `"${entry2.word}" can mean "${first}".
What else can it mean?`, second, wrong, {
      speak: `The word ${entry2.word} can mean ${first}. What else can it mean?`,
      explanation: `"${entry2.word}" also means ${second}.`
    });
  }
};
var sentenceComplete = {
  id: "ng.vr.links.sentence-complete",
  title: "Finish the sentence",
  yearBand: "b2",
  concepts: ["sentence-completion-basic"],
  hint: "Read the whole sentence with each word in the gap and listen for the one that fits.",
  helpAtHome: "Leave a word out when you read together and let them supply it.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const gap = pickTier(rng, SENTENCES, tier);
    if (rng.chance(0.3)) {
      const truth = rng.chance(0.5);
      const shown = truth ? gap.answer : rng.pick(gap.wrong);
      return tf(`Does "${shown}" complete this sentence correctly?
${gap.text}`, truth, {
        trueLabel: "Yes",
        falseLabel: "No",
        explanation: gap.text.replace("___", gap.answer.toUpperCase())
      });
    }
    return mc(rng, `Which word completes the sentence?
${gap.text}`, gap.answer, gap.wrong, {
      speak: `Which word completes this sentence? ${gap.text.replace("___", "blank")}`,
      explanation: gap.text.replace("___", gap.answer.toUpperCase())
    });
  }
};
var sentenceCompleteHard = {
  id: "ng.vr.links.sentence-complete-hard",
  title: "Finish the sentence \u2014 harder",
  yearBand: "b5",
  prerequisites: ["ng.vr.links.sentence-complete"],
  concepts: ["sentence-completion-advanced"],
  hint: "Two choices may nearly fit. Pick the one that matches the whole meaning.",
  helpAtHome: "Read a newspaper sentence aloud, leaving out one strong word, and discuss the options.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const gap = pickTier(rng, SENTENCES, tier);
    if (rng.chance(0.3)) {
      const truth = rng.chance(0.5);
      const shown = truth ? gap.answer : rng.pick(gap.wrong);
      return tf(`Does "${shown}" complete this sentence correctly?
${gap.text}`, truth, {
        trueLabel: "Yes",
        falseLabel: "No",
        explanation: gap.text.replace("___", gap.answer.toUpperCase())
      });
    }
    return mc(rng, `Which word completes the sentence?
${gap.text}`, gap.answer, gap.wrong, {
      speak: `Which word completes this sentence? ${gap.text.replace("___", "blank")}`,
      explanation: gap.text.replace("___", gap.answer.toUpperCase())
    });
  }
};
var sameKind = (list, kind) => list.filter((d) => d.kind === kind);
var definitions = {
  id: "ng.vr.links.definitions",
  title: "What the word means",
  yearBand: "b6",
  prerequisites: ["ng.vr.links.sentence-complete"],
  concepts: ["definitions"],
  hint: 'Break the word up. "Pedestrian" shares its start with "pedal" \u2014 both are about feet.',
  helpAtHome: "Keep a dictionary near the table and look up one new word each evening.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, DEFINITIONS, tier);
    const family = sameKind(bandOf(DEFINITIONS, tier), entry2.kind);
    const others = rng.sample(family.filter((d) => d.word !== entry2.word), 3);
    if (others.length < 2) {
      const anyOthers = rng.sample(DEFINITIONS.filter((d) => d.word !== entry2.word), 3);
      return mc(rng, `Which word means "${entry2.meaning}"?`, entry2.word, anyOthers.map((d) => d.word), {
        explanation: `A ${entry2.word} is ${entry2.meaning}.`
      });
    }
    if (rng.chance(0.5)) {
      return mc(rng, `Which word means "${entry2.meaning}"?`, entry2.word, others.map((d) => d.word), {
        speak: `Which word means ${entry2.meaning}?`,
        explanation: `"${entry2.word}" means ${entry2.meaning}.`
      });
    }
    return mc(rng, `What does "${entry2.word}" mean?`, entry2.meaning, others.map((d) => d.meaning), {
      speak: `What does the word ${entry2.word} mean?`,
      explanation: `"${entry2.word}" means ${entry2.meaning}.`
    });
  }
};
var linksStrand = {
  id: "ng.vr.links",
  name: "Link Bay",
  blurb: "Word pairs, sound-alikes and finishing sentences",
  theme: "bay",
  skills: [
    sentenceComplete,
    analogies,
    homophones,
    homonyms,
    analogiesHard,
    sentenceCompleteHard,
    definitions
  ]
};

// src/content/ng-ube/verbal/meaning.ts
function foreignCategory(rng, target, tier) {
  const safe = bandOf(CATEGORIES, tier).filter((c) => !categoriesClash(target, c));
  return rng.pick(safe.length ? safe : CATEGORIES.filter((c) => !categoriesClash(target, c)));
}
function outsiders(rng, target, tier, n2) {
  const out = [];
  let guard = 0;
  while (out.length < n2 && guard++ < 40) {
    const other = foreignCategory(rng, target, tier);
    const word = rng.pick(other.members);
    if (target.members.includes(word) || out.includes(word)) continue;
    out.push(word);
  }
  return out;
}
var oppositesEasy = {
  id: "ng.vr.meaning.opposites-easy",
  title: "Opposites",
  yearBand: "b1",
  concepts: ["antonyms-basic"],
  hint: "An opposite is the word that means the other way round \u2014 hot and cold.",
  helpAtHome: 'Play "say the opposite" while walking: you say big, she says small.',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, ANTONYMS, tier);
    const answer = rng.pick(entry2.opposite);
    if (difficulty >= 3 && rng.chance(0.3)) {
      const useSame = rng.chance(0.5);
      if (useSame) {
        const syn = pickTier(rng, SYNONYMS, tier);
        const other = rng.pick(syn.same);
        return tf(`Are "${syn.word}" and "${other}" opposites?`, false, {
          trueLabel: "Yes",
          falseLabel: "No",
          explanation: `No \u2014 "${syn.word}" and "${other}" mean the same thing.`
        });
      }
      return tf(`Are "${entry2.word}" and "${answer}" opposites?`, true, {
        trueLabel: "Yes",
        falseLabel: "No",
        explanation: `Yes \u2014 "${entry2.word}" is the opposite of "${answer}".`
      });
    }
    return mc(rng, `Which word is the OPPOSITE of "${entry2.word}"?`, answer, rng.sample(entry2.wrong, 3), {
      speak: `Which word means the opposite of ${entry2.word}?`,
      explanation: `The opposite of "${entry2.word}" is "${answer}".`
    });
  }
};
var antonyms = {
  id: "ng.vr.meaning.antonyms",
  title: "Trickier opposites",
  yearBand: "b4",
  prerequisites: ["ng.vr.meaning.opposites-easy"],
  concepts: ["antonyms-advanced"],
  hint: "Careful \u2014 one of the choices usually means the SAME, not the opposite.",
  helpAtHome: 'When a new word comes up in reading, ask "what is the opposite of that?"',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const entry2 = pickTier(rng, ANTONYMS, tier);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const answer = rng.pick(entry2.opposite);
      return mc(rng, `Which word is the OPPOSITE of "${entry2.word}"?`, answer, rng.sample(entry2.wrong, 3), {
        speak: `Which word means the opposite of ${entry2.word}?`,
        explanation: `"${entry2.word}" and "${answer}" are opposites. The others are close in meaning to "${entry2.word}".`
      });
    }
    if (variant === 2) {
      const answer = rng.pick(entry2.opposite);
      const syns = rng.sample(bandOf(SYNONYMS, tier), 3);
      return mc(
        rng,
        "Which pair of words are OPPOSITES?",
        `${entry2.word} \u2014 ${answer}`,
        syns.map((s) => `${s.word} \u2014 ${s.same[0]}`),
        { explanation: `"${entry2.word}" and "${answer}" are opposites. The other pairs mean the same as each other.` }
      );
    }
    const trap = rng.pick(entry2.wrong);
    return tf(`"${entry2.word}" and "${trap}" are opposites.`, false, {
      explanation: `Not quite. The opposite of "${entry2.word}" is "${entry2.opposite[0]}".`
    });
  }
};
var sameMeaning = {
  id: "ng.vr.meaning.same-meaning",
  title: "Words that mean the same",
  yearBand: "b2",
  concepts: ["synonyms-basic"],
  hint: "Try each word in a sentence and see which one you could swap in.",
  helpAtHome: 'Ask for another word that would fit: "big" \u2014 "large", "huge".',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const entry2 = pickTier(rng, SYNONYMS, tier);
    const flip = rng.chance(0.35);
    const cue = flip ? rng.pick(entry2.same) : entry2.word;
    const answer = flip ? entry2.word : rng.pick(entry2.same);
    return mc(rng, `Which word means the SAME as "${cue}"?`, answer, rng.sample(entry2.wrong, 3), {
      speak: `Which word means the same as ${cue}?`,
      explanation: `"${cue}" and "${answer}" mean the same thing.`
    });
  }
};
var synonyms = {
  id: "ng.vr.meaning.synonyms",
  title: "Choosing the best word",
  yearBand: "b4",
  prerequisites: ["ng.vr.meaning.same-meaning"],
  concepts: ["synonyms-advanced"],
  hint: "One choice means the same, one means the opposite. Read them all before you tap.",
  helpAtHome: 'Swap a plain word in something they wrote for a stronger one \u2014 "big" becomes "enormous".',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const entry2 = pickTier(rng, SYNONYMS, tier);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const flip = rng.chance(0.35);
      const cue = flip ? rng.pick(entry2.same) : entry2.word;
      const answer = flip ? entry2.word : rng.pick(entry2.same);
      return mc(rng, `Which word means the SAME as "${cue}"?`, answer, rng.sample(entry2.wrong, 3), {
        speak: `Which word means the same as ${cue}?`,
        explanation: `"${cue}" and "${answer}" mean the same thing.`
      });
    }
    if (variant === 2) {
      const opps2 = rng.sample(bandOf(ANTONYMS, tier), 3);
      return mc(
        rng,
        "Which pair of words mean the SAME?",
        `${entry2.word} \u2014 ${entry2.same[0]}`,
        opps2.map((o) => `${o.word} \u2014 ${o.opposite[0]}`),
        { explanation: `"${entry2.word}" and "${entry2.same[0]}" mean the same. The other pairs are opposites.` }
      );
    }
    const twins = bandOf(SYNONYMS, tier).filter((s) => s.same.length >= 2);
    const group = twins.length ? rng.pick(twins) : entry2;
    if (group.same.length < 2) {
      const answer = rng.pick(group.same);
      return mc(rng, `Which word means the SAME as "${group.word}"?`, answer, rng.sample(group.wrong, 3), {
        explanation: `"${group.word}" and "${answer}" mean the same thing.`
      });
    }
    const odd = rng.pick(group.wrong);
    return mc(rng, "Which word does NOT belong with the others?", odd, [group.word, group.same[0], group.same[1]], {
      explanation: `"${group.word}", "${group.same[0]}" and "${group.same[1]}" all mean the same. "${odd}" does not.`
    });
  }
};
var oddOneOut = {
  id: "ng.vr.meaning.odd-one-out",
  title: "Odd one out",
  yearBand: "b2",
  concepts: ["classification-basic"],
  hint: "Ask yourself what three of them have in common.",
  helpAtHome: "Name three things from one group and one from another, and ask which is the stranger.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(1, difficulty);
    const target = pickTier(rng, CATEGORIES, tier);
    const shown = rng.sample(target.members, 3);
    const [odd] = outsiders(rng, target, tier, 1);
    const stray = odd ?? "stone";
    return mc(rng, "Which word does NOT belong with the others?", stray, shown, {
      explanation: `${shown.join(", ")} are all ${target.name.toLowerCase()}. "${stray}" is not.`
    });
  }
};
var oddOneOutHard = {
  id: "ng.vr.meaning.odd-one-out-hard",
  title: "Odd one out \u2014 harder",
  yearBand: "b5",
  prerequisites: ["ng.vr.meaning.odd-one-out", "ng.vr.meaning.same-meaning"],
  concepts: ["classification-advanced"],
  hint: "The link may be what the words MEAN, not what kind of thing they are.",
  helpAtHome: "Try it with meanings: brave, bold, fearless, afraid \u2014 which is the odd one?",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const useMeaning = difficulty >= 3 ? rng.chance(0.55) : rng.chance(0.3);
    if (useMeaning) {
      const twins = bandOf(SYNONYMS, tier).filter((s) => s.same.length >= 2);
      if (twins.length) {
        const group = rng.pick(twins);
        const odd2 = rng.pick(group.wrong);
        return mc(rng, "Which word does NOT belong with the others?", odd2, [group.word, group.same[0], group.same[1]], {
          explanation: `"${group.word}", "${group.same[0]}" and "${group.same[1]}" all mean about the same. "${odd2}" does not.`
        });
      }
    }
    const target = pickTier(rng, CATEGORIES, tier);
    const shown = rng.sample(target.members, 3);
    const [odd] = outsiders(rng, target, tier, 1);
    const stray = odd ?? "honesty";
    return mc(rng, "Which word does NOT belong with the others?", stray, shown, {
      explanation: `${shown.join(", ")} are all ${target.name.toLowerCase()}. "${stray}" is not.`
    });
  }
};
var wordGroups = {
  id: "ng.vr.meaning.word-groups",
  title: "Sorting words into groups",
  yearBand: "b3",
  prerequisites: ["ng.vr.meaning.odd-one-out"],
  concepts: ["classification-groups"],
  hint: 'Say the word and then ask "what kind of thing is that?"',
  helpAtHome: "While shopping, ask which shelf a thing belongs on \u2014 fruit, drinks, cleaning.",
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(2, difficulty);
    const target = pickTier(rng, CATEGORIES, tier);
    const variant = rng.int(1, 3);
    if (variant === 1) {
      const word = rng.pick(target.members);
      const others = [];
      let guard = 0;
      while (others.length < 3 && guard++ < 30) {
        const c = foreignCategory(rng, target, tier);
        if (c.members.includes(word) || others.includes(c.name)) continue;
        others.push(c.name);
      }
      return mc(rng, `Which group does "${word}" belong to?`, target.name, others, {
        explanation: `"${word}" is one of the ${target.name.toLowerCase()}.`
      });
    }
    if (variant === 2) {
      const word = rng.pick(target.members);
      const wrong2 = outsiders(rng, target, tier, 3);
      return mc(rng, `Which word belongs with ${target.name.toLowerCase()}?`, word, wrong2, {
        explanation: `"${word}" is one of the ${target.name.toLowerCase()}.`
      });
    }
    const right = rng.sample(target.members, 3);
    const wrong = outsiders(rng, target, tier, 3);
    const options = [
      ...right.map((v) => ({ value: v, correct: true })),
      ...wrong.map((v) => ({ value: v, correct: false }))
    ];
    return tapMany(rng, `Tap all the ${target.name.toLowerCase()}`, options, {
      explanation: `${right.join(", ")} are ${target.name.toLowerCase()}.`
    });
  }
};
var generalWord = {
  id: "ng.vr.meaning.general-word",
  title: "The word that covers them all",
  yearBand: "b6",
  prerequisites: ["ng.vr.meaning.word-groups"],
  concepts: ["classification-general-term"],
  hint: "Three of them are examples. One is the name for the whole group.",
  helpAtHome: 'Ask for the umbrella word: "hammer, saw, spanner \u2014 what are they all?"',
  generate: ({ rng, difficulty }) => {
    const tier = tierFor(3, difficulty);
    const target = pickTier(rng, CATEGORIES, tier);
    const variant = rng.int(1, 2);
    const shown = rng.sample(target.members, 3);
    if (variant === 1) {
      const others = [];
      let guard = 0;
      while (others.length < 3 && guard++ < 30) {
        const c = foreignCategory(rng, target, tier);
        if (c.general === target.general || others.includes(c.general)) continue;
        others.push(c.general);
      }
      return mc(
        rng,
        `${capitalise(shown[0])}, ${shown[1]} and ${shown[2]} are all examples of what?`,
        target.general,
        others,
        { explanation: `${shown.join(", ")} are all ${target.name.toLowerCase()}.` }
      );
    }
    return mc(rng, "Which word includes all the others?", target.general, shown, {
      explanation: `${shown.join(", ")} are all ${target.name.toLowerCase()}.`
    });
  }
};
var meaningStrand = {
  id: "ng.vr.meaning",
  name: "Meaning Grove",
  blurb: "Same, opposite, and which word does not belong",
  theme: "grove",
  skills: [
    oppositesEasy,
    sameMeaning,
    oddOneOut,
    wordGroups,
    synonyms,
    antonyms,
    oddOneOutHard,
    generalWord
  ]
};

// src/content/ng-ube/verbal/index.ts
var verbalSubject = {
  id: "verbal",
  name: "Verbal Reasoning",
  icon: "\u{1F524}",
  color: "amber",
  available: true,
  plannedTopics: [
    "Synonyms & antonyms",
    "Odd one out",
    "Word analogies",
    "Alphabetical order",
    "Coded words",
    "Jumbled words",
    "Homonyms & homophones",
    "Letter sequences"
  ],
  strands: [meaningStrand, gamesStrand, lettersStrand, linksStrand]
};

// src/content/ng-ube/locale.ts
var ngLocale = {
  tag: "en-NG",
  currency: {
    symbol: "\u20A6",
    code: "NGN",
    subunit: { name: "kobo", plural: "kobo", per: 100 },
    notes: [5, 10, 20, 50, 100, 200, 500, 1e3],
    coins: [50, 100, 200]
  },
  /*
   * These pools are the cheapest lever on question variety in the whole
   * project. Every word problem draws a name, an object and often a place, so
   * the number of distinct-feeling questions scales with their product:
   * 48 names × 34 objects × 14 shops is over 22,000 dressings of the *same*
   * sum. Adding a name here is worth more than adding a generator.
   *
   * Names span the major Nigerian naming traditions deliberately — a child
   * should meet names from beyond their own household.
   */
  names: [
    "Ada",
    "Chidi",
    "Tunde",
    "Amaka",
    "Bisi",
    "Emeka",
    "Ngozi",
    "Segun",
    "Halima",
    "Musa",
    "Funke",
    "Obi",
    "Zainab",
    "Kunle",
    "Ifeoma",
    "Yusuf",
    "Temi",
    "Chioma",
    "Bola",
    "Aisha",
    "Nneka",
    "Femi",
    "Sadiq",
    "Uche",
    "Damilola",
    "Ibrahim",
    "Chinwe",
    "Seyi",
    "Fatima",
    "Okon",
    "Ronke",
    "Abubakar",
    "Ezinne",
    "Tobi",
    "Maryam",
    "Kelechi",
    "Sola",
    "Hauwa",
    "Ifeanyi",
    "Bunmi",
    "Nkechi",
    "Danladi",
    "Simi",
    "Chuka",
    "Amina",
    "Gbenga",
    "Ebere",
    "Idris"
  ],
  objects: [
    { one: "mango", many: "mangoes", glyph: "\u{1F96D}" },
    { one: "orange", many: "oranges", glyph: "\u{1F34A}" },
    { one: "banana", many: "bananas", glyph: "\u{1F34C}" },
    { one: "pencil", many: "pencils", glyph: "\u270F\uFE0F" },
    { one: "textbook", many: "textbooks", glyph: "\u{1F4D5}" },
    { one: "biro", many: "biros", glyph: "\u{1F58A}\uFE0F" },
    { one: "egg", many: "eggs", glyph: "\u{1F95A}" },
    { one: "ball", many: "balls", glyph: "\u26BD" },
    { one: "sweet", many: "sweets", glyph: "\u{1F36C}" },
    { one: "chicken", many: "chickens", glyph: "\u{1F414}" },
    { one: "fish", many: "fishes", glyph: "\u{1F41F}" },
    { one: "flower", many: "flowers", glyph: "\u{1F338}" },
    { one: "star", many: "stars", glyph: "\u2B50" },
    { one: "cup", many: "cups", glyph: "\u{1F964}" },
    { one: "plantain", many: "plantains", glyph: "\u{1F34C}" },
    { one: "pawpaw", many: "pawpaws", glyph: "\u{1F348}" },
    { one: "guava", many: "guavas", glyph: "\u{1F350}" },
    { one: "coconut", many: "coconuts", glyph: "\u{1F965}" },
    { one: "groundnut", many: "groundnuts", glyph: "\u{1F95C}" },
    { one: "yam", many: "yams", glyph: "\u{1F360}" },
    { one: "maize cob", many: "maize cobs", glyph: "\u{1F33D}" },
    { one: "tomato", many: "tomatoes", glyph: "\u{1F345}" },
    { one: "loaf", many: "loaves", glyph: "\u{1F35E}" },
    { one: "biscuit", many: "biscuits", glyph: "\u{1F36A}" },
    { one: "crayon", many: "crayons", glyph: "\u{1F58D}\uFE0F" },
    { one: "ruler", many: "rulers", glyph: "\u{1F4CF}" },
    { one: "exercise book", many: "exercise books", glyph: "\u{1F4D3}" },
    { one: "school bag", many: "school bags", glyph: "\u{1F392}" },
    { one: "balloon", many: "balloons", glyph: "\u{1F388}" },
    { one: "marble", many: "marbles", glyph: "\u{1F535}" },
    { one: "seed", many: "seeds", glyph: "\u{1F331}" },
    { one: "goat", many: "goats", glyph: "\u{1F410}" },
    { one: "butterfly", many: "butterflies", glyph: "\u{1F98B}" },
    { one: "bottle", many: "bottles", glyph: "\u{1F37E}" }
  ],
  places: [
    "Lagos",
    "Abuja",
    "Ibadan",
    "Kano",
    "Enugu",
    "Jos",
    "Benin",
    "Calabar",
    "Kaduna",
    "Owerri",
    "Port Harcourt",
    "Abeokuta",
    "Ilorin",
    "Onitsha",
    "Maiduguri",
    "Uyo",
    "Sokoto",
    "Warri",
    "Akure",
    "Aba"
  ],
  shops: [
    "the market",
    "the school shop",
    "the provision store",
    "the bookshop",
    "the fruit stall",
    "the bakery",
    "the corner kiosk",
    "the pharmacy",
    "the fabric stall",
    "the vegetable stall",
    "the sweet shop",
    "the stationery shop",
    "the poultry farm",
    "the fish market"
  ],
  units: {
    length: ["cm", "m"],
    mass: ["g", "kg"],
    capacity: ["ml", "litres"]
  }
};

// src/engine/rng.ts
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (min, max) => {
      if (max < min) [min, max] = [max, min];
      return Math.floor(next() * (max - min + 1)) + min;
    },
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error("rng.pick called with an empty list");
      return items[Math.floor(next() * items.length)];
    },
    sample: (items, n2) => rng.shuffle(items).slice(0, Math.max(0, Math.min(n2, items.length))),
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    step: (min, max, step) => {
      const lo = Math.ceil(min / step);
      const hi = Math.floor(max / step);
      return rng.int(lo, hi) * step;
    }
  };
  return rng;
}

// src/engine/answer.ts
var labelOf = (choices, id) => choices.find((c) => c.id === id)?.label ?? id;
function describeAnswer(item) {
  switch (item.type) {
    case "multiple-choice":
      return labelOf(item.choices, item.answerId);
    case "numeric-entry":
      return `${item.prefix ?? ""}${item.answer}${item.suffix ?? ""}`;
    case "true-false":
      return item.answer ? item.trueLabel ?? "True" : item.falseLabel ?? "False";
    case "number-line":
      return String(item.answer);
    case "count-objects":
      return String(item.count);
    case "order":
      return item.correctOrder.map((id) => labelOf(item.tokens, id)).join(", ");
    case "tap-many":
      return item.correctIds.map((id) => labelOf(item.options, id)).join(", ");
    case "match":
      return Object.entries(item.pairs).map(([l, r]) => `${labelOf(item.left, l)}\u2192${labelOf(item.right, r)}`).join(", ");
  }
}

// .kolo-tmp/peek.ts
var n = 0;
for (const strand of verbalSubject.strands) {
  console.log(`
=== ${strand.name} (${strand.id}) ===`);
  for (const skill of strand.skills) {
    console.log(`
-- ${skill.id} [${skill.yearBand}] ${skill.title}`);
    for (const d of [1, 3, 5]) {
      for (let s = 0; s < 3; s++) {
        const item = skill.generate({ rng: makeRng(++n * 7919 + d * 13), difficulty: d, locale: ngLocale });
        console.log(`  d${d} | ${item.prompt.replace(/\n/g, " / ")}`);
        console.log(`       => ${describeAnswer(item)}${item.type === "multiple-choice" ? "   [" + item.choices.map((c) => c.label).join(" | ") + "]" : ""}`);
        if (item.explanation) console.log(`       ~ ${item.explanation}`);
      }
    }
  }
}
