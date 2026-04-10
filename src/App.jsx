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
  RotateCcw
} from "lucide-react";
import { allFeats, allSkills, playbooks } from "./data/playbooks";

const STORAGE_KEY = "root-playbook-state-v5";
const LANGUAGE_KEY = "root-playbook-lang-v1";
const BG_STORAGE_KEY = "root-bg-index-v1";
const statsOrder = ["Шарм", "Хитрость", "Сноровка", "Удача", "Мощь"];

const FEAT_RULES = {
  Вор: { mode: "any", count: 4 },
  Судья: { mode: "any", count: 1 },
  Принц: { mode: "fixed-plus-any", count: 2 }
};

const uiText = {
  ru: {
    appTitle: "Буклеты",
    appFooter: "Root RPG: Базовая книга и Странники и Изгои",
    editionOutcasts: "Root RPG: Странники и Изгои (дополнение)",
    editionCore: "Root RPG: Базовая книга",
    uploadPortrait: "Загрузить портрет",
    portraitHint: "(Рекомендуется без фона)",
    restoreDefaultPortrait: "Вставить дефолтный портрет",
    removePortrait: "Убрать портрет",
    removeBg: "Background Remover",
    removeBgBusy: "Убираю фон...",
    bgPrev: "Пред. фон",
    bgNext: "След. фон",
    bgClear: "Убрать фон",
    bgNoSelection: "Фон: выключен",
    bgSelected: (idx, total) => `Фон: ${idx + 1}/${total}`,
    chooseNature: "Выберите свою натуру",
    selectedNature: "Выбрано",
    stats: "Характеристики",
    statsHint: "Добавьте +1 к характеристике на выбор (макс. +2)",
    feats: "Плутовские приёмы",
    featsHintFixed: "Только отмеченные в бланке (без доп. выбора)",
    featsHintAny: (count) => `Свободный выбор любых ${count}`,
    featsHintFixedPlusAny: (count) => `Отмеченные + выберите ещё ${count}`,
    skills: "Оружейные навыки",
    skillsHint: "Выберите 1 навык из выделенных",
    moves: "Ваши ходы",
    starting: "СТАРТОВЫЙ",
    language: "Язык"
  },
  en: {
    appTitle: "Playbooks",
    appFooter: "Root RPG: Core Book and Travelers & Outsiders",
    editionOutcasts: "Root RPG: Travelers & Outsiders Expansion",
    editionCore: "Root RPG: Core Book",
    uploadPortrait: "Upload portrait",
    portraitHint: "(Transparent background is recommended)",
    restoreDefaultPortrait: "Insert default portrait",
    removePortrait: "Remove portrait",
    removeBg: "Background Remover",
    removeBgBusy: "Removing background...",
    bgPrev: "Prev bg",
    bgNext: "Next bg",
    bgClear: "Clear bg",
    bgNoSelection: "Background: off",
    bgSelected: (idx, total) => `Background: ${idx + 1}/${total}`,
    chooseNature: "Choose your nature",
    selectedNature: "Selected",
    stats: "Stats",
    statsHint: "Add +1 to one stat (max +2)",
    feats: "Roguish feats",
    featsHintFixed: "Fixed by the playbook (no extra picks)",
    featsHintAny: (count) => `Free pick: any ${count}`,
    featsHintFixedPlusAny: (count) => `Fixed feats + pick ${count} more`,
    skills: "Weapon skills",
    skillsHint: "Choose 1 highlighted skill",
    moves: "Your moves",
    starting: "STARTING",
    language: "Language"
  }
};

const statLabel = {
  ru: {
    Шарм: "Шарм",
    Хитрость: "Хитрость",
    Сноровка: "Сноровка",
    Удача: "Удача",
    Мощь: "Мощь"
  },
  en: {
    Шарм: "Charm",
    Хитрость: "Cunning",
    Сноровка: "Finesse",
    Удача: "Luck",
    Мощь: "Might"
  }
};

const playbookNameEn = {
  Поборник: "Champion",
  Летописец: "Chronicler",
  Изгнанник: "Exile",
  Посланник: "Envoy",
  Еретик: "Heretic",
  Пират: "Pirate",
  Принц: "Prince",
  Рассказчик: "Raconteur",
  Разбойник: "Raider",
  Искатель: "Seeker",
  Авантюрист: "Adventurer",
  Судья: "Arbiter",
  Налётчик: "Harrier",
  Следопыт: "Ranger",
  Ронин: "Ronin",
  Поджигатель: "Scoundrel",
  Вор: "Thief",
  Ремесленник: "Tinker",
  Скиталец: "Vagrant"
};

