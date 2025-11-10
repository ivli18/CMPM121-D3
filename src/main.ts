// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

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
const GRID_SIZE = 5;
const WIN_VALUE = 8;

// Map Setup
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

// Player Marker
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You");
playerMarker.addTo(map);

// Game State
let heldToken: number | null = null;

function updateStatus() {
  statusPanelDiv.innerHTML = heldToken ? `Holding: ${heldToken}` : "Holding: —";
  if (heldToken! >= WIN_VALUE) {
    statusPanelDiv.innerHTML += " 🎉 YOU WIN!";
  }
}
updateStatus();

// Spawn tokens on grid
for (let i = -Math.floor(GRID_SIZE / 2); i <= Math.floor(GRID_SIZE / 2); i++) {
  for (
    let j = -Math.floor(GRID_SIZE / 2);
    j <= Math.floor(GRID_SIZE / 2);
    j++
  ) {
    const hasToken = luck([i, j, "token"].toString()) < 0.5;
    if (!hasToken) continue;

    const value = luck([i, j, "tokenValue"].toString()) < 0.2 ? 2 : 1;
    const lat = CLASSROOM_LATLNG.lat + i * TILE_DEGREES;
    const lng = CLASSROOM_LATLNG.lng + j * TILE_DEGREES;
    const bounds = leaflet.latLngBounds([
      [lat, lng],
      [lat + TILE_DEGREES, lng + TILE_DEGREES],
    ]);

    const rect = leaflet.rectangle(bounds, {
      color: "blue",
      fillOpacity: 0.1,
    }).addTo(map);

    const marker = leaflet.marker(bounds.getCenter(), {
      icon: leaflet.divIcon({ html: `<b>${value}</b>`, className: "token" }),
    }).addTo(map);
    // Only allow interaction if cell is near player
    const isInReach = Math.max(Math.abs(i), Math.abs(j)) <= 3;

    // Prevent double-processing when both marker and rect handlers fire.
    let consumed = false;

    const handleClick = () => {
      if (!isInReach || consumed) return;

      if (heldToken === null) {
        // Pick up token
        consumed = true;
        heldToken = value;
        marker.remove();
        rect.remove();
        updateStatus();
      } else if (heldToken === value) {
        // Merge tokens
        consumed = true;
        heldToken = value * 2;
        marker.remove();
        rect.remove();
        updateStatus();
      } else {
        // Holding the wrong token: do nothing (token remains)
      }
    };

    if (isInReach) {
      rect.on("click", handleClick);
      marker.on("click", handleClick);
    } else {
      rect.bindTooltip("Too far away!");
    }
  }
}
