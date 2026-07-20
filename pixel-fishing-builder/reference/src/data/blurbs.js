// Short bestiary blurbs. Specific ones for iconic fish; the rest are generated from data.
const SPECIFIC = {
  anglerfish: 'Dangles a glowing lure from its head to draw prey into the pitch dark.',
  coelacanth: 'A living fossil once believed extinct for 65 million years.',
  giant_oarfish: 'The longest bony fish alive — sailors once mistook it for a sea serpent.',
  gulper_eel: 'Almost all mouth, it can swallow prey larger than itself.',
  viperfish: 'Fangs so long they will not fit inside its own mouth.',
  blue_marlin: 'A blue rocket of muscle that can sprint faster than a racehorse.',
  bluefin_tuna: 'Warm-blooded and torpedo-shaped, built for ocean-crossing speed.',
  arapaima: 'A giant of the Amazon that must surface to gulp air.',
  pufferfish: 'Inflates into a spiky ball when threatened — and is wildly toxic.',
  clownfish: 'Lives safely among the stinging tentacles of sea anemones.',
  blobfish: 'A gelatinous blob at depth; it only looks sad out of water.',
  coelacanth_dummy: '',
  hammerhead: 'Its wide head is packed with sensors for hunting hidden prey.',
  koi: 'Prized ornamental carp — some live well over a century.',
}

const HABITAT = {
  fresh: 'freshwater lakes and rivers',
  brackish: 'the mix of river and sea',
  salt: 'the open saltwater coast',
  deepsea: 'the crushing deep sea',
}

const RARITY_LEAD = {
  common: 'A familiar face around',
  uncommon: 'A welcome sight in',
  rare: 'An uncommon prize from',
  epic: 'A prized catch from',
  legendary: 'A legendary trophy of',
}

export function blurb(fish) {
  if (SPECIFIC[fish.id]) return SPECIFIC[fish.id]
  return `${RARITY_LEAD[fish.rarity]} ${HABITAT[fish.habitat]}, reaching up to ${fish.maxSize} cm.`
}