const playbookDescriptionEn = {
  Поборник: "You are a rising hero and standard-bearer of lost causes, sworn to protect the weak.",
  Летописец: "You preserve forbidden knowledge and hidden truths others would rather erase.",
  Изгнанник: "Once a respected insider, you now define yourself by what you do after exile.",
  Посланник: "You are a professional envoy, negotiating conflicts while staying plausibly deniable.",
  Еретик: "You fight for beliefs most factions reject, convinced your cause serves a greater good.",
  Пират: "A free river captain, you live by mobility, trade, and daring choices on open waters.",
  Принц: "Born into vagabond legacy, you carry family expectation and inherited reputation.",
  Рассказчик: "You shape public truth through stories, performances, and influence across clearings.",
  Разбойник: "A dangerous bruiser-for-hire, you solve problems with force and battlefield pressure.",
  Искатель: "You chase ruins, secrets, and wonders hidden in the oldest places of the Woodland.",
  Авантюрист: "A diplomatic wanderer who builds alliances and changes power through trust.",
  Судья: "A stubborn enforcer-protector who steps into conflict and decides where justice falls.",
  Налётчик: "A fast operator and courier, always first through risk and hard routes.",
  Следопыт: "A wilderness specialist who prefers the wild edge over crowded settlements.",
  Ронин: "A masterless veteran seeking freedom, discipline, and purpose in a new land.",
  Поджигатель: "A chaotic risk-taker who turns danger into leverage, mayhem, and opportunity.",
  Вор: "A precise infiltrator who steals what others hide and disappears before the alarm.",
  Ремесленник: "An inventive engineer whose tools, plans, and prototypes change what is possible.",
  Скиталец: "A silver-tongued survivor who talks through danger and manipulates tension between enemies."
};

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

const corePortraitModules = import.meta.glob("../Core Book/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default"
});
const outcastPortraitModules = import.meta.glob("../Travelers & Outsiders/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default"
});
const backgroundModules = import.meta.glob("../Root BG/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default"
});

const unique = (arr) => Array.from(new Set(arr));

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

const buildSortedBackgrounds = () =>
  Object.entries(backgroundModules)
    .map(([path, url]) => {
      const baseName = getBaseFileName(path).replace(/\.[^/.]+$/, "");
      const numeric = Number(baseName);
      return {
        key: path,
        url,
        sortA: Number.isFinite(numeric) ? 0 : 1,
        sortB: Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER,
        sortC: baseName
      };
    })
    .sort((a, b) => a.sortA - b.sortA || a.sortB - b.sortB || a.sortC.localeCompare(b.sortC));

const portraitAssetList = [...Object.entries(corePortraitModules), ...Object.entries(outcastPortraitModules)].map(
  ([path, url]) => {
    const baseName = getBaseFileName(path).replace(/\.[^/.]+$/, "");
    return {
      path,
      url,
      normalizedName: normalizeToken(baseName)
    };
  }
);

