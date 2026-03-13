# MC Monkeys Avatar Generator

## Objective
Enable a new avatar generation mode named MC Monkeys while reusing the existing generation pipeline and UI flow.

## Prompt Composition
The final prompt is composed as:

```
baseVisualDNA + selectedTraits + negativePrompt
```

## Base Visual DNA
- Hand-drawn comic illustration inspired by classic Web3 NFT ape avatars.
- Rough ink linework with slightly imperfect outlines.
- Visible sketch-like pen strokes.
- Flat color fills with minimal shading.
- Raw and slightly imperfect drawing feel.
- Long narrow ape face, large round ears, slim neck, long upper torso, relaxed shoulders.
- Medium shot with head, torso, and arms visible.
- Character slightly turned to the side.
- Half-closed eyelids.
- Tired, unimpressed, observant expression.
- Long rectangular muzzle, small flat nose, thin neutral mouth.
- Calm, observant, slightly sarcastic mood.
- Simple monkey fur with slightly messy natural hair.
- Natural ape tones.
- Flat solid background.
- Square NFT avatar composition.
- Classic NFT avatar aesthetic.

## Negative Prompt Rules
- No 3D render.
- No Pixar style.
- No anime.
- No cute mascot.
- No modern vector illustration.
- No hyper realistic fur.
- No corporate clean illustration.
- No human hairstyle.

## Randomizable Traits
- Role
- Head accessory
- Eyes or glasses
- Clothing
- Badge or patch
- Hand pose or hand accessory
- Background color
- Fur tone
- Mood variant

## Code Layout
- Trait pools: lib/office/mcMonkeyTraits.ts
- Prompt builder: lib/office/buildMcMonkeyPrompt.ts
- Generation + persistence wiring: lib/office/avatarGenerator.ts
- Office flow trigger: app/(mission-control)/office/page.tsx
- Agent avatar persistence endpoint: app/api/agents/[id]/avatar/route.ts

## Runtime Flow
1. User clicks Generate MC MONKEY in Agent Inspector.
2. Office page calls generateMcMonkeyAvatar for selected agent.
3. Prompt builder selects random MC Monkey traits and composes final prompt.
4. Existing /api/generate-avatar endpoint generates the image.
5. Frontend persists avatar with POST /api/agents/{id}/avatar.
6. Zustand avatarMapping is updated and UI refreshes immediately.
7. Local storage mapping is updated as fallback for resilience.
