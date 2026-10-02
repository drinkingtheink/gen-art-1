/**
 * Named palettes.
 *
 * Colours are ordered quiet -> loud. rng.weighted() favours the front of the
 * list, so the first entry reads as the dominant field and the last as a rare
 * accent; line-based generators reverse this, because a thin stroke in the
 * quietest colour disappears. `bg` is the paper the piece sits on.
 *
 * Every set is scored on luminance range x mean saturation, and the number is
 * in the comment above its colours. 0.42 is where a set starts reading as bland
 * or midtone-heavy on screen — greys, and anything whose colours all sit at the
 * same value.
 *
 * That used to be a hard floor. It is now a floor for the first fifty and a
 * marker for the rest. The seventy-five that follow them are curated rather
 * than constructed, and a palette built by a person to be looked at as a strip
 * is not the same object as one built to be weighted by an rng: it holds
 * together, and a good half of them score under 0.42 while still being worth
 * having. Ten are frankly pastel and eight are near enough one hue. The score
 * is still recorded for every set, so what each one is stays legible — read it
 * as a description, not a pass mark.
 *
 * Sets are also kept apart from one another, not just from mud, measured as the
 * mean nearest-colour CIE Lab distance between their two colour sets. The first
 * fifty hold 22; the curated ones hold 16. The lower number is the price of
 * taking them from one source — trending palettes return to the same few
 * subjects, and at 22 only 33 of them survived. Below 16 they start to read as
 * the same palette twice, which is the thing the rule is for.
 *
 * Seventeen pairs among the first fifty are already under 22, jadeite and jade
 * worst at 13.03, sharing a yellow to within two hex digits. They are left
 * alone because permalinks carry palette ids and retuning a colour changes what
 * an existing link renders.
 */
