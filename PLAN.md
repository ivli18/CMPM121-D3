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

- [x] Define `CellCoord` interface: `{ i: number; j: number }` for grid addressing
- [x] Write `latLngToCell(lat: number, lng: number): CellCoord`
- [x] Write `cellToBounds(cell: CellCoord): [SWLatLng, NELatLng]` for Leaflet rendering
- [x] On map 'moveend', recompute visible cells around viewport center
- [x] Unmount cells no longer in range; spawn new ones at fringes
- [x] Reset cell state (tokens) when unmounted → enables token farming
- [x] Update win condition: require crafted token ≥ next threshold (e.g., 16)
- [x] Test globe-spanning: pan across IDL, observe seamless cell renewal
- [x] Commit with message "(D3.b complete)"
- [x] Deploy and verify on GitHub Pages

## D3.c: Object persistence

Key technical challenge: Remember cell state when off-screen\
Key gameplay challenge: Prevent token farming by re-entering areas

- [ ] Create `Map<string, CellState>` to track modified cells
- [ ] Define `CellState` interface: `{ hasToken: boolean; value?: number }`
- [ ] On token collection, update `cellStates.set(key, { hasToken: false })`
- [ ] In `createCell`, check `cellStates` first before using `luck()`
- [ ] Save state when cell is removed (already happens via Map)
- [ ] Restore state when cell is re-created
- [ ] Test: Move away and back — no tokens should reappear
- [ ] Commit with "(D3.c complete)"
- [ ] Deploy and verify on GitHub Pages
