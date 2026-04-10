import fs from "node:fs/promises";
import path from "node:path";

const workspace = process.cwd();
const playbooksPath = path.join(workspace, "src", "data", "playbooks.js");
const outputPath = path.join(workspace, "src", "data", "moveDescEnByPlaybook.js");

const source = await fs.readFile(playbooksPath, "utf8");

const executable = source
  .replace("export const allFeats =", "const allFeats =")
  .replace("export const allSkills =", "const allSkills =")
  .replace("export const playbooks =", "const playbooks =")
  .concat("\nreturn { playbooks };\n");

const { playbooks } = new Function(executable)();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateRuToEn(text) {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=en&dt=t&q=${q}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translate API failed with ${response.status}`);
  }
  const payload = await response.json();
  return (payload?.[0] || []).map((part) => part?.[0] || "").join("").trim();
}

function normalizeTerms(text) {
  return text
    .replace(/\bPV\b/g, "GM")
    .replace(/\bVI\b/g, "GM")
    .replace(/\bPC\b/g, "character")
    .replace(/\bSubterfuge\b/g, "Cunning")
    .replace(/\bDexterity\b/g, "Finesse")
    .replace(/\bPower\b/g, "Might")
    .replace(/\bStrength\b/g, "Might")
    .replace(/\bForest\b/g, "Woodland");
}

const result = {};

for (const playbook of playbooks) {
  const byMove = {};

  for (const move of playbook.moves) {
    const translated = normalizeTerms(await translateRuToEn(move.desc));
    byMove[move.name] = translated;
    await sleep(120);
  }

  result[playbook.name] = byMove;
}

const serializeValue = (value) => {
  if (typeof value === "string") {
    const escaped = value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    return `\`${escaped}\``;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const lines = Object.entries(value).map(([k, v]) => `  ${JSON.stringify(k)}: ${serializeValue(v)}`);
    return `\n{\n${lines.join(",\n")}\n}`;
  }

  return JSON.stringify(value);
};

const out = `const moveDescEnByPlaybook = ${serializeValue(result)};\n\nexport default moveDescEnByPlaybook;\n`;
await fs.writeFile(outputPath, out, "utf8");

console.log(`Generated ${outputPath}`);
