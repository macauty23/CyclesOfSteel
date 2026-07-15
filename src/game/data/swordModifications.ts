import type {
  CombatStats,
  SwordPartId,
  SwordPartOptionDefinition,
  SwordPartOptionId,
  SwordPartStatAdjustments
} from "../core/types";

type PartOptionRoster = Record<SwordPartId, SwordPartOptionDefinition[]>;

function option(
  partId: SwordPartId,
  id: SwordPartOptionId,
  name: string,
  summary: string,
  detail: string,
  cost: SwordPartOptionDefinition["cost"],
  accent: number,
  effects: SwordPartStatAdjustments,
  visual: SwordPartOptionDefinition["visual"]
): SwordPartOptionDefinition {
  return {
    id,
    partId,
    name,
    summary,
    detail,
    cost,
    accent,
    effects,
    visual
  };
}

export const SWORD_PART_OPTIONS: PartOptionRoster = {
  blade: [
    option(
      "blade",
      "bladeFieldEdge",
      "Field Edge",
      "Balanced baseline geometry.",
      "A neutral blade profile that keeps the weapon close to its stock handling.",
      {},
      0xc9d3dc,
      {},
      {}
    ),
    option(
      "blade",
      "bladeHollowGround",
      "Hollow Ground",
      "Quicker edge response.",
      "Removes mass behind the edge for snappier cuts and faster recovery, at the cost of some stopping power.",
      { steel: 2, leather: 1 },
      0xd8e0e8,
      { lightDamage: 2, lightRecovery: -8, heavyDamage: -1 },
      { bladeWidth: -1, tint: 0xe5edf6 }
    ),
    option(
      "blade",
      "bladeReinforcedSpine",
      "Reinforced Spine",
      "Heavier authority through the strong.",
      "Adds backbone to the blade so committed strikes hit harder, but larger motions take longer to recover from.",
      { steel: 2, wood: 1 },
      0xc4ced8,
      { heavyDamage: 4, heavyImpactControlLoss: 14, heavyRecovery: 8 },
      { bladeWidth: 1, tint: 0xd1d9e2 }
    ),
    option(
      "blade",
      "bladeBroadShear",
      "Broad Shear",
      "Wider edge presence.",
      "Pushes the weapon toward larger cutting arcs, helping broad swords and claymores feel fuller in the bind.",
      { steel: 2, wood: 1, leather: 1 },
      0xd1dbe5,
      { lightWidth: 8, heavyWidth: 12, lightDamage: 1, lightRange: -3 },
      { bladeWidth: 2, bladeLength: 4 }
    ),
    option(
      "blade",
      "bladeTaperedDiamond",
      "Tapered Diamond",
      "Cleaner point-forward pressure.",
      "Shifts the blade toward precise line control, extending reach while keeping the weapon disciplined through the thrust.",
      { steel: 2, crystal: 1 },
      0xdde6ee,
      { lightRange: 6, heavyRange: 8, heavyLunge: 12 },
      { bladeLength: 8, bladeWidth: -1 }
    ),
    option(
      "blade",
      "bladeWarFuller",
      "War Fuller",
      "Lightens the middle without losing presence.",
      "A fuller softens fatigue across longer exchanges and helps heavier swords cycle without feeling dead in the hand.",
      { steel: 2, wood: 1, gemstone: 1 },
      0xc5d0db,
      { staminaMax: 4, heavyRecovery: -4, lightRecovery: -2 },
      { bladeLength: 6, tint: 0xd8e1ea }
    ),
    option(
      "blade",
      "bladeHexSection",
      "Hexagonal Section",
      "Rigid and stubborn in contact.",
      "Improves bind confidence and lets contact carry more consequence when the blade lands cleanly.",
      { steel: 3, gemstone: 1 },
      0xd0dae4,
      { parryReflectRatio: 0.03, heavyImpactDisplacement: 10, lightImpactControlLoss: 8 },
      { bladeWidth: 1 }
    ),
    option(
      "blade",
      "bladeNarrowFoible",
      "Narrow Foible",
      "Longer, leaner forward half.",
      "Extends the working end for straighter entries and cleaner pokes, while giving up some cutting presence.",
      { steel: 2, crystal: 1, leather: 1 },
      0xe0e8f0,
      { lightRange: 10, heavyRange: 12, lightDamage: -1, heavyWidth: -4 },
      { bladeLength: 12, bladeWidth: -2 }
    ),
    option(
      "blade",
      "bladeThickForte",
      "Thickened Forte",
      "Stronger near the hand.",
      "Builds extra strength in the lower blade, making close binds safer and softening incoming punishment.",
      { steel: 3, leather: 1, wood: 1 },
      0xc2ccd6,
      { parryWindow: 8, incomingDamageScale: -0.03, heavyDamage: 1 },
      { bladeWidth: 1, tint: 0xcfd8e0 }
    ),
    option(
      "blade",
      "bladeWeightForward",
      "Weight-Forward Blade",
      "Forward mass for brutal finishes.",
      "Loads more mass toward the tip so heavy strikes feel punishing, but the weapon drags the user deeper into recovery.",
      { steel: 3, leather: 1, brimstone: 1 },
      0xbcc7d2,
      { heavyDamage: 5, heavyImpactDisplacement: 14, moveSpeed: -4, lightRecovery: 4 },
      { bladeLength: 6, bladeWidth: 2 }
    ),
    option(
      "blade",
      "bladeDistalTaper",
      "Distal Taper",
      "Livelier whole-blade handling.",
      "Sheds mass along the length of the blade so both tempo and footwork feel more responsive.",
      { steel: 3, gemstone: 1, wood: 1 },
      0xe4ebf2,
      { moveSpeed: 4, moveAcceleration: 60, lightRecovery: -6, heavyRecovery: -4 },
      { bladeLength: 10, bladeWidth: -1, tint: 0xe8eef5 }
    ),
    option(
      "blade",
      "bladeReinforcedRicasso",
      "Reinforced Ricasso",
      "More authority near the guard.",
      "Supports hand-close leverage, making binds and short recoveries a little more forgiving.",
      { steel: 3, wood: 1, leather: 1, crystal: 1 },
      0xd7dfe7,
      { parryWindow: 10, attackControlWindup: -4, heavyDamage: 2 },
      { bladeWidth: 1 }
    ),
    option(
      "blade",
      "bladeClaymoreLeaf",
      "Claymore Leaf",
      "Big cutting belly.",
      "Expands the central cutting zone so long swords and claymores get fuller sweeps and more commanding heavy arcs.",
      { steel: 4, wood: 1, leather: 1, gemstone: 1 },
      0xd5dee8,
      { heavyWidth: 16, heavyDamage: 3, lightWidth: 6, moveSpeed: -2 },
      { bladeLength: 10, bladeWidth: 3 }
    ),
    option(
      "blade",
      "bladeEstocCore",
      "Estoc Core",
      "Rigid anti-armor profile.",
      "Reorients the blade toward thrust pressure and direct line control at the cost of broader cutting work.",
      { steel: 4, crystal: 2, gemstone: 1 },
      0xe2e9f1,
      { lightRange: 12, heavyRange: 16, heavyLunge: 20, heavyWidth: -8, lightWidth: -4 },
      { bladeLength: 14, bladeWidth: -2 }
    ),
    option(
      "blade",
      "bladeFlambergeRipple",
      "Flamberge Ripple",
      "Unsettling contact and drag.",
      "Adds a wavering edge geometry that improves disruption on contact and makes parries bite harder.",
      { steel: 4, gemstone: 2, essence: 1 },
      0xe8edf3,
      { parryReflectRatio: 0.04, lightImpactControlLoss: 10, heavyImpactControlLoss: 16 },
      { bladeLength: 12, bladeWidth: 1, tint: 0xf0f4f8 }
    )
  ],
  crossGuard: [
    option(
      "crossGuard",
      "guardSimpleQuillons",
      "Simple Quillons",
      "Baseline hand protection.",
      "A straightforward guard layout that leaves the weapon close to its original behavior.",
      {},
      0xc39a72,
      {},
      {}
    ),
    option(
      "crossGuard",
      "guardLongQuillons",
      "Long Quillons",
      "More leverage in the bind.",
      "Extends the guard for better line control and safer parry spacing, especially on longer swords.",
      { steel: 1, wood: 1, leather: 1 },
      0xcda17c,
      { parryWindow: 10, heavyRange: 4 },
      { guardLength: 12 }
    ),
    option(
      "crossGuard",
      "guardScentStopper",
      "Scent-Stopper Guard",
      "Compact, sturdy protection.",
      "Builds a thicker center and smaller leverage profile for steadier defense with less wasted movement.",
      { steel: 2, leather: 1 },
      0xb78f68,
      { incomingDamageScale: -0.03, parryReflectRatio: 0.03 },
      { guardWidth: 2, guardLength: -4 }
    ),
    option(
      "crossGuard",
      "guardSideRings",
      "Side Rings",
      "Safer hand coverage.",
      "Adds ring protection to support calmer defense and a more confident bind against straight attacks.",
      { steel: 2, leather: 1, gemstone: 1 },
      0xd4aa82,
      { parryWindow: 12, moveSpeed: -2 },
      { guardLength: 6, tint: 0xdab48d }
    ),
    option(
      "crossGuard",
      "guardFingerRing",
      "Finger Ring",
      "Sharper hand alignment.",
      "Helps the hand index the blade more precisely, slightly improving tempo and control in narrow exchanges.",
      { steel: 2, wood: 1 },
      0xc79973,
      { lightRecovery: -4, attackControlWindup: -4 },
      { guardLength: 4, guardWidth: 1 }
    ),
    option(
      "crossGuard",
      "guardDownturned",
      "Downturned Quillons",
      "Heavier closing pressure.",
      "Encourages pushing through contact and adds more authority to heavier strikes near the bind.",
      { steel: 2, leather: 1, wood: 1 },
      0xbe926c,
      { heavyDamage: 2, heavyImpactControlLoss: 12, heavyRecovery: 4 },
      { guardLength: 8, tint: 0xc99f78 }
    ),
    option(
      "crossGuard",
      "guardUpturned",
      "Upturned Quillons",
      "Guides the line forward.",
      "Supports straight entries and longer committed actions by encouraging the hands to stay aligned behind the point.",
      { steel: 2, crystal: 1 },
      0xd0a57e,
      { lightLunge: 10, heavyLunge: 12, lightRange: 4 },
      { guardLength: 10 }
    ),
    option(
      "crossGuard",
      "guardShell",
      "Shell Guard",
      "Hand-first defensive focus.",
      "Leans hard into survivability and bind confidence, but adds enough mass to slightly dull your overall pace.",
      { steel: 3, leather: 1, gemstone: 1 },
      0xd8b08c,
      { parryWindow: 16, incomingDamageScale: -0.04, moveSpeed: -4 },
      { guardWidth: 4, guardLength: 6, tint: 0xe0ba97 }
    ),
    option(
      "crossGuard",
      "guardParryingHooks",
      "Parrying Hooks",
      "Aggressive leverage on contact.",
      "Designed for catching and redirecting opposing steel, making your binds noticeably stickier.",
      { steel: 3, leather: 1, crystal: 1 },
      0xc69a74,
      { parryWindow: 16, heavyImpactDisplacement: 8, parryReflectRatio: 0.04 },
      { guardLength: 10, guardWidth: 2 }
    ),
    option(
      "crossGuard",
      "guardBeaked",
      "Beaked Quillons",
      "Short hooking pressure.",
      "Adds a little bite to close-line control so shorter weapons feel more assertive after contact.",
      { steel: 3, leather: 1 },
      0xc18f69,
      { lightDamage: 2, heavyDamage: 1, parryWindow: 4 },
      { guardLength: 6, guardWidth: 1 }
    ),
    option(
      "crossGuard",
      "guardBasketBars",
      "Basket Bars",
      "Full hand cover.",
      "A protective guard that greatly improves safety in repeated engagements, at the cost of some free-moving tempo.",
      { steel: 4, leather: 2, coral: 1 },
      0xd6aa83,
      { parryWindow: 20, incomingDamageScale: -0.05, moveSpeed: -6 },
      { guardWidth: 5, guardLength: 8, tint: 0xe0b58c }
    ),
    option(
      "crossGuard",
      "guardSplitRing",
      "Split Ring Guard",
      "Tighter line guidance.",
      "Improves point control and lets both thrusting and longer cuts stay a little truer through the line.",
      { steel: 3, gemstone: 1, crystal: 1 },
      0xd1a47d,
      { parryWindow: 10, lightRange: 4, heavyRange: 4 },
      { guardLength: 8, tint: 0xdab08a }
    ),
    option(
      "crossGuard",
      "guardRain",
      "Rain Guard",
      "Cleaner deflection angles.",
      "Angles the guard to help incoming force slide away, improving reflection and stable active control.",
      { steel: 3, gemstone: 1, essence: 1 },
      0xe0b78f,
      { parryReflectRatio: 0.05, attackControlActive: 4 },
      { guardLength: 9, guardWidth: 2 }
    ),
    option(
      "crossGuard",
      "guardWalloon",
      "Walloon Bars",
      "Fast protection with more structure.",
      "Supports responsive dueling guards and helps dashes recover into safer hand positions.",
      { steel: 4, leather: 2, gemstone: 1 },
      0xd7aa82,
      { parryWindow: 14, dashCooldown: -10, moveSpeed: -2 },
      { guardWidth: 4, guardLength: 9, tint: 0xe0b791 }
    ),
    option(
      "crossGuard",
      "guardGreatCross",
      "Great Cross",
      "Massive leverage for large blades.",
      "Best suited for greatswords and claymores, adding real authority to big arcs and heavy binds.",
      { steel: 4, wood: 1, leather: 1, gemstone: 1 },
      0xd2a078,
      { heavyWidth: 10, heavyImpactDisplacement: 12, heavyDamage: 2, moveSpeed: -2 },
      { guardLength: 14, guardWidth: 3 }
    )
  ],
  pommel: [
    option(
      "pommel",
      "pommelWheel",
      "Wheel Pommel",
      "Balanced default counterweight.",
      "A neutral pommel that keeps the sword near its original balance.",
      {},
      0xb4beca,
      {},
      {}
    ),
    option(
      "pommel",
      "pommelBrazilNut",
      "Brazil-Nut Pommel",
      "Simple rear balance.",
      "A classic counterweight that helps heavier swords recover with a little less drag.",
      { steel: 1, wood: 1 },
      0xa6b0bb,
      { heavyRecovery: -6, heavyDamage: 1 },
      { pommelRadius: 2 }
    ),
    option(
      "pommel",
      "pommelScentStopper",
      "Scent-Stopper Pommel",
      "Sharper rear response.",
      "Shifts balance back enough to make the blade feel livelier in quick exchanges.",
      { steel: 1, leather: 1 },
      0xaeb8c2,
      { moveSpeed: 4, lightRecovery: -4 },
      { pommelRadius: 1, tint: 0xc3ccd4 }
    ),
    option(
      "pommel",
      "pommelFacetedDisk",
      "Faceted Disk",
      "Firm, steady rear mass.",
      "Adds a slightly denser tail for extra stamina and a touch more confidence in contact.",
      { steel: 2, gemstone: 1 },
      0xb8c1cb,
      { staminaMax: 4, parryReflectRatio: 0.03 },
      { pommelRadius: 2, tint: 0xc6ced6 }
    ),
    option(
      "pommel",
      "pommelPear",
      "Pear Pommel",
      "Nimble redirection.",
      "Smooths transitions between actions, making the weapon easier to redirect after commitment.",
      { steel: 2, leather: 1 },
      0xb2bac5,
      { attackControlWindup: -6, dashCooldown: -12 },
      { pommelRadius: 1, tint: 0xc1c9d2 }
    ),
    option(
      "pommel",
      "pommelFishtail",
      "Fishtail Pommel",
      "Rear-heavy finishing bias.",
      "Encourages committed finishing actions and slightly improves the consequences of clean heavy hits.",
      { steel: 2, wood: 1, leather: 1 },
      0xa7b1bc,
      { heavyImpactDisplacement: 12, heavyDamage: 2 },
      { pommelRadius: 3, tint: 0xbdc6d0 }
    ),
    option(
      "pommel",
      "pommelSpherical",
      "Spherical Pommel",
      "Round steadying weight.",
      "Improves stamina and keeps the blade from feeling too head-heavy in longer bouts.",
      { steel: 2, gemstone: 1, wood: 1 },
      0xbcc5cf,
      { staminaMax: 8, heavyRecovery: -4 },
      { pommelRadius: 4 }
    ),
    option(
      "pommel",
      "pommelPerfume",
      "Perfume-Stopper",
      "Tempo-focused balance.",
      "Lightens recovery and improves mobility, but gives up some raw impact behind the weapon.",
      { steel: 2, leather: 1, blossom: 1 },
      0xc3cbd4,
      { moveSpeed: 6, dashCooldown: -16, heavyDamage: -1 },
      { pommelRadius: 1, tint: 0xd0d7de }
    ),
    option(
      "pommel",
      "pommelLobedWheel",
      "Lobed Wheel",
      "Stable parrying counterweight.",
      "Works well for disciplined guards, providing a touch more parry forgiveness and stamina flow.",
      { steel: 2, gemstone: 1, leather: 1 },
      0xb0bac4,
      { parryWindow: 8, staminaRegen: 1 },
      { pommelRadius: 3, tint: 0xc5cdd6 }
    ),
    option(
      "pommel",
      "pommelPeenedCounterweight",
      "Peened Counterweight",
      "Brings the sword back to hand.",
      "A heavier peen helps recover both light and heavy actions, though it adds a hint of sluggishness to footwork.",
      { steel: 3, wood: 1, stormglass: 1 },
      0x9da8b3,
      { heavyRecovery: -10, lightRecovery: -6, moveSpeed: -2 },
      { pommelRadius: 4, tint: 0xbac3cc }
    ),
    option(
      "pommel",
      "pommelHeavyApple",
      "Heavy Apple",
      "Raw finish bias.",
      "Pushes more mass into recovery and impact so slower swords hit with extra conviction.",
      { steel: 3, gemstone: 1, leather: 1 },
      0xa3adb8,
      { heavyDamage: 4, heavyImpactControlLoss: 10, moveSpeed: -5 },
      { pommelRadius: 5 }
    ),
    option(
      "pommel",
      "pommelHollowBronze",
      "Hollow Bronze",
      "Lighter rear tempo.",
      "Improves dash and repositioning while leaving the blade slightly less settled during impact.",
      { steel: 3, wood: 1, coral: 1 },
      0xd0b492,
      { dashSpeed: 18, dashCooldown: -14, incomingDamageScale: 0.01 },
      { pommelRadius: 2, tint: 0xd8bf9e }
    ),
    option(
      "pommel",
      "pommelTalismanCore",
      "Talisman Core",
      "Steady breath and guard.",
      "A charm-lined pommel that makes the weapon feel calmer under pressure.",
      { steel: 3, gemstone: 1, essence: 1 },
      0xc2ccd6,
      { staminaRegen: 2, parryReflectRatio: 0.03 },
      { pommelRadius: 3, tint: 0xd1d9e1 }
    ),
    option(
      "pommel",
      "pommelLongCounterweight",
      "Long Counterweight",
      "Supports extended grips.",
      "Useful for larger hilts and longer swords, helping heavy lunges and directional changes carry farther.",
      { steel: 3, wood: 1, leather: 1, gemstone: 1 },
      0xb6c0ca,
      { heavyLunge: 18, moveAcceleration: 40 },
      { pommelRadius: 3, tint: 0xc9d1d9 }
    ),
    option(
      "pommel",
      "pommelBreaker",
      "Breaker Pommel",
      "Violent rear mass.",
      "A brutal counterweight that strengthens binds and heavy finishes for aggressive lines.",
      { steel: 4, gemstone: 1, brimstone: 1 },
      0x9ea8b2,
      { heavyDamage: 3, parryReflectRatio: 0.05, lightDamage: 1 },
      { pommelRadius: 4, tint: 0xb8c0c8 }
    )
  ],
  hilt: [
    option(
      "hilt",
      "hiltStandardWrap",
      "Standard Wrap",
      "Baseline grip and handling.",
      "A neutral hilt setup that keeps the sword close to stock handling.",
      {},
      0x956948,
      {},
      {}
    ),
    option(
      "hilt",
      "hiltCordWrap",
      "Cord Wrap",
      "Tighter palm feedback.",
      "Adds texture and certainty in the grip so acceleration and stamina flow improve slightly.",
      { wood: 1, leather: 1 },
      0xa3744f,
      { moveAcceleration: 60, staminaRegen: 1 },
      { hiltLength: 4, tint: 0xa67953 }
    ),
    option(
      "hilt",
      "hiltLeatherSpiral",
      "Leather Spiral",
      "Responsive hand feel.",
      "Supports fast changes of line and shaves a little recovery off lighter actions.",
      { wood: 1, leather: 2 },
      0xa06f4d,
      { moveSpeed: 6, lightRecovery: -4 },
      { hiltLength: 6, tint: 0xb1805a }
    ),
    option(
      "hilt",
      "hiltRisers",
      "Raised Risers",
      "More positive indexing.",
      "Helps the hand settle into repeatable positions, improving control and bind readiness.",
      { wood: 1, leather: 1, gemstone: 1 },
      0xac7a55,
      { attackControlWindup: -5, parryWindow: 6 },
      { hiltWidth: 1, tint: 0xba8860 }
    ),
    option(
      "hilt",
      "hiltLongGrip",
      "Long Grip",
      "Extra leverage behind the hands.",
      "Extends the handle for longer heavy actions and a little more push through committed attacks.",
      { wood: 2, leather: 1 },
      0x99704e,
      { heavyLunge: 18, heavyDamage: 2, moveSpeed: -2 },
      { hiltLength: 12 }
    ),
    option(
      "hilt",
      "hiltHandAndHalf",
      "Hand-and-a-Half Grip",
      "Versatile leverage extension.",
      "Supports bigger swords without fully giving up one-handed agility.",
      { wood: 2, leather: 2 },
      0x9d744f,
      { heavyRecovery: -6, lightRecovery: -3, staminaMax: 4 },
      { hiltLength: 14, hiltWidth: 1 }
    ),
    option(
      "hilt",
      "hiltTwoHandedCore",
      "Two-Handed Core",
      "Leans hard into large-blade control.",
      "Improves power and sweep presence for claymores, montantes, and other larger blades, with a real mobility tax.",
      { wood: 2, leather: 2, steel: 1 },
      0x8f6948,
      { heavyDamage: 4, heavyWidth: 8, moveSpeed: -8 },
      { hiltLength: 18, hiltWidth: 2 }
    ),
    option(
      "hilt",
      "hiltFingerNotch",
      "Finger Notch Grip",
      "Fine point alignment.",
      "Encourages tighter point presentation and slightly improves both quick precision and bind timing.",
      { wood: 1, leather: 2, crystal: 1 },
      0xa67753,
      { lightDamage: 2, parryWindow: 10 },
      { hiltLength: 8, tint: 0xb68961 }
    ),
    option(
      "hilt",
      "hiltWaisted",
      "Waisted Grip",
      "Fast transition shape.",
      "Narrows the center of the handle for more agile footwork and better repositioning after action.",
      { wood: 1, leather: 2, blossom: 1 },
      0xb18259,
      { moveSpeed: 8, dashCooldown: -10 },
      { hiltLength: 10, hiltWidth: -1 }
    ),
    option(
      "hilt",
      "hiltOakCore",
      "Oak Core Grip",
      "Stable under force.",
      "A denser internal core that helps you stay together under pressure and extends endurance.",
      { wood: 2, leather: 1, steel: 1 },
      0x966a46,
      { incomingDamageScale: -0.03, staminaMax: 6 },
      { hiltWidth: 2 }
    ),
    option(
      "hilt",
      "hiltSharkskin",
      "Sharkskin Wrap",
      "Very secure traction.",
      "A rough, high-control wrap that tightens both light and heavy recovery through better grip security.",
      { wood: 1, leather: 2, coral: 1 },
      0x8f705b,
      { lightRecovery: -8, heavyRecovery: -4 },
      { hiltLength: 8, tint: 0xa78973 }
    ),
    option(
      "hilt",
      "hiltLacquered",
      "Lacquered Grip",
      "Smooth guided flow.",
      "Helps attacks stay active a little longer and keeps the sword moving cleanly through contact.",
      { wood: 2, leather: 1, gemstone: 1 },
      0x9d6d4c,
      { attackControlActive: 6, lightRange: 4 },
      { hiltLength: 9, tint: 0xb07c58 }
    ),
    option(
      "hilt",
      "hiltRingedHandle",
      "Ringed Handle",
      "Anchored in fast movement.",
      "Supports dashing back into clean hand positions and sharpens bind response afterward.",
      { wood: 2, leather: 2, crystal: 1 },
      0xa87651,
      { parryReflectRatio: 0.04, dashSpeed: 20 },
      { hiltLength: 10, hiltWidth: 1 }
    ),
    option(
      "hilt",
      "hiltSaddleGrip",
      "Saddle Grip",
      "Built for repeated redirection.",
      "Improves acceleration and dash readiness so spacing-based swords can re-enter more smoothly.",
      { wood: 2, leather: 2, bamboo: 1 },
      0xb08056,
      { moveAcceleration: 90, dashCooldown: -14 },
      { hiltLength: 12, hiltWidth: 1 }
    ),
    option(
      "hilt",
      "hiltClaymoreCore",
      "Claymore Core",
      "Full long-grip commitment.",
      "A long two-handed grip that gives large swords extra authority through both reach and broad cutting presence.",
      { wood: 2, leather: 2, steel: 2, gemstone: 1 },
      0x8a6344,
      { heavyLunge: 24, heavyWidth: 10, heavyDamage: 3, moveSpeed: -4 },
      { hiltLength: 20, hiltWidth: 2 }
    )
  ],
  tip: [
    option(
      "tip",
      "tipServicePoint",
      "Service Point",
      "Balanced default point.",
      "A neutral point profile that leaves the sword close to its base thrust behavior.",
      {},
      0xaac0de,
      {},
      {}
    ),
    option(
      "tip",
      "tipAcute",
      "Acute Point",
      "Longer, cleaner entry angle.",
      "Extends the point slightly so both quick pokes and committed thrusts arrive from a safer distance.",
      { steel: 1, crystal: 1 },
      0xb8cbe5,
      { lightRange: 8, heavyRange: 10 },
      { tipSize: 2 }
    ),
    option(
      "tip",
      "tipArmorPoint",
      "Armor Point",
      "Focused anti-armor pressure.",
      "Improves deeper committed thrusts and makes the heavy point feel more purposeful against protected targets.",
      { steel: 2, crystal: 1 },
      0xc2d3ea,
      { heavyRange: 12, heavyDamage: 2, heavyLunge: 16 },
      { tipSize: 3, tint: 0xd2dff0 }
    ),
    option(
      "tip",
      "tipLeaf",
      "Leaf Point",
      "Broader front-edge finish.",
      "Helps lighter cuts finish with a little more edge presence and stability near the front.",
      { steel: 1, wood: 1, leather: 1 },
      0x9db8da,
      { lightWidth: 6, lightDamage: 2 },
      { tipSize: 3 }
    ),
    option(
      "tip",
      "tipSpear",
      "Spear Point",
      "Strong midline authority.",
      "A sturdy spear-style point that gives the weapon a bit more reach without losing too much cut utility.",
      { steel: 2, wood: 1 },
      0xafc4e1,
      { heavyRange: 8, heavyWidth: 4, lightRange: 4 },
      { tipSize: 2, tint: 0xc8d8eb }
    ),
    option(
      "tip",
      "tipAwl",
      "Awl Point",
      "Fine precision and deflection.",
      "Keeps the point narrow and exact, slightly improving precision play and after-parry alignment.",
      { steel: 2, crystal: 1, leather: 1 },
      0xc4d6ec,
      { parryReflectRatio: 0.02, lightRange: 12 },
      { tipSize: 2, tint: 0xd7e4f2 }
    ),
    option(
      "tip",
      "tipReinforced",
      "Reinforced Tip",
      "Harder finish through contact.",
      "Thickens the point for harder impacts at the end of a committed line, especially on heavier thrusts.",
      { steel: 2, gemstone: 1 },
      0x9fb5d4,
      { heavyImpactControlLoss: 12, heavyDamage: 3 },
      { tipSize: 4 }
    ),
    option(
      "tip",
      "tipBodkin",
      "Bodkin Point",
      "Long straight anti-gap entry.",
      "Pushes the point toward long, narrow thrusts that favor direct line control over broad finishing cuts.",
      { steel: 3, crystal: 1, gemstone: 1 },
      0xb4c7df,
      { lightRange: 10, heavyRange: 14, heavyLunge: 18, heavyWidth: -4 },
      { tipSize: 2, tint: 0xd2deee }
    ),
    option(
      "tip",
      "tipClipped",
      "Clipped Point",
      "Lighter forward recovery.",
      "Keeps the forward end nimble so tempo-oriented swords recover a little more sharply.",
      { steel: 2, wood: 1, leather: 1 },
      0xadc1da,
      { lightRecovery: -6, moveSpeed: 4 },
      { tipSize: 1, tint: 0xc4d3e5 }
    ),
    option(
      "tip",
      "tipSpatulate",
      "Spatulate Point",
      "Broader end for edge finish.",
      "Less optimized for deep thrusting, but helpful for weapons that want a stronger terminal cut presence.",
      { steel: 2, wood: 1, leather: 1, coral: 1 },
      0x9ab3d2,
      { lightWidth: 8, heavyWidth: 8, heavyRange: -4 },
      { tipSize: 4 }
    ),
    option(
      "tip",
      "tipNeedle",
      "Needle Point",
      "Maximum reach and accuracy.",
      "Designed for straight-line play, greatly improving reach and committed thrust distance.",
      { steel: 3, crystal: 2, gemstone: 1 },
      0xc8d8eb,
      { lightRange: 14, heavyRange: 18, heavyLunge: 22, lightDamage: 1 },
      { tipSize: 1, tint: 0xe0eaf4 }
    ),
    option(
      "tip",
      "tipChisel",
      "Chisel Point",
      "Bluntly forceful forward mass.",
      "Builds a more forceful leading end so heavy attacks displace and interrupt more reliably.",
      { steel: 3, gemstone: 1, brimstone: 1 },
      0x96aac8,
      { heavyDamage: 4, heavyImpactDisplacement: 10 },
      { tipSize: 5 }
    ),
    option(
      "tip",
      "tipFoibleWeight",
      "Foible Weight",
      "Fast front-edge snapping.",
      "Places a little more life near the forward third, sharpening lighter strikes and quickening their return.",
      { steel: 3, leather: 1, gemstone: 1 },
      0xa8bedb,
      { lightDamage: 2, lightRecovery: -8, attackControlWindup: -4 },
      { tipSize: 2, tint: 0xcdddEE }
    ),
    option(
      "tip",
      "tipArmorSplitter",
      "Armor Splitter",
      "Committed penetrative finish.",
      "A brutal point profile that heavily rewards committed heavy entries, but asks for cleaner timing in return.",
      { steel: 4, crystal: 2, essence: 1 },
      0xb4c6dc,
      { heavyDamage: 5, heavyRange: 10, parryWindow: -4 },
      { tipSize: 3, tint: 0xd6e1ee }
    ),
    option(
      "tip",
      "tipWinged",
      "Winged Point",
      "Balanced point control and safety.",
      "Adds a little reach while also giving the hand more confidence after a successful bind or deflection.",
      { steel: 3, wood: 1, leather: 1, crystal: 1 },
      0xbfd0e5,
      { lightRange: 6, heavyRange: 8, parryWindow: 6 },
      { tipSize: 3, tint: 0xdbe6f2 }
    )
  ]
};

