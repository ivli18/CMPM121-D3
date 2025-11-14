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

**Key Goal:** Decouple game logic from screen view by anchoring cells to a global grid (Null Island), tie interaction to player position, and enable simple crafting with a higher victory threshold.

- [x] Define `CellCoord` interface: `{ i: number; j: number }` for global grid addressing
- [x] Implement `latLngToCell(lat: number, lng: number): CellCoord` using (0,0) origin
- [x] Implement `cellToBounds(cell: CellCoord): LatLngBounds` for Leaflet rendering
- [x] Track `playerCell` as logical position in grid units (not just marker lat/lng)
- [x] Add N/S/E/W buttons to move `playerCell` and update marker position
- [x] Move map camera via `map.panTo()` when player moves (optional follow)
- [x] Allow cell interaction only within 3 tiles of `playerCell` (not map center)
- [x] On `moveend` **and** player move, call `updateVisibleCells()`
- [x] Respawn cells near map center using deterministic `luck(key)` → enables farming
- [x] Unmount offscreen cells → memoryless state (intentional for D3.b)
- [x] Update crafting: double `heldToken` on match; win when `heldToken >= 16`
- [x] Test globe-spanning: pan across map, cross IDL, verify seamless generation
- [x] Deploy via GitHub Actions and verify live behavior
- [x] Commit with accurate message

## D3.c: Object persistence

Key technical challenge: Remember cell state when off-screen\
Key gameplay challenge: Prevent token farming by re-entering areas

- [ ] Create `Map<string, CellState>` to track modified cells
- [ ] Define `CellState` interface: `{ hasToken: boolean; value: number }`
- [ ] Generate `value` once per cell using `luck()` on first access
- [ ] On token collection:\
      - Read current state (if any)\
      - Update `hasToken: false`, preserve `value`\
      - Store back into `cellStates`
- [ ] In `createCell`, check `cellStates` first:\
      - If present → use stored state\
      - If absent → generate new state with `luck()`
- [ ] Rebuild cells from scratch on scroll — no DOM retention
- [ ] Test: Move away and back — tokens stay collected, values unchanged
- [ ] Commit with "(D3.c complete)"
