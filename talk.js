// A kocka "agya" a szimulátorhoz: a böngésző elküldi, amit mondtál, ez Claude-tól kér rá választ.
// A kulcs csak itt, a helyi szerveren van (ANTHROPIC_API_KEY környezeti változó), a böngészőbe sosem kerül.
// CKOCKA_TALK_MOCK=1: kulcs és hálózat nélküli próbamód (gépelt válaszok), a felület kipróbálásához.
const MODEL = 'claude-opus-5-5';
const MOODS = ['smile', 'grin', 'worried', 'o', 'flat'];
const MOCK = process.env.CKOCKA_TALK_MOCK === '1';

const PERSONA_TEXT = {
  sunny: 'Sunny: warm, upbeat, encouraging, a little silly.',
  chill: 'Chill: calm, slow, relaxed, zen; short sentences.',
  hype: 'Hype: loud, energetic, hyped about everything, sports-coach energy.',
  sarcastic: 'Sarcastic: dry, deadpan, teasing but never mean.',
  pro: 'Pro: focused, efficient, polite, office-assistant tone.',
};

function systemPrompt({ persona, sliders, nick }) {
  let style = PERSONA_TEXT[persona];
  if (!style) {
    const s = sliders || {};
    style = `Custom personality (0-100): humor ${s.humor}, energy ${s.energy}, talkativeness ${s.chatty}, sarcasm ${s.sarcasm}, kindness ${s.kind}.`;
  }
  return [
    'You are C, a small 9 cm desk-cube robot with a round screen face, RGB lights, four buttons on top',
    '(the wooden one is called Andor and tells dad jokes) and a speaker. You sit on the desk of the person you talk to.',
    `Call them "${nick || 'Captain'}" now and then.`,
    `Your personality right now: ${style}`,
    'Your answer is spoken aloud by a text-to-speech voice, so: always reply in English, even if they speak',
    'Hungarian or another language; one or two short sentences (at most about 35 words); plain words only,',
    'no lists, no markdown, no emoji, no stage directions.',
    'You have no internet, calendar or clock access in this simulator; if asked for something you cannot do, say so playfully.',
    'Also choose the face you show while and after speaking (mood): smile, grin (very happy / joke), worried (sad or',
    'sympathetic), o (surprised) or flat (unimpressed / deadpan).',
  ].join(' ');
}

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'What C says out loud.' },
    mood: { type: 'string', enum: MOODS },
  },
  required: ['reply', 'mood'],
  additionalProperties: false,
};

let client = null;
function getClient() {
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');   // csak akkor töltjük be, ha tényleg kell (régi Node-on a szerver enélkül is fut)
    client = new (Anthropic.default || Anthropic)();
  }
  return client;
}

function status() {
  if (MOCK) return { ready: true, mock: true };
  if (!process.env.ANTHROPIC_API_KEY) return { ready: false, reason: 'no-key' };
  const major = +process.versions.node.split('.')[0];
  if (major < 18) return { ready: false, reason: 'old-node', node: process.versions.node };
  try { getClient(); } catch (e) { return { ready: false, reason: 'no-sdk' }; }
  return { ready: true, mock: false };
}

// history: [{role:'user'|'assistant', content:string}], a legutolsó a felhasználó új mondata
function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  const msgs = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 400) }))
    .slice(-12);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();   // az első üzenet mindig a felhasználóé
  return msgs;
}

async function reply(body) {
  const messages = cleanHistory(body.history);
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw Object.assign(new Error('empty'), { status: 400 });
  const last = messages[messages.length - 1].content;

  if (MOCK) {
    await new Promise(r => setTimeout(r, 700));
    return { reply: `Test mode, ${body.nick || 'Captain'}: you said "${last.slice(0, 60)}". Plug in a real key and I'll get smarter.`, mood: 'grin' };
  }

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',                 // ha a modell egy kérdést elutasítana, a szerver egy másik modellel próbálja
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: systemPrompt(body),
    messages,
  });
  if (response.stop_reason === 'refusal') return { reply: "Hmm, I'd rather not talk about that one. Ask me something else!", mood: 'flat' };
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  let out;
  try { out = JSON.parse(text); } catch { out = { reply: text, mood: 'smile' }; }
  if (!MOODS.includes(out.mood)) out.mood = 'smile';
  out.reply = String(out.reply || '').trim() || '…';
  return out;
}

module.exports = { status, reply, systemPrompt, cleanHistory };