const findPortraitForPlaybook = (playbookName) => {
  const aliases = unique([
    playbookName,
    playbookNameEn[playbookName],
    ...(playbookPortraitAliases[playbookName] || [])
  ]).map(normalizeToken);

  for (const alias of aliases) {
    if (!alias) continue;
    const exact = portraitAssetList.find((asset) => asset.normalizedName === alias);
    if (exact) return exact.url;

    const partial = portraitAssetList.find((asset) => asset.normalizedName.includes(alias));
    if (partial) return partial.url;
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

  return { bonusStat, nature, feats, skills, moves, image, useDefaultPortrait };
};

const sanitizePersistedState = (rawState) => {
  const source = rawState && typeof rawState === "object" ? rawState : {};
  const output = {};

  for (const playbook of playbooks) {
    const sanitized = sanitizeCharacter(playbook, source[playbook.name]);
    output[playbook.name] = {
      ...sanitized,
      image: null
    };
  }

  return output;
};

const getDefaultState = (playbook) => sanitizeCharacter(playbook, {});

const parseBgIndex = (value) => {
  const index = Number(value);
  return Number.isInteger(index) ? index : -1;
};

export default function App() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "ru");
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [selectedBgIndex, setSelectedBgIndex] = useState(() =>
    parseBgIndex(localStorage.getItem(BG_STORAGE_KEY))
  );

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
  }, [language]);

  useEffect(() => {
    localStorage.setItem(BG_STORAGE_KEY, String(selectedBgIndex));
  }, [selectedBgIndex]);

  const t = uiText[language];
  const coreStartIndex = playbooks.findIndex((pb) => pb.name === "Авантюрист");
  const totalBackgrounds = ROOT_BACKGROUNDS.length;

  const groupedPlaybooks = useMemo(() => {
    if (coreStartIndex <= 0) {
      return [
        {
          title: t.editionOutcasts,
          items: playbooks.map((pb, idx) => ({ pb, idx }))
        }
      ];
    }

    return [
      {
        title: t.editionOutcasts,
        items: playbooks.slice(0, coreStartIndex).map((pb, idx) => ({ pb, idx }))
      },
      {
        title: t.editionCore,
        items: playbooks.slice(coreStartIndex).map((pb, offset) => ({ pb, idx: coreStartIndex + offset }))
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

  const defaultPortrait = DEFAULT_PORTRAITS[playbook.name] || null;
  const portraitToDisplay =
    currentState.image || (currentState.useDefaultPortrait ? defaultPortrait : null);

  const activeBackground =
    selectedBgIndex >= 0 && selectedBgIndex < totalBackgrounds
      ? ROOT_BACKGROUNDS[selectedBgIndex]
      : null;

  const mainBackgroundStyle = useMemo(() => {
    if (activeBackground) {
      return {
        backgroundImage: `url(${activeBackground.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      };
    }

    return {
      backgroundImage: "url('https://www.transparenttextures.com/patterns/aged-paper.png')"
    };
  }, [activeBackground]);

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

  const displayPlaybookName = (name) => {
    if (language === "en") return playbookNameEn[name] || name;
    return name;
  };

  const displayDescription = (pb) => {
    if (language === "en") return playbookDescriptionEn[pb.name] || pb.description;
    return pb.description;
  };

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
      updateState({ image: event.target?.result || null, useDefaultPortrait: false });
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreDefaultPortrait = () => {
    if (!defaultPortrait) return;
    updateState({ image: null, useDefaultPortrait: true });
  };

  const handleRemovePortrait = () => {
    updateState({ image: null, useDefaultPortrait: false });
  };

  const handleRemoveBackgroundFromImage = async () => {
    if (!currentState.image || isRemovingBg) return;

    setIsRemovingBg(true);

    try {
      const img = new Image();
      img.src = currentState.image;
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

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 8) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const lightness = (r + g + b) / 3;

        if ((lightness > 240 && saturation < 0.24) || (lightness > 228 && saturation < 0.14)) {
          data[i + 3] = 0;
        } else if ((lightness > 215 && saturation < 0.1) || (lightness > 200 && saturation < 0.07)) {
          data[i + 3] = Math.floor(a * 0.45);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      updateState({ image: canvas.toDataURL("image/png"), useDefaultPortrait: false });
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
    if (playbook.startingMoves.length > 0) {
      const startingStr = playbook.startingMoves.join(" + ");
      return `${startingStr} + ${playbook.movesCheck}`;
    }
    return language === "en"
      ? `Choose any ${playbook.movesCheck}`
      : `Свободный выбор: ${playbook.movesCheck}`;
  };

  const selectedOptionalMovesCount = currentState.moves.filter(
    (m) => !playbook.startingMoves.includes(m)
  ).length;
  const hasReachedMoveLimit = selectedOptionalMovesCount >= playbook.movesCheck;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-body flex overflow-hidden selection:bg-amber-200">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/55 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 flex-shrink-0 bg-stone-900 text-stone-100 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shadow-xl`}
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

        <nav className="flex-1 overflow-y-auto py-2">
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

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0" style={mainBackgroundStyle}>
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

          <div className="hidden lg:flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1">
            <button
              onClick={handleBackgroundPrev}
              className="px-2 py-1 rounded hover:bg-stone-100 text-stone-700"
              title={t.bgPrev}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleBackgroundNext}
              className="px-2 py-1 rounded hover:bg-stone-100 text-stone-700"
              title={t.bgNext}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={clearBackground}
              className="px-2 py-1 rounded hover:bg-stone-100 text-stone-700"
              title={t.bgClear}
            >
              <RotateCcw size={16} />
            </button>
            <span className="text-xs text-stone-600 ml-1">
              {activeBackground ? t.bgSelected(selectedBgIndex, totalBackgrounds) : t.bgNoSelection}
            </span>
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
                <Languages size={14} className="inline mr-1" /> RU
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1.5 text-xs font-semibold ${
                  language === "en" ? "bg-stone-900 text-white" : "bg-white text-stone-700"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        <div className="lg:hidden px-4 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-2 py-2">
            <button
              onClick={handleBackgroundPrev}
              className="px-2 py-1 rounded hover:bg-stone-100 text-stone-700"
              title={t.bgPrev}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleBackgroundNext}
              className="px-2 py-1 rounded hover:bg-stone-100 text-stone-700"
              title={t.bgNext}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={clearBackground}
              className="px-2 py-1 rounded hover:bg-stone-100 text-stone-700"
              title={t.bgClear}
            >
              <RotateCcw size={16} />
            </button>
            <span className="text-xs text-stone-600 ml-1">
              {activeBackground ? t.bgSelected(selectedBgIndex, totalBackgrounds) : t.bgNoSelection}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-8 pb-16">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="w-full sm:max-w-xs mx-auto lg:w-1/3 lg:max-w-none flex-shrink-0">
                <div className="aspect-[3/4] rounded-2xl border-[6px] border-stone-800 bg-stone-200 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
                  {portraitToDisplay ? (
                    <img
                      src={portraitToDisplay}
                      alt="Портрет персонажа"
                      className="w-full h-full object-contain object-bottom drop-shadow-2xl"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center text-stone-700 hover:text-amber-700 transition-colors h-full w-full bg-stone-100 hover:bg-amber-50">
                      <ImagePlus size={48} className="mb-4 opacity-80" />
                      <span className="text-sm font-bold text-center px-4 uppercase tracking-widest text-stone-700">
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {currentState.image && (
                    <button
                      onClick={handleRemoveBackgroundFromImage}
                      disabled={isRemovingBg}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-70"
                    >
                      <Sparkles size={14} className="inline mr-1" />
                      {isRemovingBg ? t.removeBgBusy : t.removeBg}
                    </button>
                  )}

                  {portraitToDisplay && (
                    <button
                      onClick={handleRemovePortrait}
                      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                    >
                      <Trash2 size={14} className="inline mr-1" />
                      {t.removePortrait}
                    </button>
                  )}

                  {!portraitToDisplay && defaultPortrait && (
                    <button
                      onClick={handleRestoreDefaultPortrait}
                      className="col-span-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
                    >
                      {t.restoreDefaultPortrait}
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-2/3 flex flex-col gap-6 min-w-0">
                <div className="bg-white/95 p-5 md:p-6 rounded-2xl shadow-sm border border-stone-300">
                  <p className="text-lg md:text-xl text-stone-900 leading-8">{displayDescription(playbook)}</p>
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
                              {nature.name}
                            </h4>
                            {isSelected && (
                              <span className="ml-auto text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-600 text-white">
                                {t.selectedNature}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-stone-800 leading-6">{nature.desc}</p>
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
                      className={`col-span-2 ${mobilePlacement} md:col-auto w-full md:w-32 bg-white/95 rounded-xl border-2 flex flex-col items-center overflow-hidden transition-all shadow-sm ${
                        isBuffed ? "border-emerald-600 ring-2 ring-emerald-200" : "border-stone-300"
                      }`}
                    >
                      <div
                        className={`w-full py-1.5 md:py-2 text-center font-bold text-[10px] md:text-[11px] uppercase tracking-wider truncate px-1 ${
                          isBuffed ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {statLabel[language][stat]}
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
                          className={`flex items-center gap-2 w-full ${
                            isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer group"
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
                          <span className="text-sm select-none break-words leading-tight">{feat}</span>
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
                          <span className="text-sm select-none break-words leading-tight">{skill}</span>
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

              <div className="grid md:grid-cols-2 gap-4 lg:gap-6 min-w-0">
                {playbook.moves.map((move) => {
                  const isChecked = currentState.moves.includes(move.name);
                  const isMandatory = playbook.startingMoves.includes(move.name);
                  const isDisabled = !isChecked && !isMandatory && hasReachedMoveLimit;

                  return (
                    <div
                      key={move.name}
                      className={`rounded-xl shadow-sm border p-4 md:p-5 transition-all flex flex-col min-w-0 group ${
                        isChecked ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/40" : "border-stone-300"
                      } ${
                        isDisabled
                          ? "opacity-60 bg-stone-100 cursor-not-allowed"
                          : "bg-white/95 cursor-pointer hover:border-blue-400"
                      }`}
                      onClick={() => {
                        if (!isDisabled) handleMoveToggle(move.name, isMandatory);
                      }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-1 flex-shrink-0">
                          {isChecked ? (
                            <CheckSquare className={isMandatory ? "text-blue-500" : "text-blue-700"} size={20} />
                          ) : (
                            <Square
                              className={`text-stone-400 transition-colors ${
                                isDisabled ? "" : "group-hover:text-blue-400"
                              }`}
                              size={20}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`font-display font-bold text-base md:text-lg mb-2 break-words ${
                              isChecked ? "text-blue-950" : "text-stone-950"
                            }`}
                          >
                            {move.name}
                            {isMandatory && (
                              <span className="inline-block ml-2 mb-1 text-[10px] font-bold tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full align-middle">
                                {t.starting}
                              </span>
                            )}
                          </h4>
                          <div className="text-sm text-stone-800 whitespace-pre-wrap leading-7 break-words">
                            {move.desc}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
