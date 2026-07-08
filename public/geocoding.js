let map;
let marker = null;
let roofPolygons = [];
let selectedRoofIndices = [];
let drawing = false;
let roofPoints = [];
let geocoder;

const addressInput = document.getElementById("address");
const houseInfo = document.getElementById("houseInfo");
const message = document.getElementById("message");
const drawRoofBtn = document.getElementById("drawRoofBtn");
const clearRoofBtn = document.getElementById("clearRoofBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const pencilCursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffffff' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z'/%3E%3Cpath fill='%23ffffff' d='M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E\") 2 22, crosshair";

function setNextStepEnabled(enabled) {
  nextStepBtn.disabled = !enabled;
  nextStepBtn.classList.toggle("ready", enabled);
}

setNextStepEnabled(false);

function setDrawingCursor(enabled) {
  if (!map) return;
  document.body.classList.toggle("drawing-mode", enabled);
  map.getDiv().classList.toggle("drawing", enabled);
  map.setOptions({
    draggableCursor: enabled ? pencilCursor : null,
    draggingCursor: enabled ? pencilCursor : null
  });
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 38.7223, lng: -9.1393 },
    zoom: 19,
    mapTypeId: "satellite",
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    rotateControl: false,
    scaleControl: true,
    tilt: 0,
    heading: 0
  });

  geocoder = new google.maps.Geocoder();
  setNextStepEnabled(false);

  map.addListener("click", (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    if (!drawing) setMarker(lat, lng);
    else addRoofPoint(lat, lng);
  });

  initAutocomplete();
}

function setMarker(lat, lng) {
  if (marker) marker.setMap(null);

  marker = new google.maps.Marker({
    position: { lat, lng },
    map,
    draggable: true
  });

  marker.addListener("dragend", (event) => {
    const newLat = event.latLng.lat();
    const newLng = event.latLng.lng();
    houseInfo.textContent = `Lat: ${newLat.toFixed(6)}, Lng: ${newLng.toFixed(6)}`;
    reverseGeocode(newLat, newLng);
  });

  map.setCenter({ lat, lng });

  houseInfo.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  reverseGeocode(lat, lng);
}

function initAutocomplete() {
  const autocomplete = new google.maps.places.Autocomplete(addressInput);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    setMarker(lat, lng);
  });
}

function reverseGeocode(lat, lng) {
  if (!geocoder) return;

  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
    if (status === "OK" && results && results[0]) {
      const formatted = results[0].formatted_address;
      addressInput.value = formatted;
      houseInfo.textContent = formatted;
      message.textContent = "Morada atualizada";
    } else {
      message.textContent = "Sem morada para este ponto";
    }
  });
}

function searchAddress() {
  const address = addressInput.value;

  if (!address) {
    message.textContent = "Escreve uma morada";
    return;
  }

  geocoder.geocode({ address: address }, (results, status) => {
    if (status === "OK") {
      const location = results[0].geometry.location;

      setMarker(location.lat(), location.lng());
      map.setZoom(19);

      message.textContent = "Morada encontrada";
    } else {
      message.textContent = "Morada não encontrada";
    }
  });
}

// BOTÃO PESQUISAR
document.getElementById("searchBtn").onclick = searchAddress;

// ENTER NO INPUT
addressInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchAddress();
  }
});

function startDrawing() {
  drawing = true;
  roofPoints = [];
  setDrawingCursor(true);

  message.textContent = "Modo desenho ativo (clique para adicionar pontos)";
  drawRoofBtn.textContent = "Concluir face";
}

function addRoofPoint(lat, lng) {
  roofPoints.push({ lat, lng });

  // Preview: desenha a face em construção sem afetar as já existentes.
  if (roofPolygons._draft) roofPolygons._draft.setMap(null);
  roofPolygons._draft = new google.maps.Polygon({
    paths: roofPoints,
    strokeColor: "#14b8a6",
    strokeWeight: 2,
    fillColor: "#14b8a6",
    fillOpacity: 0.2,
    clickable: false
  });

  roofPolygons._draft.setMap(map);

  houseInfo.textContent = `Pontos: ${roofPoints.length}`;
}

function applyPolygonStyle(polygon, selected) {
  polygon.setOptions({
    strokeColor: selected ? "#0f766e" : "#14b8a6",
    strokeOpacity: 1,
    strokeWeight: selected ? 3 : 2,
    fillColor: "#14b8a6",
    fillOpacity: selected ? 0.35 : 0.2,
    clickable: true
  });
}

