import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getAllGames } from "../packages/shared/src/games/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const START = "<!-- GAMES:START -->";
const END = "<!-- GAMES:END -->";

function formatPlayers(min: number, max: number): string {
  if (min === max) return `${min}人`;
  return `${min}〜${max}人`;
}

function generateTable(): string {
  const games = getAllGames();
  const lines = [
    "| ゲーム | 人数 | 概要 |",
    "|--------|------|------|",
    ...games.map(
      (g) => `| ${g.name} | ${formatPlayers(g.minPlayers, g.maxPlayers)} | ${g.description} |`
    ),
  ];
  return lines.join("\n");
}

function generateList(): string {
  const games = getAllGames();
  return games
    .map((g) => `- **${g.name}** - ${formatPlayers(g.minPlayers, g.maxPlayers)}、${g.description}`)
    .join("\n");
}

for (const name of ["README.md", "CLAUDE.md"]) {
  const filePath = resolve(__dirname, "..", name);
  const content = readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(START);
  const endIdx = content.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    console.warn(`${name}: マーカーが見つかりません（スキップ）`);
    continue;
  }
  const before = content.slice(0, startIdx + START.length);
  const after = content.slice(endIdx);
  const section = name === "CLAUDE.md" ? generateList() : generateTable();
  writeFileSync(filePath, `${before}\n${section}\n${after}`, "utf-8");
  console.log(`${name} のゲーム一覧を更新しました`);
}
