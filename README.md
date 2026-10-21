# Jonah Jeopardy 🐟

A Jeopardy-style review game on **Jonah chapters 1–3**, built for youth group.

**Play it:** open `index.html` in a browser, or use the GitHub Pages link.

## How to host
1. Pick a host and split the room into teams (up to 6).
2. Click a tile, read the clue out loud, and let teams answer.
3. Click ✓ or ✗ next to a team to add or subtract points. Click the same button again to undo it.
4. **Reveal Answer** shows the answer and the verse.
5. Two hidden **Daily Doubles** are placed at random each game.
6. When the board is cleared, the **Final Jeopardy** button starts pulsing. Teams write their wagers secretly, and you type them in.

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `F` | Fullscreen |
| `M` | Music on/off |
| `Space` | Reveal answer |
| `T` | Start the 15-second timer |
| `B` / `Esc` | Back to board |

- Background music plays on the board, goes quiet while a clue is up, and switches to a "thinking" tune during the Final Jeopardy timer. Toggle it with 🎵 or `M`.
- Click a team's score to adjust it by hand.
- Click a used tile to reopen it and fix the scoring.
- Progress saves automatically, so if the browser refreshes, click **Resume Saved Game**.

## Editing questions
All the questions are in [`questions.js`](questions.js). Change the text and save. That's it.
