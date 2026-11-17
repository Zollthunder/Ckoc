# C-kocka

**Egy kis barát az asztalodra.** Asztali AI-asszisztens koncepció, amit egy AI-jal (Claude Code) együtt terveztem meg pár nap alatt, egy céges AI-kihívás keretében.

🌐 **Weboldal:** a projekt GitHub Pages oldala (interaktív 3D kocka, videó, a készítés története)

## Mi van itt?
| Mappa / fájl | Tartalom |
|---|---|
| [index.html](index.html), [web/](web/) | a weboldal (three.js-es interaktív 3D néző) |
| [3d/](3d/) | a 3D modell: `c-kocka.f3d` (Fusion 360), `c-kocka.step`, `c-kocka.stl` |
| [3d/fusion/CKocka/CKocka.py](3d/fusion/CKocka/CKocka.py) | a Fusion 360 Python szkript, ami az egész modellt felépíti |
| [video/c-kocka.mp4](video/c-kocka.mp4) | a 2:56-os videó |
| [video/](video/) | a videó „forráskódja”: animált jelenet, időzítés, szövegek |
| [tools/](tools/) | segédprogramok: Fusion MCP kliens, hanggenerálás, zene, renderelés |
| [NAPLO.md](NAPLO.md) | **a napló**: eszközök, példapromptok, elakadások és megoldások |
| [DESIGN.md](DESIGN.md) | a termék koncepciója |
| [VIDEO.md](VIDEO.md) | a videó forgatókönyve |
| [ELEKTRONIKA.md](ELEKTRONIKA.md) | elektronika kész modulokból (Pi Zero 2 WH, ReSpeaker hangpanel, XIAO RP2040, …) |
| [GYARTASI_TERV.md](GYARTASI_TERV.md), [TERVEZESI_ELVEK.md](TERVEZESI_ELVEK.md) | gyártási terv alkatrészenként és a tervezési elvek |
| [SZERELES.md](SZERELES.md) | **szerelési útmutató** lépésenként, képekkel |
| [PIACI_TANULMANY.md](PIACI_TANULMANY.md) | piaci előtanulmány: piac, ár, haszonkulcs, sorozatnagyság |
| [AJANLATKERESEK.md](AJANLATKERESEK.md) | költségbecslés és ajánlatkérés-tervezetek a 3 prototípushoz (gyakorló anyag, nem elküldve) |
| [KOLTSEGOPTIMALIZALAS.md](KOLTSEGOPTIMALIZALAS.md) | költségoptimalizálás alkatrészenként és sorozatnagyság szerint, döntésekkel |
| [dxf/vagas/](dxf/vagas/), [3d/nyomtatas/](3d/nyomtatas/) | vágási DXF-ek (lézer/CNC) és nyomtatandó STL-ek gépenként |

## Helyi futtatás
```bash
npm install
node serve.js
```
Utána a böngészőben: `http://localhost:8080` (weboldal) és `http://localhost:8080/video/scene.html` (a videó jelenete, lejátszható).

---
Tervezte: Zollo & C (Claude) · AI Kihívás 2026 · Koncepciótermék, nem kerül forgalomba.
