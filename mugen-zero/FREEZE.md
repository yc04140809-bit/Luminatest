# ARTIFACT FREEZE POINT

The Artifact prototype's baseline, recorded on 2026-09-18 so that
「動いていた状態」 is a commit and a number rather than a memory.

    commit          5c84a4a
    artifact        16,265,294 bytes of 16,777,216 (96.9%)
    headroom        511,922 bytes
    unit tests      1458 passing
    e2e tests       442 passing
    published       Artifact Version 31

## What is standing at this point

TITLE · OPENING · ALDEN VILLAGE · GREENWOOD FOREST · BATTLE · RESULT ·
探索復帰 · Inventory · LUMI · ShopOffer · アルデン村道具屋 · 薬草 ·
魔力水 · EXP · LEVEL · LEVELによる基礎成長 · PARTY CONDITION ·
HP/MP持ち越し · SAVE HARDENING · SESSION RESUME · WORLD MEMORY ·
ARCANA · AUTO · ×2 · TURN ORDER · Battle Camera · キャラクターアート切替

## What the Artifact is for now

Checking a specification, trying a piece of UI, testing a game-design
idea. It is not the thing that grows into the product.

## What must not go into it

New large images. Full-length new BGM. A large system. A rebuilt HUD.
Many monsters. Many maps. Anything, in short, that spends the half
megabyte left — because the half megabyte left is what makes the next
small experiment possible.

Small specification checks and UI experiments are still welcome, and
`npm run build:singlefile` refuses to publish a build that breaks the
limit, so the rule is enforced rather than remembered.

## Why the number is 16,265,294 and not 16 MB

The publishing limit is 16 MiB — 16,777,216 bytes. It was read as
"16 MB" once and a build was rejected for being 17 MB when it was
under 16 MB by the other definition. Both numbers are written here so
nobody has to make that mistake twice.