function toggleRoofPolygonSelection(index) {
  if (!Number.isInteger(index) || index < 0 || index >= roofPolygons.length) return;
  const existingIdx = selectedRoofIndices.indexOf(index);
  if (existingIdx >= 0) {
    selectedRoofIndices.splice(existingIdx, 1);
  } else {
    selectedRoofIndices.push(index);
  }
  selectedRoofIndices.sort((a, b) => a - b);

  const selectedSet = new Set(selectedRoofIndices);
  roofPolygons.forEach((poly, i) => applyPolygonStyle(poly, selectedSet.has(i)));

  const polygons = roofPolygonsData();
  const selected = selectedRoofIndices.map((i) => polygons[i]).filter(Boolean);
  const totalArea = selected.reduce((sum, p) => sum + (p.areaSqm || 0), 0);
  if (selected.length) {
    houseInfo.textContent = `Faces selecionadas: ${selectedRoofIndices.map((i) => i + 1).join(", ")} • Área total: ${totalArea.toFixed(1)} m²`;
  } else {
    houseInfo.textContent = `Face criada: ${roofPolygons.length}. Clique numa face para selecionar.`;
  }
  setNextStepEnabled(selectedRoofIndices.length > 0);
}

function roofPolygonsData() {
  return roofPolygons.map((poly) => {
    const path = poly.getPath().getArray().map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng()
    }));
    const areaSqm = google.maps.geometry.spherical.computeArea(
      path.map((p) => new google.maps.LatLng(p.lat, p.lng))
    );
    const center = path.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    center.lat /= path.length;
    center.lng /= path.length;
    return { points: path, areaSqm, center };
  });
}

function finishDrawing() {
  if (roofPoints.length < 3) {
    message.textContent = "Precisas de 3 pontos";
    return;
  }

  drawing = false;
  drawRoofBtn.textContent = "Desenhar face";
  setDrawingCursor(false);

  if (roofPolygons._draft) {
    roofPolygons._draft.setMap(null);
    roofPolygons._draft = null;
  }

  const poly = new google.maps.Polygon({
    paths: roofPoints,
    strokeColor: "#14b8a6",
    strokeWeight: 2,
    fillColor: "#14b8a6",
    fillOpacity: 0.2,
    clickable: true
  });

  poly.addListener("click", () => {
    const idx = roofPolygons.indexOf(poly);
    if (idx >= 0) toggleRoofPolygonSelection(idx);
  });

  poly.setMap(map);
  roofPolygons.push(poly);

  message.textContent = `Face ${roofPolygons.length} criada. Clique para selecionar (pode selecionar várias).`;
  toggleRoofPolygonSelection(roofPolygons.length - 1);
}

function clearRoof() {
  if (roofPolygons._draft) {
    roofPolygons._draft.setMap(null);
    roofPolygons._draft = null;
  }
  roofPolygons.forEach((poly) => poly.setMap(null));
  roofPolygons = [];
  selectedRoofIndices = [];
  roofPoints = [];
  drawing = false;
  setDrawingCursor(false);

  drawRoofBtn.textContent = "Desenhar face";
  houseInfo.textContent = "Casa: nenhuma";
  message.textContent = "Limpo";
  setNextStepEnabled(false);
}

function getCenter() {
  const polygons = roofPolygonsData();
  const selected = selectedRoofIndices.map((i) => polygons[i]).filter(Boolean);
  if (!selected.length) return null;
  const weighted = selected.reduce(
    (acc, p) => {
      const w = Number.isFinite(p.areaSqm) && p.areaSqm > 0 ? p.areaSqm : 1;
      return {
        lat: acc.lat + p.center.lat * w,
        lng: acc.lng + p.center.lng * w,
        w: acc.w + w
      };
    },
    { lat: 0, lng: 0, w: 0 }
  );
  if (!weighted.w) return selected[0].center;
  return { lat: weighted.lat / weighted.w, lng: weighted.lng / weighted.w };
}

function saveData() {
  if (!roofPolygons.length || !selectedRoofIndices.length) {
    message.textContent = "Desenha pelo menos uma face do telhado e seleciona uma ou mais faces";
    return false;
  }

  const polygons = roofPolygonsData();
  const selectedPolygons = selectedRoofIndices.map((i) => polygons[i]).filter(Boolean);
  if (!selectedPolygons.length) return false;

  const totalAreaSqm = selectedPolygons.reduce((sum, p) => sum + (p.areaSqm || 0), 0);
  const center = getCenter();
  const legacyPrimary = selectedPolygons[0];

  const data = {
    address: addressInput.value,
    // Compatibilidade: mantém o formato antigo com a "primeira" face selecionada.
    center: center || (legacyPrimary ? legacyPrimary.center : null),
    points: legacyPrimary ? legacyPrimary.points : [],
    area: totalAreaSqm,
    areaSqm: totalAreaSqm,
    // Novo: lista de faces + faces selecionadas.
    polygons,
    selectedPolygonIndices: selectedRoofIndices.slice()
  };

  sessionStorage.setItem("roofSelection", JSON.stringify(data));
  return true;
}

drawRoofBtn.onclick = () => {
  if (!drawing) {
    startDrawing();
    setNextStepEnabled(false);
  } else {
    finishDrawing();
  }
};

clearRoofBtn.onclick = clearRoof;

nextStepBtn.onclick = () => {
  if (!saveData()) return;
  window.location.href = "questionario.html";
};

window.initMap = initMap;
