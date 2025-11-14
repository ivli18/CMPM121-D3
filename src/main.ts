// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

interface CellCoord {
  i: number;
  j: number;
}

interface CellState {
  hasToken: boolean;
  value: number;
}

// DOM Elements
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
type Direction = "north" | "south" | "east" | "west";
["North", "East", "South", "West"].forEach((dir) => {
  const btn = document.createElement("button");
  btn.textContent = dir;
  btn.onclick = () => movePlayer(dir.toLowerCase() as Direction);
  controlPanelDiv.appendChild(btn);
});
document.body.append(statusPanelDiv);

// Constants
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const WIN_VALUE = 16;

// Track rendered cells
const renderedCells = new Map<string, {
  rect: leaflet.Rectangle;
  marker: leaflet.Marker;
  value: number;
}>();

// Map Setup
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

const cellStates = new Map<string, CellState>();

leaflet
  .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
  .addTo(map);

// Player Marker
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You");
playerMarker.addTo(map);

const playerCell: CellCoord = latLngToCell(
  CLASSROOM_LATLNG.lat,
  CLASSROOM_LATLNG.lng,
);

// Game State
let heldToken: number | null = null;

// Helper Functions
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

function createCell(cell: CellCoord) {
  const bounds = cellToBounds(cell);
  const key = cellKey(cell.i, cell.j);

  let state = cellStates.get(key);
  if (!state) {
    const tokenRoll = luck(`token-${key}`);
    const valueRoll = luck(`value-${key}`);
    state = {
      hasToken: tokenRoll < 0.5,
      value: valueRoll < 0.2 ? 2 : 1,
    };
    cellStates.set(key, state);
  }

  if (!state.hasToken) return;

  const rect = leaflet.rectangle(bounds, {
    color: "lightgreen",
    fillOpacity: 0.3,
  }).addTo(map);
  const marker = leaflet.marker(bounds.getCenter(), {
    icon: leaflet.divIcon({
      html: `<b>${state.value}</b>`,
      className: "token",
    }),
  }).addTo(map);

  const handleClick = () => {
    const distI = Math.abs(cell.i - playerCell.i);
    const distJ = Math.abs(cell.j - playerCell.j);
    if (Math.max(distI, distJ) > 3) return;

    if (heldToken === null) {
      heldToken = state.value;
    } else if (heldToken === state.value) {
      heldToken = state.value * 2;
    } else {
      return; // can't collect or merge
    }

    rect.remove();
    marker.remove();
    renderedCells.delete(key);

    // Update persistent state
    const existingState = cellStates.get(key);
    if (existingState) {
      existingState.hasToken = false;
      cellStates.set(key, existingState);
    }

    updateStatus();
  };

  rect.on("click", handleClick);
  marker.on("click", handleClick);

  renderedCells.set(key, { rect, marker, value: state.value });
}

function movePlayer(dir: "north" | "south" | "east" | "west") {
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
  map.panTo(newPos); // optional: follow player
  updateVisibleCells();
}

function updateStatus() {
  statusPanelDiv.innerHTML = heldToken ? `Holding: ${heldToken}` : "Holding: —";
  if (heldToken !== null && heldToken >= WIN_VALUE) {
    statusPanelDiv.innerHTML += " 🎉 YOU WIN!";
  }
}

function updateVisibleCells() {
  const center = map.getCenter();
  const centerCell = latLngToCell(center.lat, center.lng);

  const newCellsNeeded = new Set<string>();
  for (let di = -2; di <= 2; di++) {
    for (let dj = -2; dj <= 2; dj++) {
      newCellsNeeded.add(cellKey(centerCell.i + di, centerCell.j + dj));
    }
  }

  const currentCells = new Set(renderedCells.keys());

  // Add missing cells
  for (const key of newCellsNeeded) {
    if (!currentCells.has(key)) {
      const [i, j] = key.split(",").map(Number);
      createCell({ i, j });
    }
  }

  // Remove cells no longer in view
  for (const key of currentCells) {
    if (!newCellsNeeded.has(key)) {
      const { rect, marker } = renderedCells.get(key)!;
      rect.remove();
      marker.remove();
      renderedCells.delete(key);
    }
  }
}

// Initial Setup
map.on("moveend", updateVisibleCells);
updateVisibleCells();
updateStatus();
