# Tamer's Trail: sprite hand-off

Everything gathered so far for **Tamer's Trail**, a monster-taming adventure in the style of the classic handheld games, with a **mythology** theme. All art here is free to use (open licences); no Pokémon or other commercial game art.

## What the player likes (design brief)

- **Visuals matter most**, especially **battle visuals** (animations, effects, impact).
- Likes **powerful, cool designs, not cute ones**: dragons, sea serpents, armoured beasts, martial-arts fighters, legendaries.
- Favourite Pokémon (for vibe only, never to copy): Tyranitar, Charizard, Solgaleo, Garchomp, Milotic, Gyarados, Electivire, Zeraora, Hoopa, Rayquaza, Hydreigon, Lapras, Sceptile, Rillaboom, Salamence, Silvally, Lucario, Alakazam, Aggron, Togekiss, Grimmsnarl, Gengar, Urshifu, Suicune and the legendary dogs.
- Loves **Greek mythology** and **mythology in general**.
- **Not interested in shinies** / plain recolours.
- Happy with the pixel-art style (option 1 of the mockups) and a GBA-style battle screen.

## The plan so far

- **World:** each region draws on a mythology. Start in a Greek-style land, later Norse, Egyptian and Japanese areas.
- **Starters (player's picks):** Agnite 🔥 → Agnidon → Agnigon, Axolightl 💧 → Ampystoma, Waysprite ❄️ → Angesnow → Seraphice. Fire beats frost, frost beats water, water beats fire.
- **Mythic monsters:** Mystikapi = Pegasus, Snokari = Hydra, Gryfix = Griffin, Conglolem = Cyclops, Hectapod = Kraken, Criniotherme = Nemean Lion, Cardinale = Phoenix, Exclawvate = Titan, Wolffsky = Fenrir, Viviteel = world serpent, Anu = Anubis, Pyraminx = Sphinx, Vulpyre = kitsune, Pharavion = water god.
- **Legendary hounds (Suicune-style):** three roaming hounds (ice/water, fire, storm). Catching all three unlocks **Cerberus**, a three-headed hound made by combining their art.
- See `boards/mythology-lineup.png`.

## What's in this pack

| Folder | Contents | Count |
|---|---|---|
| `tuxemon/` | Monster sheets (128×88: front 64×64 at x0, back 64×64 at x64, two 24×24 menu icons below). `index.json` lists name, types, stage, evolution line, tags (why it's here) and licence. | 119 monsters |
| `wesnoth/` | Mythology creatures from Battle for Wesnoth, grouped (greek-myth, dragons, legendary-beasts, spirits). Each has `frames/` (base image plus every attack/defend/death/idle frame its unit file references) and `preview.png`. `index.json` lists them. | 32 creatures, 482 frames |
| `backgrounds/` | Superpowers Asset Packs battle backgrounds, 137×89 each. | 41 |
| `attack-effects/` | Superpowers RPG battle effects: frame strips (explosion, lightning, slashes, X-slash, healing, rocks, fireball, claws, flame burst, holy cross, smoke, wind). `-b` files are variants. | 14 effects |
| `boards/` | Overview images: mythology lineup, Tuxemon matches for the favourites, Wesnoth mythology creatures, first cast, and edit samples. | 6 |

**Tags in `tuxemon/index.json`:** `your-pick` (hearted by the player), `in-game-cast` (already wired into the prototype), `mythology`, and the vibe groups `dragons`, `serpents`, `armoured-beasts`, `fighters`, `legends-psychics`, `flyers-dark`. Full evolution lines are included.

**Wesnoth notes:** sprites face one direction (no back view); mirror them so the two sides face each other. Magenta pixels are "team colour" and must be recoloured (`preview.png` shows them recoloured blue). Effect strips in `attack-effects/` are equal-width frames laid out left to right (e.g. `1.png` is 6 frames of 112 px).

## Licences and credits

- **Tuxemon** (github.com/Tuxemon/Tuxemon): 41 of the monsters here are individually credited under **CC BY-SA 4.0, CC BY or public domain**. Credit each artist (see `tuxemon/TUXEMON-ATTRIBUTIONS.md`). The other 78 have no individual credit line and come under the project's **GPLv3** contribution terms, so the game should be released under **GPLv3** if they're used.
- **Battle for Wesnoth** (github.com/wesnoth/wesnoth): art is **GPL v2 or later**. Credit "Battle for Wesnoth project". Compatible with releasing the game under GPLv3.
- **Superpowers Asset Packs** by Pixel-boy / Sparklin Labs (github.com/sparklinlabs/superpowers-asset-packs): **CC0**. No credit required (appreciated).
- **Recommended:** put Tamer's Trail under **GPLv3** and add an in-game credits screen listing Tuxemon artists, the Wesnoth project and Pixel-boy.

## Other sources found (not downloaded, sites blocked from the cloud session)

- **50+ Monsters Pack 2D** by isaiah658 (OpenGameArt, CC0): 56 monsters with front and back 64×64 sprites and alternate palettes.
- **Tuxemon Set 1** (OpenGameArt, CC BY-SA 4.0): 154 monsters, would move more Tuxemon art to the "credited" group.
- **Pet Cats Pack** and **Fantasy Warrior** by LuizMelo (itch.io, CC0): animated pets and a fighter.
- **Tiny Creatures** by Clint Bellanger (OpenGameArt, CC0): 180 small 16×16 creatures for an overworld.
- To fetch these, allow `opengameart.org`, `itch.io`, `codeberg.org` and `kenney.nl` in the environment's network settings, then start a new session.

## Where the code is

- Branch **`tamer-wip`** in the Leveling-Game repo, folder `tamer/`: the pixel engine and data (first file), plus the original 28-monster cast, 8 backgrounds and 14 effects in `tamer/assets/`.
- This hand-off pack is in `tamer/handoff/` on the same branch.
- Monster picker page (all 411 Tuxemon monsters, with the player's hearts saved): https://claude.ai/artifact/VK8uxq8QPCisVtLcKpFpvt

## Next steps

1. Confirm the final cast from the boards (starters are settled).
2. Swap the prototype's code-drawn monsters for the Tuxemon and Wesnoth sprites, with mirrored Wesnoth units and their real animation frames in battle.
3. Build the first area: a Greek starting town, Route 1, wild encounters, catching, a trainer and a boss.
4. Add the credits screen and a GPLv3 licence file.
