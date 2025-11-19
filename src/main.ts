// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

/* ============================================================
   Types
   ============================================================ */
interface CellCoord {
  i: number;
  j: number;
}

interface CellState {
  hasToken: boolean;
  value: number;
}

type Direction = "north" | "south" | "east" | "west";

/* ============================================================
   DOM Setup
   ============================================================ */

// Control panel
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

// Map div
const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

// Status panel
const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Movement buttons
["North", "East", "South", "West"].forEach((dir) => {
  const btn = document.createElement("button");
  btn.textContent = dir;
  controlPanelDiv.appendChild(btn);
});

/* ============================================================
   Constants
   ============================================================ */
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const TILE_DEGREES = 1e-4;
const ZOOM_LEVEL = 19;
const WIN_VALUE = 16;

/* ============================================================
   State Containers
   ============================================================ */

// Map of cell states
const cellStates = new Map<string, CellState>();

// Rendered cells on screen
const renderedCells = new Map<
  string,
  { rect: leaflet.Rectangle; marker: leaflet.Marker | null; value: number }
>();

// Player state
let heldToken: number | null = null;
const playerCell: CellCoord = latLngToCell(
  CLASSROOM_LATLNG.lat,
  CLASSROOM_LATLNG.lng,
);

/* ============================================================
   Map Setup
   ============================================================ */
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
  .addTo(map);

// Player marker
const playerMarker = leaflet.marker(CLASSROOM_LATLNG)
  .bindTooltip("You")
  .addTo(map);

// Interaction range
const interactionRadius = leaflet.circle(playerMarker.getLatLng(), {
  radius: 3 * TILE_DEGREES * 111000, // degrees → meters
  fillColor: "blue",
  fillOpacity: 0.1,
  stroke: true,
  color: "blue",
  weight: 1,
  dashArray: "5,5",
}).addTo(map);

/* ============================================================
   Helper Functions
   ============================================================ */

function cellKey(i: number, j: number): string {
  return `${i},${j}`;
}

function latLngToCell(lat: number, lng: number): CellCoord {
  return {
    i: Math.floor(lng / TILE_DEGREES),
    j: Math.floor(lat / TILE_DEGREES),
  };
}

function cellToBounds(cell: CellCoord): leaflet.LatLngBounds {
  const lat = cell.j * TILE_DEGREES;
  const lng = cell.i * TILE_DEGREES;
  return leaflet.latLngBounds(
    [lat, lng],
    [lat + TILE_DEGREES, lng + TILE_DEGREES],
  );
}

function getInitialTokenValue(key: string): number {
  const l = luck(`value-${key}`);
  if (l < 0.01) return 8;
  if (l < 0.05) return 4;
  if (l < 0.25) return 2;
  return 1;
}

/* ============================================================
   Cell Rendering + Interaction
   ============================================================ */

function createCell(cell: CellCoord) {
  const bounds = cellToBounds(cell);
  const key = cellKey(cell.i, cell.j);

  // Ensure cell state exists
  let state = cellStates.get(key);
  if (!state) {
    const tokenRoll = luck(`token-${key}`);
    state = {
      hasToken: tokenRoll < 0.5,
      value: getInitialTokenValue(key),
    };
    cellStates.set(key, state);
  }

  // Rect (grid cell)
  const rect = leaflet.rectangle(bounds, {
    color: state.hasToken ? "lightgreen" : "gray",
    fillOpacity: state.hasToken ? 0.3 : 0.05,
    weight: 1,
  }).addTo(map);

  // Token marker
  let marker: leaflet.Marker | null = null;
  if (state.hasToken) {
    marker = leaflet.marker(bounds.getCenter(), {
      icon: leaflet.divIcon({
        html: `<b>${state.value}</b>`,
        className: "token",
      }),
    }).addTo(map);
  }

  // Click handler
  rect.on("click", () => {
    const distI = Math.abs(cell.i - playerCell.i);
    const distJ = Math.abs(cell.j - playerCell.j);
    if (Math.max(distI, distJ) > 3) return;

    if (heldToken === null) {
      if (state.hasToken) {
        heldToken = state.value;
        state.hasToken = false;
        cellStates.set(key, state);

        if (marker) {
          marker.remove();
          marker = null;
        }

        rect.setStyle({ fillOpacity: 0.05, color: "gray" });
        updateStatus();
      }
    } else {
      if (state.hasToken) {
        if (heldToken === state.value) {
          heldToken = heldToken * 2;
          state.hasToken = false;
          cellStates.set(key, state);

          if (marker) {
            marker.remove();
            marker = null;
          }

          rect.setStyle({ fillOpacity: 0.05, color: "gray" });
          updateStatus();
        }
      } else {
        // Deposit token
        state.hasToken = true;
        state.value = heldToken;
        cellStates.set(key, state);

        marker = leaflet.marker(bounds.getCenter(), {
          icon: leaflet.divIcon({
            html: `<b>${heldToken}</b>`,
            className: "token",
          }),
        }).addTo(map);

        rect.setStyle({ fillOpacity: 0.3, color: "lightgreen" });
        heldToken = null;
        updateStatus();
      }
    }
  });

  // Store render info
  renderedCells.set(key, { rect, marker, value: state.value });
}

