import React, { useEffect, useState } from "react";
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
  Trash2
} from "lucide-react";
import { allFeats, allSkills, playbooks } from "./data/playbooks";

const STORAGE_KEY = "root-playbook-state-v2";
const statsOrder = ["Шарм", "Хитрость", "Сноровка", "Удача", "Мощь"];

const getDefaultState = (playbook) => ({
  bonusStat: null,
  feats: [...playbook.startingFeats],
  skills: [],
  moves: [...playbook.startingMoves],
  image: null
});

export default function App() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [characterState, setCharacterState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characterState));
  }, [characterState]);

  const playbook = playbooks[selectedIdx];
  const currentState = characterState[playbook.name] || getDefaultState(playbook);

  const updateState = (updates) => {
    setCharacterState((prev) => {
      const base = prev[playbook.name] || getDefaultState(playbook);
      return {
        ...prev,
        [playbook.name]: { ...base, ...updates }
      };
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      updateState({ image: event.target?.result || null });
    };
    reader.readAsDataURL(file);
  };

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
    const isStarting = playbook.startingFeats.includes(feat);
    const isChecked = currentState.feats.includes(feat);

    if (isStarting && isChecked) return;

    if (isChecked) {
      updateState({ feats: currentState.feats.filter((item) => item !== feat) });
    } else {
      updateState({ feats: [...currentState.feats, feat] });
    }
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
      const startingStr = playbook.startingMoves.join(" И ").toUpperCase();
      return `ВЫ ПОЛУЧАЕТЕ ${startingStr}, ЗАТЕМ ВЫБЕРИТЕ ЕЩЕ ${playbook.movesCheck}`;
    }
    return `ВЫБЕРИТЕ ${playbook.movesCheck} ДЛЯ СТАРТА`;
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
        className={`fixed md:static inset-y-0 left-0 w-64 flex-shrink-0 bg-stone-900 text-stone-100 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shadow-xl`}
      >
        <div className="p-4 bg-stone-950 flex items-center justify-between border-b border-stone-800">
          <h1 className="text-xl font-display font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2">
            <BookOpen size={20} /> Буклеты
          </h1>
          <button
            className="md:hidden text-stone-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {playbooks.map((pb, idx) => (
            <button
              key={pb.name}
              onClick={() => {
                setSelectedIdx(idx);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-6 py-3 font-medium transition-colors break-words ${
                selectedIdx === idx
                  ? "bg-stone-800 text-amber-300 border-r-4 border-amber-500"
                  : "text-stone-200 hover:bg-stone-800 hover:text-white"
              }`}
            >
              {pb.name}
            </button>
          ))}
        </nav>

        <div className="p-4 bg-stone-950 text-xs text-stone-400 text-center border-t border-stone-800">
          Root: База и Изгои
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] min-w-0">
        <header className="bg-white border-b border-stone-300 p-4 flex items-center sticky top-0 z-10 shadow-sm min-w-0">
          <button
            className="mr-4 md:hidden text-stone-700 hover:text-stone-900 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={28} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-display font-bold text-stone-950 truncate">{playbook.name}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-8 pb-16">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="w-full sm:max-w-xs mx-auto lg:w-1/3 lg:max-w-none flex-shrink-0">
                <div className="aspect-[3/4] rounded-2xl border-[6px] border-stone-800 bg-stone-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg">
                  {currentState.image ? (
                    <>
                      <img
                        src={currentState.image}
                        alt="Портрет персонажа"
                        className="w-full h-full object-contain object-bottom drop-shadow-2xl"
                      />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => updateState({ image: null })}
                          className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transform hover:scale-110 transition-all"
                          title="Удалить портрет"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center text-stone-700 hover:text-amber-700 transition-colors h-full w-full bg-stone-100 hover:bg-amber-50">
                      <ImagePlus size={48} className="mb-4 opacity-80" />
                      <span className="text-sm font-bold text-center px-4 uppercase tracking-widest text-stone-700">
                        Загрузить портрет
                      </span>
                      <span className="text-[10px] uppercase text-stone-600 mt-1 tracking-wider">
                        (Рекомендуется без фона)
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
              </div>

              <div className="w-full lg:w-2/3 flex flex-col gap-6 min-w-0">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-300">
                  <p className="text-lg md:text-xl text-stone-900 leading-8">{playbook.description}</p>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide mb-4 border-b-2 border-amber-600 pb-2">
                    Выберите свою натуру
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4 flex-1">
                    {playbook.natures.map((nature) => (
                      <div
                        key={nature.name}
                        className="bg-white rounded-xl shadow-sm border border-stone-300 p-5 hover:border-amber-500 transition-colors cursor-pointer group flex flex-col min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="text-amber-600 fill-current flex-shrink-0" size={18} />
                          <h4 className="font-display font-bold text-lg text-stone-950 truncate">
                            {nature.name}
                          </h4>
                        </div>
                        <p className="text-sm text-stone-800 leading-6">{nature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 border-b-2 border-emerald-700 pb-2 gap-2">
                <h3 className="text-xl font-display font-bold text-stone-900 uppercase tracking-wide">
                  Характеристики
                </h3>
                <span className="text-sm font-semibold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-center md:text-left">
                  Добавьте +1 к характеристике на выбор (макс. +2)
                </span>
              </div>

              <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                {statsOrder.map((stat) => {
                  const baseVal = playbook.stats[stat];
                  const isBuffed = currentState.bonusStat === stat;
                  const currentVal = baseVal + (isBuffed ? 1 : 0);
                  const canBuff = !currentState.bonusStat && currentVal < 2;

                  return (
                    <div
                      key={stat}
                      className={`w-[100px] md:w-32 bg-white rounded-xl border-2 flex flex-col items-center overflow-hidden transition-all shadow-sm ${
                        isBuffed ? "border-emerald-600 ring-2 ring-emerald-200" : "border-stone-300"
                      }`}
                    >
                      <div
                        className={`w-full py-1.5 md:py-2 text-center font-bold text-[10px] md:text-[11px] uppercase tracking-wider truncate px-1 ${
                          isBuffed ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {stat}
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
                  <Shield className="text-stone-700 flex-shrink-0" size={20} /> Плутовские трюки
                </h3>
                <div className="bg-white rounded-xl border border-stone-300 p-4 shadow-sm flex-1">
                  <p className="text-xs text-stone-700 mb-4 uppercase tracking-wider font-semibold break-words">
                    Начинает с отмеченными трюками
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allFeats.map((feat) => {
                      const isStarting = playbook.startingFeats.includes(feat);
                      const isChecked = currentState.feats.includes(feat);

                      return (
                        <label
                          key={feat}
                          className={`flex items-center gap-2 ${
                            isStarting && isChecked ? "cursor-default" : "cursor-pointer group"
                          } w-full ${isStarting ? "font-bold text-stone-900" : "text-stone-800"}`}
                        >
                          <button
                            className="focus:outline-none flex-shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              handleFeatToggle(feat);
                            }}
                            disabled={isStarting && isChecked}
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
                  <Sword className="text-stone-700 flex-shrink-0" size={20} /> Оружейные навыки
                </h3>
                <div className="bg-white rounded-xl border border-stone-300 p-4 shadow-sm flex-1">
                  <p className="text-xs text-stone-700 mb-4 uppercase tracking-wider font-semibold break-words">
                    Выберите один <span className="text-emerald-700 font-bold">выделенный</span> навык для старта
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
                  Ваши ходы
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
                          : "bg-white cursor-pointer hover:border-blue-400"
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
                                СТАРТОВЫЙ
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
