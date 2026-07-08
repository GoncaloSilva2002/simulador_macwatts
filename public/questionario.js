  function loadStoredJson(key) {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function persistJson(key, value) {
    const raw = JSON.stringify(value);
    try {
      sessionStorage.setItem(key, raw);
    } catch (error) {
      console.warn("Falha ao guardar em sessionStorage:", error);
    }
    try {
      localStorage.setItem(key, raw);
    } catch (error) {
      console.warn("Falha ao guardar em localStorage:", error);
    }
  }

  function openLocalDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("macwatts-storage", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("uploads")) {
          db.createObjectStore("uploads");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbSet(key, value) {
    const db = await openLocalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDel(key) {
    const db = await openLocalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  const clientAddressTitle = document.getElementById("clientAddressTitle");
  const centerText = document.getElementById("centerText");
  const areaText = document.getElementById("areaText");
  const zoneText = document.getElementById("zoneText");
  const form = document.getElementById("questionnaireForm");
  const statusEl = document.getElementById("status");
  const backBtn = document.getElementById("backBtn");
  const priceLight = document.getElementById("priceLight");
  const priceValue = document.getElementById("priceValue");
  const pricePerKwhInput = document.getElementById("pricePerKwh");
  const powerTermInput = document.getElementById("powerTerm");
  const monthlyKwhTotalText = document.getElementById("monthlyKwhTotalText");
  const monthlyKwhCoveredText = document.getElementById("monthlyKwhCoveredText");
  const monthlyKwpText = document.getElementById("monthlyKwpText");
  const panelProductionText = document.getElementById("panelProductionText");
  const panelsNeededText = document.getElementById("panelsNeededText");
  const batteryCapacityText = document.getElementById("batteryCapacityText");
  const powerTermWarning = document.getElementById("powerTermWarning");
  const roofPanelsWarning = document.getElementById("roofPanelsWarning");
  const chartHomeFill = document.getElementById("chartHomeFill");
  const chartHomePct = document.getElementById("chartHomePct");
  const chartGridFill = document.getElementById("chartGridFill");
  const chartGridPct = document.getElementById("chartGridPct");
  const chartSystemFill = document.getElementById("chartSystemFill");
  const chartSystemPct = document.getElementById("chartSystemPct");
  const chartNetworkFill = document.getElementById("chartNetworkFill");
  const chartNetworkPct = document.getElementById("chartNetworkPct");
  const chartBatteryProdRow = document.getElementById("chartBatteryProdRow");
  const chartBatteryUseRow = document.getElementById("chartBatteryUseRow");
  const chartBatteryProdFill = document.getElementById("chartBatteryProdFill");
  const chartBatteryUseFill = document.getElementById("chartBatteryUseFill");
  const chartBatteryProdPct = document.getElementById("chartBatteryProdPct");
  const chartBatteryUsePct = document.getElementById("chartBatteryUsePct");
  const chartHomeCaption = document.getElementById("chartHomeCaption");
  const chartBatteryCaption = document.getElementById("chartBatteryCaption");
  const chartGridCaption = document.getElementById("chartGridCaption");
  const chartSystemCaption = document.getElementById("chartSystemCaption");
  const chartBatteryUseCaption = document.getElementById("chartBatteryUseCaption");
  const chartNetworkCaption = document.getElementById("chartNetworkCaption");
  const powerTermModal = document.getElementById("powerTermModal");
  const powerTermModalText = document.getElementById("powerTermModalText");
  const powerTermClose = document.getElementById("powerTermClose");
  const invoiceCapture = document.getElementById("invoiceCapture");
  const invoicePdfUpload = document.getElementById("invoicePdfUpload");
  const openInvoiceMenu = document.getElementById("openInvoiceMenu");
  const openInvoicePdf = document.getElementById("openInvoicePdf");
  const openInvoiceCapture = document.getElementById("openInvoiceCapture");
  const invoiceMenu = document.getElementById("invoiceMenu");
  const invoiceStatus = document.getElementById("invoiceStatus");
  const invoiceRemoveBtn = document.getElementById("invoiceRemoveBtn");
  const cameraOverlay = document.getElementById("cameraOverlay");
  const cameraPreview = document.getElementById("cameraPreview");
  const cameraCanvas = document.getElementById("cameraCanvas");
  const closeCamera = document.getElementById("closeCamera");
  const switchCamera = document.getElementById("switchCamera");
  const capturePhoto = document.getElementById("capturePhoto");

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function ensureInfoTooltip() {
    let tooltip = document.getElementById("infoTooltip");
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.id = "infoTooltip";
    tooltip.className = "info-tooltip";
    tooltip.setAttribute("role", "dialog");
    tooltip.setAttribute("aria-label", "Pré-visualização");
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function showInfoTooltip(anchorEl) {
    const imageSrc = anchorEl.getAttribute("data-info-image");
    if (!imageSrc) return;
    const imageAlt = anchorEl.getAttribute("data-info-alt") || "Imagem";

    const tooltip = ensureInfoTooltip();
    tooltip.innerHTML = `<img src="${imageSrc}" alt="${imageAlt}">`;
    tooltip.style.display = "block";

    const anchorRect = anchorEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 8;
    const gap = 10;

    const desiredLeft = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    const left = clamp(desiredLeft, padding, window.innerWidth - tooltipRect.width - padding);

    const fitsBelow = anchorRect.bottom + gap + tooltipRect.height <= window.innerHeight - padding;
    const top = fitsBelow
      ? anchorRect.bottom + gap
      : Math.max(padding, anchorRect.top - gap - tooltipRect.height);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideInfoTooltip() {
    const tooltip = document.getElementById("infoTooltip");
    if (!tooltip) return;
    tooltip.style.display = "none";
  }

  document.querySelectorAll(".info-icon[data-info-image]").forEach((icon) => {
    icon.addEventListener("mouseenter", () => showInfoTooltip(icon));
    icon.addEventListener("focus", () => showInfoTooltip(icon));
    icon.addEventListener("mouseleave", hideInfoTooltip);
    icon.addEventListener("blur", hideInfoTooltip);
  });

  window.addEventListener("scroll", hideInfoTooltip, { passive: true });
  window.addEventListener("resize", hideInfoTooltip);

  let cameraStream = null;
  let cameraFacingMode = "environment";
  const batteryChoiceInputs = Array.from(document.querySelectorAll('input[name="batteryChoice"]'));
  const phaseTypeInputs = Array.from(document.querySelectorAll('input[name="phaseType"]'));
  const usageTimeInputs = Array.from(document.querySelectorAll('input[name="usageTime"]'));
  const roofTypeInputs = Array.from(document.querySelectorAll('input[name="roofType"]'));
  let showPowerTermPopup = false;
  let pendingOverlayRecalc = false;

  let roofData = loadStoredJson("roofSelection");
  let savedQuestionnaire = loadStoredJson("contactQuestionnaire");
  let invoiceFile = loadStoredJson("invoiceFile");
  let invoicePhoto = loadStoredJson("invoicePhoto");
  let invoicePdf = loadStoredJson("invoicePdf");
  const defaultInvoiceHint = invoiceStatus ? invoiceStatus.textContent : "";
  const GOOGLE_MAPS_KEY = "AIzaSyDb_0_8iNV8ojyt8nbqXKt7SBVgWGc-qRs";

  if (roofData && !Number.isFinite(roofData.areaSqm) && Number.isFinite(roofData.area)) {
    roofData.areaSqm = roofData.area;
  }

  function getSelectedRoofFaces(data) {
    if (!data) return [];
    const polygons = Array.isArray(data.polygons) ? data.polygons : null;
    const selectedIndices = Array.isArray(data.selectedPolygonIndices)
      ? data.selectedPolygonIndices.filter((v) => Number.isInteger(v))
      : Number.isInteger(data.selectedPolygonIndex)
        ? [data.selectedPolygonIndex]
        : null;

    if (polygons && selectedIndices && selectedIndices.length) {
      return selectedIndices.map((idx) => polygons[idx]).filter(Boolean);
    }
    if (polygons && polygons.length) {
      return polygons;
    }
    if (Array.isArray(data.points) && data.points.length >= 3) {
      return [
        {
          points: data.points,
          areaSqm: Number.isFinite(Number(data.areaSqm)) ? Number(data.areaSqm) : Number(data.area) || 0,
          center: data.center || null
        }
      ];
    }
    return [];
  }

  function summarizeRoofFaces(faces) {
    const validFaces = Array.isArray(faces) ? faces : [];
    const totalAreaSqm = validFaces.reduce((sum, face) => sum + (Number(face && face.areaSqm) || 0), 0);
    const center = (() => {
      const weighted = validFaces.reduce(
        (acc, face) => {
          const c = face && face.center;
          if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return acc;
          const w = Number.isFinite(face.areaSqm) && face.areaSqm > 0 ? face.areaSqm : 1;
          return { lat: acc.lat + c.lat * w, lng: acc.lng + c.lng * w, w: acc.w + w };
        },
        { lat: 0, lng: 0, w: 0 }
      );
      if (!weighted.w) return null;
      return { lat: weighted.lat / weighted.w, lng: weighted.lng / weighted.w };
    })();
    return { totalAreaSqm, center };
  }

  const selectedRoofFaces = getSelectedRoofFaces(roofData);
  const selectedRoofSummary = summarizeRoofFaces(selectedRoofFaces);
  if (roofData && selectedRoofFaces.length) {
    roofData.areaSqm = selectedRoofSummary.totalAreaSqm || roofData.areaSqm;
    roofData.area = roofData.areaSqm;
    roofData.center = selectedRoofSummary.center || roofData.center;
  }

  // Configuração da região (ajusta estes valores conforme o país/região)
  const REGION_LAT_MIN = 36.9;
  const REGION_LAT_MAX = 42.2;
  const REGION_ZONE_COUNT = 4;
  const REGION_ZONE_LABELS = ["Sul", "Centro Sul", "Centro", "Norte"];

  // Produção média mensal por painel (0.53 kWp) em kWh, por zona.
  const ZONE_PANEL_MONTHLY_KWH = {
    "Norte": 59.6,
    "Centro":61,
    "Centro Sul": 68.5,
    "Sul": 72.9
  };
  const DEFAULT_PANEL_MONTHLY_KWH = 66.25;

  // Dimensões do painel e espaçamento (metros).
  const PANEL_WIDTH_M = 2.1;
  const PANEL_HEIGHT_M = 1.3;
  const PANEL_GAP_INCLINADO_M = 0.1;
  const PANEL_GAP_PLANO_M = 0.5;

  function getPanelGapM() {
    const roofType = roofTypeInputs.find((input) => input.checked)?.value || null;
    return roofType === "plano" ? PANEL_GAP_PLANO_M : PANEL_GAP_INCLINADO_M;
  }

  function getLatitudeZone(lat, minLat, maxLat, zoneCount = 3, labels = null) {
    if (!Number.isFinite(lat) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return null;
    }
    const interval = maxLat - minLat;
    if (interval <= 0 || zoneCount <= 0) {
      return null;
    }
    if (lat < minLat || lat > maxLat) {
      return "Fora da região";
    }

    const step = interval / zoneCount;
    const zoneIndex = Math.min(zoneCount - 1, Math.floor((lat - minLat) / step));

    if (Array.isArray(labels) && labels.length === zoneCount) {
      return labels[zoneIndex] || "Zona";
    }
    if (zoneCount === 3) {
      return ["Sul", "Centro", "Norte"][zoneIndex] || "Zona";
    }
    return `Zona ${zoneIndex + 1}`;
  }

  let map = null;
  let overlayView = null;
  let roofPolygons = [];
  let roofMarker = null;
  let panelPolygons = [];
  let panelPolygonsLatLng = [];

  let currentZoneLabel = null;
  let lastPanelsNeeded = 0;
  let lastPanelsIdeal = 0;
  let lastPanelsFit = 0;
  let lastPanelsFitRequested = 0;
  let lastPanelsMaxByArea = null;
  let lastPanelsPlaced = null;
  let lastPanelsCapacity = null;

  if (!roofData || !roofData.center || !selectedRoofFaces.length) {
    statusEl.textContent = "Não encontrámos seleção de telhado. Volta ao passo anterior.";
    clientAddressTitle.textContent = "Sem morada";
  } else {
    const selectedAddress = roofData.address || "não disponível";
    clientAddressTitle.textContent = selectedAddress;
    centerText.textContent = `Centro: lat ${roofData.center.lat.toFixed(6)}, lon ${roofData.center.lng.toFixed(6)}`;
    areaText.textContent = `Área estimada: ${(roofData.areaSqm || 0).toFixed(1)} m²`;
    currentZoneLabel = getLatitudeZone(
      roofData.center.lat,
      REGION_LAT_MIN,
      REGION_LAT_MAX,
      REGION_ZONE_COUNT,
      REGION_ZONE_LABELS
    );
    zoneText.textContent = currentZoneLabel ? `Zona: ${currentZoneLabel}` : "Zona: configure latitudes";
  }

  function getInvoiceAttachment() {
    return [invoiceFile, invoicePdf, invoicePhoto].find((item) => item && item.dataUrl) || null;
  }

  function updateInvoiceUi(nextText = null) {
    if (!invoiceStatus || !invoiceRemoveBtn) return;
    const attachment = getInvoiceAttachment();
    const hasAttachment = Boolean(attachment);

    if (nextText !== null) {
      invoiceStatus.textContent = nextText;
    } else if (hasAttachment) {
      invoiceStatus.textContent = attachment && attachment.name ? `Fatura anexada: ${attachment.name}` : "Fatura anexada.";
    } else {
      invoiceStatus.textContent = defaultInvoiceHint;
    }

    if (hasAttachment) {
      invoiceRemoveBtn.hidden = false;
    } else {
      invoiceRemoveBtn.hidden = true;
    }
  }

  async function clearInvoiceAttachment() {
    invoiceFile = null;
    invoicePhoto = null;
    invoicePdf = null;

    ["invoiceFile", "invoicePhoto", "invoicePdf"].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

    if (invoiceCapture) invoiceCapture.value = "";
    if (invoicePdfUpload) invoicePdfUpload.value = "";

    try {
      await idbDel("invoiceFile");
      await idbDel("invoiceKind");
    } catch (error) {
      console.warn("Falha ao remover fatura do IndexedDB:", error);
    }

    updateInvoiceUi();
  }

  function initQuestionnaireMap() {
    map = new google.maps.Map(document.getElementById("roofPreview"), {
      center: { lat: 38.7223, lng: -9.1393 },
      zoom: 12,
      mapTypeId: "satellite",
      disableDefaultUI: true,
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      keyboardShortcuts: false,
      gestureHandling: "none"
    });

    overlayView = new google.maps.OverlayView();
    overlayView.onAdd = function () {};
    overlayView.draw = function () {};
    overlayView.setMap(map);

    if (!roofData || !roofData.center || !selectedRoofFaces.length) {
      return;
    }

    roofPolygons.forEach((poly) => poly.setMap(null));
    roofPolygons = [];

    const bounds = new google.maps.LatLngBounds();
    selectedRoofFaces.forEach((face) => {
      const path = (face.points || []).map((point) => ({ lat: point.lat, lng: point.lng }));
      if (path.length < 3) return;
      const poly = new google.maps.Polygon({
        paths: path,
        strokeColor: "#14b8a6",
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: "#14b8a6",
        fillOpacity: 0.35,
        clickable: false
      });
      poly.setMap(map);
      roofPolygons.push(poly);
      path.forEach((point) => bounds.extend(point));
    });

    roofMarker = new google.maps.Marker({
      position: { lat: roofData.center.lat, lng: roofData.center.lng },
      map,
      clickable: false
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
    }
    google.maps.event.addListenerOnce(map, "idle", () => renderPriceSlider());
  }

  backBtn.addEventListener("click", () => {
    window.location.href = "geocoding.html";
  });

  updateInvoiceUi();

  function estimateMaxPanelsByRoofArea() {
    const roofAreaSqm = roofData && Number.isFinite(Number(roofData.areaSqm)) ? Number(roofData.areaSqm) : null;
    if (!roofAreaSqm || roofAreaSqm <= 0) return null;
    const gap = getPanelGapM();
    const panelAreaSqm = (PANEL_WIDTH_M + gap) * (PANEL_HEIGHT_M + gap);
    const packingEfficiency = 0.80;
    const maxPanels = Math.floor((roofAreaSqm * packingEfficiency) / panelAreaSqm);
    return Math.max(0, maxPanels);
  }

  function normalizePanelsCount(count) {
    let normalized = Number(count);
    if (!Number.isFinite(normalized) || normalized < 0) normalized = 0;
    normalized = Math.floor(normalized);
    if (normalized % 2 !== 0) {
      normalized -= 1;
    }
    return Math.max(0, normalized);
  }

  const ALLOWED_PANEL_COUNTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 26];

  function clampPanelsToAllowedCount(count) {
    const normalized = normalizePanelsCount(count);
    // Entre 22 e 26 não existe 24 no produto: subimos para 26.
    if (normalized > 22 && normalized < 26) return 26;
    for (let i = ALLOWED_PANEL_COUNTS.length - 1; i >= 0; i--) {
      const allowed = ALLOWED_PANEL_COUNTS[i];
      if (allowed <= normalized) return allowed;
    }
    return 0;
  }

  function getBatteryLabel() {
    const selected = batteryChoiceInputs.find((input) => input.checked);
    if (!selected) return null;
    if (selected.value !== "sim") return "Não";
    const capacity = getBatteryCapacityKwh(lastPanelsNeeded);
    if (!capacity) {
      const panelInfo = lastPanelsNeeded ? ` (${lastPanelsNeeded} painéis)` : "";
      return `Sem bateria${panelInfo}`;
    }
    return `Sim (${capacity} kWh)`;
  }

  function getPhaseTypeLabel() {
    const selected = phaseTypeInputs.find((input) => input.checked);
    if (!selected) return null;
    return selected.value === "monofasica" ? "Monofásica" : "Trifásica";
  }

  function getUsageTimeLabel() {
    const selected = usageTimeInputs.find((input) => input.checked);
    if (!selected) return null;
    switch (selected.value) {
      case "manhas":
        return "Manhãs (08h:00-16h:00)";
      case "tardes":
        return "Tardes (16h:00-00h:00)";
      case "noites":
        return "Noites (00h:00-08h:00)";
      default:
        return "Dia todo";
    }
  }

  function panelsFromKwp(kwp) {
    if (!Number.isFinite(kwp) || kwp <= 0) return 0;
    if (kwp <= 1.1) return 2;
    if (kwp <= 2.1) return 4;
    if (kwp <= 3.2) return 6;
    if (kwp <= 4.2) return 8;
    if (kwp <= 5.3) return 10;
    if (kwp <= 6.4) return 12;
    if (kwp <= 7.4) return 14;
    if (kwp <= 8.5) return 16;
    if (kwp <= 10.6) return 20;
    if (kwp <= 11.7) return 22;
    if (kwp <= 13.8) return 26;
    return 26;
  }

  function getBatteryCapacityKwh(panelsCount) {
    if (!Number.isFinite(panelsCount) || panelsCount <= 0) return null;
    if (panelsCount <= 2) return 0;
    if (panelsCount <= 8) return 5;
    if (panelsCount <= 12) return 10;
    if (panelsCount <= 16) return 15;
    if (panelsCount <= 22) return 20;
    if (panelsCount <= 26) return 25;
    return 25;
  }

  function roundToOneDecimal(value) {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    const thousand = Math.floor((value + Number.EPSILON) * 1000);
    const base = Math.floor(thousand / 100); // base at 1 decimal, as integer (e.g. 2.1 -> 21)
    const remainder = thousand - base * 100; // 0..99 (represents 0.00..0.099)
    return remainder > 40 ? (base + 1) / 10 : base / 10;
  }

  function requiredKvaFromKwp(kwp) {
    if (!Number.isFinite(kwp) || kwp <= 0) return null;
    const inverterPowerKw = kwp / 1.2;
    return inverterPowerKw / 0.9;
  }

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function renderPriceSlider() {
    const min = Number(priceLight.min);
    const max = Number(priceLight.max);
    const value = Number(priceLight.value);
    const percent = ((value - min) / (max - min)) * 100;
    priceLight.style.background = `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${percent}%, #d1d5db ${percent}%, #d1d5db 100%)`;
    priceValue.textContent = `${value}€`;

    const pricePerKwhRaw = Number(String(pricePerKwhInput.value || "").replace(",", "."));
    const pricePerKwh = Number.isFinite(pricePerKwhRaw) && pricePerKwhRaw > 0 ? pricePerKwhRaw : 0.20;
    const powerTermRaw = Number(String(powerTermInput.value || "").replace(",", "."));
    const powerTerm = Number.isFinite(powerTermRaw) && powerTermRaw > 0 ? powerTermRaw : null;
    const panelPower = 0.53;
    const productionPerPanel = ZONE_PANEL_MONTHLY_KWH[currentZoneLabel] ?? DEFAULT_PANEL_MONTHLY_KWH;
    const usageTime = usageTimeInputs.find((input) => input.checked)?.value || null;
    const usageFactor = usageTime === "manhas" ? 0.71 : usageTime === "tardes" ? 0.88 : usageTime === "noites" ? 0.28 : 0.61;
    const wantsBattery = batteryChoiceInputs.find((input) => input.checked)?.value === "sim";
    const monthlyKwhTotal = value / pricePerKwh;
    const monthlyKwhCovered = monthlyKwhTotal * usageFactor;
    const monthlyKwhForPanels = wantsBattery ? monthlyKwhTotal : monthlyKwhCovered;
    const requiredKwp = (monthlyKwhForPanels / productionPerPanel) * panelPower;
    const requiredKwpRounded = roundToOneDecimal(requiredKwp);
    let idealPanels = panelsFromKwp(requiredKwpRounded);
    if (idealPanels % 2 !== 0) {
      idealPanels += 1;
    }
    idealPanels = clampPanelsToAllowedCount(idealPanels);
    const maxPanelsByArea = estimateMaxPanelsByRoofArea();
    let fitPanels = idealPanels;
    if (maxPanelsByArea !== null) {
      fitPanels = clampPanelsToAllowedCount(Math.min(idealPanels, maxPanelsByArea));
    }
    const fitPanelsRequest = fitPanels;
    const placedPanels = updatePanelOverlay(fitPanelsRequest);
    if (Number.isFinite(placedPanels) && placedPanels >= 0) {
      fitPanels = clampPanelsToAllowedCount(Math.min(fitPanelsRequest, placedPanels));
    } else if (placedPanels === null && map && !pendingOverlayRecalc) {
      pendingOverlayRecalc = true;
      google.maps.event.addListenerOnce(map, "idle", () => {
        pendingOverlayRecalc = false;
        renderPriceSlider();
      });
    }

    lastPanelsIdeal = idealPanels;
    lastPanelsFitRequested = fitPanelsRequest;
    lastPanelsFit = fitPanels;
    lastPanelsMaxByArea = maxPanelsByArea;
    lastPanelsPlaced = placedPanels;

    const monthlyKwhTotalRounded0 = Math.round(monthlyKwhTotal);
    const monthlyKwhCoveredRounded0 = Math.round(monthlyKwhCovered);
    monthlyKwhTotalText.textContent = `${monthlyKwhTotalRounded0} kWh`;
    monthlyKwhCoveredText.textContent = `${monthlyKwhCoveredRounded0} kWh`;
    const monthlyKwpRaw = fitPanels * panelPower;
    const monthlyKwpAdjusted = monthlyKwpRaw / 1.2;
    monthlyKwpText.textContent = `${requiredKwpRounded.toFixed(1)} kWp`;
    if (panelProductionText) {
      panelProductionText.textContent = `${productionPerPanel.toFixed(0)} kWh/mês`;
    }
    const fitKwp = roundToOneDecimal(fitPanels * panelPower);
    panelsNeededText.textContent = `${fitPanels} painéis (${fitKwp.toFixed(1)} kWp)`;
    if (batteryCapacityText) {
      const capacity = wantsBattery ? getBatteryCapacityKwh(fitPanels) : 0;
      batteryCapacityText.textContent = capacity > 0 ? `${capacity} kWh` : "Sem bateria";
    }
    lastPanelsNeeded = fitPanels;
    if (roofPanelsWarning) {
      // Usa o resultado efetivamente desenhado. No salto comercial de 22 para 26,
      // uma capacidade geométrica intermédia (por exemplo, 24) é arredondada para
      // o pedido de 26, embora o telhado possa acabar por receber apenas 22.
      if (idealPanels > 0 && fitPanels < idealPanels) {
        const fitKwp = roundToOneDecimal(fitPanels * panelPower);
        roofPanelsWarning.textContent = `No telhado é possível instalar aproximadamente ${fitPanels} painéis (${fitKwp.toFixed(1)} kWp). No entanto, a solução ideal prevê a instalação de ${idealPanels} painéis.`;
      } else {
        roofPanelsWarning.textContent = "";
      }
    }
	    const batteryMaxChargeFraction = 0.9; // não consideramos carga a 100% (SOC máx ~90%)


    const productionMonthly = productionPerPanel * fitPanels;
    const alignmentFactor = 0.85; // 85% eficiência temporal (ajustável)
    const producaoperca = productionMonthly * alignmentFactor;

    // --- CONSUMO ---
    const consumoTotal = monthlyKwhTotal;
    const consumoSolarEstimate = monthlyKwhCovered;
    // --- PRODUÇÃO (não pode exceder producaoperca) ---
    const homeFromCoveredBase = Math.min(consumoSolarEstimate, producaoperca); // produção usada diretamente
    const excedenteBase = Math.max(0, producaoperca - homeFromCoveredBase);

	    // Bateria: sem perdas/eficiências (pedido), apenas limite de carga (SOC máx ~90%).
	    // - "para a bateria" = energia carregada a partir do excedente
	    // - "da bateria" = energia entregue ao consumo (igual à carregada)
		    const batteryCapacityKwh = wantsBattery ? (getBatteryCapacityKwh(fitPanels) || 0) : 0;
	    const batteryChargeMaxMonthly = wantsBattery ? (batteryCapacityKwh * batteryMaxChargeFraction) * 30 : 0;
	    const batteryChargeNeededMonthly = wantsBattery ? Math.max(0, consumoTotal - homeFromCoveredBase) : 0;
	    const batteryChargedMonthlyBase = wantsBattery
	      ? Math.min(excedenteBase, batteryChargeMaxMonthly, batteryChargeNeededMonthly)
	      : 0;

	    // Ajuste solicitado: garantir sempre envio para a rede (+5% da produção estimada).
	    // Tiramos primeiro da bateria (se existir), e só depois da habitação.
	    const GRID_EXPORT_BONUS_PCT_POINTS = 5;
	    const gridExportBonusMonthly = producaoperca * (GRID_EXPORT_BONUS_PCT_POINTS / 100);
	    let homeFromCovered = homeFromCoveredBase;
	    let batteryChargedMonthly = batteryChargedMonthlyBase;
	    let remainingBonusMonthly = gridExportBonusMonthly;
	    if (remainingBonusMonthly > 0) {
	      const fromBatteryMonthly = wantsBattery ? Math.min(batteryChargedMonthly, remainingBonusMonthly) : 0;
	      batteryChargedMonthly = Math.max(0, batteryChargedMonthly - fromBatteryMonthly);
	      remainingBonusMonthly = Math.max(0, remainingBonusMonthly - fromBatteryMonthly);
	      if (remainingBonusMonthly > 0) {
	        const fromHomeMonthly = Math.min(homeFromCovered, remainingBonusMonthly);
	        homeFromCovered = Math.max(0, homeFromCovered - fromHomeMonthly);
	        remainingBonusMonthly = Math.max(0, remainingBonusMonthly - fromHomeMonthly);
	      }
	    }

	    // Mantemos o mesmo valor entre "produção" e "origem do consumo".
	    const homeFromTotal = homeFromCovered;
	    const remainingConsumptionAfterSolar = Math.max(0, consumoTotal - homeFromTotal);
	    const batteryFromTotal = wantsBattery ? Math.min(batteryChargedMonthly, remainingConsumptionAfterSolar) : 0;
	    const batteryFromCovered = batteryFromTotal;
	    const gridFromTotal = Math.max(0, consumoTotal - (homeFromTotal + batteryFromTotal));
	    const gridFromCovered = Math.max(0, producaoperca - homeFromCovered - batteryFromCovered);

    // --- BASES / PERCENTAGENS ---
    const clampPct = (value) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
    const roundPct1 = (value) => Math.round(clampPct(value) * 10) / 10;
    const roundPct0 = (value) => Math.round(clampPct(value));

		    // Destino da produção: percentagens sobre a produção mensal estimada.
		    // Nota: `homeFromCovered + batteryFromCovered + gridFromCovered` == `producaoperca` (com os clamps acima).
		    const coveredBase = homeFromCovered + batteryFromCovered + gridFromCovered;
    const homeCoveredPct = coveredBase ? clampPct((homeFromCovered / coveredBase) * 100) : 0;
    const batteryProdPct = wantsBattery && coveredBase ? clampPct((batteryFromCovered / coveredBase) * 100) : 0;
    const gridCoveredPct = clampPct(100 - homeCoveredPct - batteryProdPct);

    const homeCoveredWidth = roundPct1(homeCoveredPct);
    const batteryProdWidth = roundPct1(batteryProdPct);
    const gridCoveredWidth = roundPct1(Math.max(0, 100 - homeCoveredWidth - batteryProdWidth));

	    const homeCoveredLabel = roundPct0(homeCoveredPct);
	    const batteryProdLabel = wantsBattery ? roundPct0(batteryProdPct) : 0;
	    const gridCoveredLabel = Math.max(0, 100 - homeCoveredLabel - batteryProdLabel);

    // Origem do consumo: garantir que a soma é sempre 100%.
    const totalBase = homeFromTotal + batteryFromTotal + gridFromTotal;
    const systemPct = totalBase ? clampPct((homeFromTotal / totalBase) * 100) : 0;
    const batteryUsePct = wantsBattery && totalBase ? clampPct((batteryFromTotal / totalBase) * 100) : 0;
    const networkPct = clampPct(100 - systemPct - batteryUsePct);

    const systemWidth = roundPct1(systemPct);
    const batteryUseWidth = roundPct1(batteryUsePct);
    const networkWidth = roundPct1(Math.max(0, 100 - systemWidth - batteryUseWidth));

    const systemLabel = roundPct0(systemPct);
    const batteryUseLabel = wantsBattery ? roundPct0(batteryUsePct) : 0;
    const networkLabel = Math.max(0, 100 - systemLabel - batteryUseLabel);

    // kWh mostrados (inteiros): garantir que as somas batem certo com os totais (produção e consumo),
    // evitando erros de arredondamento.
    const toUnits = (value) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

    const productionKwhBase = toUnits(producaoperca);
    const consumptionKwhBase = toUnits(consumoTotal);

    const systemKwhDisplay = Math.min(toUnits(homeFromTotal), productionKwhBase, consumptionKwhBase);
    const batteryKwhDisplay = wantsBattery
      ? Math.min(
          toUnits(batteryFromTotal),
          Math.max(0, productionKwhBase - systemKwhDisplay),
          Math.max(0, consumptionKwhBase - systemKwhDisplay)
        )
      : 0;
    const gridExportKwhDisplay = Math.max(0, productionKwhBase - systemKwhDisplay - batteryKwhDisplay);
    const gridImportKwhDisplay = Math.max(0, consumptionKwhBase - systemKwhDisplay - batteryKwhDisplay);

    if (chartBatteryProdRow) {
      chartBatteryProdRow.style.display = wantsBattery ? "grid" : "none";
    }
    if (chartBatteryUseRow) {
      chartBatteryUseRow.style.display = wantsBattery ? "grid" : "none";
    }

    if (chartHomeFill && chartGridFill && chartSystemFill && chartNetworkFill) {
      chartHomeFill.style.width = `${homeCoveredWidth.toFixed(1)}%`;
      if (chartBatteryProdFill) {
        chartBatteryProdFill.style.width = `${batteryProdWidth.toFixed(1)}%`;
      }
      chartGridFill.style.width = `${gridCoveredWidth.toFixed(1)}%`;
      chartSystemFill.style.width = `${systemWidth.toFixed(1)}%`;
      if (chartBatteryUseFill) {
        chartBatteryUseFill.style.width = `${batteryUseWidth.toFixed(1)}%`;
      }
      chartNetworkFill.style.width = `${networkWidth.toFixed(1)}%`;
    }
    if (chartHomePct && chartGridPct && chartSystemPct && chartNetworkPct) {
      chartHomePct.textContent = `${homeCoveredLabel}%`;
      if (chartBatteryProdPct) {
        chartBatteryProdPct.textContent = `${batteryProdLabel}%`;
      }
      chartGridPct.textContent = `${gridCoveredLabel}%`;
      chartSystemPct.textContent = `${systemLabel}%`;
      if (chartBatteryUsePct) {
        chartBatteryUsePct.textContent = `${batteryUseLabel}%`;
      }
      chartNetworkPct.textContent = `${networkLabel}%`;
    }
    if (chartHomeCaption) {
      chartHomeCaption.textContent = `${systemKwhDisplay} kWh para a habitação`;
    }
    if (chartBatteryCaption) {
      chartBatteryCaption.textContent = `${batteryKwhDisplay} kWh para a bateria`;
      chartBatteryCaption.style.display = wantsBattery ? "block" : "none";
    }
    if (chartGridCaption) {
      chartGridCaption.textContent = `${gridExportKwhDisplay} kWh para a rede`;
    }
    if (chartSystemCaption) {
      chartSystemCaption.textContent = `${systemKwhDisplay} kWh do sistema`;
    }
    if (chartBatteryUseCaption) {
      chartBatteryUseCaption.textContent = `${batteryKwhDisplay} kWh da bateria`;
      chartBatteryUseCaption.style.display = wantsBattery ? "block" : "none";
    }
    if (chartNetworkCaption) {
      chartNetworkCaption.textContent = `${gridImportKwhDisplay} kWh da rede`;
    }

    if (powerTermWarning) {
      const panelsForPowerTerm = Number.isFinite(lastPanelsFit) ? clampPanelsToAllowedCount(lastPanelsFit) : 0;
      const kwpForPowerTerm = panelsForPowerTerm > 0
        ? roundToOneDecimal(panelsForPowerTerm * panelPower)
        : requiredKwpRounded;
      const requiredKva = requiredKvaFromKwp(kwpForPowerTerm);
      if (powerTerm && requiredKva && powerTerm < requiredKva) {
        powerTermWarning.textContent = "O termo de potência pode ser insuficiente para esta instalação.";
        if (showPowerTermPopup && powerTermModal && powerTermModalText) {
          powerTermModalText.textContent = "Aumentar o termo de potência.";
          powerTermModal.classList.add("open");
        }
      } else {
        powerTermWarning.textContent = "";
      }
    }
    showPowerTermPopup = false;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distancePointToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
    const clamped = Math.min(1, Math.max(0, t));
    const projX = a.x + clamped * dx;
    const projY = a.y + clamped * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }

  function minDistanceToEdges(point, polygon) {
    let min = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const dist = distancePointToSegment(point, polygon[i], polygon[j]);
      if (dist < min) min = dist;
    }
    return min;
  }

  function canPlaceRect(center, width, height, polygon, margin = 0) {
    const halfW = width / 2;
    const halfH = height / 2;
    const corners = [
      { x: center.x - halfW, y: center.y - halfH },
      { x: center.x + halfW, y: center.y - halfH },
      { x: center.x + halfW, y: center.y + halfH },
      { x: center.x - halfW, y: center.y + halfH }
    ];
    const midpoints = [
      { x: center.x, y: center.y - halfH },
      { x: center.x + halfW, y: center.y },
      { x: center.x, y: center.y + halfH },
      { x: center.x - halfW, y: center.y }
    ];
    const edgeSamples = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      edgeSamples.push(
        { x: a.x + (b.x - a.x) * 0.25, y: a.y + (b.y - a.y) * 0.25 },
        { x: a.x + (b.x - a.x) * 0.75, y: a.y + (b.y - a.y) * 0.75 }
      );
    }
    const samples = [center, ...corners, ...midpoints, ...edgeSamples];
    return samples.every((pt) => {
      if (!pointInPolygon(pt, polygon)) return false;
      return minDistanceToEdges(pt, polygon) >= margin;
    });
  }

  function polygonAreaPx(points) {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return Math.abs(area / 2);
  }

  function getPolygonCenter(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  function rotatePoint(point, angle, origin) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    return {
      x: origin.x + dx * cos - dy * sin,
      y: origin.y + dx * sin + dy * cos
    };
  }

  function encodeNumber(value) {
    let v = value < 0 ? ~(value << 1) : (value << 1);
    let encoded = "";
    while (v >= 0x20) {
      encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    encoded += String.fromCharCode(v + 63);
    return encoded;
  }

  function encodePolyline(points) {
    // Menos precisão = URLs mais curtos (Static Maps tem limites de tamanho).
    // 1e4 (~11m) é suficiente para o desenho de polígonos/painéis no contexto do questionário.
    const scale = 1e4;
    let lastLat = 0;
    let lastLng = 0;
    let result = "";
    points.forEach((point) => {
      const lat = Math.round(point.lat * scale);
      const lng = Math.round(point.lng * scale);
      const dLat = lat - lastLat;
      const dLng = lng - lastLng;
      lastLat = lat;
      lastLng = lng;
      result += encodeNumber(dLat) + encodeNumber(dLng);
    });
    return result;
  }

  function buildPathParam(options, points) {
    if (!points || !points.length) return null;
    const encoded = encodePolyline(points);
    const segments = [];
    if (options.fillColor) segments.push(`fillcolor:${options.fillColor}`);
    if (options.color) segments.push(`color:${options.color}`);
    if (options.weight !== undefined) segments.push(`weight:${options.weight}`);
    segments.push(`enc:${encoded}`);
    return segments.join("|");
  }

  function buildStaticMapUrl() {
    if (!map || !roofData || !roofData.center || !selectedRoofFaces.length) {
      return null;
    }
    const center = map.getCenter();
    const zoom = map.getZoom();
    const params = [];
    params.push(`center=${center.lat()},${center.lng()}`);
    params.push(`zoom=${zoom}`);
    params.push("size=640x400");
    params.push("scale=2");
    // Nota: Google Static Maps pode bloquear "satellite/hybrid" em contas/regiões (ex.: EEE).
    // Usamos "roadmap" para garantir que o mapa consegue ser gerado e anexado no email.
    params.push("maptype=roadmap");
    params.push(`key=${GOOGLE_MAPS_KEY}`);

    selectedRoofFaces.forEach((face) => {
      const points = (face.points || []).map((point) => ({ lat: point.lat, lng: point.lng }));
      if (points.length < 3) return;
      const roofPath = buildPathParam({ color: "0x14b8a6ff", fillColor: "0x14b8a655", weight: 2 }, points);
      if (roofPath) params.push(`path=${encodeURIComponent(roofPath)}`);
    });

    if (panelPolygonsLatLng.length) {
      const panelOptions = { color: "0x0b0b0bff", fillColor: "0x0b0b0bb3", weight: 1 };
      panelPolygonsLatLng.forEach((panel) => {
        const panelPath = buildPathParam(panelOptions, panel);
        if (panelPath) {
          params.push(`path=${encodeURIComponent(panelPath)}`);
        }
      });
    }

    let url = `https://maps.googleapis.com/maps/api/staticmap?${params.join("&")}`;
    if (url.length > 8000 && panelPolygonsLatLng.length) {
      const reduced = panelPolygonsLatLng.slice(0, Math.max(10, Math.floor(panelPolygonsLatLng.length / 2)));
      const reducedParams = params.filter((param) => !param.startsWith("path=") || param.includes("14b8a6"));
      reduced.forEach((panel) => {
        const panelPath = buildPathParam({ color: "0x0b0b0bff", fillColor: "0x0b0b0bb3", weight: 1 }, panel);
        if (panelPath) {
          reducedParams.push(`path=${encodeURIComponent(panelPath)}`);
        }
      });
      url = `https://maps.googleapis.com/maps/api/staticmap?${reducedParams.join("&")}`;
    }

    return url;
  }

  function buildEmailStaticMapUrl() {
    if (!map || !roofData || !roofData.center || !selectedRoofFaces.length) {
      return null;
    }
    const center = map.getCenter();
    const currentZoom = map.getZoom() || 0;
    const zoom = Math.max(0, currentZoom - 4);
    const params = [];
    params.push(`center=${center.lat()},${center.lng()}`);
    params.push(`zoom=${zoom}`);
    params.push("size=640x400");
    params.push("scale=2");
    // Nota: Google Static Maps pode bloquear "satellite/hybrid" em contas/regiões (ex.: EEE).
    // Usamos "roadmap" para garantir que o mapa consegue ser gerado e anexado no email.
    params.push("maptype=roadmap");
    params.push(`key=${GOOGLE_MAPS_KEY}`);

    selectedRoofFaces.forEach((face) => {
      const points = (face.points || []).map((point) => ({ lat: point.lat, lng: point.lng }));
      if (points.length < 3) return;
      const roofPath = buildPathParam({ color: "0x14b8a6ff", fillColor: "0x14b8a655", weight: 2 }, points);
      if (roofPath) params.push(`path=${encodeURIComponent(roofPath)}`);
    });

    params.push(`markers=color:red|${roofData.center.lat},${roofData.center.lng}`);

    if (panelPolygonsLatLng.length) {
      const panelOptions = { color: "0x0b0b0bff", fillColor: "0x0b0b0bb3", weight: 1 };
      panelPolygonsLatLng.forEach((panel) => {
        const panelPath = buildPathParam(panelOptions, panel);
        if (panelPath) {
          params.push(`path=${encodeURIComponent(panelPath)}`);
        }
      });
    }

    let url = `https://maps.googleapis.com/maps/api/staticmap?${params.join("&")}`;
    if (url.length > 8000 && panelPolygonsLatLng.length) {
      const reduced = panelPolygonsLatLng.slice(0, Math.max(10, Math.floor(panelPolygonsLatLng.length / 2)));
      const reducedParams = params.filter((param) => !param.startsWith("path=") || param.includes("14b8a6"));
      reduced.forEach((panel) => {
        const panelPath = buildPathParam({ color: "0x0b0b0bff", fillColor: "0x0b0b0bb3", weight: 1 }, panel);
        if (panelPath) {
          reducedParams.push(`path=${encodeURIComponent(panelPath)}`);
        }
      });
      url = `https://maps.googleapis.com/maps/api/staticmap?${reducedParams.join("&")}`;
    }

    return url;
  }

  async function generateMapSnapshot() {
    const url = buildEmailStaticMapUrl();
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      return {
        dataUrl,
        name: "mapa-telhado.png",
        mime: blob.type || "image/png"
      };
    } catch (error) {
      console.error("Erro ao gerar mapa estático:", error);
      return null;
    }
  }

  function getPolygonOrientation(points) {
    if (!points || points.length < 2) return 0;
    let maxLen = 0;
    let bestAngle = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const len = Math.hypot(dx, dy);
      if (len > maxLen) {
        maxLen = len;
        bestAngle = Math.atan2(dy, dx);
      }
    }
    return bestAngle;
  }

  function getMapSize() {
    if (!map) return { x: 0, y: 0 };
    const rect = map.getDiv().getBoundingClientRect();
    return { x: rect.width, y: rect.height };
  }

  function getPanelPixelSize(polygonPoints, roofAreaSqm) {
    const areaPx = polygonAreaPx(polygonPoints);
    if (!Number.isFinite(roofAreaSqm) || roofAreaSqm <= 0 || areaPx <= 0) {
      return null;
    }
    const pxPerMeter = Math.sqrt(areaPx / roofAreaSqm);
    return {
      width: Math.max(10, PANEL_WIDTH_M * pxPerMeter),
      height: Math.max(6, PANEL_HEIGHT_M * pxPerMeter),
      gap: Math.max(2, getPanelGapM() * pxPerMeter)
    };
  }

  function buildPanelPositions(polygonPoints, count, angle) {
    if (!polygonPoints || polygonPoints.length < 3 || count <= 0) {
      return [];
    }
    const fallback = (() => {
      const mapSize = getMapSize();
      const baseWidth = Math.max(10, Math.round(mapSize.x / 42));
      const baseHeight = Math.max(6, Math.round(baseWidth * 0.62));
      const baseGap = Math.max(2, Math.round(baseWidth * 0.2));
      return { width: baseWidth, height: baseHeight, gap: baseGap };
    })();
    const realSize = getPanelPixelSize(polygonPoints, Number(roofData && roofData.areaSqm));
    const base = realSize || fallback;
    const orientations = [
      { width: base.width, height: base.height },
      { width: base.height, height: base.width }
    ];
    const offsetSteps = [0, 0.2, 0.4, 0.6, 0.8];
    // A margem à borda não deve ser tão grande como o espaçamento entre painéis;
    // caso contrário, para pedidos pequenos (ex.: 2 painéis) podemos acabar a "perder" capacidade.
    const edgeMargin = Math.max(0, base.gap * 0.5);

    const origin = getPolygonCenter(polygonPoints);
    const baseRotation = Number.isFinite(angle) ? angle : 0;
    const rotationCandidates = [baseRotation, baseRotation + Math.PI / 24, baseRotation - Math.PI / 24];
    let best = [];

    for (const rotation of rotationCandidates) {
      const rotatedPolygon = polygonPoints.map((point) => rotatePoint(point, -rotation, origin));

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      rotatedPolygon.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });

      for (const orient of orientations) {
        const width = orient.width;
        const height = orient.height;
        const gap = base.gap;
        const stepX = width + gap;
        const stepY = height + gap;

        for (const ox of offsetSteps) {
          for (const oy of offsetSteps) {
            const startX = minX + width / 2 + stepX * ox;
            const startY = minY + height / 2 + stepY * oy;
            const placed = [];

            for (let y = startY; y <= maxY - height / 2; y += stepY) {
              for (let x = startX; x <= maxX - width / 2; x += stepX) {
                if (canPlaceRect({ x, y }, width, height, rotatedPolygon, edgeMargin)) {
                  const worldCenter = rotatePoint({ x, y }, rotation, origin);
                  placed.push({ x: worldCenter.x, y: worldCenter.y, width, height, angle: rotation });
                  if (placed.length >= count) break;
                }
              }
              if (placed.length >= count) break;
            }
            if (placed.length >= count) {
              return placed;
            }
            if (placed.length > best.length) {
              best = placed;
            }
          }
        }
      }
    }
    return best;
  }

  function clearPanelOverlay() {
    panelPolygons.forEach((polygon) => polygon.setMap(null));
    panelPolygons = [];
  }

  function allocatePanelsByArea(totalPanels, faces) {
    const sanitizedTotal = clampPanelsToAllowedCount(totalPanels);
    if (!sanitizedTotal || !faces.length) return [];
    const totalPairs = Math.floor(sanitizedTotal / 2);
    if (!totalPairs) return faces.map(() => 0);
    const areas = faces.map((f) => Math.max(0, Number(f && f.areaSqm) || 0));
    const totalArea = areas.reduce((a, b) => a + b, 0);
    if (!totalArea) {
      const basePairs = Math.floor(totalPairs / faces.length);
      const remainderPairs = totalPairs - basePairs * faces.length;
      return faces.map((_, i) => (basePairs + (i < remainderPairs ? 1 : 0)) * 2);
    }
    const rawPairs = areas.map((a) => (a / totalArea) * totalPairs);
    const floors = rawPairs.map((v) => Math.floor(v));
    let remainingPairs = totalPairs - floors.reduce((a, b) => a + b, 0);
    const order = rawPairs
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
      .map((x) => x.i);
    const alloc = floors.slice();
    for (let k = 0; k < order.length && remainingPairs > 0; k++) {
      alloc[order[k]] += 1;
      remainingPairs -= 1;
    }
    return alloc.map((p) => p * 2);
  }

  function estimateFaceCapacityPanels(face, projection, angle) {
    const facePoints = (face.points || [])
      .map((point) => projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng)))
      .map((point) => ({ x: point.x, y: point.y }));
    if (facePoints.length < 3) return 0;
    const originalArea = roofData.areaSqm;
    roofData.areaSqm = Number(face.areaSqm) || originalArea;
    const positions = buildPanelPositions(facePoints, 200, angle);
    roofData.areaSqm = originalArea;
    return clampPanelsToAllowedCount(positions.length);
  }

  function allocatePanelsWithCaps(totalPanels, faces, caps) {
    const requested = clampPanelsToAllowedCount(totalPanels);
    if (!requested || !faces.length) return [];
    const safeCaps = Array.isArray(caps) && caps.length === faces.length ? caps.map((c) => clampPanelsToAllowedCount(c || 0)) : faces.map(() => requested);
    let allocation = allocatePanelsByArea(requested, faces).map((n) => clampPanelsToAllowedCount(n));

    let overflow = 0;
    allocation = allocation.map((n, i) => {
      const cap = safeCaps[i] || 0;
      if (n > cap) {
        overflow += n - cap;
        return cap;
      }
      return n;
    });

    if (overflow > 0) {
      // Redistribui o excesso por faces com capacidade disponível.
      for (let i = 0; i < allocation.length && overflow > 0; i++) {
        const cap = safeCaps[i] || 0;
        const room = Math.max(0, cap - allocation[i]);
        const add = Math.min(room, overflow);
        allocation[i] += add;
        overflow -= add;
      }
    }

    // Ajuste final para garantir que a soma não excede o pedido (e é par).
    const total = allocation.reduce((a, b) => a + b, 0);
    if (total > requested) {
      let toRemove = total - requested;
      for (let i = allocation.length - 1; i >= 0 && toRemove > 0; i--) {
        const remove = Math.min(allocation[i], toRemove);
        allocation[i] -= remove;
        toRemove -= remove;
      }
    }
    allocation = allocation.map((n) => clampPanelsToAllowedCount(n));
    return allocation;
  }

  function updatePanelOverlay(panelsNeeded) {
    if (!map || !overlayView) return null;
    if (!roofData || !selectedRoofFaces.length) {
      clearPanelOverlay();
      return 0;
    }
    const requestedPanels = clampPanelsToAllowedCount(panelsNeeded);
    if (!requestedPanels) {
      clearPanelOverlay();
      lastPanelsCapacity = 0;
      return 0;
    }
    const projection = overlayView.getProjection();
    if (!projection) {
      google.maps.event.addListenerOnce(map, "idle", () => updatePanelOverlay(panelsNeeded));
      return null;
    }

    clearPanelOverlay();
    panelPolygonsLatLng = [];

    const faceCaps = selectedRoofFaces.map((face) => {
      const facePoints = (face.points || [])
        .map((point) => projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng)))
        .map((point) => ({ x: point.x, y: point.y }));
      if (facePoints.length < 3) return 0;
      const angle = getPolygonOrientation(facePoints);
      return estimateFaceCapacityPanels(face, projection, angle);
    });
    lastPanelsCapacity = clampPanelsToAllowedCount(faceCaps.reduce((sum, c) => sum + (c || 0), 0));

    const allocations = allocatePanelsWithCaps(requestedPanels, selectedRoofFaces, faceCaps);
    let totalPlaced = 0;

    selectedRoofFaces.forEach((face, faceIndex) => {
      const target = clampPanelsToAllowedCount(allocations[faceIndex] || 0);
      if (!target) return;
      const facePoints = (face.points || [])
        .map((point) => projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng)))
        .map((point) => ({ x: point.x, y: point.y }));
      if (facePoints.length < 3) return;

      const angle = getPolygonOrientation(facePoints);
      // Ajusta escala do painel por face (px/m) usando a área dessa face.
      const originalArea = roofData.areaSqm;
      roofData.areaSqm = Number(face.areaSqm) || originalArea;
      const positions = buildPanelPositions(facePoints, target, angle);
      roofData.areaSqm = originalArea;

      const drawableCount = clampPanelsToAllowedCount(positions.length);
      totalPlaced += drawableCount;

      positions.slice(0, drawableCount).forEach((pos) => {
        const halfW = pos.width / 2;
        const halfH = pos.height / 2;
        const relCorners = [
          { x: -halfW, y: -halfH },
          { x: halfW, y: -halfH },
          { x: halfW, y: halfH },
          { x: -halfW, y: halfH }
        ];
        const corners = relCorners.map((corner) => {
          const rotated = rotatePoint(
            { x: pos.x + corner.x, y: pos.y + corner.y },
            pos.angle || 0,
            { x: pos.x, y: pos.y }
          );
          return projection.fromDivPixelToLatLng(new google.maps.Point(rotated.x, rotated.y));
        });
        const path = corners.map((corner) => ({ lat: corner.lat(), lng: corner.lng() }));
        const panel = new google.maps.Polygon({
          paths: path,
          strokeColor: "#0b0b0b",
          strokeOpacity: 1,
          strokeWeight: 1,
          fillColor: "#0b0b0b",
          fillOpacity: 0.7,
          clickable: false
        });
        panel.setMap(map);
        panelPolygons.push(panel);
        panelPolygonsLatLng.push(path);
      });
    });

    return clampPanelsToAllowedCount(totalPlaced);
  }

  async function handleInvoiceFile(file) {
    if (!file) return;
    updateInvoiceUi("A anexar fatura…");
    if (invoiceRemoveBtn) invoiceRemoveBtn.hidden = true;

    const reader = new FileReader();
    reader.onerror = () => {
      updateInvoiceUi("Falha ao anexar a fatura.");
    };
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      invoiceFile = {
        name: file.name,
        type: file.type,
        dataUrl
      };
      persistJson("invoiceFile", invoiceFile);
      try {
        await idbSet("invoiceFile", invoiceFile);
        await idbSet("invoiceKind", file.type === "application/pdf" ? "pdf" : "photo");
      } catch (error) {
        console.warn("Falha ao guardar fatura em IndexedDB:", error);
      }
      if (file.type === "application/pdf") {
        invoicePdf = invoiceFile;
        invoicePhoto = null;
        persistJson("invoicePdf", invoicePdf);
        sessionStorage.removeItem("invoicePhoto");
        localStorage.removeItem("invoicePhoto");
      } else {
        invoicePhoto = invoiceFile;
        invoicePdf = null;
        persistJson("invoicePhoto", invoicePhoto);
        sessionStorage.removeItem("invoicePdf");
        localStorage.removeItem("invoicePdf");
      }

      updateInvoiceUi();
    };
    reader.readAsDataURL(file);
  }

  openInvoiceMenu.addEventListener("click", () => {
    invoiceMenu.classList.toggle("open");
  });

  if (invoiceRemoveBtn) {
    invoiceRemoveBtn.addEventListener("click", async () => {
      invoiceMenu.classList.remove("open");
      await clearInvoiceAttachment();
    });
  }

  openInvoiceCapture.addEventListener("click", () => {
    invoiceMenu.classList.remove("open");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      openCamera();
      return;
    }
    invoiceCapture.value = "";
    invoiceCapture.click();
  });

  invoiceCapture.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    handleInvoiceFile(file);
  });

  function stopCameraStream() {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  async function getCameraStream(preferredFacingMode) {
    const facingCandidates = [];
    if (preferredFacingMode) facingCandidates.push(preferredFacingMode);
    if (preferredFacingMode !== "environment") facingCandidates.push("environment");
    if (preferredFacingMode !== "user") facingCandidates.push("user");

    const tried = new Set();
    for (const facingMode of facingCandidates) {
      if (!facingMode || tried.has(facingMode)) continue;
      tried.add(facingMode);
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facingMode } }
        });
      } catch (error) {
        // Continue to fallback attempts.
      }

      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } }
        });
      } catch (error) {
        // Continue to fallback attempts.
      }
    }

    return await navigator.mediaDevices.getUserMedia({ video: true });
  }

  async function startCamera(preferredFacingMode) {
    stopCameraStream();
    cameraStream = await getCameraStream(preferredFacingMode);
    cameraPreview.srcObject = cameraStream;
  }

  async function openCamera() {
    try {
      await startCamera(cameraFacingMode);
      cameraOverlay.classList.add("open");
      cameraOverlay.setAttribute("aria-hidden", "false");
    } catch (error) {
      invoiceStatus.textContent = "Não foi possível abrir a câmara. Pode carregar uma foto.";
      invoiceCapture.value = "";
      invoiceCapture.click();
    }
  }

  function closeCameraModal() {
    stopCameraStream();
    cameraOverlay.classList.remove("open");
    cameraOverlay.setAttribute("aria-hidden", "true");
  }

  closeCamera.addEventListener("click", closeCameraModal);

  if (switchCamera) {
    switchCamera.addEventListener("click", async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
      try {
        await startCamera(nextMode);
        cameraFacingMode = nextMode;
      } catch (error) {
        // If switching fails, keep the current stream/mode.
        try {
          await startCamera(cameraFacingMode);
        } catch (innerError) {
          closeCameraModal();
          invoiceStatus.textContent = "Não foi possível trocar a câmara. Pode carregar uma foto.";
          invoiceCapture.value = "";
          invoiceCapture.click();
        }
      }
    });
  }

  cameraOverlay.addEventListener("click", (event) => {
    if (event.target === cameraOverlay) {
      closeCameraModal();
    }
  });

  capturePhoto.addEventListener("click", () => {
    if (!cameraPreview.videoWidth || !cameraPreview.videoHeight) {
      return;
    }
    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraPreview, 0, 0);
    cameraCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "fatura-capturada.jpg", { type: "image/jpeg" });
      handleInvoiceFile(file);
      closeCameraModal();
    }, "image/jpeg", 0.92);
  });

  openInvoicePdf.addEventListener("click", () => {
    invoiceMenu.classList.remove("open");
    invoicePdfUpload.click();
  });

  invoicePdfUpload.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    handleInvoiceFile(file);
  });

  document.addEventListener("click", (event) => {
    if (!invoiceMenu.contains(event.target) && event.target !== openInvoiceMenu) {
      invoiceMenu.classList.remove("open");
    }
  });

  if (powerTermClose) {
    powerTermClose.addEventListener("click", () => {
      powerTermModal.classList.remove("open");
    });
  }

  if (powerTermModal) {
    powerTermModal.addEventListener("click", (event) => {
      if (event.target === powerTermModal) {
        powerTermModal.classList.remove("open");
      }
    });
  }

  [...batteryChoiceInputs, ...phaseTypeInputs, ...usageTimeInputs, ...roofTypeInputs].forEach((input) => {
    input.addEventListener("change", () => {
      renderPriceSlider();
    });
  });

  if (savedQuestionnaire) {
    if (savedQuestionnaire.priceLight !== undefined) {
      priceLight.value = String(savedQuestionnaire.priceLight);
    }
    if (savedQuestionnaire.pricePerKwh !== undefined) {
      pricePerKwhInput.value = String(savedQuestionnaire.pricePerKwh);
    }
    if (savedQuestionnaire.powerTerm !== undefined) {
      powerTermInput.value = String(savedQuestionnaire.powerTerm);
    }
    if (savedQuestionnaire.propertyType) {
      const propertyOption = form.querySelector(`input[name="propertyType"][value="${savedQuestionnaire.propertyType}"]`);
      if (propertyOption) propertyOption.checked = true;
    }
    if (savedQuestionnaire.hasBattery !== undefined) {
      const value = savedQuestionnaire.hasBattery ? "sim" : "nao";
      const batteryOption = batteryChoiceInputs.find((input) => input.value === value);
      if (batteryOption) batteryOption.checked = true;
    }
    if (savedQuestionnaire.phaseType) {
      const phaseOption = phaseTypeInputs.find((input) => input.value === savedQuestionnaire.phaseType);
      if (phaseOption) phaseOption.checked = true;
    }
    if (savedQuestionnaire.usageTime) {
      const usageOption = usageTimeInputs.find((input) => input.value === savedQuestionnaire.usageTime);
      if (usageOption) usageOption.checked = true;
    }
    if (savedQuestionnaire.roofType) {
      const roofTypeOption = roofTypeInputs.find((input) => input.value === savedQuestionnaire.roofType);
      if (roofTypeOption) roofTypeOption.checked = true;
    }
  }

  if (invoiceFile && invoiceFile.dataUrl) {
    invoiceStatus.textContent = "Fatura carregada. Será enviada por email.";
  } else if ((invoicePhoto && invoicePhoto.dataUrl) || (invoicePdf && invoicePdf.dataUrl)) {
    invoiceStatus.textContent = "Fatura carregada. Será enviada por email.";
  }

  priceLight.addEventListener("input", () => {
    showPowerTermPopup = true;
    renderPriceSlider();
  });
  pricePerKwhInput.addEventListener("input", () => {
    let value = pricePerKwhInput.value.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    const [intPartRaw, decPartRaw] = value.split(".");
    const intPart = (intPartRaw || "").slice(0, 2);
    const decPart = (decPartRaw || "").slice(0, 4);
    pricePerKwhInput.value = decPartRaw !== undefined ? `${intPart}.${decPart}` : intPart;
    showPowerTermPopup = true;
    renderPriceSlider();
  });
  powerTermInput.addEventListener("input", () => {
    let value = powerTermInput.value.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    const [intPartRaw, decPartRaw] = value.split(".");
    const intPart = (intPartRaw || "").slice(0, 2);
    const decPart = (decPartRaw || "").slice(0, 2);
    powerTermInput.value = decPartRaw !== undefined ? `${intPart}.${decPart}` : intPart;
  });
  renderPriceSlider();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const priceValueNumber = Number(formData.get("priceLight"));
    const pricePerKwhRaw = Number(String(formData.get("pricePerKwh") || "").replace(",", "."));
    const pricePerKwh = Number.isFinite(pricePerKwhRaw) && pricePerKwhRaw > 0 ? pricePerKwhRaw : 0.20;
    const powerTermRaw = Number(String(formData.get("powerTerm") || "").replace(",", "."));
    const powerTerm = Number.isFinite(powerTermRaw) && powerTermRaw > 0 ? powerTermRaw : null;
    const panelPower = 0.53;
    const productionPerPanel = ZONE_PANEL_MONTHLY_KWH[currentZoneLabel] ?? DEFAULT_PANEL_MONTHLY_KWH;
    const usageTime = usageTimeInputs.find((input) => input.checked)?.value || null;
    const usageFactor =
      usageTime === "manhas" ? 0.71
      : usageTime === "tardes" ? 0.88
      : usageTime === "noites" ? 0.28
      : 0.61;
    const wantsBattery = batteryChoiceInputs.find((input) => input.checked)?.value === "sim";

    const monthlyKwhEstimate = priceValueNumber / pricePerKwh;
    const monthlyKwhCoveredEstimate = monthlyKwhEstimate * usageFactor;
    const monthlyKwhForPanels = wantsBattery ? monthlyKwhEstimate : monthlyKwhCoveredEstimate;
    const requiredKwp = (monthlyKwhForPanels / productionPerPanel) * panelPower;
    const requiredKwpRounded = roundToOneDecimal(requiredKwp);
    const basePanelsNeeded = panelsFromKwp(requiredKwpRounded);
    const monthlyKwpNeeded = requiredKwpRounded;
    let totalPanelsIdeal = basePanelsNeeded;
    if (totalPanelsIdeal % 2 !== 0) {
      totalPanelsIdeal += 1;
    }
    totalPanelsIdeal = clampPanelsToAllowedCount(totalPanelsIdeal);
    const maxPanelsByArea = estimateMaxPanelsByRoofArea();
    let totalPanels = totalPanelsIdeal;
    if (maxPanelsByArea !== null) {
      totalPanels = clampPanelsToAllowedCount(Math.min(totalPanelsIdeal, maxPanelsByArea));
    }
    const placedPanels = updatePanelOverlay(totalPanels);
    if (Number.isFinite(placedPanels) && placedPanels >= 0) {
      totalPanels = clampPanelsToAllowedCount(Math.min(totalPanels, placedPanels));
    }
    const requiredKva = requiredKvaFromKwp(requiredKwpRounded);
    const batteryCapacityKwh = wantsBattery ? getBatteryCapacityKwh(totalPanels) : null;
    const panelsFitKwp = roundToOneDecimal(totalPanels * panelPower);

    if (powerTerm && requiredKva && powerTerm < requiredKva) {
      powerTermWarning.textContent = "Aumentar o termo de potência.";
    }

    const mapSnapshot = await generateMapSnapshot();
    try {
      if (mapSnapshot) {
        await idbSet("mapSnapshot", mapSnapshot);
      }
    } catch (error) {
      console.warn("Falha ao guardar mapa em IndexedDB:", error);
    }
    const mapSnapshotUrl = buildEmailStaticMapUrl();
    const roofType = roofTypeInputs.find((input) => input.checked)?.value || null;
    const phaseType = phaseTypeInputs.find((input) => input.checked)?.value || null;
    const usageTimeSelected = usageTimeInputs.find((input) => input.checked)?.value || null;
    const payload = {
      propertyType: formData.get("propertyType"),
      roofType,
      priceLight: priceValueNumber,
      pricePerKwh,
      powerTerm,
      zoneLabel: currentZoneLabel,
      panelMonthlyKwh: productionPerPanel,
      panelPowerKw: panelPower,
      monthlyKwhEstimate,
      monthlyKwhCoveredEstimate,
      monthlyKwhForPanels,
      usageFactor,
      monthlyKwpNeeded,
      basePanelsNeeded,
      batteryCapacityKwh,
      hasBattery: wantsBattery,
      phaseType,
      usageTime: usageTimeSelected,
      mapSnapshotBase64: mapSnapshot ? mapSnapshot.dataUrl : null,
      mapSnapshotName: mapSnapshot ? mapSnapshot.name : null,
      mapSnapshotMime: mapSnapshot ? mapSnapshot.mime : null,
      mapSnapshotUrl,
      panelsNeeded: totalPanels,
      panelsIdeal: totalPanelsIdeal,
      panelsFitKwp,
      panelsMaxFitByArea: maxPanelsByArea,
      panelsPlaced: placedPanels,
      updatedAt: new Date().toISOString()
    };
    persistJson("contactQuestionnaire", payload);
    statusEl.textContent = "Dados guardados. A avançar para contacto...";
    window.location.href = "contacto.html";
  });

  window.initQuestionnaireMap = initQuestionnaireMap;
  if (window.__questionnaireMapInitRequested) {
    window.__questionnaireMapInitRequested = false;
    try {
      initQuestionnaireMap();
    } catch (error) {
      console.warn("Falha ao inicializar o mapa (retry):", error);
    }
  }
