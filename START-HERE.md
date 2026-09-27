# Sudoku — Cloudflare setup

1. Create a new GitHub repository and upload the contents of this folder to its root.
2. Cloudflare → Workers & Pages → create a Worker connected to that repository.
3. Worker name: `sudoku`
4. Build command: `npm run build`
5. Deploy command: `npx wrangler deploy --config wrangler.jsonc`
6. Deploy, then add `sudoku.cl1p.xyz` as a Custom Domain in the Worker's domain settings.
7. Open `https://sudoku.cl1p.xyz/adam`, choose New game, then Easy.

The config creates the PLAYERS Durable Object binding and SQLite storage automatically. No D1 database, R2 bucket, API keys, or admin password are needed. Do not create a separate sample Durable Object Worker. Keep this config and migration on future deployments; deleting the Worker/storage can delete progress.

## Playing

- Select a number 1–9; matching placed numbers are highlighted. Tap an editable cell to enter it.
- Pencil toggles candidate notes; notes don't count as mistakes. Correct entries remove the same candidate from peer cells.
- Erase clears an editable cell and its notes.
- Two mistakes are allowed; the third ends the board. Incorrect entries are rejected and the cell is marked. New game retries that puzzle if it wasn't completed.
- Complete 60 Easy to unlock Medium, 60 Medium to unlock Hard, 60 Hard to unlock Expert, and 60 Expert to unlock Extreme.
- Your board, notes, mistakes and completion counts save after each move. Wait for “Saved to your link” before closing. An internet connection is required.
- The same player link resumes on other devices. A stale move from another device is rejected and the latest saved board is loaded.
- Links are shared access, not accounts. Anyone who knows a link can change its progress. No list of players is exposed.
- 60 different puzzles per tier (300 total), each checked for exactly one solution. After finishing all 60 in a tier, its puzzles cycle for replay.

## Difficulty

Puzzles are graded by a fixed solver: Easy needs naked singles only; Medium adds hidden singles; Hard needs 1–3 branch attempts, Expert 4–12, Extreme more than 12. Branch effort is an approximate difficulty measure, not a guarantee of a specific human solving technique. No puzzle changes its solution while you play.

## Development

`npm ci`, `npm run build`, `npm test`, then `npx wrangler dev --config wrangler.jsonc`.

`npm test` checks all 300 puzzles for uniqueness and verifies game rules, saved progress, version conflicts, and difficulty unlocking.

`node tests/runtime.mjs` tests the Cloudflare runtime using Miniflare (included with Wrangler).

Puzzle solutions stay in the Worker bundle; they are not included in the browser assets or API responses. This is a casual game, not a cheat-proof competitive system.

## Version 1.1.0
Upload all updated files and redeploy with the existing command. Keep the same Worker and binding to retain progress. New Easy boards start with 46 clues. Existing games keep their original clues. Wins display a persistent completion banner. Completed rows, columns, and boxes animate. Fully placed digits disappear from the selector. After a correct move, when every remaining cell has just one legal candidate, the server completes and saves the game atomically; the browser animates the remaining entries. Reduced-motion preferences are honored.
