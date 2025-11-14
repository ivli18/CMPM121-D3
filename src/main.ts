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

// DOM Elements
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
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

// Game State
let heldToken: number | null = null;

// Helper Functions
function cellKey(i: number, j: number): string {
  return `${i},${j}`;
}

function latLngToCell(lat: number, lng: number): CellCoord {
  return {
    i: Math.floor((lng - CLASSROOM_LATLNG.lng) / TILE_DEGREES),
    j: Math.floor((lat - CLASSROOM_LATLNG.lat) / TILE_DEGREES),
  };
}

function cellToBounds(cell: CellCoord): leaflet.LatLngBounds {
  const lat = CLASSROOM_LATLNG.lat + cell.j * TILE_DEGREES;
  const lng = CLASSROOM_LATLNG.lng + cell.i * TILE_DEGREES;
  return leaflet.latLngBounds(
    [lat, lng],
    [lat + TILE_DEGREES, lng + TILE_DEGREES],
  );
}

function createCell(cell: CellCoord) {
  const bounds = cellToBounds(cell);
  const key = cellKey(cell.i, cell.j); // Unique string key

  // Deterministic token (same position → same outcome)
  const hasToken = luck(`token-${key}`) < 0.5;
  if (!hasToken) return;

  const value = luck(`value-${key}`) < 0.2 ? 2 : 1;
  const rect = leaflet.rectangle(bounds, {
    color: "lightgreen",
    fillOpacity: 0.3,
  }).addTo(map);

  const marker = leaflet.marker(bounds.getCenter(), {
    icon: leaflet.divIcon({ html: `<b>${value}</b>`, className: "token" }),
  }).addTo(map);

  const handleClick = () => {
    const maxDist = Math.max(Math.abs(cell.i), Math.abs(cell.j));
    if (maxDist > 3) return; // Too far
    if (heldToken === null) {
      heldToken = value;
      rect.remove();
      marker.remove();
      renderedCells.delete(key);
      updateStatus();
    } else if (heldToken === value) {
      heldToken = value * 2;
      rect.remove();
      marker.remove();
      renderedCells.delete(key);
      updateStatus();
    }
  };

  rect.on("click", handleClick);
  marker.on("click", handleClick);

  renderedCells.set(key, { rect, marker, value });
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
