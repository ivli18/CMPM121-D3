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

- [x] Set up Leaflet map centered on classroom
- [x] Draw one grid cell at player location
- [x] Draw a 5x5 grid of cells around player
- [x] Use `luck()` to decide which cells have tokens (value 1 or 2)
- [x] Display token values visibly in cells
- [x] Allow player to click nearby cells to pick up a token
- [x] Show what token the player is holding
- [x] Allow player to merge two equal tokens (crafting)
- [x] Detect when player creates a value >= 8 → "You win!"
- [x] Commit with message "(D3.a complete)"
- [x] Deploy to GitHub Pages and verify it works

## D3.b: Globe-spanning Gameplay

Key goal: Make the map infinite and coordinate-bound, support viewport-relative visibility, and enable farming via memoryless cells.

### Steps

- [ ] Define `CellCoord` interface: `{ i: number; j: number }` for grid addressing
- [ ] Write `latLngToCell(lat: number, lng: number): CellCoord`
- [ ] Write `cellToBounds(cell: CellCoord): [SWLatLng, NELatLng]` for Leaflet rendering
- [ ] On map 'moveend', recompute visible cells around viewport center
- [ ] Unmount cells no longer in range; spawn new ones at fringes
- [ ] Reset cell state (tokens) when unmounted → enables token farming
- [ ] Update win condition: require crafted token ≥ next threshold (e.g., 16)
- [ ] Test globe-spanning: pan across IDL, observe seamless cell renewal
- [ ] Commit with message "(D3.b complete)"
- [ ] Deploy and verify on GitHub Pages
