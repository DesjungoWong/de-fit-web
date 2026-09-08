// "Level Up: First Semester" — a consent-first visual novel.
// The in-story "System" only ever rewards honesty, effort, and respect.
// It explicitly refuses to reward or permit anything non-consensual.

export const START_STATS = { trust: 0, confidence: 0, affection: 0 }

function eff(delta) {
  return delta
}

export const scenes = {
  n1_move: {
    bg: 'title', speaker: null, portrait: null,
    text: [
      "You just moved to Alder Hill for your first semester of college — new city, new dorm, nobody who's known you longer than a week.",
      "You tell yourself that's a fresh start. It mostly just feels like standing at the edge of a pool that's colder than it looks.",
    ],
    next: 'n2_system_boot',
  },
  n2_system_boot: {
    bg: 'title', speaker: 'system', portrait: null,
    text: [
      "[SYSTEM ONLINE] Welcome. I'm going to be tracking three things about you this semester: Confidence, Trust, and Affection.",
      "Confidence is about you. Trust and Affection are about other people — and I only move those numbers up when you've actually earned it. Honesty, effort, showing up. That's the whole mechanic.",
      "I want to be very clear about one rule before we start: I do not have a setting for 'take something without asking.' If you ever try to force a moment, I will tell you flatly that it isn't a moment, it's a mistake. Are we good?",
    ],
    next: 'n3_campus_arrival',
  },
  n3_campus_arrival: {
    bg: 'campus', speaker: null, portrait: null,
    text: [
      "Orientation week. The quad is full of upperclassmen power-walking between tents, and you're clutching a campus map you don't actually need.",
      "Near the big oak tree, someone's sitting cross-legged on a jacket, sketchbook balanced on one knee, utterly unbothered by the chaos around her.",
    ],
    next: 'n4_meet_wren',
  },
  n4_meet_wren: {
    bg: 'campus', speaker: 'wren', portrait: 'surprised',
    text: [
      "You're not looking where you're walking, and your shoulder clips a guy wire holding up a tent sign. It swings — right toward her sketchbook.",
      "You lunge and catch the sign before it takes out her drawing. Barely.",
      "\"...Okay,\" she says, looking up at you like you're a raccoon that just did long division. \"That was either really smooth or a complete accident.\"",
    ],
    choices: [
      { label: '"Complete accident. I own that."', next: 'n5_names', effects: { confidence: 1, trust: 2 } },
      { label: '"Let\'s just say I meant it."', next: 'n5_names', effects: { confidence: 1, trust: 0 } },
    ],
  },
  n5_names: {
    bg: 'campus', speaker: 'wren', portrait: 'smile',
    text: [
      "She laughs — a short, real laugh, not a polite one. \"I'm Wren. Third year, architecture, and apparently in need of a bodyguard for my sketchbook.\"",
      "\"It's got two years of studio work in it. So, thanks, actually.\"",
    ],
    next: 'n7_quest_ping',
  },
  n7_quest_ping: {
    bg: 'campus', speaker: 'system', portrait: null,
    text: [
      "[QUEST LOGGED] Cross paths again. Reward: nothing, technically — I just think you should.",
      "Confidence +1 for not freezing up.",
    ],
    next: 'n8_cafe_visit',
  },
  n8_cafe_visit: {
    bg: 'cafe', speaker: null, portrait: null,
    text: [
      "Four days later, you duck into The Grind between classes, mostly for the wifi. Wren's behind the counter in an apron, hair pulled back, looking like she'd rather be sketching.",
      "\"Oh — sign-guy,\" she says. \"Small world, or small campus. Probably the second one.\"",
    ],
    choices: [
      { label: 'Make easy small talk about the campus', next: 'n9_cafe_smalltalk', effects: { trust: 1 } },
      { label: 'Ask what she\'s been sketching lately', next: 'n9_cafe_sketch', effects: { trust: 2, affection: 1 } },
    ],
  },
  n9_cafe_smalltalk: {
    bg: 'cafe', speaker: 'wren', portrait: 'neutral',
    text: [
      "\"It's fine. Small. Everyone already knows everyone's business by week two,\" she says, sliding your coffee across. Pleasant enough — but she's already looking past you at the next customer.",
    ],
    next: 'n10_cafe_end',
  },
  n9_cafe_sketch: {
    bg: 'cafe', speaker: 'wren', portrait: 'soft',
    text: [
      "She pauses, surprised you asked. \"Mostly buildings nobody else looks twice at. Fire escapes. The parking garage stairwell, don't ask.\"",
      "\"Most people's eyes glaze over the second I say 'architecture.' You get one point for not doing that.\"",
    ],
    next: 'n10_cafe_end',
    effects: { affection: 1 },
  },
  n10_cafe_end: {
    bg: 'cafe', speaker: 'wren', portrait: 'smile',
    text: [
      "\"Anyway. Club fair's this weekend if you're into that kind of forced fun,\" she says. \"I table for the design collective. Come heckle me.\"",
    ],
    next: 'n11_club_fair',
  },
  n11_club_fair: {
    bg: 'campus', speaker: null, portrait: null,
    text: [
      "The club fair is a wall of noise and free pens. You find Wren's table easily — it's the one with actual good drawings pinned to the board instead of a stock photo banner.",
    ],
    choices: [
      { label: 'Sign up for the design collective', next: 'n12_hangout', effects: { affection: 2, trust: 1 }, flag: 'joinedArt' },
      { label: 'Admit design isn\'t your thing, but ask to hang out anyway', next: 'n12_hangout', effects: { trust: 2 } },
    ],
  },
  n12_hangout: {
    bg: 'library', speaker: 'wren', portrait: 'neutral',
    text: [
      "A week in, you end up sharing a table at the library, her sketchbook and your unopened textbook between you.",
      "\"My parents keep asking when I'm switching to something 'practical,'\" she says, out of nowhere, still drawing. \"Like architecture isn't a real job. It's just not a real job with a name they've heard of.\"",
    ],
    choices: [
      { label: 'Just listen — ask what she actually wants', next: 'n13_rain', effects: { trust: 3, affection: 1 } },
      { label: 'Jump in with advice on how to convince them', next: 'n13_rain', effects: { trust: -1 } },
    ],
  },
  n13_rain: {
    bg: 'rain', speaker: null, portrait: null,
    text: [
      "You're both caught in a sudden downpour walking back from the library, no umbrella between you. You end up jammed under the awning of a closed bookstore, soaked to the knees.",
      "Wren's laughing despite herself, wringing out her sleeve. \"This is the most collegiate thing that's happened to me all year.\"",
    ],
    choices: [
      { label: 'Let the silence sit — just watch the rain with her', next: 'n14_confide', effects: { trust: 2, affection: 2 } },
      { label: 'Crack a joke to fill the quiet', next: 'n14_confide', effects: { affection: 1 } },
    ],
  },
  n14_confide: {
    bg: 'rain', speaker: 'wren', portrait: 'soft',
    text: [
      "\"Can I tell you something dumb?\" she says, still looking at the street. \"Sometimes I think everyone in studio is better than me and I'm one bad review from finding out I'm a fraud.\"",
      "\"I don't usually say that part out loud.\"",
    ],
    choices: [
      { label: 'Tell her honestly why her work stands out to you', next: 'n15_powerup', effects: { trust: 3, affection: 2 } },
      { label: 'Brush it off — \"everyone feels like that, you\'re fine\"', next: 'n15_powerup', effects: { trust: -1 } },
    ],
  },
  n15_powerup: {
    bg: 'rain', speaker: 'system', portrait: null,
    text: [
      "[STAT INCREASE] Confidence +2. Unlocked passive: Steady Nerve — you stop rehearsing conversations three times before having them.",
      "For the record, that upgrade came from you telling the truth in an uncomfortable moment. I want to be annoying and point that out, because it's the whole system, actually.",
    ],
    next: 'n16_almost_moment',
  },
  n16_almost_moment: {
    bg: 'dusk', speaker: 'wren', portrait: 'blush',
    text: [
      "Weeks pass. It's late October, golden hour, and you're both sitting on the low wall outside the studio building after she pulls an all-nighter on a model.",
      "She's close enough that you can feel the warmth off her jacket. She looks up at you, and for a second neither of you says anything.",
    ],
    choices: [
      { label: '"Can I kiss you?"', next: 'n17_ask_first', effects: { trust: 3, affection: 3 } },
      { label: 'Lean in without asking', next: 'n17_boundary', effects: { affection: -1 } },
      { label: 'Look away — not sure this is the moment', next: 'n17_step_back', effects: { trust: 1 } },
    ],
  },
  n17_ask_first: {
    bg: 'dusk', speaker: 'wren', portrait: 'laugh',
    text: [
      "She blinks, then grins, something relieved in it. \"Nobody's asked me that in actual words before. Yes. Obviously yes.\"",
      "It's quick, warm, a little clumsy — the good kind of clumsy. When you pull back she's still smiling.",
    ],
    next: 'n18_bridge',
  },
  n17_boundary: {
    bg: 'dusk', speaker: 'wren', portrait: 'firm',
    text: [
      "She leans back before you get anywhere close, hand flat against your chest. Not scared — just firm. \"Hey. Ask first. That's not a small thing to skip.\"",
    ],
    choices: [
      { label: '"You\'re right. I\'m sorry — that was on me."', next: 'n18_bridge', effects: { trust: 2 } },
      { label: 'Push forward anyway', next: 'n17b_disrespect', effects: { trust: -20, affection: -10 }, flag: 'disrespected' },
    ],
  },
  n17b_disrespect: {
    bg: 'dusk', speaker: 'wren', portrait: 'hurt',
    text: [
      "She shoves back hard and is on her feet before you can react, putting the wall between you. \"No means no, and I already said it once. Don't ever do that again.\"",
      "She walks off. The System doesn't say anything for a long moment.",
    ],
    next: 'n18_bridge',
  },
  n17_step_back: {
    bg: 'dusk', speaker: 'wren', portrait: 'soft',
    text: [
      "You look away, and after a beat she relaxes, like she'd been holding her breath too. \"...Yeah. Okay. Good instinct,\" she says quietly.",
    ],
    next: 'n18_bridge',
  },
  n18_bridge: {
    bg: 'campus', speaker: null, portrait: null,
    text: [
      "Whatever happened on that wall, the semester keeps moving. Midterms come and go. The trees along the quad go bare.",
      "The fall festival banner goes up outside the student center: string lights, food trucks, a stage nobody famous will play on.",
    ],
    next: 'n19_festival',
  },
  n19_festival: {
    bg: 'festival', speaker: 'wren', portrait: 'smile',
    text: [
      "\"Okay, I'm officially asking,\" Wren says, appearing at your dorm door in a jacket you haven't seen before. \"Festival. You, me. Not as a bit. As an actual date, if you're in.\"",
    ],
    choices: [
      { label: 'Ask her to dance first', next: 'n20_walk_back', effects: { affection: 2 } },
      { label: 'Go get food and talk instead', next: 'n20_walk_back', effects: { trust: 1, affection: 1 } },
    ],
  },
  n20_walk_back: {
    bg: 'dusk', speaker: null, portrait: null,
    text: [
      "You end up walking her back across the quad afterward, string lights fading behind you, the campus gone quiet.",
      "\"This was a good semester,\" she says, mostly to herself. \"Better than I expected, anyway.\"",
    ],
    next: 'n21_confession_choice',
  },
  n21_confession_choice: {
    bg: 'dusk', speaker: 'system', portrait: null,
    text: [
      "[SYSTEM NOTE] This is the kind of moment I can't calculate for you. I can only tell you what's true so far, and let you decide what to do with it.",
    ],
    choices: [
      { label: 'Tell her how you feel', next: 'n22_finale', effects: { affection: 2 } },
      { label: 'Ask how she feels, first', next: 'n22_finale', effects: { trust: 2 } },
      { label: 'Say nothing — it doesn\'t feel like the right time', next: 'n22_finale', effects: {} },
    ],
  },
  n22_finale: {
    bg: 'dusk', speaker: null, portrait: null,
    text: ["..."],
    isFinaleGate: true,
  },

  // Endings
  ending_together: {
    bg: 'festival', speaker: 'wren', portrait: 'laugh', isEnding: true,
    title: 'Ending: Together',
    text: [
      "\"I was starting to think I'd have to say it first,\" she says, laughing, and closes the distance herself this time.",
      "It's not fireworks. It's better than that — it's easy, and warm, and entirely mutual. Whatever comes next, you're facing it together.",
    ],
  },
  ending_friends: {
    bg: 'campus', speaker: 'wren', portrait: 'soft', isEnding: true,
    title: 'Ending: Not Yet, But Not Nothing',
    text: [
      "\"I like where this is,\" she says, bumping your shoulder with hers. \"I'm not in a rush to name it. Are you?\"",
      "You're not, actually. There's a whole rest of the year, and neither of you is going anywhere.",
    ],
  },
  ending_growth: {
    bg: 'library', speaker: null, portrait: null, isEnding: true,
    title: 'Ending: Building Something Real First',
    text: [
      "Things with Wren stay complicated — some distance you put there yourself, whether from a moment you handled badly or one you never quite showed up for.",
      "[SYSTEM] Trust doesn't reset just because you want it to. But Confidence isn't gone, either. You spend the rest of the semester actually working on the parts of yourself that caused this — and for the first time, that feels like the real quest.",
    ],
  },
}

export function resolveEnding(stats, flags) {
  if (flags.disrespected) return 'ending_growth'
  if (stats.trust >= 10 && stats.affection >= 10) return 'ending_together'
  if (stats.trust >= 4 || stats.affection >= 4) return 'ending_friends'
  return 'ending_growth'
}

export const FIRST_SCENE = 'n1_move'
