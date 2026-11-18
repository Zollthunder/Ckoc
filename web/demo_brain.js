// Demó „agy” a nyilvános oldalra: ha nincs helyi szerver (GitHub Pages), a kocka kulcsszavak alapján,
// előre megírt mondatokkal válaszol. Így a beszélgetés a weboldalon is kipróbálható, API-kulcs nélkül.
// Helyben (node serve.js + kulcs) ehelyett Claude válaszol, lásd talk.js.
// A kérdés lehet magyar vagy angol, a kocka mindig angolul felel (ugyanúgy, mint élesben).

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// [kulcsszavak (ékezet nélkül, magyar és angol), válaszok, arc]
const RULES = [
  [/\b(vicc|joke|funny|nevettess|poen)/, [
    ["Why did the cube go to therapy? It had too many issues with its edges.", 'grin'],
    ["I told my wooden button a joke. Andor didn't laugh. Tough crowd, those trees.", 'grin'],
    ["What's a tree's favourite drink? Root beer. Andor taught me that one.", 'grin'],
    ["I'd tell you a joke about corners, but you'd find it a bit too pointed.", 'grin'],
  ]],
  [/\b(ki vagy|mi vagy|who are you|what are you|bemutatkoz|your name|hogy hivnak|neved)/, [
    ["I'm C, a nine centimetre cube with a face, lights and far too much personality. Nice to meet you, {nick}!", 'smile'],
    ["I'm C! A desk buddy you can talk to, pet, shake, or throw on a bad day. Rubber corners, no hard feelings.", 'grin'],
  ]],
  [/\b(hogy vagy|mi ujsag|how are you|how's it going|whats up|hogy erzed)/, [
    ["Fully charged and slightly dizzy from last time. So, pretty great!", 'grin'],
    ["Living the cube life, {nick}. Four buttons, zero worries.", 'smile'],
  ]],
  [/\b(szia|hello|hali|hi\b|hey|jo reggelt|jo napot|good morning|csa\b|cso\b|helo)/, [
    ["Hey {nick}! Good to see you. Want a joke, or shall I just look adorable?", 'grin'],
    ["Hi {nick}! I was just practising my smile. How's it looking?", 'smile'],
  ]],
  [/\b(dob|throw|toss|eldob)/, [
    ["Throw me if you must. Rubber corners, remember? I'll just get a bit dizzy.", 'o'],
    ["Go on then, toss me. I'll forgive you after a coffee break.", 'flat'],
  ]],
  [/\b(macska|cica|cat|miau|meow|dorombol|purr)/, [
    ["Pet my roof in cat mode and I'll purr. No three a.m. zoomies. Mostly.", 'grin'],
  ]],
  [/\b(fesz|stressz|stress|szomoru|sad|rossz nap|bad day|faradt|tired|unatkoz|bored)/, [
    ["Sounds like a rough one, {nick}. Take a breath. Want a silly joke to reset?", 'worried'],
    ["Rough day? You can throw me, I won't mind. Or we can just sit here together.", 'worried'],
  ]],
  [/\b(ido|hany ora|what time|weather|idojaras|naptar|calendar|news|hirek)/, [
    ["In this website demo I have no clock, weather or internet. On your desk, I would. Sorry, {nick}!", 'flat'],
  ]],
  [/\b(zene|music|party|tanc|dance|bulizz)/, [
    ["Party mode! Press the party button and watch my lights go wild.", 'grin'],
  ]],
  [/\b(kamera|camera|privacy|adatvedelem|figyelsz|spy|watching|kemked)/, [
    ["Flip me upside down and the mic and camera switch off. No peeking, promise.", 'smile'],
  ]],
  [/\b(ara\b|arat|mennyibe|price|cost|buy|vasarol|megvehet|kaphato)/, [
    ["I'm a concept, not for sale. But the research says about two hundred euros, if anyone's asking.", 'o'],
  ]],
  [/\b(claude|ai\b|mesterseges|robot|chatgpt|okos)/, [
    ["When I run locally, Claude does my thinking. On this website I'm running on a little script. Shh.", 'grin'],
  ]],
  [/\b(koszi|koszonom|thanks|thank you|kosz)/, [
    ["Any time, {nick}! That's what desk cubes are for.", 'smile'],
  ]],
  [/\b(szeretlek|love you|cuki|cute|aranyos)/, [
    ["Stop it, you'll make my C glow even brighter.", 'grin'],
  ]],
  [/\b(viszlat|szia szia|bye|jo ejt|good night|megyek)/, [
    ["Bye {nick}! I'll be right here, being a cube.", 'smile'],
  ]],
];

const SARCASTIC = [
  ["Fascinating. Truly. I'm a cube, but sure, go on.", 'flat'],
  ["Wow. And here I thought today would be boring.", 'flat'],
];
const FALLBACK = [
  ["Hmm, my demo brain didn't catch that one. Try asking me for a joke, or who I am!", 'o'],
  ["That's a big question for a small cube. Run me locally and Claude will answer it properly.", 'smile'],
  ["Interesting! In this website demo I only know a few topics. Ask me about jokes, cats or bad days.", 'smile'],
];

export function demoReply(text, { persona = 'sunny', nick = 'Captain' } = {}) {
  const t = norm(text);
  const rule = RULES.find(([re]) => re.test(t));
  let [reply, mood] = rule ? pick(rule[1]) : pick(persona === 'sarcastic' ? SARCASTIC : FALLBACK);
  if (persona === 'sarcastic' && rule && Math.random() < 0.4) reply += ' Not that I care.';
  if (persona === 'hype') reply = reply.replace(/\.$/, '!') + ' LET\'S GO!';
  return { reply: reply.replace(/\{nick\}/g, nick || 'Captain'), mood };
}
