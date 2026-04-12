import { statsData } from "./content/statsData.js";

const LANGUAGE_KEY = "root-playbook-lang-v1";
const TOOLTIP_SELECTOR = "[data-stat-key]";
const TOOLTIP_THEME = "forest-rpg";
const FULL_CONTENT_REVEAL_MS = 2600;
const validLanguages = new Set(["ru", "en"]);
const tooltipInstances = new Map();

const isTouchDevice =
  window.matchMedia("(hover: none)").matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;

const normalizeLanguage = (value) => (validLanguages.has(value) ? value : "en");

let currentLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));

const getDescription = (statKey, language) => {
  return statsData[language]?.[statKey] || statsData.ru?.[statKey] || "";
};

const capitalizeFirstChar = (text) => {
  if (!text) return "";
  const firstChar = text.charAt(0);
  return firstChar.toLocaleUpperCase() + text.slice(firstChar.length);
};

const getPreviewContent = (fullContent) => {
  const normalized = String(fullContent || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  // Take the first full sentence; if not found, use the entire string.
  const firstSentenceMatch = normalized.match(/^(.+?[.!?…])\s+(?=[A-ZА-ЯЁ])/u);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[1] : normalized;

  return capitalizeFirstChar(firstSentence);
};

const getTooltipSegments = (fullContent) => {
  const normalized = String(fullContent || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { shortContent: "", revealContent: "" };
  }

  const firstSentenceMatch = normalized.match(/^(.+?[.!?…])\s+(?=[A-ZА-ЯЁ])/u);
  const shortContent = getPreviewContent(normalized);

  if (!firstSentenceMatch) {
    return { shortContent, revealContent: shortContent };
  }

  const firstSentence = firstSentenceMatch[1].trim();
  const remainingContent = capitalizeFirstChar(normalized.slice(firstSentence.length).trim());

  return {
    shortContent,
    revealContent: remainingContent || shortContent,
  };
};

const clearRevealTimer = (record) => {
  if (!record?.revealTimer) return;
  window.clearTimeout(record.revealTimer);
  record.revealTimer = null;
};

const refreshTooltipLanguage = (nextLanguage) => {
  currentLanguage = normalizeLanguage(nextLanguage);

  tooltipInstances.forEach((record, element) => {
    const statKey = element.dataset.statKey;
    const fullContent = getDescription(statKey, currentLanguage);
    const segments = getTooltipSegments(fullContent);
    record.shortContent = segments.shortContent;
    record.revealContent = segments.revealContent;
    clearRevealTimer(record);
    record.instance.setContent(record.shortContent);
  });
};

const cleanupDetachedInstances = () => {
  tooltipInstances.forEach((record, element) => {
    if (element.isConnected) return;
    clearRevealTimer(record);
    record.instance.destroy();
    tooltipInstances.delete(element);
  });
};

const upsertTooltip = (element) => {
  const statKey = element.dataset.statKey;
  if (!statKey) return;

  const fullContent = getDescription(statKey, currentLanguage);
  const segments = getTooltipSegments(fullContent);
  const shortContent = segments.shortContent;
  if (!shortContent) return;

  const existingRecord = tooltipInstances.get(element);
  if (existingRecord) {
    existingRecord.shortContent = shortContent;
    existingRecord.revealContent = segments.revealContent;
    clearRevealTimer(existingRecord);
    existingRecord.instance.setContent(shortContent);
    return;
  }

  const instance = window.tippy(element, {
    content: shortContent,
    theme: TOOLTIP_THEME,
    maxWidth: 360,
    allowHTML: false,
    interactive: false,
    trigger: isTouchDevice ? "click" : "mouseenter focus",
    hideOnClick: true,
    touch: true,
    onShow(currentInstance) {
      const record = tooltipInstances.get(element);
      if (!record) return;

      clearRevealTimer(record);
      currentInstance.setContent(record.shortContent);
      record.revealTimer = window.setTimeout(() => {
        const latestRecord = tooltipInstances.get(element);
        if (!latestRecord) return;
        latestRecord.instance.setContent(latestRecord.revealContent);
        latestRecord.revealTimer = null;
      }, FULL_CONTENT_REVEAL_MS);
    },
    onHide(currentInstance) {
      const record = tooltipInstances.get(element);
      if (!record) return;

      clearRevealTimer(record);
      currentInstance.setContent(record.shortContent);
    },
    onDestroy() {
      const record = tooltipInstances.get(element);
      if (!record) return;
      clearRevealTimer(record);
    },
  });

  tooltipInstances.set(element, {
    instance,
    shortContent,
    revealContent: segments.revealContent,
    revealTimer: null,
  });
};

const bindStatTooltips = () => {
  if (typeof window.tippy !== "function") return;

  document.querySelectorAll(TOOLTIP_SELECTOR).forEach((element) => {
    upsertTooltip(element);
  });
  cleanupDetachedInstances();
};

const syncLanguageFromStorage = () => {
  const nextLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
  if (nextLanguage !== currentLanguage) {
    refreshTooltipLanguage(nextLanguage);
  }
};

bindStatTooltips();

const rootNode = document.getElementById("root");
if (rootNode) {
  const observer = new MutationObserver(() => {
    bindStatTooltips();
    syncLanguageFromStorage();
  });

  observer.observe(rootNode, { childList: true, subtree: true, characterData: true });
}

window.addEventListener("root-language-changed", (event) => {
  const nextLanguage = event?.detail?.language;
  if (nextLanguage) {
    refreshTooltipLanguage(nextLanguage);
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === LANGUAGE_KEY && event.newValue) {
    refreshTooltipLanguage(event.newValue);
  }
});

