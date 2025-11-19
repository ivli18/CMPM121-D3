// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

// --- Types ---
interface CellCoord {
  i: number;
  j: number;
}
interface CellState {
  hasToken: boolean;
  value: number;
}
type Direction = "north" | "south" | "east" | "west";

// --- DOM ---
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

["North", "East", "South", "West"].forEach((dir) => {
  const btn = document.createElement("button");
  btn.textContent = dir;
  controlPanelDiv.appendChild(btn);
});

// --- Constants ---
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const TILE_DEGREES = 1e-4;
const ZOOM_LEVEL = 19;
const WIN_VALUE = 16;

// --- State ---
const cellStates = new Map<string, CellState>();
const renderedCells = new Map<
  string,
  { rect: leaflet.Rectangle; marker: leaflet.Marker | null; value: number }
>();
let heldToken: number | null = null;
const playerCell: CellCoord = latLngToCell(
  CLASSROOM_LATLNG.lat,
  CLASSROOM_LATLNG.lng,
);

// --- Map Setup ---
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const playerMarker = leaflet.marker(CLASSROOM_LATLNG).bindTooltip("You").addTo(
  map,
);
const interactionRadius = leaflet.circle(playerMarker.getLatLng(), {
  radius: 3 * TILE_DEGREES * 111000,
  fillColor: "blue",
  fillOpacity: 0.1,
  stroke: true,
  color: "blue",
  weight: 1,
  dashArray: "5,5",
}).addTo(map);

// --- Helpers ---
function cellKey(i: number, j: number) {
  return `${i},${j}`;
}
function latLngToCell(lat: number, lng: number): CellCoord {
  return {
    i: Math.floor(lng / TILE_DEGREES),
    j: Math.floor(lat / TILE_DEGREES),
  };
}
function cellToBounds(cell: CellCoord) {
  const lat = cell.j * TILE_DEGREES, lng = cell.i * TILE_DEGREES;
  return leaflet.latLngBounds([lat, lng], [
    lat + TILE_DEGREES,
    lng + TILE_DEGREES,
  ]);
}
function getInitialTokenValue(key: string) {
  const l = luck(`value-${key}`);
  if (l < 0.01) return 8;
  if (l < 0.05) return 4;
  if (l < 0.25) return 2;
  return 1;
}

// --- Cells ---
function createCell(cell: CellCoord) {
  const key = cellKey(cell.i, cell.j);

  // Ensure cell state exists
  if (!cellStates.has(key)) {
    const tokenRoll = luck(`token-${key}`);
    cellStates.set(key, {
      hasToken: tokenRoll < 0.5,
      value: getInitialTokenValue(key),
    });
  }
  const state = cellStates.get(key)!; // guaranteed to exist now
  const bounds = cellToBounds(cell);

  // Rect
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

  rect.on("click", () => handleCellClick(cell, rect, marker));

  // Save rendered info
  renderedCells.set(key, { rect, marker, value: state.value });
}

function handleCellClick(
  cell: CellCoord,
  rect: leaflet.Rectangle,
  marker: leaflet.Marker | null,
) {
  const key = cellKey(cell.i, cell.j);
  const state = cellStates.get(key)!;

  const distI = Math.abs(cell.i - playerCell.i);
  const distJ = Math.abs(cell.j - playerCell.j);
  if (Math.max(distI, distJ) > 3) return;

  if (heldToken === null && state.hasToken) {
    heldToken = state.value;
    state.hasToken = false;
    if (marker) {
      marker.remove();
      marker = null;
    }
    rect.setStyle({ fillOpacity: 0.05, color: "gray" });
  } else if (heldToken !== null) {
    if (state.hasToken && heldToken === state.value) {
      heldToken *= 2;
      state.hasToken = false;
      if (marker) {
        marker.remove();
        marker = null;
      }
      rect.setStyle({ fillOpacity: 0.05, color: "gray" });
    } else if (!state.hasToken) {
      state.hasToken = true;
      state.value = heldToken;
      marker = leaflet.marker(cellToBounds(cell).getCenter(), {
        icon: leaflet.divIcon({
          html: `<b>${heldToken}</b>`,
          className: "token",
        }),
      }).addTo(map);
      rect.setStyle({ fillOpacity: 0.3, color: "lightgreen" });
      heldToken = null;
    }
  }

  cellStates.set(key, state);
  updateStatus();
  saveGameState();
}

// --- Player Movement ---
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
  saveGameState();
}

function movePlayerToCell(cell: CellCoord) {
  playerCell.i = cell.i;
  playerCell.j = cell.j;
  const newPos = cellToBounds(cell).getCenter();
  playerMarker.setLatLng(newPos);
  interactionRadius.setLatLng(newPos);
  map.panTo(newPos);
  updateVisibleCells();
  saveGameState();
}

// --- Status / Cells ---
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

  for (const key of newCellsNeeded) {
    if (!renderedCells.has(key)) {
      const [i, j] = key.split(",").map(Number);
      createCell({ i, j });
    }
  }

  for (const key of renderedCells.keys()) {
    if (!newCellsNeeded.has(key)) {
      const { rect, marker } = renderedCells.get(key)!;
      rect.remove();
      if (marker) marker.remove();
      renderedCells.delete(key);
    }
  }
}

// --- Save / Load ---
const SAVE_KEY = "gridGameState";