/* ============================================================
   Player Movement
   ============================================================ */

function movePlayer(dir: Direction) {
  switch (dir) {
    case "north":
      playerCell.j++;
      break;
    case "south":
      playerCell.j--;
      break;
    case "east":
      playerCell.i++;
      break;
    case "west":
      playerCell.i--;
      break;
  }

  const newPos = cellToBounds(playerCell).getCenter();
  playerMarker.setLatLng(newPos);
  interactionRadius.setLatLng(newPos);
  map.panTo(newPos);

  updateVisibleCells();
}

/* ============================================================
   Status + Visible Cell Management
   ============================================================ */

function updateStatus() {
  statusPanelDiv.innerHTML = heldToken ? `Holding: ${heldToken}` : "Holding: —";
  if (heldToken !== null && heldToken >= WIN_VALUE) {
    statusPanelDiv.innerHTML += " 🎉 YOU WIN!";
  }
}

function updateVisibleCells() {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const minCell = latLngToCell(sw.lat, sw.lng);
  const maxCell = latLngToCell(ne.lat, ne.lng);

  const newCellsNeeded = new Set<string>();

  for (let i = minCell.i - 1; i <= maxCell.i + 1; i++) {
    for (let j = minCell.j - 1; j <= maxCell.j + 1; j++) {
      newCellsNeeded.add(cellKey(i, j));
    }
  }

  // Add new cells
  for (const key of newCellsNeeded) {
    if (!renderedCells.has(key)) {
      const [i, j] = key.split(",").map(Number);
      createCell({ i, j });
    }
  }

  // Remove cells out of range
  for (const key of renderedCells.keys()) {
    if (!newCellsNeeded.has(key)) {
      const { rect, marker } = renderedCells.get(key)!;
      rect.remove();
      if (marker) marker.remove();
      renderedCells.delete(key);
    }
  }
}

/* ============================================================
   Initialization
   ============================================================ */
map.on("moveend", updateVisibleCells);
updateVisibleCells();
updateStatus();

interface MovementController {
  start(): void;
  stop(): void;
  onMove?: (cell: CellCoord) => void;
}

class ButtonMovement implements MovementController {
  onMove?: (cell: CellCoord) => void;
  private buttons: HTMLButtonElement[] = [];

  constructor(buttonsSelector = "#controlPanel button") {
    this.buttons = Array.from(
      document.querySelectorAll(buttonsSelector),
    ) as HTMLButtonElement[];

    // Rebind click handlers so they go through the facade-managed path.
    this.buttons.forEach((btn) => {
      // keep any existing inline onclick by preserving it
      const existing = btn.onclick;
      btn.onclick = (ev) => {
        const dir = (btn.textContent || "").toLowerCase() as Direction;
        // Use the canonical move function so effect is identical.
        movePlayer(dir);
        // notify listeners if any
        if (this.onMove) this.onMove(playerCell);
        // call previous handler if present
        if (typeof existing === "function") existing.call(btn, ev);
      };
    });
  }

  start() {
    // enable the buttons (they exist already)
    this.buttons.forEach((b) => (b.disabled = false));
  }

  stop() {
    this.buttons.forEach((b) => (b.disabled = true));
  }
}

class MovementFacade {
  private controllers: Record<string, MovementController> = {};
  private activeName: string | null = null;

  register(name: string, controller: MovementController) {
    this.controllers[name] = controller;
  }

  activate(name: string) {
    if (this.activeName && this.controllers[this.activeName]) {
      this.controllers[this.activeName].stop();
    }
    const c = this.controllers[name];
    if (!c) {
      console.warn("Movement controller not registered:", name);
      return;
    }
    this.activeName = name;
    c.start();
    c.onMove = () => {
      // default reaction: update UI
      updateStatus();
      // (other reactions can be attached by registering controllers externally)
    };
  }

  deactivate() {
    if (this.activeName && this.controllers[this.activeName]) {
      this.controllers[this.activeName].stop();
    }
    this.activeName = null;
  }

  getActive(): string | null {
    return this.activeName;
  }
}

// instantiate and hook up buttons-based controller
const movementFacade = new MovementFacade();
const buttonMovement = new ButtonMovement();
movementFacade.register("buttons", buttonMovement);

// activate buttons by default
movementFacade.activate("buttons");
