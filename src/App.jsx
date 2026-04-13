import React, { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  Shield,
  Sword,
  BookOpen,
  Star,
  Plus,
  Minus,
  CheckSquare,
  Square,
  ImagePlus,
  Trash2,
  Languages,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileDown,
  Save,
  Info
} from "lucide-react";
import { allFeats, allSkills, playbooks } from "./data/playbooks";
import localizationData, { playbookNameEn } from "./content/localizationData";
import { getLocalizer } from "./i18n/localization";
import frameSvg from "../frame.svg";

const STORAGE_KEY = "root-playbook-state-v5";
const LANGUAGE_KEY = "root-playbook-lang-v1";
const BG_STORAGE_KEY = "root-bg-index-v1";
const BACKGROUND_DRAFT_STORAGE_KEY = "root-character-background-draft-v1";
const CHARACTER_PROFILE_STORAGE_KEY = "root-character-profile-v1";
const MAX_MOTIVES = 2;
const MAX_CUSTOM_MOTIVES = 2;
const statsOrder = ["Шарм", "Хитрость", "Сноровка", "Удача", "Мощь"];

const FEAT_RULES = {
  Вор: { mode: "any", count: 4 },
  Судья: { mode: "any", count: 1 },
  Принц: { mode: "fixed-plus-any", count: 2 }
};