const PALETTES = [
  {
    id: 'dusk-tide',
    name: 'Dusk Tide',
    bg: '#16222f',
    // 0.18
    colors: ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b'],
  },
  {
    id: 'sunset-bliss',
    name: 'Sunset Bliss',
    bg: '#d9e5d6',
    // 0.19
    colors: ['#d9e5d6', '#eddea4', '#f7a072', '#ff9b42', '#00a7e1'],
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    bg: '#f7f7ff',
    // 0.20
    colors: ['#f7f7ff', '#bdd5ea', '#495867', '#577399', '#fe5f55'],
  },
  {
    id: 'vibrant-nature-hues',
    name: 'Vibrant Nature Hues',
    bg: '#aaf683',
    // 0.20
    colors: ['#aaf683', '#ffd97d', '#60d394', '#ff9b85', '#ee6055'],
  },
  {
    id: 'dovecote',
    name: 'Dovecote',
    bg: '#e4ded6',
    // 0.21
    colors: ['#e4ded6', '#d5cbba', '#758398', '#fa72a7', '#2d2656'],
  },
  {
    id: 'forest-dream',
    name: 'Forest Dream',
    bg: '#c3e8bd',
    // 0.21
    colors: ['#c3e8bd', '#9ddbad', '#8eb897', '#5b7553', '#040403'],
  },
  {
    id: 'purple-dream',
    name: 'Purple Dream',
    bg: '#e0b1cb',
    // 0.22
    colors: ['#e0b1cb', '#be95c4', '#9f86c0', '#5e548e', '#231942'],
  },
  {
    id: 'neutral-harmony-bliss',
    name: 'Neutral Harmony Bliss',
    bg: '#f4f1de',
    // 0.23
    colors: ['#f4f1de', '#f2cc8f', '#81b29a', '#e07a5f', '#3d405b'],
  },
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    bg: '#ffffff',
    // 0.24
    colors: ['#ffffff', '#ffd5c2', '#588b8b', '#f28f3b', '#c8553d'],
  },
  {
    id: 'warm-harvest',
    name: 'Warm Harvest',
    bg: '#eef1bd',
    // 0.24
    colors: ['#eef1bd', '#bbd686', '#c4a381', '#b2675e', '#644536'],
  },
  {
    id: 'sunflower-fields',
    name: 'Sunflower Fields',
    bg: '#ffee32',
    // 0.28
    colors: ['#ffee32', '#d6d6d6', '#ffd100', '#333533', '#202020'],
  },
  {
    id: 'floral-sunset-melody',
    name: 'Floral Sunset Melody',
    bg: '#ffca3a',
    // 0.29
    colors: ['#ffca3a', '#36949d', '#4267ac', '#ff595e', '#6a4c93'],
  },
  {
    id: 'gothic-romance',
    name: 'Gothic Romance',
    bg: '#f2f4f3',
    // 0.29
    colors: ['#f2f4f3', '#a9927d', '#5e503f', '#0a0908', '#49111c'],
  },
  {
    id: 'vintage-vibes',
    name: 'Vintage Vibes',
    bg: '#f1dac4',
    // 0.30
    colors: ['#f1dac4', '#a69cac', '#474973', '#0d0c1d', '#161b33'],
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    bg: '#ffd9da',
    // 0.32
    colors: ['#ffd9da', '#30343f', '#1b2021', '#ea638c', '#89023e'],
  },
  {
    id: 'fairy-bloom',
    name: 'Fairy Bloom',
    bg: '#ffdde1',
    // 0.32
    colors: ['#ffdde1', '#ffb8de', '#ff74d4', '#ff36ab', '#642ca9'],
  },
  {
    id: 'mossy-woods',
    name: 'Mossy Woods',
    bg: '#d6d5c9',
    // 0.32
    colors: ['#d6d5c9', '#b9baa3', '#0a100d', '#902923', '#a22c29'],
  },
  {
    id: 'shore-pine',
    name: 'Shore Pine',
    bg: '#e9c46a',
    // 0.32
    colors: ['#e9c46a', '#f4a261', '#2a9d8f', '#e76f51', '#264653'],
  },
  {
    id: 'golden-harvest',
    name: 'Golden Harvest',
    bg: '#f3ffb6',
    // 0.33
    colors: ['#f3ffb6', '#739e82', '#d38b5d', '#2c5530', '#99621e'],
  },
  {
    id: 'monochrome-magic',
    name: 'Monochrome Magic',
    bg: '#eaeaea',
    // 0.34
    colors: ['#eaeaea', '#050404', '#2e1c2b', '#893168', '#4a1942'],
  },
  {
    id: 'summer-dream',
    name: 'Summer Dream',
    bg: '#fdfcdc',
    // 0.34
    colors: ['#fdfcdc', '#fed9b7', '#00afb9', '#f07167', '#0081a7'],
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    bg: '#f9eee7',
    // 0.34
    colors: ['#f9eee7', '#e8bcbb', '#7e8f6d', '#b25d40', '#550f05'],
  },
  {
    id: 'forest-hues',
    name: 'Forest Hues',
    bg: '#edddd4',
    // 0.35
    colors: ['#edddd4', '#283d3b', '#197278', '#772e25', '#c44536'],
  },
  {
    id: 'oceanic-cactus',
    name: 'Oceanic Cactus',
    bg: '#f7fff7',
    // 0.36
    colors: ['#f7fff7', '#ffe66d', '#4ecdc4', '#1a535c', '#ff6b6b'],
  },
  {
    id: 'shoreline',
    name: 'Shoreline',
    bg: '#f9f7f3',
    // 0.36
    colors: ['#f9f7f3', '#b5e2fa', '#0fa3b1', '#2a9d8f', '#264653'],
  },
  {
    id: 'iceflow',
    name: 'Iceflow',
    bg: '#daf4f2',
    // 0.37
    colors: ['#daf4f2', '#9bd9f1', '#a5dcb2', '#403198', '#380d67'],
  },
  {
    id: 'magical-seaside',
    name: 'Magical Seaside',
    bg: '#efea5a',
    // 0.37
    colors: ['#efea5a', '#83e377', '#f29e4c', '#048ba8', '#54478c'],
  },
  {
    id: 'meadow-green',
    name: 'Meadow Green',
    bg: '#d9ed92',
    // 0.38
    colors: ['#d9ed92', '#99d98c', '#34a0a4', '#1a759f', '#184e77'],
  },
  {
    id: 'sweet-sunshine',
    name: 'Sweet Sunshine',
    bg: '#f0c987',
    // 0.39
    colors: ['#f0c987', '#89bd9e', '#db4c40', '#3c153b', '#8b1e3f'],
  },
  {
    id: 'vibrant-nature',
    name: 'Vibrant Nature',
    bg: '#f4f0bb',
    // 0.39
    colors: ['#f4f0bb', '#87c38f', '#226f54', '#43291f', '#da2c38'],
  },
  {
    id: 'colorful-daybreak',
    name: 'Colorful Daybreak',
    bg: '#f7b801',
    // 0.40
    colors: ['#f7b801', '#f18701', '#7678ed', '#f35b04', '#3d348b'],
  },
  {
    id: 'driftwood',
    name: 'Driftwood',
    bg: '#d5bfb1',
    // 0.40
    colors: ['#d5bfb1', '#1d8ea0', '#82514a', '#030305', '#0a3a3e'],
  },
  {
    id: 'golden-glow',
    name: 'Golden Glow',
    bg: '#d7e8ba',
    // 0.41
    colors: ['#d7e8ba', '#4da1a9', '#ffa630', '#2e5077', '#611c35'],
  },
  {
    id: 'mystical-forest-glow',
    name: 'Mystical Forest Glow',
    bg: '#b5dead',
    // 0.41
    colors: ['#b5dead', '#b0ca87', '#809848', '#442220', '#2e0014'],
  },
  {
    id: 'ocean-serenity',
    name: 'Ocean Serenity',
    bg: '#eff6e0',
    // 0.41
    colors: ['#eff6e0', '#aec3b0', '#598392', '#124559', '#01161e'],
  },
  {
    id: 'fiery-palette',
    name: 'Fiery Palette',
    bg: '#28061b',
    // 0.42
    colors: ['#5f0f40', '#9a031e', '#0f4c5c', '#e36414', '#fb8b24'],
  },
  {
    id: 'summer-sunset',
    name: 'Summer Sunset',
    bg: '#efefd0',
    // 0.42
    colors: ['#efefd0', '#f7c59f', '#1a659e', '#ff6b35', '#004e89'],
  },
  {
    id: 'autumn-harvest',
    name: 'Autumn Harvest',
    bg: '#ffe6a7',
    // 0.44
    colors: ['#ffe6a7', '#bb9457', '#99582a', '#432818', '#6f1d1b'],
  },
  {
    id: 'blue-lagoon',
    name: 'Blue Lagoon',
    bg: '#020b0f',
    // 0.44
    colors: ['#051923', '#003554', '#006494', '#0582ca', '#00a6fb'],
  },
  {
    id: 'cherry-blossom-bloom',
    name: 'Cherry Blossom Bloom',
    bg: '#fff0f3',
    // 0.44
    colors: ['#fff0f3', '#ffb3c1', '#ff758f', '#590d22', '#a4133c'],
  },
  {
    id: 'neon-summer-glow',
    name: 'Neon Summer Glow',
    bg: '#b4ffff',
    // 0.44
    colors: ['#b4ffff', '#fed811', '#fdc100', '#02cecb', '#06837f'],
  },
  {
    id: 'riso',
    name: 'Riso',
    bg: '#fdf8f0',
    // 0.44
    colors: ['#fdf8f0', '#ffe800', '#00a95c', '#0078bf', '#ff48b0'],
  },
  {
    id: 'vibrant-color-blast',
    name: 'Vibrant Color Blast',
    bg: '#ffbc42',
    // 0.44
    colors: ['#ffbc42', '#0496ff', '#006ba6', '#8f2d56', '#d81159'],
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    bg: '#050d1f',
    // 0.45
    colors: ['#14275c', '#2f5fd0', '#5e9cff', '#a9d4ff', '#ffe066'],
  },
  {
    id: 'rosewood',
    name: 'Rosewood',
    bg: '#9ad5ca',
    // 0.45
    colors: ['#9ad5ca', '#ff7477', '#4a6c6f', '#23001e', '#8c1c13'],
  },
  {
    id: 'vibrant-color-fiesta',
    name: 'Vibrant Color Fiesta',
    bg: '#ffbe0b',
    // 0.45
    colors: ['#ffbe0b', '#3a86ff', '#fb5607', '#8338ec', '#ff006e'],
  },
  {
    id: 'coastal-blues',
    name: 'Coastal Blues',
    bg: '#a9d6e5',
    // 0.46
    colors: ['#a9d6e5', '#61a5c2', '#2c7da0', '#01497c', '#012a4a'],
  },
  {
    id: 'moss',
    name: 'Moss',
    bg: '#fcfffc',
    // 0.46
    colors: ['#fcfffc', '#2d3a3a', '#2ba84a', '#248232', '#040f0f'],
  },
  {
    id: 'bold-hues',
    name: 'Bold Hues',
    bg: '#180544',
    // 0.47
    colors: ['#3a0ca3', '#7209b7', '#f72585', '#4361ee', '#4cc9f0'],
  },
  {
    id: 'bindweed',
    name: 'Bindweed',
    bg: '#f7f2e6',
    // 0.48
    colors: ['#25113d', '#7b4ab8', '#b98ce8', '#f6e48a', '#c8ff2e'],
  },
  {
    id: 'geyser',
    name: 'Geyser',
    bg: '#eef5f2',
    // 0.48
    colors: ['#073d4a', '#1f96a8', '#8fe0cf', '#f5e04a', '#e85a14'],
  },
  {
    id: 'gradient-blues',
    name: 'Gradient Blues',
    bg: '#80ffdb',
    // 0.48
    colors: ['#80ffdb', '#64dfdf', '#48bfe3', '#5e60ce', '#7400b8'],
  },
  {
    id: 'ocotillo',
    name: 'Ocotillo',
    bg: '#f5ecd8',
    // 0.48
    colors: ['#241f0e', '#5c6b2f', '#f2dca0', '#f5a623', '#e0197f'],
  },
  {
    id: 'refreshing-aqua-tones',
    name: 'Refreshing Aqua Tones',
    bg: '#9fffcb',
    // 0.48
    colors: ['#9fffcb', '#7ae582', '#25a18e', '#00a5cf', '#004e64'],
  },
  {
    id: 'vibrant-sunset',
    name: 'Vibrant Sunset',
    bg: '#0f021d',
    // 0.48
    colors: ['#240046', '#5a189a', '#9d4edd', '#ff6d00', '#ff8500'],
  },
  {
    id: 'mesa',
    name: 'Mesa',
    bg: '#f2e6d2',
    // 0.49
    colors: ['#1f120e', '#2f6b5c', '#f2dca8', '#cf7a2a', '#e34a14'],
  },
  {
    id: 'red-sunburst',
    name: 'Red Sunburst',
    bg: '#210205',
    // 0.49
    colors: ['#4f000b', '#720026', '#ce4257', '#ff7f51', '#ff9b54'],
  },
  {
    id: 'refreshing-summer-fun',
    name: 'Refreshing Summer Fun',
    bg: '#8ecae6',
    // 0.49
    colors: ['#8ecae6', '#ffb703', '#219ebc', '#fb8500', '#023047'],
  },
  {
    id: 'ukiyo',
    name: 'Ukiyo',
    bg: '#f2ece0',
    // 0.49
    colors: ['#101c3d', '#3d7fa6', '#e8dca8', '#c25a2a', '#c8203c'],
  },
  {
    id: 'fauve',
    name: 'Fauve',
    bg: '#f5efe2',
    // 0.50
    colors: ['#123f2e', '#1f6fa8', '#f2d94a', '#e8431f', '#ff1f8f'],
  },
  {
    id: 'tropic',
    name: 'Tropic',
    bg: '#041012',
    // 0.50
    colors: ['#0d3a37', '#16a08f', '#ffd12e', '#ff6b3d', '#ff2d8f'],
  },
  {
    id: 'turquoise-harmony',
    name: 'Turquoise Harmony',
    bg: '#f0f3bd',
    // 0.50
    colors: ['#f0f3bd', '#02c39a', '#00a896', '#028090', '#05668d'],
  },
  {
    id: 'cochineal',
    name: 'Cochineal',
    bg: '#fdf4f6',
    // 0.51
    colors: ['#f6a8bd', '#c2185b', '#3d0a2b', '#ff3d6e', '#ffcf3d'],
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    bg: '#0a0410',
    // 0.51
    colors: ['#2e0a2c', '#8a1063', '#e0229c', '#ff6fc8', '#ffd1ec'],
  },
  {
    id: 'thicket',
    name: 'Thicket',
    bg: '#f7f4ec',
    // 0.51
    colors: ['#8fd98a', '#1d6b45', '#2a1208', '#b5431c', '#f2b705'],
  },
  {
    id: 'autumn-glow',
    name: 'Autumn Glow',
    bg: '#f7b538',
    // 0.52
    colors: ['#f7b538', '#db7c26', '#d8572a', '#c32f27', '#780116'],
  },
  {
    id: 'smoulder',
    name: 'Smoulder',
    bg: '#11020f',
    // 0.52
    colors: ['#290023', '#2f4111', '#802352', '#c63906', '#f09a05'],
  },
  {
    id: 'sodium',
    name: 'Sodium',
    bg: '#10101c',
    // 0.52
    colors: ['#2a2440', '#f5e6c8', '#ffb000', '#ff6a00', '#ff2d55'],
  },
  {
    id: 'vivid-nightfall',
    name: 'Vivid Nightfall',
    bg: '#e0aaff',
    // 0.52
    colors: ['#e0aaff', '#9d4edd', '#10002b', '#7b2cbf', '#3c096c'],
  },
  {
    id: 'watermelon-sorbet',
    name: 'Watermelon Sorbet',
    bg: '#ffd166',
    // 0.52
    colors: ['#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#ef476f'],
  },
  {
    id: 'dark-sunset',
    name: 'Dark Sunset',
    bg: '#fff3b0',
    // 0.53
    colors: ['#fff3b0', '#e09f3e', '#335c67', '#9e2a2b', '#540b0e'],
  },
  {
    id: 'enchanted-forest-whimsy',
    name: 'Enchanted Forest Whimsy',
    bg: '#0c020a',
    // 0.54
    colors: ['#1c0118', '#370926', '#42113c', '#618b25', '#6bd425'],
  },
  {
    id: 'flame',
    name: 'Flame',
    bg: '#f4eed2',
    // 0.54
    colors: ['#eae2b7', '#fcbf49', '#003049', '#f77f00', '#d62828'],
  },
  {
    id: 'jadeite',
    name: 'Jadeite',
    bg: '#04100d',
    // 0.54
    colors: ['#0c2f28', '#0f6b52', '#17c48e', '#5cffd0', '#ffd23d'],
  },
  {
    id: 'ozone',
    name: 'Ozone',
    bg: '#060d14',
    // 0.54
    colors: ['#0f2b40', '#1f7fc2', '#4fd6ff', '#c9fbff', '#a3ff12'],
  },
  {
    id: 'pennant',
    name: 'Pennant',
    bg: '#f7f4ef',
    // 0.54
    colors: ['#8fb8f5', '#0d1b2e', '#00843d', '#c8102e', '#ffc400'],
  },
  {
    id: 'tidal-rust',
    name: 'Tidal Rust',
    bg: '#02080b',
    // 0.54
    colors: ['#001219', '#9b2226', '#0a9396', '#bb3e03', '#ee9b00'],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    bg: '#f8f9fa',
    // 0.54
    colors: ['#f8f9fa', '#ffd60a', '#0033cc', '#e63946', '#0b090a'],
  },
  {
    id: 'acid',
    name: 'Acid',
    bg: '#0b0b10',
    // 0.55
    colors: ['#2f2f4a', '#7b2ff7', '#00e5a0', '#f2ff49', '#ff2e93'],
  },
  {
    id: 'aster',
    name: 'Aster',
    bg: '#f5f6fb',
    // 0.55
    colors: ['#9fb0ef', '#2a2fc0', '#0d0f3d', '#ffd500', '#ff2e7a'],
  },
  {
    id: 'klaxon',
    name: 'Klaxon',
    bg: '#fbfbf9',
    // 0.55
    colors: ['#9fe8f2', '#00a3c4', '#1b1b3a', '#ffd400', '#ff1f8f'],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    bg: '#03080e',
    // 0.55
    colors: ['#092a45', '#0f6f8f', '#1bbfae', '#8f4dff', '#ffcf2e'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: '#050d16',
    // 0.56
    colors: ['#0f2338', '#3fa7ff', '#b14aff', '#00ffc8', '#eaffff'],
  },
  {
    id: 'citrus',
    name: 'Citrus',
    bg: '#d3fad6',
    // 0.56
    colors: ['#d3fad6', '#f7d488', '#f3b61f', '#e01a4f', '#270722'],
  },
  {
    id: 'ensign',
    name: 'Ensign',
    bg: '#f1f3f6',
    // 0.56
    colors: ['#b3d4ff', '#2a5db0', '#071634', '#ff8a00', '#e01b24'],
  },
  {
    id: 'golden-spice',
    name: 'Golden Spice',
    bg: '#eecf6d',
    // 0.56
    colors: ['#eecf6d', '#d5ac4e', '#8b6220', '#45050c', '#720e07'],
  },
  {
    id: 'hedgerow',
    name: 'Hedgerow',
    bg: '#f9f5f0',
    // 0.56
    colors: ['#c2d98f', '#2f7a12', '#2a0b26', '#a81070', '#ffc107'],
  },
  {
    id: 'helium',
    name: 'Helium',
    bg: '#0f0410',
    // 0.56
    colors: ['#35102e', '#a82a5e', '#ff5c7a', '#ffd84d', '#00e5ff'],
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    bg: '#01090f',
    // 0.56
    colors: ['#082a3d', '#0f6f99', '#17c8e0', '#6cf7ff', '#ff4d6d'],
  },
  {
    id: 'vibrant-spring',
    name: 'Vibrant Spring',
    bg: '#b2ff9e',
    // 0.56
    colors: ['#b2ff9e', '#affc41', '#1dd3b0', '#086375', '#3c1642'],
  },
  {
    id: 'cinnabar',
    name: 'Cinnabar',
    bg: '#0a0403',
    // 0.57
    colors: ['#4a0d06', '#a81f0c', '#f03a10', '#ff8a2b', '#00ecd1'],
  },
  {
    id: 'cyanotype',
    name: 'Cyanotype',
    bg: '#f1f4f8',
    // 0.57
    colors: ['#04080f', '#10325e', '#4b86c9', '#cfe4f7', '#ffdd00'],
  },
  {
    id: 'forge',
    name: 'Forge',
    bg: '#edc200',
    // 0.57
    colors: ['#edc200', '#ec9411', '#f66420', '#d92e14', '#a00000'],
  },
  {
    id: 'oxblood',
    name: 'Oxblood',
    bg: '#fdf6ec',
    // 0.57
    colors: ['#f4d58d', '#e35337', '#8c1c13', '#2b0307', '#ffffff'],
  },
  {
    id: 'vibrant-fusion',
    name: 'Vibrant Fusion',
    bg: '#ffd300',
    // 0.57
    colors: ['#ffd300', '#0aff99', '#147df5', '#be0aff', '#ff0000'],
  },
  {
    id: 'bitumen',
    name: 'Bitumen',
    bg: '#0c0806',
    // 0.59
    colors: ['#140a02', '#4a2a10', '#a16c38', '#f0dcb8', '#00e5ff'],
  },
  {
    id: 'fiery-ocean',
    name: 'Fiery Ocean',
    bg: '#fdf0d5',
    // 0.59
    colors: ['#fdf0d5', '#669bbc', '#003049', '#780000', '#c1121f'],
  },
  {
    id: 'venom',
    name: 'Venom',
    bg: '#030a06',
    // 0.59
    colors: ['#0a2e18', '#0f7a35', '#1fd65a', '#7dff3d', '#ff00a8'],
  },
  {
    id: 'cherry-bomb',
    name: 'Cherry Bomb',
    bg: '#ffcbdd',
    // 0.60
    colors: ['#ffcbdd', '#fb4b4e', '#3e000c', '#7c0b2b', '#d10000'],
  },
  {
    id: 'cryolite',
    name: 'Cryolite',
    bg: '#eef4f8',
    // 0.60
    colors: ['#120c4d', '#1f3fc4', '#1f8fe0', '#3fdde0', '#a8f7ff'],
  },
  {
    id: 'jewel',
    name: 'Jewel',
    bg: '#06040a',
    // 0.60
    colors: ['#1a0f3d', '#153fa8', '#0f9e6b', '#c41e5c', '#ffc824'],
  },
  {
    id: 'marigold',
    name: 'Marigold',
    bg: '#fffaeb',
    // 0.60
    colors: ['#ffeeb8', '#ffd23f', '#f2a007', '#c25e00', '#3d2308'],
  },
  {
    id: 'bramble',
    name: 'Bramble',
    bg: '#f2f5ec',
    // 0.61
    colors: ['#03140a', '#10561f', '#2f8f4c', '#d8f0a8', '#ff007f'],
  },
  {
    id: 'ocean-sunset',
    name: 'Ocean Sunset',
    bg: '#f0f0c9',
    // 0.61
    colors: ['#f0f0c9', '#f2bb05', '#124e78', '#d74e09', '#6e0e0a'],
  },
  {
    id: 'chlorophyll',
    name: 'Chlorophyll',
    bg: '#08110a',
    // 0.63
    colors: ['#0a2e14', '#17662a', '#4fa314', '#a8d419', '#eaff4a'],
  },
  {
    id: 'voltage',
    name: 'Voltage',
    bg: '#01050f',
    // 0.63
    colors: ['#0b1240', '#2233ff', '#00b3ff', '#7de8ff', '#ff2e00'],
  },
  {
    id: 'citron',
    name: 'Citron',
    bg: '#0a0c02',
    // 0.64
    colors: ['#2b3206', '#7a8c0b', '#cfe015', '#fff23d', '#ff3b1f'],
  },
  {
    id: 'bright-green',
    name: 'Bright Green',
    bg: '#ccff33',
    // 0.65
    colors: ['#ccff33', '#70e000', '#38b000', '#004b23', '#007200'],
  },
  {
    id: 'electric',
    name: 'Electric',
    bg: '#10002b',
    // 0.65
    colors: ['#3c096c', '#9b5de5', '#00bbf9', '#00f5d4', '#fee440'],
  },
  {
    id: 'purple-sunset',
    name: 'Purple Sunset',
    bg: '#ffbd00',
    // 0.65
    colors: ['#ffbd00', '#ff5400', '#9e0059', '#ff0054', '#390099'],
  },
  {
    id: 'solar',
    name: 'Solar',
    bg: '#0e0900',
    // 0.65
    colors: ['#3a2600', '#a06a00', '#ffc400', '#ffef8a', '#7c3bff'],
  },
  {
    id: 'jade',
    name: 'Jade',
    bg: '#f0fffc',
    // 0.66
    colors: ['#b2f7ef', '#00a878', '#ffd23f', '#00332c', '#011c1a'],
  },
  {
    id: 'electric-rainbow-burst',
    name: 'Electric Rainbow Burst',
    bg: '#adff02',
    // 0.67
    colors: ['#adff02', '#ffdd00', '#01befe', '#ff006d', '#8f00ff'],
  },
  {
    id: 'iris',
    name: 'Iris',
    bg: '#0a0518',
    // 0.67
    colors: ['#1d0a4d', '#4f19c4', '#8b2bff', '#c86bff', '#f7ff4d'],
  },
  {
    id: 'nautical-blues',
    name: 'Nautical Blues',
    bg: '#a6e1fa',
    // 0.67
    colors: ['#a6e1fa', '#0e6ba8', '#00072d', '#001c55', '#0a2472'],
  },
  {
    id: 'sunny-beach-day',
    name: 'Sunny Beach Day',
    bg: '#ffecd1',
    // 0.67
    colors: ['#ffecd1', '#15616d', '#ff7d00', '#001524', '#78290f'],
  },
  {
    id: 'fiery-red-sunset',
    name: 'Fiery Red Sunset',
    bg: '#ffba08',
    // 0.68
    colors: ['#ffba08', '#f48c06', '#03071e', '#dc2f02', '#6a040f'],
  },
  {
    id: 'plasma',
    name: 'Plasma',
    bg: '#0d0221',
    // 0.68
    colors: ['#2d0b4e', '#7209b7', '#f72585', '#ff8500', '#ffe66d'],
  },
  {
    id: 'flaming-fun',
    name: 'Flaming Fun',
    bg: '#ffeaae',
    // 0.71
    colors: ['#ffeaae', '#ffc100', '#0a0903', '#ff8200', '#ff0000'],
  },
  {
    id: 'sunset-disco-dance',
    name: 'Sunset Disco Dance',
    bg: '#ffd500',
    // 0.73
    colors: ['#ffd500', '#fdc500', '#3d0066', '#510087', '#5c0099'],
  },
  {
    id: 'flare',
    name: 'Flare',
    bg: '#0b0203',
    // 0.74
    colors: ['#3d0014', '#9b0b28', '#ee1133', '#ff6a1f', '#ffe94d'],
  },
  {
    id: 'tangerine',
    name: 'Tangerine',
    bg: '#fffaf0',
    // 0.74
    colors: ['#ffffff', '#ffea00', '#ff9e00', '#ff5400', '#00171f'],
  },
  {
    id: 'cerise',
    name: 'Cerise',
    bg: '#0d0210',
    // 0.77
    colors: ['#40002b', '#a3007a', '#ff1f8f', '#ffd400', '#aaff00'],
  },
  {
    id: 'fiery-sky',
    name: 'Fiery Sky',
    bg: '#ffffff',
    // 0.78
    colors: ['#ffffff', '#004e89', '#00043a', '#800016', '#c00021'],
  },
  {
    id: 'laser',
    name: 'Laser',
    bg: '#000305',
    // 0.78
    colors: ['#08202b', '#00a2ff', '#ff0055', '#00ff8c', '#faff00'],
  },
]
export const palettes = PALETTES

