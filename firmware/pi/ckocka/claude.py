"""A kocka „esze”: Claude API (hivatalos `anthropic` Python SDK).

A kulcs CSAK az ANTHROPIC_API_KEY környezeti változóból jön – fájlba soha nem kerül (a Pi-n: /etc/ckocka.env,
amit a systemd olvas be; lásd README). Modell: claude-opus-5-5, effort: low (gyors, rövid válasz).
Ha a Claude egy kérést biztonsági okból visszautasítana, a szerver ugyanabban a hívásban egy tartalék modellel
próbálja újra (server-side fallback, "default" útválasztás).
A tesztek egy hamis klienst adnak át (client=...), így se hálózat, se kulcs nem kell hozzájuk.
"""
import logging, os

from .talk import MODEL, Mind, MindError, Reply, speakable

log = logging.getLogger('ckocka.claude')

FALLBACK_BETA = 'server-side-fallback-2026-07-01'

SAY = {
    'nokey': "My brain isn't connected yet. Someone needs to give me an API key.",
    'auth': "My API key doesn't work. Please check it in my settings.",
    'busy': "My brain is a bit overloaded right now. Try again in a minute.",
    'offline': "I can't reach my brain right now. Is the Wi-Fi on?",
    'error': 'Something went wrong in my head. Please try again.',
    'refusal': "Sorry, that's not something I can help with.",
    'empty': "Hmm, I lost my train of thought. Could you say that again?",
}


def has_key():
    return bool(os.environ.get('ANTHROPIC_API_KEY', '').strip())


class ClaudeMind(Mind):
    def __init__(self, client=None, model=MODEL, effort='low', max_tokens=2048, timeout=30.0):
        self.model, self.effort, self.max_tokens = model, effort, max_tokens
        self.client = client
        if client is None and has_key():
            import anthropic                                     # csak a Pi-n / élesben kell
            self.client = anthropic.AsyncAnthropic(timeout=timeout, max_retries=1)   # a kulcsot a környezetből veszi

    async def reply(self, system, messages):
        if self.client is None:
            raise MindError(SAY['nokey'], 'nincs ANTHROPIC_API_KEY')
        try:
            r = await self.client.beta.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,                      # a gondolkodás is ebbe számít; a rövidséget a prompt adja
                output_config={'effort': self.effort},
                betas=[FALLBACK_BETA],
                fallbacks='default',
                system=system,
                messages=messages,
            )
        except Exception as e:
            raise MindError(SAY[_classify(e)], '%s: %s' % (type(e).__name__, e)) from e
        if r.stop_reason == 'refusal':
            raise MindError(SAY['refusal'], 'refusal: %s' % getattr(r.stop_details, 'category', None))
        text = speakable(' '.join(b.text for b in r.content if getattr(b, 'type', None) == 'text'))
        if r.stop_reason == 'max_tokens':
            log.warning('a válasz elérte a max_tokens korlátot – a teljes mondatokig mondja el')
        if not text:
            raise MindError(SAY['empty'], 'üres válasz (%s)' % r.stop_reason)
        u = getattr(r, 'usage', None)
        if u is not None:
            log.info('Claude: %s be / %s ki token', getattr(u, 'input_tokens', '?'), getattr(u, 'output_tokens', '?'))
        return Reply(text, r.content)                           # a teljes tartalom megy vissza a beszélgetésbe


def _classify(e):
    """Az SDK típusos hibái -> mit mondjon a kocka. (Szövegillesztés nélkül; ha az SDK nincs telepítve: általános hiba.)"""
    try:
        import anthropic
    except ImportError:
        return 'error'
    if isinstance(e, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return 'auth'
    if isinstance(e, anthropic.RateLimitError):
        return 'busy'
    if isinstance(e, anthropic.APIConnectionError):                # ide tartozik az időtúllépés is
        return 'offline'
    if isinstance(e, anthropic.APIStatusError) and e.status_code >= 500:
        return 'busy'
    return 'error'
