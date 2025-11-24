# D3: World of Bits

## Game Design Vision

A puzzle game where you collect and merge number tokens on a map. Start with 1s, combine them into 2s, then 4s, and so on, until you reach a high-value token (like 8) and win.

## Technologies

- TypeScript for game logic
- Leaflet for map rendering
- Deno + Vite for build system
- GitHub Pages for deployment

## Assignments

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

Key technical challenge: Remember cell state when off-screen
Key gameplay challenge: Prevent token farming by re-entering areas

- [x] Create `Map<string, CellState>` to track modified cells
- [x] Define `CellState` interface: `{ hasToken: boolean; value: number }`
- [x] Generate `value` once per cell using `luck()` on first access
- [x] On token collection:
      - Read current state (if any)
      - Update `hasToken: false`, preserve `value`
      - Store back into `cellStates`
- [x] In `createCell`, check `cellStates` first:
      - If present → use stored state
      - If absent → generate new state with `luck()`
- [x] Rebuild cells from scratch on scroll — no DOM retention
- [x] Test: Move away and back — tokens stay collected, values unchanged
- [x] Commit with "(D3.c complete)"

## D3.d: Gameplay Across Real-world Space and Time

- [x] Use `navigator.geolocation.watchPosition()` to update player position from real-world movement
- [x] Convert GPS coordinates to grid cell using `latLngToCell()` and update `playerCell`
- [x] Implement `MovementController` interface with `start()`, `stop()`, and `onMove` callback
- [x] Create `ButtonMovement` class that uses N/S/E/W buttons (existing logic)
- [x] Create `GeolocationMovement` class that uses GPS updates
- [x] Route all movement through active controller (Facade pattern)
- [ ] Support mode selection via query string: `?movement=buttons` or `?movement=geolocation`
- [x] (Optional) Add on-screen button to toggle movement modes
- [x] Save game state (`cellStates`, `heldToken`) to `localStorage` on exit
- [x] Load game state from `localStorage` on page load
- [x] Add "New Game" button that clears `localStorage` and resets game
- [x] Support `?reset=true` URL param to start fresh
- [x] Test geolocation on a real mobile device
- [x] Verify game resumes correctly after page reload
- [x] Deploy via GitHub Actions and confirm live version works
