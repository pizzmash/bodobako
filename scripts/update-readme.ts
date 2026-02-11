import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getAllGames } from "../packages/shared/src/games/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readmePath = resolve(__dirname, "..", "README.md");

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

const readme = readFileSync(readmePath, "utf-8");
const startMarker = "<!-- GAMES:START -->";
const endMarker = "<!-- GAMES:END -->";

const startIdx = readme.indexOf(startMarker);
const endIdx = readme.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("README.md にマーカーが見つかりません");
  process.exit(1);
}

const before = readme.slice(0, startIdx + startMarker.length);
const after = readme.slice(endIdx);
const updated = `${before}\n${generateTable()}\n${after}`;

writeFileSync(readmePath, updated, "utf-8");
console.log("README.md のゲーム一覧を更新しました");