function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className = "",
  imageClassName = "",
  imageStyle,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto"
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  if (!src && !placeholderSrc) return null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {(placeholderSrc || src) && (
        <img
          src={placeholderSrc || src}
          alt=""
          aria-hidden="true"
          className={`${imageClassName} absolute inset-0 w-full h-full transition-opacity duration-500 ease-out ${
            isLoaded ? "opacity-0" : "opacity-100 blur-md scale-[1.04]"
          }`}
          style={imageStyle}
          loading="eager"
          decoding="async"
        />
      )}

      {src && (
        <img
          src={src}
          alt={alt}
          className={`${imageClassName} absolute inset-0 w-full h-full transition-opacity duration-500 ease-out ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={imageStyle}
          loading={loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
}

const playbookPortraitAliases = {
  Поборник: ["поборник", "champion"],
  Летописец: ["летописец", "хроник", "chronicler"],
  Изгнанник: ["изгнанник", "exile"],
  Посланник: ["посланник", "envoy"],
  Еретик: ["еретик", "heretic"],
  Пират: ["пират", "pirate"],
  Принц: ["принц", "князь", "prince"],
  Рассказчик: ["рассказчик", "raconteur"],
  Разбойник: ["разбойник", "грабитель", "raider"],
  Искатель: ["искатель", "seeker"],
  Авантюрист: ["авантюрист", "adventurer"],
  Судья: ["судья", "arbiter"],
  Налётчик: ["налетчик", "налётчик", "harrier"],
  Следопыт: ["следопыт", "ranger"],
  Ронин: ["ронин", "ronin"],
  Поджигатель: ["поджигатель", "scoundrel"],
  Вор: ["вор", "thief"],
  Ремесленник: ["ремесленник", "tinker"],
  Скиталец: ["скиталец", "vagrant"]
};

const optimizedPortraitSvgModules = import.meta.glob("../assets-optimized/portraits-svg/*.svg", {
  eager: true,
  import: "default"
});
const optimizedPortraitLowModules = import.meta.glob("../assets-optimized/portraits-low/*.webp", {
  eager: true,
  import: "default"
});
const optimizedBackgroundModules = import.meta.glob("../assets-optimized/backgrounds/*.webp", {
  eager: true,
  import: "default"
});
const optimizedBackgroundLowModules = import.meta.glob("../assets-optimized/backgrounds-low/*.webp", {
  eager: true,
  import: "default"
});

const unique = (arr) => Array.from(new Set(arr));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const PORTRAIT_MASS_CACHE = new Map();
const REPUTATION_VALUES = [-3, -2, -1, 0, 1, 2, 3];
const FACTION_TRACK_LENGTH = Math.max(
  localizationData.characterStoryOptions?.ru?.factions?.length || 0,
  localizationData.characterStoryOptions?.en?.factions?.length || 0
);
const INITIAL_VISIBLE_FACTIONS = Math.min(3, FACTION_TRACK_LENGTH);
const FACTION_LABELS_BY_INDEX = Array.from({ length: FACTION_TRACK_LENGTH }, (_, idx) =>
  [
    localizationData.characterStoryOptions?.ru?.factions?.[idx],
    localizationData.characterStoryOptions?.en?.factions?.[idx]
  ].filter(Boolean)
);

const clampReputation = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-3, Math.min(3, Math.trunc(numeric)));
};

const createDefaultFactionReputation = () =>
  Array.from({ length: FACTION_TRACK_LENGTH }, () => 0);

const sanitizeVisibleFactionCount = (rawValue) => {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return INITIAL_VISIBLE_FACTIONS;
  return clamp(Math.trunc(numeric), INITIAL_VISIBLE_FACTIONS, FACTION_TRACK_LENGTH);
};

const sanitizeFactionReputation = (rawValue, legacyHelped = [], legacyHarmed = []) => {
  const reputation = createDefaultFactionReputation();

  if (Array.isArray(rawValue)) {
    for (let idx = 0; idx < FACTION_TRACK_LENGTH; idx += 1) {
      reputation[idx] = clampReputation(rawValue[idx]);
    }
    return reputation;
  }

  const helpedSet = new Set(legacyHelped);
  const harmedSet = new Set(legacyHarmed);

  for (let idx = 0; idx < FACTION_TRACK_LENGTH; idx += 1) {
    const labels = FACTION_LABELS_BY_INDEX[idx] || [];
    const hasHelped = labels.some((label) => helpedSet.has(label));
    const hasHarmed = labels.some((label) => harmedSet.has(label));

    if (hasHelped && !hasHarmed) reputation[idx] = 1;
    if (hasHarmed && !hasHelped) reputation[idx] = -1;
  }

  return reputation;
};

const analyzePortraitMassOffset = (imageUrl) =>
  new Promise((resolve) => {
    if (!imageUrl) {
      resolve({ x: 0, y: 0 });
      return;
    }

    if (PORTRAIT_MASS_CACHE.has(imageUrl)) {
      resolve(PORTRAIT_MASS_CACHE.get(imageUrl));
      return;
    }

    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth || 1;
        const height = img.naturalHeight || 1;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ x: 0, y: 0 });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;

        let weightedCount = 0;
        let weightedX = 0;
        let weightedY = 0;
        const alphaThreshold = 12;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < alphaThreshold) continue;

          const weight = alpha / 255;
          const pixelIndex = i / 4;
          const x = pixelIndex % width;
          const y = (pixelIndex - x) / width;

          weightedCount += weight;
          weightedX += x * weight;
          weightedY += y * weight;
        }

        if (!weightedCount) {
          const zero = { x: 0, y: 0 };
          PORTRAIT_MASS_CACHE.set(imageUrl, zero);
          resolve(zero);
          return;
        }

        const centerX = weightedX / weightedCount;
        const centerY = weightedY / weightedCount;
        const normX = 0.5 - centerX / Math.max(1, width - 1);
        const normY = 0.5 - centerY / Math.max(1, height - 1);

        const offset = {
          x: clamp(normX * 30, -12, 12),
          y: clamp(normY * 40, -16, 16)
        };

        PORTRAIT_MASS_CACHE.set(imageUrl, offset);
        resolve(offset);
      } catch {
        resolve({ x: 0, y: 0 });
      }
    };

    img.onerror = () => resolve({ x: 0, y: 0 });
    img.src = imageUrl;
  });

const normalizeToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/^the\s+/, "")
    .replace(/[^a-zа-яё0-9]+/g, " ")
    .trim();

const getBaseFileName = (path) => {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "";
};

const buildAssetMapByBaseName = (modules) =>
  new Map(
    Object.entries(modules).map(([path, url]) => [getBaseFileName(path).replace(/\.[^/.]+$/, ""), url])
  );

const backgroundLowByBaseName = buildAssetMapByBaseName(optimizedBackgroundLowModules);

const buildSortedBackgrounds = () =>
  Object.entries(optimizedBackgroundModules)
    .map(([path, url]) => {
      const baseName = getBaseFileName(path).replace(/\.[^/.]+$/, "");
      const numeric = Number(baseName);
      return {
        key: path,
        url,
        lowUrl: backgroundLowByBaseName.get(baseName) || url,
        sortA: Number.isFinite(numeric) ? 0 : 1,
        sortB: Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER,
        sortC: baseName
      };
    })
    .sort((a, b) => a.sortA - b.sortA || a.sortB - b.sortB || a.sortC.localeCompare(b.sortC));

const portraitLowByBaseName = buildAssetMapByBaseName(optimizedPortraitLowModules);

const portraitAssetList = Object.entries(optimizedPortraitSvgModules).map(([path, url]) => {
  const baseName = getBaseFileName(path).replace(/\.[^/.]+$/, "");
  return {
    path,
    url,
    lowUrl: portraitLowByBaseName.get(baseName) || url,
    normalizedName: normalizeToken(baseName)
  };
});

const findPortraitForPlaybook = (playbookName) => {
  const aliases = unique([
    playbookName,
    playbookNameEn[playbookName],
    ...(playbookPortraitAliases[playbookName] || [])
  ]).map(normalizeToken);

  for (const alias of aliases) {
    if (!alias) continue;
    const exact = portraitAssetList.find((asset) => asset.normalizedName === alias);
    if (exact) return exact;

    const partial = portraitAssetList.find((asset) => asset.normalizedName.includes(alias));
    if (partial) return partial;
  }

  return null;
};

const DEFAULT_PORTRAITS = Object.fromEntries(
  playbooks.map((pb) => [pb.name, findPortraitForPlaybook(pb.name)])
);

const ROOT_BACKGROUNDS = buildSortedBackgrounds();

const getFeatRule = (playbookName) => FEAT_RULES[playbookName] || { mode: "fixed", count: 0 };

const getFixedFeats = (playbook, featRule) =>
  featRule.mode === "any" ? [] : [...playbook.startingFeats];

const clampFeats = (feats, fixedFeats, featRule) => {
  const valid = unique((feats || []).filter((feat) => allFeats.includes(feat)));

  if (featRule.mode === "fixed") {
    return [...fixedFeats];
  }

  if (featRule.mode === "any") {
    return valid.slice(0, featRule.count);
  }

  const optional = valid.filter((feat) => !fixedFeats.includes(feat)).slice(0, featRule.count);
  return unique([...fixedFeats, ...optional]);
};

const sanitizeCharacter = (playbook, rawState) => {
  const featRule = getFeatRule(playbook.name);
  const fixedFeats = getFixedFeats(playbook, featRule);
  const next = rawState && typeof rawState === "object" ? rawState : {};

  const bonusStat = statsOrder.includes(next.bonusStat) ? next.bonusStat : null;
  const nature = playbook.natures.some((n) => n.name === next.nature) ? next.nature : null;
  const feats = clampFeats(next.feats, fixedFeats, featRule);

  const skills = unique(
    (Array.isArray(next.skills) ? next.skills : []).filter((skill) =>
      playbook.startingSkills.includes(skill)
    )
  ).slice(0, 1);

  const mandatoryMoves = [...playbook.startingMoves];
  const optionalMoves = unique(
    (Array.isArray(next.moves) ? next.moves : []).filter((move) =>
      playbook.moves.some((m) => m.name === move) && !mandatoryMoves.includes(move)
    )
  ).slice(0, playbook.movesCheck);

  const moves = unique([...mandatoryMoves, ...optionalMoves]);
  const image = typeof next.image === "string" ? next.image : null;
  const useDefaultPortrait =
    typeof next.useDefaultPortrait === "boolean" ? next.useDefaultPortrait : true;
  const bgRemovalBackup = typeof next.bgRemovalBackup === "string" ? next.bgRemovalBackup : null;

  return { bonusStat, nature, feats, skills, moves, image, useDefaultPortrait, bgRemovalBackup };
};

const sanitizePersistedState = (rawState) => {
  const source = rawState && typeof rawState === "object" ? rawState : {};
  const output = {};

  for (const playbook of playbooks) {
    const sanitized = sanitizeCharacter(playbook, source[playbook.name]);
    output[playbook.name] = {
      ...sanitized,
      image: null,
      bgRemovalBackup: null
    };
  }

  return output;
};

const getDefaultState = (playbook) => sanitizeCharacter(playbook, {});

const parseBgIndex = (value) => {
  const index = Number(value);
  return Number.isInteger(index) ? index : -1;
};

const emptyBackgroundDraft = {
  name: "",
  animalType: "",
  appearance: "",
  biography: "",
  motives: [],
  customMotives: [],
  connections: [
    { role: "", characterName: "" },
    { role: "", characterName: "" }
  ],
  visibleFactionCount: INITIAL_VISIBLE_FACTIONS,
  factionReputation: createDefaultFactionReputation()
};

const parseJsonStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const sanitizeBackgroundDraft = (rawDraft) => {
  const draft = rawDraft && typeof rawDraft === "object" ? rawDraft : {};
  const legacyHelped = Array.isArray(draft.factionsHelped)
    ? unique(draft.factionsHelped.map(String))
    : [];
  const legacyHarmed = Array.isArray(draft.factionsHarmed)
    ? unique(draft.factionsHarmed.map(String))
    : [];
  const rawConnections = Array.isArray(draft.connections) ? draft.connections : [];
  const rawCustomMotives = Array.isArray(draft.customMotives) ? draft.customMotives : [];
  const normalizedConnections = [0, 1].map((idx) => {
    const item = rawConnections[idx] && typeof rawConnections[idx] === "object" ? rawConnections[idx] : {};
    return {
      role: typeof item.role === "string" ? item.role : "",
      characterName: typeof item.characterName === "string" ? item.characterName : ""
    };
  });
  const customMotives = rawCustomMotives
    .map((item) => ({
      title: typeof item?.title === "string" ? item.title : "",
      description: typeof item?.description === "string" ? item.description : ""
    }))
    .slice(0, MAX_CUSTOM_MOTIVES);
  const factionReputation = sanitizeFactionReputation(
    draft.factionReputation,
    legacyHelped,
    legacyHarmed
  );
  const highestUsedFactionIndex = factionReputation.reduce(
    (maxIndex, value, index) => (clampReputation(value) !== 0 ? index : maxIndex),
    -1
  );
  const visibleFactionCount = Math.max(
    sanitizeVisibleFactionCount(draft.visibleFactionCount),
    highestUsedFactionIndex + 1
  );

  return {
    name: typeof draft.name === "string" ? draft.name : "",
    animalType: typeof draft.animalType === "string" ? draft.animalType : "",
    appearance: typeof draft.appearance === "string" ? draft.appearance : "",
    biography: typeof draft.biography === "string" ? draft.biography : "",
    motives: Array.isArray(draft.motives) ? unique(draft.motives.map(String)).slice(0, MAX_MOTIVES) : [],
    customMotives,
    connections: normalizedConnections,
    visibleFactionCount,
    factionReputation
  };
};

export default function App() {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const adventurerIndex = playbooks.findIndex((pb) => pb.name === "Авантюрист");
    return adventurerIndex >= 0 ? adventurerIndex : 0;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "en");
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [selectedBgIndex, setSelectedBgIndex] = useState(() =>
    parseBgIndex(localStorage.getItem(BG_STORAGE_KEY))
  );
  const [frameInnerMaskUrl, setFrameInnerMaskUrl] = useState("");
  const [frameMaskHasOpening, setFrameMaskHasOpening] = useState(false);
  const [portraitMassOffset, setPortraitMassOffset] = useState({ x: 0, y: 0 });
  const [activeMoveName, setActiveMoveName] = useState(null);
  const [activeStep, setActiveStep] = useState("builder");
  const [backgroundDraft, setBackgroundDraft] = useState(() =>
    sanitizeBackgroundDraft(parseJsonStorage(BACKGROUND_DRAFT_STORAGE_KEY, emptyBackgroundDraft))
  );
  const [draftSnapshotOnOpen, setDraftSnapshotOnOpen] = useState(() =>
    sanitizeBackgroundDraft(parseJsonStorage(BACKGROUND_DRAFT_STORAGE_KEY, emptyBackgroundDraft))
  );
  const [savedCharacterProfile, setSavedCharacterProfile] = useState(() =>
    parseJsonStorage(CHARACTER_PROFILE_STORAGE_KEY, null)
  );
  const [saveNotice, setSaveNotice] = useState("");
  const [shouldPrintProfile, setShouldPrintProfile] = useState(false);
  const [isConnectionHelpOpen, setIsConnectionHelpOpen] = useState(false);

  const [characterState, setCharacterState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? sanitizePersistedState(JSON.parse(saved)) : {};
    } catch {
      return {};
    }
  });

  const persistedCharacterState = useMemo(
    () => sanitizePersistedState(characterState),
    [characterState]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedCharacterState));
  }, [persistedCharacterState]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.setAttribute("data-ui-lang", language);
    window.dispatchEvent(new CustomEvent("root-language-changed", { detail: { language } }));
  }, [language]);

  useEffect(() => {
    localStorage.setItem(BG_STORAGE_KEY, String(selectedBgIndex));
  }, [selectedBgIndex]);

  useEffect(() => {
    let isActive = true;
    const img = new Image();

    img.onload = () => {
      if (!isActive) return;

      const width = img.naturalWidth || 1;
      const height = img.naturalHeight || 1;

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sourceCtx = sourceCanvas.getContext("2d");
      if (!sourceCtx) return;

      sourceCtx.drawImage(img, 0, 0, width, height);
      const sourceData = sourceCtx.getImageData(0, 0, width, height);
      const pixels = sourceData.data;
      const threshold = 16;
      const total = width * height;

      const isOutsideTransparent = new Uint8Array(total);
      const queue = new Uint32Array(total);
      let qHead = 0;
      let qTail = 0;

      const tryEnqueue = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const idx = y * width + x;
        if (isOutsideTransparent[idx]) return;
        if (pixels[idx * 4 + 3] >= threshold) return;
        isOutsideTransparent[idx] = 1;
        queue[qTail++] = idx;
      };

      for (let x = 0; x < width; x += 1) {
        tryEnqueue(x, 0);
        tryEnqueue(x, height - 1);
      }
      for (let y = 0; y < height; y += 1) {
        tryEnqueue(0, y);
        tryEnqueue(width - 1, y);
      }

      while (qHead < qTail) {
        const idx = queue[qHead++];
        const x = idx % width;
        const y = (idx - x) / width;
        tryEnqueue(x + 1, y);
        tryEnqueue(x - 1, y);
        tryEnqueue(x, y + 1);
        tryEnqueue(x, y - 1);
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = width;
      outCanvas.height = height;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) return;

      const outData = outCtx.createImageData(width, height);
      const outPixels = outData.data;
      let innerPixelCount = 0;

      for (let i = 0; i < total; i += 1) {
        const alpha = pixels[i * 4 + 3];
        const isInnerOpening = alpha < threshold && !isOutsideTransparent[i];
        if (isInnerOpening) {
          innerPixelCount += 1;
          outPixels[i * 4] = 255;
          outPixels[i * 4 + 1] = 255;
          outPixels[i * 4 + 2] = 255;
          outPixels[i * 4 + 3] = 255;
        }
      }

      outCtx.putImageData(outData, 0, 0);
      const hasOpening = innerPixelCount > total * 0.003;
      setFrameMaskHasOpening(hasOpening);
      setFrameInnerMaskUrl(hasOpening ? outCanvas.toDataURL("image/png") : "");
    };

    img.onerror = () => {
      if (isActive) {
        setFrameMaskHasOpening(false);
        setFrameInnerMaskUrl("");
      }
    };

    img.src = frameSvg;

    return () => {
      isActive = false;
    };
  }, []);

  const i18n = useMemo(() => getLocalizer(language), [language]);
  const { t } = i18n;
  const storyOptions =
    localizationData.characterStoryOptions[language] || localizationData.characterStoryOptions.en;
  const connectionRules = localizationData.connectionRules[language] || localizationData.connectionRules.en;
  const coreStartIndex = playbooks.findIndex((pb) => pb.name === "Авантюрист");
  const totalBackgrounds = ROOT_BACKGROUNDS.length;

  useEffect(() => {
    if (!saveNotice) return undefined;
    const timeoutId = window.setTimeout(() => setSaveNotice(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [saveNotice]);

  useEffect(() => {
    if (activeStep !== "profile" || !shouldPrintProfile) return undefined;

    const timeoutId = window.setTimeout(() => {
      window.print();
      setShouldPrintProfile(false);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [activeStep, shouldPrintProfile]);

  useEffect(() => {
    if (!isConnectionHelpOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isConnectionHelpOpen]);

  const groupedPlaybooks = useMemo(() => {
    if (coreStartIndex <= 0) {
      return [
        {
          title: t.editionCore,
          items: playbooks.map((pb, idx) => ({ pb, idx }))
        }
      ];
    }

    return [
      {
        title: t.editionCore,
        items: playbooks.slice(coreStartIndex).map((pb, offset) => ({ pb, idx: coreStartIndex + offset }))
      },
      {
        title: t.editionOutcasts,
        items: playbooks.slice(0, coreStartIndex).map((pb, idx) => ({ pb, idx }))
      }
    ];
  }, [coreStartIndex, t.editionCore, t.editionOutcasts]);

  const playbook = playbooks[selectedIdx];
  const currentState = sanitizeCharacter(
    playbook,
    characterState[playbook.name] || getDefaultState(playbook)
  );

  const featRule = getFeatRule(playbook.name);
  const fixedFeats = getFixedFeats(playbook, featRule);
  const optionalFeatsCount = currentState.feats.filter((feat) => !fixedFeats.includes(feat)).length;
  const hasReachedFeatLimit = optionalFeatsCount >= featRule.count;

  useEffect(() => {
    if (playbook.moves.some((move) => move.name === activeMoveName)) {
      return;
    }

    const preferredMoveName =
      playbook.startingMoves.find((name) => playbook.moves.some((move) => move.name === name)) ||
      playbook.moves[0]?.name ||
      null;

    if (preferredMoveName !== activeMoveName) {
      setActiveMoveName(preferredMoveName);
    }
  }, [activeMoveName, playbook]);

  const defaultPortraitAsset = DEFAULT_PORTRAITS[playbook.name] || null;
  const defaultPortrait = defaultPortraitAsset?.url || null;
  const portraitToDisplay =
    currentState.image || (currentState.useDefaultPortrait ? defaultPortrait : null);
  const hasCustomPortraitUpload = Boolean(currentState.image && !currentState.useDefaultPortrait);

  const activeBackground =
    selectedBgIndex >= 0 && selectedBgIndex < totalBackgrounds
      ? ROOT_BACKGROUNDS[selectedBgIndex]
      : null;

  useEffect(() => {
    let isActive = true;

    analyzePortraitMassOffset(portraitToDisplay).then((offset) => {
      if (isActive) {
        setPortraitMassOffset(offset);
      }
    });

    return () => {
      isActive = false;
    };
  }, [portraitToDisplay]);

  useEffect(() => {
    const preloadLinks = [];

    const addPreload = (href, priority = "high") => {
      if (!href) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      link.setAttribute("fetchpriority", priority);
      document.head.appendChild(link);
      preloadLinks.push(link);
    };

    addPreload(frameSvg, "high");
    addPreload(activeBackground?.lowUrl, "high");
    addPreload(activeBackground?.url, "high");
    addPreload(portraitToDisplay, "high");

    return () => {
      preloadLinks.forEach((link) => link.remove());
    };
  }, [activeBackground?.lowUrl, activeBackground?.url, portraitToDisplay]);

  useEffect(() => {
    let canceled = false;

    const warmUrls = Array.from(
      new Set([
        ...ROOT_BACKGROUNDS.flatMap((bg) => [bg.lowUrl, bg.url]),
        ...Object.values(DEFAULT_PORTRAITS).flatMap((asset) =>
          asset ? [asset.lowUrl || asset.url, asset.url] : []
        )
      ])
    ).filter(Boolean);

    const warmResources = () => {
      if (canceled) return;

      warmUrls.forEach((url) => {
        const image = new Image();
        image.decoding = "async";
        if ("fetchPriority" in image) {
          image.fetchPriority = "low";
        }
        image.src = url;
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmResources, { timeout: 2200 });
      return () => {
        canceled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(warmResources, 1200);
    return () => {
      canceled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const frameInnerOpeningMaskStyle = useMemo(() => {
    if (!frameInnerMaskUrl || !frameMaskHasOpening) {
      return {};
    }

    return {
      WebkitMaskImage: `url(${frameInnerMaskUrl})`,
      maskImage: `url(${frameInnerMaskUrl})`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain"
    };
  }, [frameInnerMaskUrl, frameMaskHasOpening]);

  const frameInnerFallbackStyle = useMemo(
    () => ({
      clipPath: "inset(18% 16% 16% 16% round 12% 12% 10% 10%)"
    }),
    []
  );

  const updateState = (updates) => {
    setCharacterState((prev) => {
      const base = sanitizeCharacter(playbook, prev[playbook.name] || getDefaultState(playbook));
      const merged = sanitizeCharacter(playbook, { ...base, ...updates });
      return {
        ...prev,
        [playbook.name]: merged
      };
    });
  };

  const displayPlaybookName = i18n.playbookName;

  const displayDescription = (pb) => i18n.playbookDescription(pb);

  const displayNatureName = (natureName) => i18n.natureName(natureName);

  const displayNatureDescription = (playbookName, natureName, defaultDescription) =>
    i18n.natureDescription(playbookName, natureName, defaultDescription);

  const displayMoveName = (playbookName, moveName) => i18n.moveName(playbookName, moveName);

  const displayMoveDescription = (playbookName, moveName, defaultDescription) =>
    i18n.moveDescription(playbookName, moveName, defaultDescription);

  const displayFeatName = (featName) => i18n.featName(featName);

  const displaySkillName = (skillName) => i18n.skillName(skillName);

  const getFeatHint = () => {
    if (featRule.mode === "any") return t.featsHintAny(featRule.count);
    if (featRule.mode === "fixed-plus-any") return t.featsHintFixedPlusAny(featRule.count);
    return t.featsHintFixed;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      updateState({ image: event.target?.result || null, useDefaultPortrait: false, bgRemovalBackup: null });
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreDefaultPortrait = () => {
    if (!defaultPortrait) return;
    updateState({ image: null, useDefaultPortrait: true, bgRemovalBackup: null });
  };

  const handleRemovePortrait = () => {
    updateState({ image: null, useDefaultPortrait: false, bgRemovalBackup: null });
  };

  const handleRestoreBackgroundToImage = () => {
    const backup = currentState.bgRemovalBackup;
    if (!backup) return;

    const shouldRestoreDefault = Boolean(defaultPortrait && backup === defaultPortrait);
    updateState({
      image: shouldRestoreDefault ? null : backup,
      useDefaultPortrait: shouldRestoreDefault,
      bgRemovalBackup: null
    });
  };

  const handleRemoveBackgroundFromImage = async () => {
    if (!hasCustomPortraitUpload || !portraitToDisplay || isRemovingBg) return;

    setIsRemovingBg(true);

    try {
      const img = new Image();
      img.src = portraitToDisplay;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const width = canvas.width;
      const height = canvas.height;
      const total = width * height;

      const toOffset = (pixelIndex) => pixelIndex * 4;
      const readRgb = (pixelIndex) => {
        const o = toOffset(pixelIndex);
        return [data[o], data[o + 1], data[o + 2], data[o + 3]];
      };
      const colorDistance = (aR, aG, aB, bR, bG, bB) =>
        Math.hypot(aR - bR, aG - bG, aB - bB);

      const borderPixels = [];
      const addBorderPixel = (x, y) => {
        borderPixels.push(y * width + x);
      };

      for (let x = 0; x < width; x += 1) {
        addBorderPixel(x, 0);
        addBorderPixel(x, height - 1);
      }
      for (let y = 1; y < height - 1; y += 1) {
        addBorderPixel(0, y);
        addBorderPixel(width - 1, y);
      }

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumLight = 0;
      let modelCount = 0;

      borderPixels.forEach((pixelIndex) => {
        const [r, g, b, a] = readRgb(pixelIndex);
        if (a < 8) return;
        sumR += r;
        sumG += g;
        sumB += b;
        sumLight += (r + g + b) / 3;
        modelCount += 1;
      });

      if (modelCount === 0) {
        modelCount = 1;
      }

      const bgR = sumR / modelCount;
      const bgG = sumG / modelCount;
      const bgB = sumB / modelCount;
      const bgLight = sumLight / modelCount;

      let deviationSum = 0;
      borderPixels.forEach((pixelIndex) => {
        const [r, g, b, a] = readRgb(pixelIndex);
        if (a < 8) return;
        deviationSum += colorDistance(r, g, b, bgR, bgG, bgB);
      });

      const avgDeviation = deviationSum / modelCount;
      const strictThreshold = Math.max(20, Math.min(62, 18 + avgDeviation * 1.6));
      const softThreshold = strictThreshold + 16;
      const localStepThreshold = Math.max(18, strictThreshold * 0.72);

      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      let qHead = 0;
      let qTail = 0;

      const enqueue = (pixelIndex) => {
        if (visited[pixelIndex]) return;
        visited[pixelIndex] = 1;
        queue[qTail] = pixelIndex;
        qTail += 1;
      };

      borderPixels.forEach((pixelIndex) => {
        const [r, g, b, a] = readRgb(pixelIndex);
        if (a < 8) {
          enqueue(pixelIndex);
          return;
        }
        const distToModel = colorDistance(r, g, b, bgR, bgG, bgB);
        if (distToModel <= softThreshold) {
          enqueue(pixelIndex);
        }
      });

      if (qTail === 0) {
        borderPixels.forEach((pixelIndex) => enqueue(pixelIndex));
      }

      const tryExpand = (nextX, nextY, parentIndex) => {
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) return;

        const nextIndex = nextY * width + nextX;
        if (visited[nextIndex]) return;

        const [r, g, b, a] = readRgb(nextIndex);
        if (a < 8) {
          enqueue(nextIndex);
          return;
        }

        const parentOffset = toOffset(parentIndex);
        const parentR = data[parentOffset];
        const parentG = data[parentOffset + 1];
        const parentB = data[parentOffset + 2];

        const distToModel = colorDistance(r, g, b, bgR, bgG, bgB);
        const distToParent = colorDistance(r, g, b, parentR, parentG, parentB);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const lightness = (r + g + b) / 3;

        const isBackgroundLike =
          distToModel <= strictThreshold ||
          (distToModel <= softThreshold &&
            distToParent <= localStepThreshold &&
            (saturation < 0.34 || lightness >= bgLight - 24));

        if (isBackgroundLike) {
          enqueue(nextIndex);
        }
      };

      while (qHead < qTail) {
        const currentIndex = queue[qHead++];
        const x = currentIndex % width;
        const y = (currentIndex - x) / width;

        tryExpand(x + 1, y, currentIndex);
        tryExpand(x - 1, y, currentIndex);
        tryExpand(x, y + 1, currentIndex);
        tryExpand(x, y - 1, currentIndex);
      }

      const hasBackgroundNeighbor = (pixelIndex) => {
        const x = pixelIndex % width;
        const y = (pixelIndex - x) / width;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (visited[ny * width + nx]) return true;
          }
        }

        return false;
      };

      for (let pixelIndex = 0; pixelIndex < total; pixelIndex += 1) {
        const o = toOffset(pixelIndex);

        if (visited[pixelIndex]) {
          data[o + 3] = 0;
          continue;
        }

        if (!hasBackgroundNeighbor(pixelIndex)) continue;

        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        const a = data[o + 3];
        const distToModel = colorDistance(r, g, b, bgR, bgG, bgB);

        if (distToModel > softThreshold || a < 8) continue;

        const edgeStrength = Math.max(0, (softThreshold - distToModel) / Math.max(1, softThreshold - strictThreshold));
        const alphaScale = 1 - 0.4 * edgeStrength;
        data[o + 3] = Math.max(0, Math.floor(a * alphaScale));
      }

      ctx.putImageData(imageData, 0, 0);
      const preservedOriginal = currentState.bgRemovalBackup || portraitToDisplay;
      updateState({
        image: canvas.toDataURL("image/png"),
        useDefaultPortrait: false,
        bgRemovalBackup: preservedOriginal
      });
    } catch {
      // Keep original portrait if background remover fails.
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleBackgroundNext = () => {
    if (totalBackgrounds === 0) return;
    setSelectedBgIndex((prev) => {
      if (prev < 0 || prev >= totalBackgrounds) return 0;
      return (prev + 1) % totalBackgrounds;
    });
  };

  const handleBackgroundPrev = () => {
    if (totalBackgrounds === 0) return;
    setSelectedBgIndex((prev) => {
      if (prev < 0 || prev >= totalBackgrounds) return totalBackgrounds - 1;
      return (prev - 1 + totalBackgrounds) % totalBackgrounds;
    });
  };

  const clearBackground = () => setSelectedBgIndex(-1);
  const canRestoreRemovedBackground = Boolean(
    hasCustomPortraitUpload && currentState.bgRemovalBackup && portraitToDisplay
  );

  const handleStatIncrease = (stat) => {
    if (!currentState.bonusStat && playbook.stats[stat] < 2) {
      updateState({ bonusStat: stat });
    }
  };

  const handleStatDecrease = (stat) => {
    if (currentState.bonusStat === stat) {
      updateState({ bonusStat: null });
    }
  };

  const handleFeatToggle = (feat) => {
    const isChecked = currentState.feats.includes(feat);
    const isFixed = fixedFeats.includes(feat);

    if (featRule.mode === "fixed") return;

    if (featRule.mode === "fixed-plus-any" && isFixed) return;

    if (isChecked) {
      updateState({ feats: currentState.feats.filter((item) => item !== feat) });
      return;
    }

    if (hasReachedFeatLimit) return;

    updateState({ feats: [...currentState.feats, feat] });
  };

  const handleSkillToggle = (skill) => {
    if (!playbook.startingSkills.includes(skill)) return;

    const isChecked = currentState.skills.includes(skill);
    if (isChecked) {
      updateState({ skills: [] });
    } else {
      updateState({ skills: [skill] });
    }
  };

  const handleMoveToggle = (moveName, isMandatory) => {
    if (isMandatory) return;

    const isChecked = currentState.moves.includes(moveName);
    const selectedOptionalMoves = currentState.moves.filter(
      (m) => !playbook.startingMoves.includes(m)
    );

    if (isChecked) {
      updateState({ moves: currentState.moves.filter((m) => m !== moveName) });
    } else if (selectedOptionalMoves.length < playbook.movesCheck) {
      updateState({ moves: [...currentState.moves, moveName] });
    }
  };

  const getMovesHeaderText = () => {
    return i18n.movesHeaderText(playbook, displayMoveName);
  };

  const selectedOptionalMovesCount = currentState.moves.filter(
    (m) => !playbook.startingMoves.includes(m)
  ).length;
  const hasReachedMoveLimit = selectedOptionalMovesCount >= playbook.movesCheck;
  const activeMove = playbook.moves.find((move) => move.name === activeMoveName) || playbook.moves[0] || null;

  const requiredOptionalFeatCount = featRule.mode === "fixed" ? 0 : featRule.count;
  const selectedRequiredFeatsCount =
    featRule.mode === "fixed-plus-any" ? optionalFeatsCount : featRule.mode === "any" ? currentState.feats.length : 0;

  const isBuilderReady =
    Boolean(currentState.nature) &&
    Boolean(currentState.bonusStat) &&
    currentState.skills.length === 1 &&
    selectedOptionalMovesCount === playbook.movesCheck &&
    selectedRequiredFeatsCount === requiredOptionalFeatCount;

  const bgBackdropUrl = activeBackground?.url || activeBackground?.lowUrl || "";

  const updateBackgroundField = (field, value) => {
    setBackgroundDraft((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBackgroundPick = (field, value, maxCount = Number.POSITIVE_INFINITY) => {
    setBackgroundDraft((prev) => {
      const list = Array.isArray(prev[field]) ? prev[field] : [];
      const hasValue = list.includes(value);

      if (hasValue) {
        return { ...prev, [field]: list.filter((item) => item !== value) };
      }

      if (list.length >= maxCount) {
        return prev;
      }

      return { ...prev, [field]: [...list, value] };
    });
  };

  const updateConnectionField = (index, field, value) => {
    setBackgroundDraft((prev) => {
      const nextConnections = prev.connections.map((connection, connectionIndex) =>
        connectionIndex === index ? { ...connection, [field]: value } : connection
      );
      return { ...prev, connections: nextConnections };
    });
  };

  const addCustomMotive = () => {
    setBackgroundDraft((prev) => {
      if (prev.customMotives.length >= MAX_CUSTOM_MOTIVES) return prev;
      return {
        ...prev,
        customMotives: [...prev.customMotives, { title: "", description: "" }]
      };
    });
  };

  const updateCustomMotiveField = (index, field, value) => {
    setBackgroundDraft((prev) => {
      const nextCustomMotives = prev.customMotives.map((motive, motiveIndex) =>
        motiveIndex === index ? { ...motive, [field]: value } : motive
      );
      return { ...prev, customMotives: nextCustomMotives };
    });
  };

  const removeCustomMotive = (index) => {
    setBackgroundDraft((prev) => ({
      ...prev,
      customMotives: prev.customMotives.filter((_, motiveIndex) => motiveIndex !== index)
    }));
  };

  const setFactionReputation = (index, nextValue) => {
    setBackgroundDraft((prev) => {
      const nextReputation = [...prev.factionReputation];
      const currentValue = clampReputation(nextReputation[index]);
      const normalizedNext = clampReputation(nextValue);
      nextReputation[index] = currentValue === normalizedNext ? 0 : normalizedNext;
      return {
        ...prev,
        factionReputation: nextReputation,
        visibleFactionCount: Math.max(
          sanitizeVisibleFactionCount(prev.visibleFactionCount),
          index + 1
        )
      };
    });
  };

  const revealNextFaction = () => {
    setBackgroundDraft((prev) => ({
      ...prev,
      visibleFactionCount: clamp(
        sanitizeVisibleFactionCount(prev.visibleFactionCount) + 1,
        INITIAL_VISIBLE_FACTIONS,
        storyOptions.factions.length
      )
    }));
  };

  const persistBackgroundDraft = (nextDraft) => {
    const sanitized = sanitizeBackgroundDraft(nextDraft);
    localStorage.setItem(BACKGROUND_DRAFT_STORAGE_KEY, JSON.stringify(sanitized));
    setBackgroundDraft(sanitized);
    setDraftSnapshotOnOpen(sanitized);
    setSaveNotice(t.saveDone);
    return sanitized;
  };

  const buildProfilePayload = (nextDraft) => {
    const normalizedDraft = sanitizeBackgroundDraft(nextDraft);
    const factionsHelped = storyOptions.factions.filter(
      (_, idx) => (normalizedDraft.factionReputation[idx] || 0) > 0
    );
    const factionsHarmed = storyOptions.factions.filter(
      (_, idx) => (normalizedDraft.factionReputation[idx] || 0) < 0
    );

    return {
      savedAt: new Date().toISOString(),
      language,
      playbookName: playbook.name,
      nature: currentState.nature,
      stats: statsOrder.map((stat) => ({
        stat,
        value: playbook.stats[stat] + (currentState.bonusStat === stat ? 1 : 0)
      })),
      feats: [...currentState.feats],
      skills: [...currentState.skills],
      moves: [...currentState.moves],
      portrait: portraitToDisplay || null,
      backgroundImage: activeBackground?.url || activeBackground?.lowUrl || null,
      background: {
        ...normalizedDraft,
        factionsHelped,
        factionsHarmed
      }
    };
  };

  const persistProfile = (payload) => {
    localStorage.setItem(CHARACTER_PROFILE_STORAGE_KEY, JSON.stringify(payload));
    setSavedCharacterProfile(payload);
  };

  const requiredBackgroundChecks = [
    backgroundDraft.name.trim().length > 0,
    backgroundDraft.animalType.trim().length > 0,
    backgroundDraft.biography.trim().length > 0,
    backgroundDraft.motives.length === MAX_MOTIVES,
    backgroundDraft.connections.every(
      (connection) => connection.role.trim().length > 0 && connection.characterName.trim().length > 0
    )
  ];
  const backgroundCompletedCount = requiredBackgroundChecks.filter(Boolean).length;
  const backgroundProgressPercent = Math.round(
    (backgroundCompletedCount / requiredBackgroundChecks.length) * 100
  );
  const isBackgroundComplete = requiredBackgroundChecks.every(Boolean);

  const hasUnsavedBackgroundChanges =
    JSON.stringify(sanitizeBackgroundDraft(backgroundDraft)) !==
    JSON.stringify(sanitizeBackgroundDraft(draftSnapshotOnOpen));

  const visibleFactionCount = clamp(
    sanitizeVisibleFactionCount(backgroundDraft.visibleFactionCount),
    INITIAL_VISIBLE_FACTIONS,
    storyOptions.factions.length
  );
  const visibleFactions = storyOptions.factions.slice(0, visibleFactionCount);
  const canRevealMoreFactions = visibleFactionCount < storyOptions.factions.length;

  const openBackgroundStep = () => {
    if (!isBuilderReady) return;
    const snapshot = sanitizeBackgroundDraft(backgroundDraft);
    setDraftSnapshotOnOpen(snapshot);
    setActiveStep("background");
    setSidebarOpen(false);
  };

  const handleBackToBuilder = () => {
    if (hasUnsavedBackgroundChanges) {
      const shouldDiscard = window.confirm(t.backToBuilderWarning);
      if (!shouldDiscard) return;
      setBackgroundDraft(sanitizeBackgroundDraft(draftSnapshotOnOpen));
    }
    setIsConnectionHelpOpen(false);
    setActiveStep("builder");
  };

  const handleSaveCharacterAndReturn = () => {
    const savedDraft = persistBackgroundDraft(backgroundDraft);
    persistProfile(buildProfilePayload(savedDraft));
    setActiveStep("builder");
    setIsConnectionHelpOpen(false);
  };

  const handleExportToPdf = () => {
    if (!isBackgroundComplete) {
      window.alert(t.fillRequiredBeforeExport);
      return;
    }

    const savedDraft = persistBackgroundDraft(backgroundDraft);
    persistProfile(buildProfilePayload(savedDraft));
    setActiveStep("profile");
    setShouldPrintProfile(true);
    setIsConnectionHelpOpen(false);
  };

  const openBackgroundFromProfile = () => {
    const snapshot = sanitizeBackgroundDraft(backgroundDraft);
    setDraftSnapshotOnOpen(snapshot);
    setIsConnectionHelpOpen(false);
    setActiveStep("background");
  };

  const handleClearBackgroundDraft = () => {
    const clearedDraft = sanitizeBackgroundDraft(emptyBackgroundDraft);
    setBackgroundDraft(clearedDraft);
    localStorage.removeItem(BACKGROUND_DRAFT_STORAGE_KEY);
    setIsConnectionHelpOpen(false);
    setSaveNotice("");
  };

  if (activeStep === "background") {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 font-body relative overflow-x-hidden selection:bg-amber-200">
        {bgBackdropUrl && (
          <div className="absolute inset-0 opacity-[0.14] pointer-events-none">
            <ProgressiveImage
              src={activeBackground?.url}
              placeholderSrc={activeBackground?.lowUrl}
              alt={t.portraitBackgroundAlt}
              className="w-full h-full"
              imageClassName="object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-80 pointer-events-none" />

        <main className="relative p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 pb-10">
            <section className="bg-white rounded-2xl border border-stone-300 p-4 md:p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-stone-950 truncate">
                    {displayPlaybookName(playbook.name)}
                  </h2>
                  {currentState.nature && (
                    <p className="text-sm text-stone-700 mt-1">{displayNatureName(currentState.nature)}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:inline text-xs text-stone-600">{t.language}</span>
                  <div className="flex rounded-lg border border-stone-300 overflow-hidden bg-white">
                    <button
                      onClick={() => setLanguage("ru")}
                      className={`px-2.5 py-1.5 text-xs font-semibold ${
                        language === "ru" ? "bg-amber-700 text-white" : "bg-white text-stone-700"
                      }`}
                    >
                      <Languages size={14} className="inline mr-1" /> {t.langRuShort}
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`px-2.5 py-1.5 text-xs font-semibold ${
                        language === "en" ? "bg-amber-700 text-white" : "bg-white text-stone-700"
                      }`}
                    >
                      {t.langEnShort}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider text-stone-600">{t.progressLabel}</span>
                  <span className="text-xs font-semibold text-stone-900">{backgroundProgressPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${backgroundProgressPercent}%` }}
                  />
                </div>
              </div>
            </section>

            <div className="grid lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] gap-5 items-start">
              <aside className="bg-white rounded-2xl border border-stone-300 p-4 space-y-4 shadow-sm">
                <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden">
                  {activeBackground && (
                    <ProgressiveImage
                      src={activeBackground.url}
                      placeholderSrc={activeBackground.lowUrl}
                      alt={t.portraitBackgroundAlt}
                      className="absolute inset-0"
                      imageClassName="object-cover opacity-55"
                      loading="eager"
                    />
                  )}
                  <div className="absolute inset-0 bg-stone-100/35" />

                  {portraitToDisplay ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <img
                        src={portraitToDisplay}
                        alt={t.characterPortraitAlt}
                        className="w-[94%] h-[96%] object-contain"
                        style={{ transform: `translate(${portraitMassOffset.x}%, ${portraitMassOffset.y}%)` }}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />
                    </div>
                  ) : (
                    <label className="absolute inset-0 z-10 cursor-pointer flex flex-col items-center justify-center text-stone-700 hover:text-amber-700 transition-colors">
                      <ImagePlus size={42} className="mb-3 opacity-80" />
                      <span className="text-[11px] font-bold text-center px-3 uppercase tracking-widest text-stone-700">
                        {t.uploadPortrait}
                      </span>
                      <span className="text-[10px] uppercase text-stone-600 mt-1 tracking-wider">
                        {t.portraitHint}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>

                {hasCustomPortraitUpload && (
                  <button
                    onClick={canRestoreRemovedBackground ? handleRestoreBackgroundToImage : handleRemoveBackgroundFromImage}
                    disabled={isRemovingBg}
                    className={`w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-70 shadow-sm transition-colors ${
                      canRestoreRemovedBackground
                        ? "bg-stone-700 hover:bg-stone-800"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {canRestoreRemovedBackground ? (
                      <RotateCcw size={14} className="inline mr-1" />
                    ) : (
                      <Sparkles size={14} className="inline mr-1" />
                    )}
                    {canRestoreRemovedBackground ? t.restoreBg : isRemovingBg ? t.removeBgBusy : t.removeBg}
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleBackgroundPrev}
                    className="px-2 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-800 text-white text-sm font-semibold transition-colors"
                    title={t.bgPrev}
                  >
                    <ChevronLeft size={14} className="inline" />
                  </button>
                  <button
                    onClick={handleBackgroundNext}
                    className="px-2 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-800 text-white text-sm font-semibold transition-colors"
                    title={t.bgNext}
                  >
                    <ChevronRight size={14} className="inline" />
                  </button>
                  <button
                    onClick={clearBackground}
                    className="px-2 py-2.5 rounded-xl bg-stone-500 hover:bg-stone-600 text-white text-sm font-semibold transition-colors"
                    title={t.bgClear}
                  >
                    <RotateCcw size={14} className="inline" />
                  </button>
                </div>

                <p className="text-xs text-stone-600">
                  {activeBackground ? t.bgSelected(selectedBgIndex, totalBackgrounds) : t.bgNoSelection}
                </p>

                <label className="block w-full">
                  <span className="sr-only">{t.uploadPortrait}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <span className="block w-full text-center px-3 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-800 text-white text-sm font-semibold cursor-pointer transition-colors">
                    <ImagePlus size={14} className="inline mr-1" />
                    {t.uploadPortrait}
                  </span>
                </label>

                {portraitToDisplay && (
                  <button
                    onClick={handleRemovePortrait}
                    className="w-full px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                  >
                    <Trash2 size={14} className="inline mr-1" />
                    {t.removePortrait}
                  </button>
                )}

                {!portraitToDisplay && defaultPortrait && (
                  <button
                    onClick={handleRestoreDefaultPortrait}
                    className="w-full px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
                  >
                    {t.restoreDefaultPortrait}
                  </button>
                )}

                <div className="hidden lg:block pt-2 space-y-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={handleClearBackgroundDraft}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 text-sm font-semibold transition-colors"
                  >
                    {t.clearBackgroundForm}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCharacterAndReturn}
                    className="w-full px-4 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save size={18} /> {t.saveCharacterAndReturn}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportToPdf}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-700 text-white hover:bg-stone-800 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileDown size={18} /> {t.exportPdf}
                  </button>
                  {saveNotice && <span className="block text-center text-sm text-emerald-700">{saveNotice}</span>}
                </div>
              </aside>

              <section className="bg-white rounded-2xl border border-stone-300 p-4 md:p-5 space-y-4 shadow-sm">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700 mb-1">{t.nameLabel}</span>
                    <input
                      type="text"
                      value={backgroundDraft.name}
                      onChange={(event) => updateBackgroundField("name", event.target.value)}
                      className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700 mb-1">
                      {t.animalTypeLabel}
                    </span>
                    <input
                      type="text"
                      value={backgroundDraft.animalType}
                      onChange={(event) => updateBackgroundField("animalType", event.target.value)}
                      className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="block text-sm font-semibold text-stone-700 mb-1">{t.biographyLabel}</span>
                  <textarea
                    value={backgroundDraft.biography}
                    onChange={(event) => updateBackgroundField("biography", event.target.value)}
                    placeholder={t.biographyPlaceholder}
                    rows={4}
                    className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 resize-y"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-stone-700 mb-1">
                    {t.appearanceLabel}
                  </span>
                  <input
                    type="text"
                    value={backgroundDraft.appearance}
                    onChange={(event) => updateBackgroundField("appearance", event.target.value)}
                    className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900"
                  />
                </label>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-stone-700">{t.motivesLabel}</span>
                    <span className="text-xs text-stone-700">{t.motivesHint}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {storyOptions.motives.map((motive) => {
                      const isSelected = backgroundDraft.motives.includes(motive);
                      return (
                        <button
                          type="button"
                          key={motive}
                          onClick={() => toggleBackgroundPick("motives", motive, MAX_MOTIVES)}
                          className={`px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
                            isSelected
                              ? "bg-amber-500 text-stone-950"
                              : "bg-stone-200 text-stone-800 hover:bg-stone-300"
                          }`}
                        >
                          {motive}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-stone-300 p-3 bg-white space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-stone-700">{t.otherMotivesLabel}</span>
                      <p className="text-xs text-stone-700 mt-1">{t.otherMotivesHint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={addCustomMotive}
                      disabled={backgroundDraft.customMotives.length >= MAX_CUSTOM_MOTIVES}
                      className="px-3 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-semibold disabled:opacity-45 transition-colors"
                    >
                      {t.addOtherMotive}
                    </button>
                  </div>

                  {backgroundDraft.customMotives.length > 0 && (
                    <div className="space-y-3">
                      {backgroundDraft.customMotives.map((motive, motiveIndex) => (
                        <div key={motiveIndex} className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-semibold text-stone-700">#{motiveIndex + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeCustomMotive(motiveIndex)}
                              className="px-2.5 py-1.5 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-700 text-sm font-semibold transition-colors"
                            >
                              {t.removeOtherMotive}
                            </button>
                          </div>
                          <div className="space-y-2">
                            <label className="block">
                              <span className="block text-xs text-stone-700 mb-1">{t.otherMotiveNameLabel}</span>
                              <input
                                type="text"
                                value={motive.title}
                                placeholder={t.otherMotiveNamePlaceholder}
                                onChange={(event) =>
                                  updateCustomMotiveField(motiveIndex, "title", event.target.value)
                                }
                                className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-xs text-stone-700 mb-1">{t.otherMotiveDescriptionLabel}</span>
                              <textarea
                                value={motive.description}
                                placeholder={t.otherMotiveDescriptionPlaceholder}
                                onChange={(event) =>
                                  updateCustomMotiveField(motiveIndex, "description", event.target.value)
                                }
                                rows={2}
                                className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 resize-y"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-700">{t.connectionsLabel}</span>
                    <button
                      type="button"
                      onClick={() => setIsConnectionHelpOpen(true)}
                      className="px-2.5 py-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-semibold transition-colors"
                    >
                      <Info size={13} className="inline mr-1" />
                      {t.connectionHelpButton}
                    </button>
                  </div>

                  {backgroundDraft.connections.map((connection, index) => (
                    <div key={index} className="rounded-xl border border-stone-300 p-3 bg-white">
                      <p className="text-[11px] uppercase tracking-wider text-stone-600 mb-2">
                        {index === 0 ? t.connectionOneLabel : t.connectionTwoLabel}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-xs text-stone-700 mb-1">{t.connectionRoleLabel}</span>
                          <select
                            value={connection.role}
                            onChange={(event) => updateConnectionField(index, "role", event.target.value)}
                            className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900"
                          >
                            <option value="">-</option>
                            {storyOptions.connectionRoles.map((role) => (
                              <option key={`${role}-${index}`} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="block text-xs text-stone-700 mb-1">{t.connectionNameLabel}</span>
                          <input
                            type="text"
                            value={connection.characterName}
                            placeholder={t.connectionNamePlaceholder}
                            onChange={(event) =>
                              updateConnectionField(index, "characterName", event.target.value)
                            }
                            className="w-full rounded-lg bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-stone-300 p-3 bg-white space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-700">
                      {t.factionReputationTitle}
                    </span>
                    <span className="text-xs text-stone-700">{t.reputationHint}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                    <span className="text-rose-700">{t.badFameLabel}</span>
                    <span className="text-emerald-700">{t.prestigeLabel}</span>
                  </div>

                  <div className="space-y-3">
                    {visibleFactions.map((faction, factionIndex) => {
                      const currentValue = clampReputation(backgroundDraft.factionReputation[factionIndex]);

                      return (
                        <div key={faction} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-stone-900">{faction}</span>
                            <span
                              className={`text-xs font-bold ${
                                currentValue < 0
                                  ? "text-rose-700"
                                  : currentValue > 0
                                  ? "text-emerald-700"
                                  : "text-stone-600"
                              }`}
                            >
                              {currentValue > 0 ? `+${currentValue}` : currentValue}
                            </span>
                          </div>

                          <div className="grid grid-cols-7 gap-1.5">
                            {REPUTATION_VALUES.map((value) => {
                              const isActive = currentValue === value;
                              const isNegative = value < 0;
                              const isPositive = value > 0;

                              const baseClass = isNegative
                                ? "border-rose-300 text-rose-700"
                                : isPositive
                                ? "border-emerald-300 text-emerald-700"
                                : "border-stone-300 text-stone-700";

                              const activeClass = isNegative
                                ? "bg-rose-500 border-rose-600 text-white"
                                : isPositive
                                ? "bg-emerald-500 border-emerald-600 text-white"
                                : "bg-stone-600 border-stone-700 text-white";

                              return (
                                <button
                                  key={`${faction}-${value}`}
                                  type="button"
                                  onClick={() => setFactionReputation(factionIndex, value)}
                                  className={`h-8 rounded-md border text-xs font-bold transition-colors ${
                                    isActive ? activeClass : `${baseClass} bg-white hover:bg-stone-100`
                                  }`}
                                >
                                  {value > 0 ? `+${value}` : value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {canRevealMoreFactions && (
                      <button
                        type="button"
                        onClick={revealNextFaction}
                        className="w-full h-10 rounded-lg border border-stone-300 bg-stone-100 text-stone-900 hover:bg-stone-200 text-sm font-semibold transition-colors"
                      >
                        {t.addFaction}
                      </button>
                    )}
                  </div>
                </div>

                <div className="lg:hidden pt-1 space-y-2">
                  <button
                    type="button"
                    onClick={handleClearBackgroundDraft}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 text-sm font-semibold transition-colors"
                  >
                    {t.clearBackgroundForm}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCharacterAndReturn}
                    className="w-full px-4 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save size={18} /> {t.saveCharacterAndReturn}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportToPdf}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-700 text-white hover:bg-stone-800 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileDown size={18} /> {t.exportPdf}
                  </button>
                  {saveNotice && <span className="block text-center text-sm text-emerald-700">{saveNotice}</span>}
                </div>

              </section>
            </div>
          </div>
        </main>

        {isConnectionHelpOpen && (
          <div className="fixed inset-0 z-[70] bg-black/45 p-4 overflow-y-auto">
            <div className="w-full max-w-3xl my-6 mx-auto bg-white rounded-2xl border border-stone-300 p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-xl font-display font-bold text-stone-900">{t.connectionHelpTitle}</h3>
                <button
                  type="button"
                  onClick={() => setIsConnectionHelpOpen(false)}
                  className="text-stone-500 hover:text-stone-800"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-stone-800 leading-6 mb-4">{t.connectionHelpIntro}</p>

              <div className="space-y-4">
                {connectionRules.map((rule) => (
                  <div key={rule.title} className="rounded-xl border border-stone-300 p-3 bg-stone-50">
                    <h4 className="font-display font-bold text-stone-900 mb-1">{rule.title}</h4>
                    <p className="text-sm text-stone-800 leading-6">{rule.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsConnectionHelpOpen(false)}
                  className="px-4 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-950 text-sm font-semibold"
                >
                  {t.connectionHelpClose}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeStep === "profile" && savedCharacterProfile) {
    const profile = savedCharacterProfile;
    const profileConnections = Array.isArray(profile.background?.connections)
      ? profile.background.connections
      : [];

    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 font-body relative overflow-x-hidden selection:bg-amber-200">
        {bgBackdropUrl && (
          <div className="absolute inset-0 opacity-[0.14] pointer-events-none">
            <ProgressiveImage
              src={activeBackground?.url}
              placeholderSrc={activeBackground?.lowUrl}
              alt={t.portraitBackgroundAlt}
              className="w-full h-full"
              imageClassName="object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-80 pointer-events-none" />

        <div className="relative min-h-screen px-3 sm:px-5 md:px-8 py-4 md:py-6">
          <div className="max-w-7xl mx-auto space-y-5">
            <header className="bg-white/90 rounded-2xl border border-stone-300 p-4 md:p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-stone-900">{t.profileReadyTitle}</h1>
                <p className="text-sm sm:text-base text-stone-700 mt-1">{t.profileReadySubtitle}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep("builder")}
                  className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-800 text-white text-sm font-semibold"
                >
                  {t.backToBuilder}
                </button>
                <button
                  type="button"
                  onClick={openBackgroundFromProfile}
                  className="px-3 py-2 rounded-lg bg-stone-200 text-stone-900 hover:bg-stone-300 text-sm font-semibold"
                >
                  {t.editBackground}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400 text-sm font-semibold flex items-center gap-2"
                >
                  <FileDown size={16} /> {t.exportPdf}
                </button>
              </div>
            </header>

            <div className="grid lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.22fr)] gap-4 items-start">
              <aside className="bg-white/90 rounded-2xl border border-stone-300 p-4 space-y-4 shadow-sm">
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden">
                  {activeBackground && (
                    <ProgressiveImage
                      src={activeBackground.url}
                      placeholderSrc={activeBackground.lowUrl}
                      alt={t.portraitBackgroundAlt}
                      className="absolute inset-0"
                      imageClassName="object-cover opacity-55"
                      loading="eager"
                    />
                  )}
                  <div className="absolute inset-0 bg-stone-100/35" />
                  {profile.portrait ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <img
                        src={profile.portrait}
                        alt={t.characterPortraitAlt}
                        className="w-[94%] h-[96%] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm z-10">
                      {t.characterPortraitAlt}
                    </div>
                  )}
                </div>
                <div className="text-sm text-stone-800 space-y-1">
                  <p className="font-semibold text-stone-900">{displayPlaybookName(profile.playbookName)}</p>
                  {profile.nature && <p>{displayNatureName(profile.nature)}</p>}
                  <p>{profile.background?.name || "-"}</p>
                  <p>{profile.background?.animalType || "-"}</p>
                </div>
              </aside>

              <section className="space-y-3">
                <div className="bg-white/90 rounded-2xl border border-stone-300 p-4 shadow-sm">
                  <h2 className="text-sm uppercase tracking-wider text-stone-600 mb-2">{t.profileSectionBuild}</h2>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-stone-900">
                    {profile.stats.map((item) => (
                      <p key={item.stat}>
                        {i18n.statLabel(item.stat)}: {item.value >= 0 ? `+${item.value}` : item.value}
                      </p>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-stone-900">
                    {t.feats}: {profile.feats.map((feat) => displayFeatName(feat)).join(", ") || "-"}
                  </p>
                  <p className="mt-1 text-sm text-stone-900">
                    {t.skills}: {profile.skills.map((skill) => displaySkillName(skill)).join(", ") || "-"}
                  </p>
                  <p className="mt-1 text-sm text-stone-900">
                    {t.moves}: {profile.moves.map((move) => displayMoveName(profile.playbookName, move)).join(", ") || "-"}
                  </p>
                </div>

                <div className="bg-white/90 rounded-2xl border border-stone-300 p-4 shadow-sm">
                  <h2 className="text-sm uppercase tracking-wider text-stone-600 mb-2">{t.profileSectionBackground}</h2>
                  <p className="text-sm text-stone-900 whitespace-pre-wrap leading-6">
                    {profile.background?.biography || "-"}
                  </p>
                  <p className="mt-2 text-sm text-stone-900">
                    {t.motivesLabel}: {(profile.background?.motives || []).join(", ") || "-"}
                  </p>
                  {Array.isArray(profile.background?.customMotives) &&
                    profile.background.customMotives.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm text-stone-900">
                        <p className="font-semibold">{t.otherMotivesLabel}:</p>
                        {profile.background.customMotives.map((motive, motiveIndex) => (
                          <p key={`${motive?.title || "motive"}-${motiveIndex}`}>
                            {motive?.title || "-"}: {motive?.description || "-"}
                          </p>
                        ))}
                      </div>
                    )}
                  <div className="mt-2 space-y-1 text-sm text-stone-900">
                    <p className="font-semibold">{t.connectionsLabel}:</p>
                    {profileConnections.length ? (
                      profileConnections.map((connection, index) => (
                        <p key={`${connection.role}-${connection.characterName}-${index}`}>
                          {index === 0 ? t.connectionOneLabel : t.connectionTwoLabel}: {connection.role || "-"} -{" "}
                          {connection.characterName || "-"}
                        </p>
                      ))
                    ) : (
                      <p>-</p>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-900">
                    {t.appearanceLabel}: {profile.background?.appearance || "-"}
                  </p>
                </div>

                <div className="bg-white/90 rounded-2xl border border-stone-300 p-4 shadow-sm">
                  <h2 className="text-sm uppercase tracking-wider text-stone-600 mb-2">{t.profileSectionStory}</h2>
                  <div className="space-y-2">
                    {storyOptions.factions.map((faction, factionIndex) => {
                      const value = clampReputation(profile.background?.factionReputation?.[factionIndex]);
                      return (
                        <div key={`${faction}-profile`} className="flex items-center justify-between text-sm">
                          <span className="text-stone-900">{faction}</span>
                          <span
                            className={`font-semibold ${
                              value < 0
                                ? "text-rose-700"
                                : value > 0
                                ? "text-emerald-700"
                                : "text-stone-600"
                            }`}
                          >
                            {value > 0 ? `+${value}` : value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm text-stone-900">
                    {t.factionsHelpedLabel}: {(profile.background?.factionsHelped || []).join(", ") || "-"}
                  </p>
                  <p className="mt-1 text-sm text-stone-900">
                    {t.factionsHarmedLabel}: {(profile.background?.factionsHarmed || []).join(", ") || "-"}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-body flex flex-col md:flex-row overflow-x-hidden selection:bg-amber-200">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/55 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 md:w-80 flex-shrink-0 bg-stone-900 text-stone-100 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shadow-xl overflow-y-auto md:overflow-visible`}
      >
        <div className="p-4 bg-stone-950 flex items-center justify-between border-b border-stone-800">
          <h1 className="text-xl font-display font-bold tracking-wide text-amber-400 uppercase flex items-center gap-2">
            <BookOpen size={20} /> {t.appTitle}
          </h1>
          <button
            className="md:hidden text-stone-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-2">
          {groupedPlaybooks.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="px-4 py-2 text-[11px] uppercase tracking-wider text-stone-400 border-y border-stone-800 bg-stone-950/40">
                {group.title}
              </p>
              {group.items.map(({ pb, idx }) => (
                <button
                  key={pb.name}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-5 py-2.5 font-medium transition-colors break-words ${
                    selectedIdx === idx
                      ? "bg-stone-800 text-amber-300 border-r-4 border-amber-500"
                      : "text-stone-200 hover:bg-stone-800 hover:text-white"
                  }`}
                >
                  {displayPlaybookName(pb.name)}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 bg-stone-950 text-[11px] text-stone-400 text-center border-t border-stone-800">
          {t.appFooter}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] min-w-0">
        <header className="bg-white/95 border-b border-stone-300 p-4 flex items-center sticky top-0 z-10 shadow-sm min-w-0 gap-3">
          <button
            className="md:hidden text-stone-700 hover:text-stone-900 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={28} />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-stone-950 truncate">
              {displayPlaybookName(playbook.name)}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:inline text-xs text-stone-600">{t.language}</span>
            <div className="flex rounded-lg border border-stone-300 overflow-hidden bg-white">
              <button
                onClick={() => setLanguage("ru")}
                className={`px-2.5 py-1.5 text-xs font-semibold ${
                  language === "ru" ? "bg-stone-900 text-white" : "bg-white text-stone-700"
                }`}
              >
                <Languages size={14} className="inline mr-1" /> {t.langRuShort}
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1.5 text-xs font-semibold ${
                  language === "en" ? "bg-stone-900 text-white" : "bg-white text-stone-700"
                }`}
              >
                {t.langEnShort}
              </button>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-8 pb-16">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="w-full max-w-[20rem] sm:max-w-xs mx-auto lg:w-1/3 lg:max-w-none flex-shrink-0">
                <div
                  className="relative aspect-[3/4] overflow-hidden"
                  style={{ background: "transparent" }}
                >
                  <div
                    className="absolute inset-0 overflow-hidden z-10 pointer-events-none transform-gpu scale-[1.16] sm:scale-[1.24] md:scale-[1.32]"
                    style={{
                      background: "transparent",
                      ...(frameMaskHasOpening ? frameInnerOpeningMaskStyle : frameInnerFallbackStyle)
                    }}
                  >
                    {activeBackground && (
                      <ProgressiveImage
                        src={activeBackground.url}
                        placeholderSrc={activeBackground.lowUrl}
                        alt={t.portraitBackgroundAlt}
                        className="w-full h-full"
                        imageClassName="object-cover"
                        loading="eager"
                        fetchPriority="high"
                      />
                    )}
                  </div>

                  <img
                    src={frameSvg}
                    alt={t.portraitFrameAlt}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-20 transform-gpu scale-[1.16] sm:scale-[1.24] md:scale-[1.32]"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />

                  {portraitToDisplay ? (
                    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
                      <div className="w-[86%] h-[90%] sm:w-[88%] sm:h-[93%] md:w-[90%] md:h-[96%]">
                        <img
                          src={portraitToDisplay}
                          alt={t.characterPortraitAlt}
                          className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-200 ease-out"
                          style={{
                            transform: `translate(${portraitMassOffset.x}%, ${portraitMassOffset.y}%)`
                          }}
                          loading="eager"
                          decoding="async"
                          fetchPriority="high"
                        />
                      </div>
                    </div>
                  ) : (
                    <label
                      className="absolute inset-0 z-30 cursor-pointer flex flex-col items-center justify-center text-stone-700 hover:text-amber-700 transition-colors bg-stone-100/65 hover:bg-amber-50/65 transform-gpu scale-[1.16] sm:scale-[1.24] md:scale-[1.32]"
                      style={frameMaskHasOpening ? frameInnerOpeningMaskStyle : frameInnerFallbackStyle}
                    >
                      <ImagePlus size={48} className="mb-4 opacity-80" />
                      <span className="text-[10px] font-bold text-center px-4 uppercase tracking-widest text-stone-700">
                        {t.uploadPortrait}
                      </span>
                      <span className="text-[10px] uppercase text-stone-600 mt-1 tracking-wider">
                        {t.portraitHint}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}

                  {hasCustomPortraitUpload && (
                    <button
                      onClick={canRestoreRemovedBackground ? handleRestoreBackgroundToImage : handleRemoveBackgroundFromImage}
                      disabled={isRemovingBg}
                      className={`absolute bottom-2 right-2 z-50 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-70 shadow-md ${
                        canRestoreRemovedBackground
                          ? "bg-stone-700 hover:bg-stone-800"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {canRestoreRemovedBackground ? (
                        <RotateCcw size={14} className="inline mr-1" />
                      ) : (
                        <Sparkles size={14} className="inline mr-1" />
                      )}
                      {canRestoreRemovedBackground ? t.restoreBg : isRemovingBg ? t.removeBgBusy : t.removeBg}
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={handleBackgroundPrev}
                    className="px-2 py-2 rounded-lg bg-stone-700 hover:bg-stone-800 text-white text-xs font-semibold"
                    title={t.bgPrev}
                  >
                    <ChevronLeft size={14} className="inline" />
                  </button>
                  <button
                    onClick={handleBackgroundNext}
                    className="px-2 py-2 rounded-lg bg-stone-700 hover:bg-stone-800 text-white text-xs font-semibold"
                    title={t.bgNext}
                  >
                    <ChevronRight size={14} className="inline" />
                  </button>
                  <button
                    onClick={clearBackground}
                    className="px-2 py-2 rounded-lg bg-stone-500 hover:bg-stone-600 text-white text-xs font-semibold"
                    title={t.bgClear}
                  >
                    <RotateCcw size={14} className="inline" />
                  </button>

                  {portraitToDisplay && (
                    <button
                      onClick={handleRemovePortrait}
                      className="col-span-3 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                    >
                      <Trash2 size={14} className="inline mr-1" />
                      {t.removePortrait}
                    </button>
                  )}

                  {!portraitToDisplay && defaultPortrait && (
                    <button
                      onClick={handleRestoreDefaultPortrait}
                      className="col-span-3 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
                    >
                      {t.restoreDefaultPortrait}
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-2/3 flex flex-col gap-6 min-w-0">
                <div className="bg-white/95 p-5 md:p-6 rounded-2xl shadow-sm border border-stone-300">
                  <p className="text-base md:text-lg text-stone-900 leading-7">{displayDescription(playbook)}</p>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide mb-4 border-b-2 border-amber-600 pb-2">
                    {t.chooseNature}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4 flex-1">
                    {playbook.natures.map((nature) => {
                      const isSelected = currentState.nature === nature.name;
                      return (
                        <button
                          key={nature.name}
                          className={`text-left rounded-xl shadow-sm border p-5 transition-all cursor-pointer group flex flex-col min-w-0 ${
                            isSelected
                              ? "bg-amber-100 border-amber-600 ring-2 ring-amber-300"
                              : "bg-white/95 border-stone-300 hover:border-amber-500"
                          }`}
                          onClick={() => updateState({ nature: nature.name })}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="text-amber-600 fill-current flex-shrink-0" size={18} />
                            <h4 className="font-display font-bold text-lg text-stone-950 truncate">
                              {displayNatureName(nature.name)}
                            </h4>
                            {isSelected && (
                              <span className="ml-auto text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-600 text-white">
                                {t.selectedNature}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-stone-800 leading-6">
                            {displayNatureDescription(playbook.name, nature.name, nature.desc)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 border-b-2 border-emerald-700 pb-2 gap-2">
                <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide">
                  {t.stats}
                </h3>
                <span className="text-sm font-semibold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-center md:text-left">
                  {t.statsHint}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-3 md:flex md:flex-wrap md:gap-4 md:justify-start">
                {statsOrder.map((stat, idx) => {
                  const baseVal = playbook.stats[stat];
                  const isBuffed = currentState.bonusStat === stat;
                  const currentVal = baseVal + (isBuffed ? 1 : 0);
                  const canBuff = !currentState.bonusStat && currentVal < 2;
                  const mobilePlacement = idx === 3 ? "col-start-2" : idx === 4 ? "col-start-4" : "";

                  return (
                    <div
                      key={stat}
                      data-stat-card={stat}
                      className={`col-span-2 ${mobilePlacement} md:col-auto w-full md:w-32 bg-white/95 rounded-xl border-2 flex flex-col items-center overflow-hidden transition-all shadow-sm ${
                        isBuffed ? "border-emerald-600 ring-2 ring-emerald-200" : "border-stone-300"
                      }`}
                    >
                      <div
                        data-stat-key={stat}
                        className={`w-full py-1.5 md:py-2 text-center font-bold text-[10px] md:text-[11px] uppercase tracking-wider truncate px-1 ${
                          isBuffed ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {i18n.statLabel(stat)}
                      </div>
                      <div className="py-3 md:py-4 text-2xl md:text-3xl font-black text-stone-900 flex items-center justify-center relative w-full">
                        <span className={isBuffed ? "text-emerald-700" : ""}>
                          {currentVal >= 0 ? `+${currentVal}` : currentVal}
                        </span>
                      </div>
                      <div className="flex w-full border-t border-stone-200 divide-x divide-stone-200 bg-stone-50">
                        <button
                          disabled={!isBuffed}
                          onClick={() => handleStatDecrease(stat)}
                          className="flex-1 py-1.5 md:py-2 flex justify-center text-stone-500 hover:text-red-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-500 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <button
                          disabled={!canBuff}
                          onClick={() => handleStatIncrease(stat)}
                          className="flex-1 py-1.5 md:py-2 flex justify-center text-stone-500 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-500 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              <div className="flex flex-col min-w-0">
                <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide mb-4 border-b-2 border-stone-400 pb-2 flex items-center gap-2">
                  <Shield className="text-stone-700 flex-shrink-0" size={20} /> {t.feats}
                </h3>
                <div className="bg-white/95 rounded-xl border border-stone-300 p-4 shadow-sm flex-1">
                  <p className="text-xs text-stone-700 mb-4 uppercase tracking-wider font-semibold break-words">
                    {getFeatHint()}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allFeats.map((feat) => {
                      const isFixed = fixedFeats.includes(feat);
                      const isChecked = currentState.feats.includes(feat);
                      let isDisabled = false;

                      if (featRule.mode === "fixed") {
                        isDisabled = true;
                      } else if (featRule.mode === "any") {
                        isDisabled = !isChecked && hasReachedFeatLimit;
                      } else {
                        isDisabled = (isFixed && isChecked) || (!isChecked && !isFixed && hasReachedFeatLimit);
                      }

                      return (
                        <label
                          key={feat}
                          data-feat-key={feat}
                          className={`flex items-center gap-2 w-full ${
                            isDisabled
                              ? isChecked
                                ? "cursor-not-allowed"
                                : "cursor-not-allowed opacity-60"
                              : "cursor-pointer group"
                          } ${isFixed ? "font-bold text-stone-900" : "text-stone-800"}`}
                        >
                          <button
                            className="focus:outline-none flex-shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              handleFeatToggle(feat);
                            }}
                            disabled={isDisabled}
                          >
                            {isChecked ? (
                              <CheckSquare className="text-amber-600" size={18} />
                            ) : (
                              <Square className="text-stone-400 group-hover:text-amber-500 transition-colors" size={18} />
                            )}
                          </button>
                          <span className="text-sm select-none break-words leading-tight">{displayFeatName(feat)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide mb-4 border-b-2 border-stone-400 pb-2 flex items-center gap-2">
                  <Sword className="text-stone-700 flex-shrink-0" size={20} /> {t.skills}
                </h3>
                <div className="bg-white/95 rounded-xl border border-stone-300 p-4 shadow-sm flex-1">
                  <p className="text-xs text-stone-700 mb-4 uppercase tracking-wider font-semibold break-words">
                    {t.skillsHint}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allSkills.map((skill) => {
                      const isStartingOption = playbook.startingSkills.includes(skill);
                      const isChecked = currentState.skills.includes(skill);

                      return (
                        <label
                          key={skill}
                          data-skill-key={skill}
                          className={`flex items-center gap-2 w-full ${
                            isStartingOption
                              ? "cursor-pointer group font-bold text-emerald-800"
                              : "cursor-not-allowed text-stone-400"
                          }`}
                        >
                          <button
                            className="focus:outline-none flex-shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSkillToggle(skill);
                            }}
                            disabled={!isStartingOption}
                          >
                            {isChecked ? (
                              <CheckSquare className="text-emerald-700" size={18} />
                            ) : (
                              <Square
                                className={`text-stone-400 transition-colors ${
                                  isStartingOption ? "group-hover:text-emerald-500" : ""
                                }`}
                                size={18}
                              />
                            )}
                          </button>
                          <span className="text-sm select-none break-words leading-tight">{displaySkillName(skill)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 border-b-2 border-blue-700 pb-2 gap-2">
                <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide">
                  {t.moves}
                </h3>
                <span className="text-[11px] md:text-sm font-bold bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-center md:text-left break-words max-w-full">
                  {getMovesHeaderText()}
                </span>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] gap-3 lg:gap-5 min-w-0">
                <div className="min-w-0">
                  <div className="rounded-xl border border-stone-300 bg-white/90 shadow-sm overflow-hidden">
                    <div className="divide-y divide-stone-200/80">
                    {playbook.moves.map((move) => {
                      const isChecked = currentState.moves.includes(move.name);
                      const isMandatory = playbook.startingMoves.includes(move.name);
                      const isDisabled = !isChecked && !isMandatory && hasReachedMoveLimit;
                      const isActive = activeMove?.name === move.name;

                      return (
                        <div
                          key={move.name}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition-colors min-w-0 ${
                            isActive
                              ? "bg-blue-100/90 ring-1 ring-inset ring-blue-400"
                              : "bg-white hover:bg-stone-50/80"
                          } ${isDisabled ? "opacity-70" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveMoveName(move.name)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <span
                              className={`font-display font-bold text-sm md:text-base break-words ${
                                isActive ? "text-blue-950" : "text-stone-900"
                              }`}
                            >
                              {displayMoveName(playbook.name, move.name)}
                            </span>
                            {isMandatory && (
                              <span className="inline-block ml-2 text-[10px] font-bold tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full align-middle">
                                {t.starting}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            aria-label={displayMoveName(playbook.name, move.name)}
                            disabled={isMandatory || isDisabled}
                            onClick={() => {
                              handleMoveToggle(move.name, isMandatory);
                              setActiveMoveName(move.name);
                            }}
                            className="flex-shrink-0 w-8 h-8 rounded-md border border-stone-300 bg-stone-50 flex items-center justify-center text-stone-500 hover:text-blue-700 hover:border-blue-400 disabled:opacity-45 disabled:hover:text-stone-500 disabled:hover:border-stone-300 transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare className={isMandatory ? "text-blue-500" : "text-blue-700"} size={18} />
                            ) : (
                              <Square className={isActive ? "text-blue-500" : "text-stone-400"} size={18} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>

                <div className="bg-white/95 rounded-xl border border-blue-200 p-4 md:p-6 shadow-sm min-w-0 min-h-[240px]">
                  {activeMove && (
                    <>
                      <div className="text-sm text-stone-800 whitespace-pre-wrap leading-7 break-words">
                        {displayMoveDescription(playbook.name, activeMove.name, activeMove.desc)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-1">
              {isBuilderReady ? (
                <button
                  type="button"
                  onClick={openBackgroundStep}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-base font-display font-bold tracking-wide shadow-sm transition-colors"
                >
                  {t.goToBackgroundPage}
                </button>
              ) : (
                <p className="text-sm text-stone-600">{t.builderIncompleteHint}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


