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

  async function idbGet(key) {
    const db = await openLocalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readonly");
      const request = tx.objectStore("uploads").get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
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

  function formatBatterySummary(questionnaireData) {
    const hasBattery = questionnaireData && questionnaireData.hasBattery;
    if (hasBattery === undefined) return "não disponível";
    if (!hasBattery) return "Não";
    const capacityRaw = questionnaireData ? questionnaireData.batteryCapacityKwh : null;
    const capacity = Number(capacityRaw);
    if (!Number.isFinite(capacity)) {
      return "Sim";
    }
    if (capacity <= 0) {
      return "Sem bateria";
    }
    return `Sim (${capacity.toFixed(0)} kWh)`;
  }

  function formatBatteryCapacity(questionnaireData) {
    const hasBattery = questionnaireData && questionnaireData.hasBattery;
    if (!hasBattery) return "Sem bateria";
    const capacityRaw = questionnaireData ? questionnaireData.batteryCapacityKwh : null;
    const capacity = Number(capacityRaw);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return "Sem bateria";
    }
    return `${capacity.toFixed(0)} kWh`;
  }

  const backBtn = document.getElementById("backBtn");
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("status");
  const sumAddress = document.getElementById("sumAddress");
  const sumCoords = document.getElementById("sumCoords");
  const sumArea = document.getElementById("sumArea");
  const sumRoofType = document.getElementById("sumRoofType");
  const sumProperty = document.getElementById("sumProperty");
  const sumPrice = document.getElementById("sumPrice");
  const sumPricePerKwh = document.getElementById("sumPricePerKwh");
  const sumKwh = document.getElementById("sumKwh");
  const sumKwhCovered = document.getElementById("sumKwhCovered");
  const sumZone = document.getElementById("sumZone");
  const sumPanelProduction = document.getElementById("sumPanelProduction");
  const sumPanels = document.getElementById("sumPanels");
  const sumUsage = document.getElementById("sumUsage");
  const sumPhase = document.getElementById("sumPhase");
  const sumBattery = document.getElementById("sumBattery");
  const sumPowerTerm = document.getElementById("sumPowerTerm");

  let roofData = loadStoredJson("roofSelection");
  let questionnaireData = loadStoredJson("contactQuestionnaire");
  let invoiceFile = loadStoredJson("invoiceFile");
  let invoicePhoto = loadStoredJson("invoicePhoto");
  let invoicePdf = loadStoredJson("invoicePdf");

  function renderSummary() {
    if (roofData) {
      sumAddress.textContent = `Morada: ${roofData.address || "não disponível"}`;
      if (roofData.center && typeof roofData.center.lat === "number" && typeof roofData.center.lng === "number") {
        sumCoords.textContent = `Coordenadas: lat ${roofData.center.lat.toFixed(6)}, lon ${roofData.center.lng.toFixed(6)}`;
      }
      sumArea.textContent = `Área do telhado: ${(roofData.areaSqm || 0).toFixed(1)} m²`;
    }

    if (questionnaireData) {
      const usageTimeLabel = (() => {
        const value = questionnaireData.usageTime;
        if (!value) return "não disponível";
        if (value === "manhas") return "Manhãs (08h:00-16h:00)";
        if (value === "tardes") return "Tardes (16h:00-00h:00)";
        if (value === "noites") return "Noites (00h:00-08h:00)";
        return "Dia todo";
      })();

      const phaseLabel = (() => {
        const value = questionnaireData.phaseType;
        if (!value) return "não disponível";
        return value === "monofasica" ? "Monofásica" : "Trifásica";
      })();

      const batteryLabel = formatBatterySummary(questionnaireData);

      if (sumRoofType) {
        const roofTypeLabel = questionnaireData.roofType === "plano" ? "Plano (laje)"
          : questionnaireData.roofType === "inclinado" ? "Inclinado"
            : "não disponível";
        sumRoofType.textContent = `Tipo de telhado: ${roofTypeLabel}`;
      }
      sumProperty.textContent = `Tipo de imóvel: ${questionnaireData.propertyType || "não disponível"}`;
      sumPrice.textContent = `Preço da luz: ${Number(questionnaireData.priceLight || 0).toFixed(0)}€`;
      if (questionnaireData.pricePerKwh !== undefined && Number.isFinite(Number(questionnaireData.pricePerKwh))) {
        sumPricePerKwh.textContent = `Preço por kWh: ${Number(questionnaireData.pricePerKwh).toFixed(4)}€`;
      } else {
        sumPricePerKwh.textContent = "Preço por kWh: 0.20€";
      }
      sumKwh.textContent = `Consumo mensal: ${Number(questionnaireData.monthlyKwhEstimate || 0).toFixed(1)} kWh`;
      sumKwhCovered.textContent = `Consumo coberto no Periodo Solar: ${Number(questionnaireData.monthlyKwhCoveredEstimate || 0).toFixed(1)} kWh`;
      if (questionnaireData.zoneLabel) {
        sumZone.textContent = `Zona: ${questionnaireData.zoneLabel}`;
      } else {
        sumZone.textContent = "Zona: não disponível";
      }
      if (questionnaireData.panelMonthlyKwh !== undefined && Number.isFinite(Number(questionnaireData.panelMonthlyKwh))) {
        sumPanelProduction.textContent = `Produção média por painel: ${Number(questionnaireData.panelMonthlyKwh).toFixed(0)} kWh/mês`;
      } else {
        sumPanelProduction.textContent = "Produção média por painel: não disponível";
      }
      const fitPanels = Number(questionnaireData.panelsNeeded || 0);
      const idealPanels = Number(questionnaireData.panelsIdeal || 0);
      if (fitPanels > 0 && idealPanels > 0 && fitPanels < idealPanels) {
        const panelPowerKw = Number(questionnaireData.panelPowerKw);
        const fitKwpSaved = Number(questionnaireData.panelsFitKwp);
        const fitKwpResolved = Number.isFinite(fitKwpSaved) ? fitKwpSaved
          : (Number.isFinite(panelPowerKw) && panelPowerKw > 0) ? roundToOneDecimal(fitPanels * panelPowerKw)
            : null;
        const idealKwpResolved =
          (Number.isFinite(panelPowerKw) && panelPowerKw > 0) ? roundToOneDecimal(idealPanels * panelPowerKw) : null;
        const fitSuffix = fitKwpResolved !== null ? ` (${fitKwpResolved.toFixed(1)} kWp)` : "";
        const idealSuffix = idealKwpResolved !== null ? ` (${idealKwpResolved.toFixed(1)} kWp)` : "";
        sumPanels.textContent = `Kit Solar Residencial: ${fitPanels}${fitSuffix} (Possível instalar no telhado)
        Solução ideal: ${idealPanels}${idealSuffix} (Ideal para cobrir consumo)`;
      } else {
        const panelPowerKw = Number(questionnaireData.panelPowerKw);
        const fitKwpSaved = Number(questionnaireData.panelsFitKwp);
        const fitKwpResolved = Number.isFinite(fitKwpSaved) ? fitKwpSaved
          : (Number.isFinite(panelPowerKw) && panelPowerKw > 0) ? roundToOneDecimal(fitPanels * panelPowerKw)
            : null;
        const fitSuffix = fitKwpResolved !== null ? ` (${fitKwpResolved.toFixed(1)} kWp)` : "";
        sumPanels.textContent = `Kit Solar Residencial: ${fitPanels}${fitSuffix}`;
      }
      sumUsage.textContent = `Maior consumo: ${usageTimeLabel}`;
      sumPhase.textContent = `Tipo de contador: ${phaseLabel}`;
      sumBattery.textContent = `Bateria: ${batteryLabel}`;
      if (questionnaireData.powerTerm !== undefined && Number.isFinite(Number(questionnaireData.powerTerm))) {
        sumPowerTerm.textContent = `Termo de potência: ${Number(questionnaireData.powerTerm).toFixed(2)} kVA`;
      } else {
        sumPowerTerm.textContent = "Termo de potência: não disponível";
      }
    }
  }

  async function hydrateUploadsFromIdb() {
    try {
      if (!invoiceFile) {
        const storedInvoice = await idbGet("invoiceFile");
        const storedKind = await idbGet("invoiceKind");
        if (storedInvoice) {
          invoiceFile = storedInvoice;
          const kind = storedKind || storedInvoice.type;
          if (kind === "pdf" || storedInvoice.type === "application/pdf") {
            invoicePdf = storedInvoice;
            invoicePhoto = null;
          } else {
            invoicePhoto = storedInvoice;
            invoicePdf = null;
          }
        }
      }
      if (!questionnaireData) {
        questionnaireData = {};
      }
      if (questionnaireData && !questionnaireData.mapSnapshotBase64) {
        const storedMap = await idbGet("mapSnapshot");
        if (storedMap) {
          questionnaireData.mapSnapshotBase64 = storedMap.dataUrl;
          questionnaireData.mapSnapshotName = storedMap.name;
          questionnaireData.mapSnapshotMime = storedMap.mime;
        }
      }
    } catch (error) {
      console.warn("Falha ao ler anexos do IndexedDB:", error);
    }
    renderSummary();
  }

  renderSummary();
  hydrateUploadsFromIdb();

  backBtn.addEventListener("click", () => {
    window.location.href = "questionario.html";
  });

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function formatPtNumber(value, decimals = 0) {
    if (!Number.isFinite(value)) return "";
    return value.toFixed(decimals).replace(".", ",");
  }

  function roundToOneDecimal(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round((value + Number.EPSILON) * 10) / 10;
  }

  function requiredKvaFromKwp(kwp) {
    if (!Number.isFinite(kwp) || kwp <= 0) return null;
    const inverterPowerKw = kwp / 1.2;
    return inverterPowerKw / 0.9;
  }

  function formatAddressShort(address) {
    const raw = String(address || "").trim();
    if (!raw) return "";
    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const shortParts = parts.slice(0, 3);
      const hasPortugal = parts.some((part) => part.toLowerCase().includes("portugal"));
      if (!hasPortugal) {
        shortParts.push("Portugal");
      }
      return shortParts.join(", ");
    }
    return raw.toLowerCase().includes("portugal") ? raw : `${raw}, Portugal`;
  }

  function buildQuestionnaireSummary(questionnaireData, roofData) {
    if (!questionnaireData) return "";
    const lines = [];
    const warnings = [];

    if (roofData && roofData.areaSqm !== undefined) {
      lines.push(`Área do telhado: ${Number(roofData.areaSqm || 0).toFixed(1)} m²`);
    }
    if (questionnaireData.roofType) {
      const roofTypeLabel = questionnaireData.roofType === "plano" ? "Plano (laje)"
        : questionnaireData.roofType === "inclinado" ? "Inclinado"
          : questionnaireData.roofType;
      lines.push(`Tipo de telhado: ${roofTypeLabel}`);
    }
    if (questionnaireData.propertyType) lines.push(`Tipo de imóvel: ${questionnaireData.propertyType}`);
    if (questionnaireData.priceLight !== undefined) lines.push(`Preço da luz: ${Number(questionnaireData.priceLight).toFixed(0)}€`);
    if (questionnaireData.pricePerKwh !== undefined && Number.isFinite(Number(questionnaireData.pricePerKwh))) {
      lines.push(`Preço por kWh: ${Number(questionnaireData.pricePerKwh).toFixed(4)}€`);
    }
    if (questionnaireData.zoneLabel) lines.push(`Zona: ${questionnaireData.zoneLabel}`);
    if (questionnaireData.panelMonthlyKwh !== undefined && Number.isFinite(Number(questionnaireData.panelMonthlyKwh))) {
      lines.push(`Produção média por painel: ${Number(questionnaireData.panelMonthlyKwh).toFixed(0)} kWh/mês`);
    }
    if (questionnaireData.powerTerm !== undefined && Number.isFinite(Number(questionnaireData.powerTerm))) {
      lines.push(`Termo de potência: ${Number(questionnaireData.powerTerm).toFixed(2)} kVA`);
    }
    if (questionnaireData.monthlyKwhEstimate) lines.push(`Consumo mensal: ${Number(questionnaireData.monthlyKwhEstimate).toFixed(1)} kWh`);
    if (questionnaireData.monthlyKwhCoveredEstimate) lines.push(`Consumo no Periodo Solar: ${Number(questionnaireData.monthlyKwhCoveredEstimate).toFixed(1)} kWh`);
    if (questionnaireData.monthlyKwpNeeded) {
      const roundedKwp = roundToOneDecimal(Number(questionnaireData.monthlyKwpNeeded));
      lines.push(`kWp necessário: ${roundedKwp.toFixed(1)} kWp`);

      const powerTerm = Number(questionnaireData.powerTerm);
      const requiredKva = requiredKvaFromKwp(roundedKwp);
      if (Number.isFinite(powerTerm) && powerTerm > 0 && requiredKva && powerTerm < requiredKva) {
        warnings.push("O termo de potência pode ser insuficiente para esta instalação.");
      }
    }
    if (questionnaireData.panelsNeeded !== undefined && questionnaireData.panelsNeeded !== null) {
      const fitPanels = Number(questionnaireData.panelsNeeded);
      const idealPanels = Number(questionnaireData.panelsIdeal);
      const maxFitByArea = Number(questionnaireData.panelsMaxFitByArea);
      const placedPanels = Number(questionnaireData.panelsPlaced);
      const constrainedByRoof =
        (Number.isFinite(maxFitByArea) && maxFitByArea > 0 && maxFitByArea < idealPanels)
        || (Number.isFinite(placedPanels) && placedPanels > 0 && placedPanels < idealPanels);
      const showRoofConstraintWarning =
        Number.isFinite(idealPanels)
        && idealPanels > 0
        && fitPanels > 0
        && fitPanels < idealPanels
        && constrainedByRoof;

      if (showRoofConstraintWarning) {
        const panelPowerKw = Number(questionnaireData.panelPowerKw);
        const fitKwpSaved = Number(questionnaireData.panelsFitKwp);
        const fitKwpResolved = Number.isFinite(fitKwpSaved) ? fitKwpSaved
          : (Number.isFinite(panelPowerKw) && panelPowerKw > 0) ? roundToOneDecimal(fitPanels * panelPowerKw)
            : null;
        const kwpSuffix = fitKwpResolved !== null ? ` (${fitKwpResolved.toFixed(1)} kWp)` : "";

        lines.push(`Kit Solar Residencial: ${fitPanels}${kwpSuffix} (Possível instalar no telhado)`);
        warnings.push(`No telhado é possível instalar aproximadamente ${fitPanels} painéis${kwpSuffix}. No entanto, a solução ideal prevê a instalação de ${idealPanels} painéis.`);
      } else {
        const panelPowerKw = Number(questionnaireData.panelPowerKw);
        const fitKwpSaved = Number(questionnaireData.panelsFitKwp);
        const fitKwpResolved = Number.isFinite(fitKwpSaved) ? fitKwpSaved
          : (Number.isFinite(panelPowerKw) && panelPowerKw > 0) ? roundToOneDecimal(fitPanels * panelPowerKw)
            : null;
        const kwpSuffix = fitKwpResolved !== null ? ` (${fitKwpResolved.toFixed(1)} kWp)` : "";
        lines.push(`Kit Solar Residencial: ${fitPanels}${kwpSuffix}`);
      }
      if (Number.isFinite(idealPanels) && idealPanels > 0 && Number.isFinite(fitPanels) && fitPanels === 0) {
        warnings.push("O telhado pode não ter área suficiente para painéis.");
      }
    }

    const usageTime = questionnaireData.usageTime;
    if (usageTime) {
      const label = usageTime === "manhas" ? "Manhãs (08h:00-16h:00)"
        : usageTime === "tardes" ? "Tardes (16h:00-00h:00)"
          : usageTime === "noites" ? "Noites (00h:00-08h:00)"
            : "Dia todo";
      lines.push(`Maior consumo: ${label}`);
    }

    const phaseType = questionnaireData.phaseType;
    if (phaseType) {
      lines.push(`Tipo de contador: ${phaseType === "monofasica" ? "Monofásica" : "Trifásica"}`);
    }

    if (questionnaireData.hasBattery !== undefined) {
      lines.push(`Bateria: ${formatBatterySummary(questionnaireData)}`);
      lines.push(`Capacidade da bateria: ${formatBatteryCapacity(questionnaireData)}`);
    }

    if (warnings.length) {
      lines.push("");
      lines.push("Avisos:");
      warnings.forEach((warning) => lines.push(`- ${warning}`));
    }

    return lines.join("\n");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Garantir que temos o questionário carregado mesmo que o hydrate async ainda não tenha terminado.
    questionnaireData = questionnaireData || loadStoredJson("contactQuestionnaire") || {};

    if (!invoiceFile) {
      try {
        const storedInvoice = await idbGet("invoiceFile");
        const storedKind = await idbGet("invoiceKind");
        if (storedInvoice) {
          invoiceFile = storedInvoice;
          const kind = storedKind || storedInvoice.type;
          if (kind === "pdf" || storedInvoice.type === "application/pdf") {
            invoicePdf = storedInvoice;
            invoicePhoto = null;
          } else {
            invoicePhoto = storedInvoice;
            invoicePdf = null;
          }
        }
      } catch (error) {
        console.warn("Falha ao carregar fatura do IndexedDB:", error);
      }
    }
    if (questionnaireData && !questionnaireData.mapSnapshotBase64) {
      try {
        const storedMap = await idbGet("mapSnapshot");
        if (storedMap) {
          questionnaireData.mapSnapshotBase64 = storedMap.dataUrl;
          questionnaireData.mapSnapshotName = storedMap.name;
          questionnaireData.mapSnapshotMime = storedMap.mime;
        }
      } catch (error) {
        console.warn("Falha ao carregar mapa do IndexedDB:", error);
      }
    }

    const formData = new FormData(form);
    const clientData = {
      clientName: String(formData.get("clientName") || "").trim(),
      clientEmail: String(formData.get("clientEmail") || "").trim(),
      clientPhone: String(formData.get("clientPhone") || "").trim(),
      clientNif: String(formData.get("clientNif") || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const nifDigits = clientData.clientNif.replace(/\D/g, "");
    clientData.clientNif = nifDigits;

    if (!clientData.clientName || !clientData.clientEmail || !clientData.clientPhone || !clientData.clientNif) {
      statusEl.textContent = "Preenche nome, email, telemóvel e NIF.";
      return;
    }
    if (clientData.clientNif.length !== 9) {
      statusEl.textContent = "O NIF deve ter exatamente 9 dígitos.";
      return;
    }

    const finalData = {
      roof: roofData,
      roofLocation: {
        latitude: (roofData && roofData.center && roofData.center.lat !== undefined) ? roofData.center.lat : null,
        longitude: (roofData && roofData.center && roofData.center.lng !== undefined) ? roofData.center.lng : null
      },
      questionnaire: questionnaireData,
      contact: clientData
    };

    persistJson("quoteRequest", finalData);

    statusEl.textContent = "A enviar pedido...";

    try {
      const addressSummary = formatAddressShort(roofData && roofData.address ? roofData.address : "");
      const questionnaireSummary = buildQuestionnaireSummary(questionnaireData, roofData);
      const primaryInvoice = [invoiceFile, invoicePdf, invoicePhoto].find((item) => item && item.dataUrl);
      const alternativeInvoice = [invoicePdf, invoicePhoto].find((item) => {
        return item
          && item.dataUrl
          && (!primaryInvoice || item.dataUrl !== primaryInvoice.dataUrl);
      });

      const payload = {
        clientName: clientData.clientName,
        clientEmail: clientData.clientEmail,
        clientPhone: clientData.clientPhone,
        clientNif: clientData.clientNif,
        addressSummary,
        questionnaireSummary,
        latitude: (roofData && roofData.center && roofData.center.lat !== undefined) ? roofData.center.lat : null,
        longitude: (roofData && roofData.center && roofData.center.lng !== undefined) ? roofData.center.lng : null,
        invoiceAttachmentBase64: primaryInvoice ? primaryInvoice.dataUrl : null,
        invoiceAttachmentName: primaryInvoice ? primaryInvoice.name : null,
        invoiceAttachmentMime: primaryInvoice ? primaryInvoice.type : null,
        invoiceAttachmentBase64Alt: alternativeInvoice ? alternativeInvoice.dataUrl : null,
        invoiceAttachmentNameAlt: alternativeInvoice ? alternativeInvoice.name : null,
        invoiceAttachmentMimeAlt: alternativeInvoice ? alternativeInvoice.type : null,
        mapSnapshotBase64: questionnaireData && questionnaireData.mapSnapshotBase64 ? questionnaireData.mapSnapshotBase64 : null,
        mapSnapshotName: questionnaireData && questionnaireData.mapSnapshotName ? questionnaireData.mapSnapshotName : null,
        mapSnapshotMime: questionnaireData && questionnaireData.mapSnapshotMime ? questionnaireData.mapSnapshotMime : null,
        mapSnapshotUrl: questionnaireData && questionnaireData.mapSnapshotUrl ? questionnaireData.mapSnapshotUrl : null,
        questionnaire: questionnaireData || null,
        roof: roofData || null
      };

      const apiBaseUrl = (window.MACWATTS_CONFIG && window.MACWATTS_CONFIG.apiBaseUrl)
        ? String(window.MACWATTS_CONFIG.apiBaseUrl).replace(/\/+$/, "")
        : "";
      const response = await fetch(`${apiBaseUrl}/api/quote/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(responseText || `HTTP ${response.status}`);
      }

      const keysToClear = [
        "roofSelection",
        "contactQuestionnaire",
        "invoiceFile",
        "invoicePhoto",
        "invoicePdf",
        "quoteRequest"
      ];
      keysToClear.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      try {
        await idbDel("invoiceFile");
        await idbDel("invoiceKind");
        await idbDel("mapSnapshot");
      } catch (error) {
        console.warn("Falha ao limpar anexos do IndexedDB:", error);
      }

      statusEl.textContent = "Pedido enviado. A empresa entrará em contacto em breve.";
      setTimeout(() => {
        window.location.href = "geocoding.html";
      }, 1200);
    } catch (error) {
      statusEl.textContent = `Falhou o envio: ${error.message || "erro desconhecido"}`;
      console.error("Erro ao enviar pedido:", error);
    }
  });
