import moveDescEnByPlaybook from "../data/moveDescEnByPlaybook";
import localizationData from "../content/localizationData";

const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = new Set(["ru", "en"]);

export const normalizeLanguage = (language) =>
  SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;

export const getLocalizer = (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  const isEnglish = normalizedLanguage === "en";
  const t = localizationData.uiText[normalizedLanguage] || localizationData.uiText[DEFAULT_LANGUAGE];

  return {
    language: normalizedLanguage,
    t,
    statLabel: (stat) =>
      localizationData.statLabel[normalizedLanguage]?.[stat] || localizationData.statLabel.ru?.[stat] || stat,
    playbookName: (name) =>
      isEnglish ? localizationData.playbookNameEn[name] || name : name,
    playbookDescription: (playbook) =>
      isEnglish ? localizationData.playbookDescriptionEn[playbook.name] || playbook.description : playbook.description,
    natureName: (natureName) =>
      isEnglish ? localizationData.natureNameEn[natureName] || natureName : natureName,
    natureDescription: (playbookName, natureName, defaultDescription) => {
      if (!isEnglish) return defaultDescription;
      return localizationData.natureDescEnByKey[`${playbookName}::${natureName}`] || defaultDescription;
    },
    moveName: (playbookName, moveName) => {
      if (!isEnglish) return moveName;
      return localizationData.moveNameEnByPlaybook[playbookName]?.[moveName] || moveName;
    },
    moveDescription: (playbookName, moveName, defaultDescription) => {
      if (!isEnglish) return defaultDescription;
      return moveDescEnByPlaybook[playbookName]?.[moveName] || defaultDescription;
    },
    featName: (featName) =>
      isEnglish ? localizationData.featNameEn[featName] || featName : featName,
    skillName: (skillName) =>
      isEnglish ? localizationData.skillNameEn[skillName] || skillName : skillName,
    movesHeaderText: (playbook, displayMoveName) => {
      if (playbook.startingMoves.length > 0) {
        const startingStr = playbook.startingMoves
          .map((moveName) => displayMoveName(playbook.name, moveName))
          .join(", ");
        return t.movesHeaderWithStarting(startingStr, playbook.movesCheck);
      }
      return t.movesHeaderAny(playbook.movesCheck);
    },
  };
};
