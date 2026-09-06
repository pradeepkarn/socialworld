import { getDeterministicAppearance, hashString } from './src/game/player/PlayerAppearance';

console.log('===============================================================');
console.log('   MATHEMATICAL VERIFICATION: 50+ UNIQUE PROCEDURAL CHARACTERS  ');
console.log('===============================================================');

const sampleIds = [
  ...Array.from({ length: 50 }, (_, i) => `p_runner_${(i + 1).toString().padStart(3, '0')}`),
  ...Array.from({ length: 25 }, (_, i) => `p_${Math.random().toString(36).substring(2, 8)}`),
  ...Array.from({ length: 25 }, (_, i) => `Runner_${1000 + i * 37}`),
];

const signatures = new Set<string>();
const bodyTypeCounts: Record<string, number> = {};
const torsoShapeCounts: Record<string, number> = {};
const skinToneCounts: Record<string, number> = {};
const hairStyleCounts: Record<string, number> = {};
const hairColorCounts: Record<string, number> = {};
const topColorCounts: Record<string, number> = {};
const armorCounts: Record<string, number> = {};
const accessoryCounts: Record<string, number> = {};

console.log(`\nTesting ${sampleIds.length} generated player IDs for collision & diversity...\n`);

for (let i = 0; i < sampleIds.length; i++) {
  const id = sampleIds[i];
  const app = getDeterministicAppearance(id);

  if (signatures.has(app.signature)) {
    throw new Error(`CRITICAL: Duplicate complete signature detected for ID ${id}: ${app.signature}`);
  }
  signatures.add(app.signature);

  bodyTypeCounts[app.bodyTypeName] = (bodyTypeCounts[app.bodyTypeName] || 0) + 1;
  torsoShapeCounts[app.torsoShape] = (torsoShapeCounts[app.torsoShape] || 0) + 1;
  skinToneCounts[app.skinName] = (skinToneCounts[app.skinName] || 0) + 1;
  hairStyleCounts[app.hairStyleName] = (hairStyleCounts[app.hairStyleName] || 0) + 1;
  hairColorCounts[app.hairColorName] = (hairColorCounts[app.hairColorName] || 0) + 1;
  topColorCounts[app.paletteName] = (topColorCounts[app.paletteName] || 0) + 1;
  armorCounts[app.armorTypeName] = (armorCounts[app.armorTypeName] || 0) + 1;
  accessoryCounts[app.accessoryTypeName] = (accessoryCounts[app.accessoryTypeName] || 0) + 1;

  if (i < 10) {
    console.log(`Player [${id.padEnd(16)}]: ${(app.bodyTypeName + ' (' + app.torsoShape + ')').padEnd(24)} | ${app.skinName.padEnd(18)} | ${app.hairStyleName.padEnd(20)} | ${app.armorTypeName.padEnd(21)} | ${app.accessoryTypeName}`);
  }
}

console.log(`\n... (${sampleIds.length - 10} more players verified)`);

console.log('\n--- DIVERSITY METRICS ---');
console.log(`Total Players Tested: ${sampleIds.length}`);
console.log(`Unique Signatures:   ${signatures.size} / ${sampleIds.length} (100% Unique)`);
console.log(`Distinct Body Types: ${Object.keys(bodyTypeCounts).length} represented (${Object.keys(bodyTypeCounts).join(', ')})`);
console.log(`Distinct Torso Shapes: ${Object.keys(torsoShapeCounts).length} represented (${Object.keys(torsoShapeCounts).join(', ')})`);
console.log(`Distinct Skin Tones: ${Object.keys(skinToneCounts).length} represented`);
console.log(`Distinct Hairstyles: ${Object.keys(hairStyleCounts).length} represented`);
console.log(`Distinct Hair Colors: ${Object.keys(hairColorCounts).length} represented`);
console.log(`Distinct Armor Types: ${Object.keys(armorCounts).length} represented`);
console.log(`Distinct Accessories: ${Object.keys(accessoryCounts).length} represented`);

console.log('\n--- DETERMINISM TEST ---');
// Verify that same ID always generates identical signature
for (let i = 0; i < 20; i++) {
  const id = `test_player_determinism_${i}`;
  const sig1 = getDeterministicAppearance(id).signature;
  const sig2 = getDeterministicAppearance(id).signature;
  if (sig1 !== sig2) {
    throw new Error(`Determinism failed for ${id}!`);
  }
}
console.log('✓ Determinism verified: 100% consistent signature output for identical player IDs.');

console.log('\n===============================================================');
console.log('       ALL 50+ UNIQUE PROCEDURAL IDENTITY TESTS PASSED!        ');
console.log('===============================================================');
