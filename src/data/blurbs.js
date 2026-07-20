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
  greenland_shark: 'The longest-lived vertebrate — some are over 400 years old.',
  giant_squid: 'The kraken of legend. Its eyes are the size of dinner plates.',
  manta_ray: 'A gentle giant that glides through the reef on 7-meter wings.',
  archerfish: 'Shoots insects off branches with a precise jet of water.',
  mandarinfish: 'Possibly the most psychedelic paint job in the ocean.',
  vampire_squid: 'Neither vampire nor squid — it turns itself inside out when scared.',
  giant_isopod: 'A deep-sea pillbug the size of a house cat.',
  chimaera: 'A ghostly relative of sharks that split off 400 million years ago.',
  wels_catfish: 'River monster of Europe — rumored to swallow ducks whole.',
  beluga_sturgeon: 'Source of the world\'s most expensive caviar, and older than dinosaurs.',
  ocean_sunfish: 'A three-meter swimming head that sunbathes at the surface.',
  golden_dorado: 'The river tiger — a blaze of gold with a bulldog\'s attitude.',
}

const HABITAT = {
  fresh: 'freshwater lakes and rivers',
  river: 'cold, fast mountain rivers',
  brackish: 'the mix of river and sea',
  salt: 'the open saltwater coast',
  reef: 'the bustling coral reef',
  ice: 'the frozen fjord',
  deepsea: 'the crushing deep sea',
  wreck: 'the haunted timbers of the sunken wreck',
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
