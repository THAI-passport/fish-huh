// Achievements. test(x) runs against a derived stats object built in App.
export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Catch', icon: '🎣', desc: 'Land your very first fish', test: (x) => x.total >= 1 },
  { id: 'ten', name: 'Getting the Hang of It', icon: '🐟', desc: 'Catch 10 fish', test: (x) => x.total >= 10 },
  { id: 'fifty', name: 'Old Salt', icon: '⚓', desc: 'Catch 50 fish', test: (x) => x.total >= 50 },
  { id: 'hundred', name: 'Sea Dog', icon: '🌊', desc: 'Catch 100 fish', test: (x) => x.total >= 100 },
  { id: 'collector', name: 'Collector', icon: '📖', desc: 'Discover 10 species', test: (x) => x.species >= 10 },
  { id: 'naturalist', name: 'Naturalist', icon: '🔬', desc: 'Discover 25 species', test: (x) => x.species >= 25 },
  { id: 'complete', name: 'Gotta Catch Them All', icon: '🏆', desc: 'Discover every species', test: (x) => x.species >= x.totalSpecies },
  { id: 'legend', name: 'The Legend', icon: '🌟', desc: 'Land a legendary fish', test: (x) => x.legendary },
  { id: 'streak5', name: 'On Fire', icon: '🔥', desc: 'Catch 5 in a row', test: (x) => x.maxStreak >= 5 },
  { id: 'streak10', name: 'Unstoppable', icon: '💥', desc: 'Catch 10 in a row', test: (x) => x.maxStreak >= 10 },
  { id: 'globe', name: 'Globetrotter', icon: '🗺️', desc: 'Catch a fish in every zone', test: (x) => x.zonesFished >= 4 },
  { id: 'shiny', name: 'Shiny Hunter', icon: '✨', desc: 'Catch a shiny fish', test: (x) => x.shinies >= 1 },
  { id: 'big', name: 'Trophy Catch', icon: '🐋', desc: 'Land a fish 200 cm or bigger', test: (x) => x.biggest >= 200 },
]