function saveGameState() {
  const data = {
    playerCell,
    heldToken,
    cells: Array.from(cellStates.entries()),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function restoreAllCells() {
  // Clear any existing rendered cells first
  for (const { rect, marker } of renderedCells.values()) {
    rect.remove();
    if (marker) marker.remove();
  }
  renderedCells.clear();

  // Re-create all cells from saved state
  for (const key of cellStates.keys()) {
    const [i, j] = key.split(",").map(Number);
    createCell({ i, j });
  }
}

function loadGameState() {
  const json = localStorage.getItem(SAVE_KEY);
  if (!json) return;
  try {
    const data = JSON.parse(json);
    heldToken = data.heldToken;
    playerCell.i = data.playerCell.i;
    playerCell.j = data.playerCell.j;
    const newPos = cellToBounds(playerCell).getCenter();
    playerMarker.setLatLng(newPos);
    interactionRadius.setLatLng(newPos);
    map.panTo(newPos);
    data.cells.forEach(([key, state]: [string, CellState]) =>
      cellStates.set(key, state)
    );
    restoreAllCells();
    updateVisibleCells();
    updateStatus();
  } catch (e) {
    console.warn("Failed to load game state", e);
  }
}

// --- Init ---
map.on("moveend", updateVisibleCells);
updateVisibleCells();
updateStatus();
globalThis.addEventListener?.("beforeunload", saveGameState);
loadGameState();

// --- Movement Controllers ---
interface MovementController {
  start(): void;
  stop(): void;
  onMove?: (cell: CellCoord) => void;
}

class ButtonMovement implements MovementController {
  onMove?: (cell: CellCoord) => void;
  private buttons: HTMLButtonElement[];
  constructor(buttonsSelector = "#controlPanel button") {
    this.buttons = Array.from(
      document.querySelectorAll(buttonsSelector),
    ) as HTMLButtonElement[];
    this.buttons.forEach((btn) => {
      const existing = btn.onclick;
      btn.onclick = (ev) => {
        const dir = (btn.textContent || "").toLowerCase() as Direction;
        movePlayer(dir);
        this.onMove?.(playerCell);
        if (typeof existing === "function") existing.call(btn, ev);
      };
    });
  }
  start() {
    this.buttons.forEach((b) => b.disabled = false);
  }
  stop() {
    this.buttons.forEach((b) => b.disabled = true);
  }
}

class GeolocationMovement implements MovementController {
  onMove?: (cell: CellCoord) => void;
  private watchId: number | null = null;
  start() {
    if (!navigator.geolocation) {
      return console.warn("Geolocation not supported");
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => console.warn("GPS error:", err),
      { enableHighAccuracy: true },
    );
  }
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
  private handlePosition(pos: GeolocationPosition) {
    const { latitude: lat, longitude: lng } = pos.coords;

    // Convert GPS → grid cell
    const newCell = latLngToCell(lat, lng);

    // Update global playerCell
    movePlayerToCell(newCell);
    this.onMove?.(newCell);
  }
}

class MovementFacade {
  private controllers: Record<string, MovementController> = {};
  private activeName: string | null = null;
  register(name: string, controller: MovementController) {
    this.controllers[name] = controller;
  }
  activate(name: string) {
    if (this.activeName) this.controllers[this.activeName]?.stop();
    const c = this.controllers[name];
    if (!c) {
      console.warn("Controller not registered:", name);
      return;
    }
    this.activeName = name;
    c.start();
    c.onMove = () => updateStatus();
  }
  deactivate() {
    if (this.activeName) this.controllers[this.activeName]?.stop();
    this.activeName = null;
  }
  getActive() {
    return this.activeName;
  }
}

const movementFacade = new MovementFacade();
const buttonMovement = new ButtonMovement();
movementFacade.register("buttons", buttonMovement);
movementFacade.activate("buttons");

const geoMovement = new GeolocationMovement();
movementFacade.register("geolocation", geoMovement);
geoMovement.onMove = () => {
  updateStatus();
};

// URL toggle
const params = new URLSearchParams(globalThis.location.search);
if (params.get("movement") === "geolocation") {
  movementFacade.activate("geolocation");
}

// Toggle button
const toggleBtn = document.createElement("button");
toggleBtn.id = "movementToggle";
toggleBtn.style.cssText = "position:absolute;top:10px;right:10px;z-index:1000";
document.body.appendChild(toggleBtn);
function updateToggleButtonText() {
  const active = movementFacade.getActive();
  toggleBtn.textContent = active === "geolocation"
    ? "Switch to Buttons"
    : "Switch to GPS";
}
updateToggleButtonText();
toggleBtn.onclick = () => {
  if (movementFacade.getActive() === "geolocation") {
    movementFacade.activate("buttons");
  } else movementFacade.activate("geolocation");
  updateToggleButtonText();
};

const RESET_GAME = params.get("reset") === "true";

if (RESET_GAME) {
  localStorage.removeItem(SAVE_KEY);
  cellStates.clear();
  renderedCells.forEach(({ rect, marker }) => {
    rect.remove();
    if (marker) marker.remove();
  });
  renderedCells.clear();
  heldToken = null;
  playerCell.i = latLngToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng).i;
  playerCell.j = latLngToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng).j;
  updateVisibleCells();
  updateStatus();
}

const newGameBtn = document.createElement("button");
newGameBtn.textContent = "New Game";
newGameBtn.style.cssText = "position:absolute;top:40px;right:10px;z-index:1000";
document.body.appendChild(newGameBtn);

newGameBtn.onclick = () => {
  localStorage.removeItem(SAVE_KEY);
  location.href = location.pathname; // reload without query params
};
