# D3: World of Bits

# Game Design Vision

A puzzle game where you collect and merge number tokens on a map. Start with 1s, combine them into 2s, then 4s, and so on, until you reach a high-value token (like 8) and win.

# Technologies

- TypeScript for game logic
- Leaflet for map rendering
- Deno + Vite for build system
- GitHub Pages for deployment

# Assignments

## D3.a: Core Mechanics (token collection and crafting)

Key goal: Get a working prototype where you can pick up and merge tokens on a map.

### Steps

- [ ] Set up Leaflet map centered on classroom
- [ ] Draw one grid cell at player location
- [ ] Draw a 5x5 grid of cells around player
- [ ] Use `luck()` to decide which cells have tokens (value 1 or 2)
- [ ] Display token values visibly in cells
- [ ] Allow player to click nearby cells to pick up a token
- [ ] Show what token the player is holding
- [ ] Allow player to merge two equal tokens (crafting)
- [ ] Detect when player creates a value >= 8 → "You win!"
- [ ] Commit with message "(D3.a complete)"
- [ ] Deploy to GitHub Pages and verify it works