export const paletteById = Object.fromEntries(PALETTES.map((p) => [p.id, p]))

/** Option list in the shape the `select` param control expects. */
export const paletteOptions = PALETTES.map((p) => ({ value: p.id, label: p.name }))

/** Look up a palette, falling back to the first rather than returning undefined. */
export function getPalette(id) {
  return paletteById[id] ?? PALETTES[0]
}

/** Perceived lightness of '#rgb' or '#rrggbb', 0-255. */
export function lightness(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * The inks in a palette that separate from its own paper.
 *
 * Every set carries a colour or two sitting close to its background, which is
 * fine in a field of thousands of marks and not fine in a piece built from a
 * handful of large areas: there, an invisible ink is not texture, it is a hole
 * in the picture. Falls back to the full set rather than returning something
 * unusable.
 */
export function legibleInks(palette, gap = 26) {
  const paper = lightness(palette.bg)
  const kept = palette.colors.filter((ink) => Math.abs(lightness(ink) - paper) > gap)
  return kept.length >= 2 ? kept : palette.colors
}

/**
 * A palette at random, never the one named by `not`.
 *
 * Deliberately outside the seeded rng. Which set a piece opens in is a choice
 * the interface makes on your behalf, not part of what a seed reproduces — and
 * every permalink writes the palette out explicitly, so a shared link still
 * pins the one it was saved with. Pass an rng where the choice does have to be
 * repeatable.
 *
 * Excluding the current palette matters when this is used to change pieces:
 * one time in fifty the roll would land on what is already on screen and the
 * switch would look like it had not taken.
 */
export function randomPaletteId(not = null, rng = null) {
  const float = rng ? rng.float : Math.random
  const pool = not ? PALETTES.filter((palette) => palette.id !== not) : PALETTES
  const from = pool.length ? pool : PALETTES
  return from[Math.floor(float() * from.length)].id
}

/** '#rrggbb' or '#rgb' -> [r,g,b]. */
function toRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Blend two palettes colour by colour.
 *
 * Straight sRGB interpolation, which can pass through a slightly muddy midpoint
 * between complementary hues. Perceptual blending would avoid that, but these
 * palettes are close enough in lightness that it doesn't show, and this keeps
 * the hot path cheap — it runs every frame during playback.
 */
export function mixPalettes(a, b, t) {
  if (t <= 0) return a
  if (t >= 1) return b
  const lerp = (x, y) => x + (y - x) * t
  const mixHex = (h1, h2) => {
    const c1 = toRgb(h1)
    const c2 = toRgb(h2)
    return toHex([lerp(c1[0], c2[0]), lerp(c1[1], c2[1]), lerp(c1[2], c2[2])])
  }
  return {
    id: `${a.id}~${b.id}`,
    name: `${a.name} / ${b.name}`,
    bg: mixHex(a.bg, b.bg),
    colors: a.colors.map((c, i) => mixHex(c, b.colors[i] ?? c)),
  }
}

/**
 * Where a continuously advancing cycle sits: which two palettes, and how far
 * between them. `hold` is the fraction of each step spent settled on a single
 * palette rather than in transition.
 *
 * `startId` anchors the walk to a chosen palette rather than always beginning
 * at the first one. Without it a running cycle ignores the palette you picked,
 * because the sequence is decided entirely by elapsed time.
 */
export function paletteAtCycle(position, startId = null, hold = 0.55) {
  const n = PALETTES.length
  const anchor = Math.max(0, PALETTES.findIndex((p) => p.id === startId))
  const step = Math.floor(position)
  const from = PALETTES[(anchor + step) % n]
  const to = PALETTES[(anchor + step + 1) % n]
  const within = position - step
  const linear = within < hold ? 0 : (within - hold) / (1 - hold)
  // Smoothstep: a linear cross-fade reads as a wipe, easing reads as a dissolve.
  const t = linear * linear * (3 - 2 * linear)
  return mixPalettes(from, to, t)
}

/**
 * Palette treatment — how the chosen palette gets used.
 *
 * Separate from *which* palette, which stays a per-piece param because
 * different pieces genuinely suit different sets. Treatment is canvas state
 * like the shape or the grain: it says which colour is paper, which dominates,
 * and which are in play at all.
 *
 * Applied after showcase's palette blending, so cycling and treatment compose.
 */

/** bg values below zero are sources outside the palette's own colours. */
export const BG_PALETTE = -1
export const BG_PAPER = -2
export const BG_INK = -3

export const TREATMENT_DEFAULTS = { bg: BG_PALETTE, rotate: 0, invert: false, muted: [] }

export function coerceTreatment(raw = {}) {
  const bg = Number(raw.bg)
  const rotate = Number(raw.rotate)
  // filter(Boolean) before Number: ''.split('.') is [''], and Number('') is 0,
  // which would silently mute colour 0 whenever muted was simply absent.
  const muted = (Array.isArray(raw.muted) ? raw.muted : String(raw.muted ?? '').split('.'))
    .filter((v) => v !== '' && v !== null && v !== undefined)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 4)
  return {
    bg: Number.isInteger(bg) && bg >= BG_INK && bg <= 4 ? bg : TREATMENT_DEFAULTS.bg,
    rotate: Number.isInteger(rotate) && rotate >= 0 && rotate <= 4 ? rotate : 0,
    invert: raw.invert === true || raw.invert === 'true' || raw.invert === '1',
    muted: [...new Set(muted)].sort(),
  }
}