export const DEFAULT_SWORD_PART_OPTION_IDS: Record<SwordPartId, SwordPartOptionId> = {
  blade: "bladeFieldEdge",
  crossGuard: "guardSimpleQuillons",
  pommel: "pommelWheel",
  hilt: "hiltStandardWrap",
  tip: "tipServicePoint"
};

export const SWORD_PART_OPTIONS_BY_ID: Record<SwordPartOptionId, SwordPartOptionDefinition> = Object.values(SWORD_PART_OPTIONS)
  .flat()
  .reduce<Record<SwordPartOptionId, SwordPartOptionDefinition>>((accumulator, definition) => {
    accumulator[definition.id] = definition;
    return accumulator;
  }, {});

function applyEffects(stats: CombatStats, effects: SwordPartStatAdjustments): void {
  stats.maxHp += effects.maxHp ?? 0;
  stats.moveSpeed += effects.moveSpeed ?? 0;
  stats.moveAcceleration += effects.moveAcceleration ?? 0;
  stats.dashSpeed += effects.dashSpeed ?? 0;
  stats.dashDuration += effects.dashDuration ?? 0;
  stats.dashCooldown += effects.dashCooldown ?? 0;
  stats.attackControlWindup += effects.attackControlWindup ?? 0;
  stats.attackControlActive += effects.attackControlActive ?? 0;
  stats.parryWindow += effects.parryWindow ?? 0;
  stats.parryReflectRatio += effects.parryReflectRatio ?? 0;
  stats.staminaMax += effects.staminaMax ?? 0;
  stats.staminaRegen += effects.staminaRegen ?? 0;
  stats.incomingDamageScale += effects.incomingDamageScale ?? 0;
  stats.pickupRadius += effects.pickupRadius ?? 0;

  stats.lightAttack.damage += effects.lightDamage ?? 0;
  stats.heavyAttack.damage += effects.heavyDamage ?? 0;
  stats.lightAttack.range += effects.lightRange ?? 0;
  stats.heavyAttack.range += effects.heavyRange ?? 0;
  stats.lightAttack.width += effects.lightWidth ?? 0;
  stats.heavyAttack.width += effects.heavyWidth ?? 0;
  stats.lightAttack.recovery += effects.lightRecovery ?? 0;
  stats.heavyAttack.recovery += effects.heavyRecovery ?? 0;
  stats.lightAttack.windup += effects.lightWindup ?? 0;
  stats.heavyAttack.windup += effects.heavyWindup ?? 0;
  stats.lightAttack.lunge += effects.lightLunge ?? 0;
  stats.heavyAttack.lunge += effects.heavyLunge ?? 0;
  stats.lightAttack.impact.controlLossMs += effects.lightImpactControlLoss ?? 0;
  stats.heavyAttack.impact.controlLossMs += effects.heavyImpactControlLoss ?? 0;
  stats.lightAttack.impact.displacement += effects.lightImpactDisplacement ?? 0;
  stats.heavyAttack.impact.displacement += effects.heavyImpactDisplacement ?? 0;
}

export function applySwordPartModifications(
  stats: CombatStats,
  equippedOptionIds: Record<SwordPartId, SwordPartOptionId>
): void {
  for (const partId of Object.keys(equippedOptionIds) as SwordPartId[]) {
    const definition = SWORD_PART_OPTIONS_BY_ID[equippedOptionIds[partId]];

    if (!definition) {
      continue;
    }

    applyEffects(stats, definition.effects);
  }
}