/**
 * Resolve a palette through a treatment.
 *
 * `bg` indexes the palette's *original* colours, so the swatch you click is the
 * colour you get, whatever muting and rotation are doing to the ink order.
 */
export function applyTreatment(palette, treatment) {
  const t = treatment ?? TREATMENT_DEFAULTS

  let colors = palette.colors.filter((_, i) => !t.muted.includes(i))
  // Muting everything would leave generators with nothing to draw with.
  if (!colors.length) colors = [...palette.colors]

  if (t.invert) colors = [...colors].reverse()

  if (t.rotate) {
    const r = t.rotate % colors.length
    colors = [...colors.slice(r), ...colors.slice(0, r)]
  }

  let bg = palette.bg
  if (t.bg === BG_PAPER) bg = '#f7f7f4'
  else if (t.bg === BG_INK) bg = '#12121a'
  else if (t.bg >= 0) bg = palette.colors[t.bg] ?? palette.bg

  return { ...palette, colors, bg }
}

/**
 * The nearest whole palette to where the cycle currently sits.
 *
 * A cycling piece is usually showing a blend of two sets, and a blend has no
 * id — it can't be stored in a param or a link. Pausing therefore snaps to
 * whichever of the two it's nearer, which shifts the colour slightly but makes
 * the state something that can actually be written down.
 */
export function paletteIdAtCycle(position, startId = null, hold = 0.55) {
  const n = PALETTES.length
  const anchor = Math.max(0, PALETTES.findIndex((p) => p.id === startId))
  const step = Math.floor(position)
  const within = position - step
  const linear = within < hold ? 0 : (within - hold) / (1 - hold)
  const t = linear * linear * (3 - 2 * linear)
  return PALETTES[(anchor + step + (t < 0.5 ? 0 : 1)) % n].id
}

/** Swatch sources for the background picker, in the order they're shown. */
export function backgroundChoices(palette) {
  return [
    { value: BG_PALETTE, color: palette.bg, label: 'Palette paper' },
    ...palette.colors.map((color, i) => ({ value: i, color, label: `Colour ${i + 1}` })),
    { value: BG_PAPER, color: '#f7f7f4', label: 'Paper' },
    { value: BG_INK, color: '#12121a', label: 'Ink' },
  ]
}
