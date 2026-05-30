(function () {
  "use strict";

  const STORE_KEY = "maturalab-state-v1";
  const SESSION_KEY = "maturalab-session-v1";
  const THEME_KEY = "maturalab-theme-v1";
  const EXAM_SESSION_KEY = "maturalab-exam-session-v1";
  const GUEST_SUBJECT_INTERESTS_KEY = "maturalab-subject-interests-guest-v1";

  const taskTypes = [
    ["ai_open", "Zadanie otwarte oceniane przez AI"],
    ["short_answer", "Zadanie z krótką odpowiedzią"],
    ["closed", "Zadanie zamknięte"],
    ["file", "Zadanie z plikiem"],
    ["info_algorithm", "Zadanie informatyczne - algorytmika"],
    ["info_excel", "Zadanie informatyczne - Excel"],
    ["info_access", "Zadanie informatyczne - Access"],
  ];

  const defaultTags = [
    ["łatwe obliczenia", "latwe-obliczenia", "Krótkie rachunki bez złożonych przekształceń."],
    ["zadanie dowodowe", "zadanie-dowodowe", "Wymaga uzasadnienia lub dowodu."],
    ["wymaga rysunku", "wymaga-rysunku", "Pomaga lub wymaga diagramu."],
    ["często na maturze", "czesto-na-maturze", "Typowy schemat CKE."],
    ["arkusz CKE", "arkusz-cke", "Zadanie w stylu arkuszy CKE."],
    ["teoria", "teoria", "Sprawdza definicje i własności."],
    ["długa odpowiedź", "dluga-odpowiedz", "Wymaga pełnego toku rozumowania."],
    ["krótkie zadanie", "krotkie-zadanie", "Nadaje się na szybką powtórkę."],
    ["podchwytliwe", "podchwytliwe", "Łatwo zgubić warunek lub szczegół."],
    ["do powtórki", "do-powtorki", "Warto wrócić przed egzaminem."],
  ];

  const categorySeed = {
    matematyka: [
      "liczby rzeczywiste",
      "wyrażenia algebraiczne",
      "równania i nierówności",
      "funkcje",
      "ciągi",
      "trygonometria",
      "planimetria",
      "stereometria",
      "geometria analityczna",
      "kombinatoryka",
      "rachunek prawdopodobieństwa",
      "statystyka",
      "optymalizacja",
      "zadania dowodowe",
    ],
    fizyka: [
      "kinematyka",
      "dynamika",
      "praca, moc, energia",
      "grawitacja",
      "ruch harmoniczny",
      "termodynamika",
      "elektrostatyka",
      "prąd elektryczny",
      "magnetyzm",
      "indukcja elektromagnetyczna",
      "fale",
      "optyka",
      "fizyka jądrowa",
      "astronomia",
    ],
    angielski: [
      "czytanie ze zrozumieniem",
      "słuchanie",
      "gramatyka",
      "słownictwo",
      "transformacje zdań",
      "uzupełnianie luk",
      "wypowiedź pisemna",
      "środki językowe",
      "parafrazy",
    ],
    informatyka: [
      "algorytmika",
      "programowanie C++",
      "programowanie Python",
      "arkusz kalkulacyjny Excel",
      "bazy danych Access",
      "analiza danych",
      "symulacje",
      "kryptografia",
      "grafy",
      "dynamiczne programowanie",
      "sortowanie i wyszukiwanie",
      "zadania tekstowe z odpowiedzią",
    ],
  };

  const defaultNavVisibility = {
    start: true,
    subjects: true,
    ranking: true,
    contact: true,
  };

  const colorPalette = [
    { label: "Zielony", accentColor: "#22d3b6" },
    { label: "Fioletowy", accentColor: "#8b7cf6" },
    { label: "Żółty", accentColor: "#e6bc57" },
    { label: "Niebieski", accentColor: "#4ea7ff" },
    { label: "Różowy", accentColor: "#ec4899" },
    { label: "Pomarańczowy", accentColor: "#f97316" },
    { label: "Cyjan", accentColor: "#06b6d4" },
    { label: "Limonka", accentColor: "#84cc16" },
  ];

  const subjectThemePresets = [
    { slug: "matematyka", label: "Matematyka", accentColor: "#22d3b6" },
    { slug: "fizyka", label: "Fizyka", accentColor: "#8b7cf6" },
    { slug: "angielski", label: "Angielski", accentColor: "#e6bc57" },
    { slug: "informatyka", label: "Informatyka", accentColor: "#4ea7ff" },
  ];
  const defaultSubjectThemes = Object.fromEntries(subjectThemePresets.map((preset) => [preset.slug, preset]));
  const defaultSubjectSlugs = new Set(subjectThemePresets.map((preset) => preset.slug));

  const mathDelimiters = [
    { left: "$$", right: "$$", display: true },
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false },
    { left: "$", right: "$", display: false },
  ];

  let state = loadState();
  let filterState = {};
  let openFilterKey = "";
  let examTimer = null;
  let mathRenderRetry = null;
  let mathRenderRetries = 0;
  let subjectListState = {
    query: "",
    sort: "popular",
    interestsOpen: false,
  };
  let examSearchState = {};
  let examAttemptSearchState = {};
  let examAttemptStatusState = {};
  let profileExamSubjectState = "all";
  let profileSubjectTaskFilterState = {};
  let profileSubjectTaskSearchState = {};
  let profileSubjectCategoryState = {};

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    syncFavicon(theme);
  }

  function applyTheme() {
    const theme = getTheme();
    document.documentElement.dataset.theme = theme;
    syncFavicon(theme);
  }

  function brandLogoSvg() {
    return `
      <svg class="brand-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="92 68 330 382" aria-hidden="true" focusable="false">
        <g class="logo-sheet" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
          <path d="M146 172H168"/>
          <path d="M146 172C132.745 172 122 182.745 122 196V392C122 414.091 139.909 432 162 432H300"/>
          <path d="M360 246V368"/>
          <path d="M300 432V388C300 376.954 308.954 368 320 368H360"/>
          <path d="M300 432L360 368"/>
          <path d="M178 260H302"/>
          <path d="M178 302H302"/>
          <path d="M178 344H246"/>
        </g>
        <g class="logo-cap" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
          <path d="M130 126L256 82L382 126L256 170L130 126Z"/>
          <path d="M188 148V190C188 207 218 220 256 220C294 220 324 207 324 190V148"/>
          <path d="M256 126H370"/>
          <circle cx="256" cy="126" r="9"/>
          <path d="M370 126V178"/>
          <circle cx="370" cy="178" r="10"/>
          <path d="M358 222L370 178L382 222C374 228 366 228 358 222Z"/>
        </g>
      </svg>
    `;
  }

  function faviconSvg(theme) {
    const darkTheme = theme === "dark";
    const badge = darkTheme ? "#f4f7fb" : "#111827";
    const sheet = darkTheme ? "#0b0f14" : "#f4f7fb";
    const cap = "#22d3b6";
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
        <rect width="512" height="512" rx="96" fill="${badge}"/>
        <g stroke="${sheet}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
          <path d="M146 172H168"/>
          <path d="M146 172C132.745 172 122 182.745 122 196V392C122 414.091 139.909 432 162 432H300"/>
          <path d="M360 246V368"/>
          <path d="M300 432V388C300 376.954 308.954 368 320 368H360"/>
          <path d="M300 432L360 368"/>
          <path d="M178 260H302"/>
          <path d="M178 302H302"/>
          <path d="M178 344H246"/>
        </g>
        <g stroke="${cap}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
          <path d="M130 126L256 82L382 126L256 170L130 126Z"/>
          <path d="M188 148V190C188 207 218 220 256 220C294 220 324 207 324 190V148"/>
          <path d="M256 126H370"/>
          <circle cx="256" cy="126" r="9" fill="${cap}"/>
          <path d="M370 126V178"/>
          <circle cx="370" cy="178" r="10" fill="${cap}"/>
          <path d="M358 222L370 178L382 222C374 228 366 228 358 222Z" fill="${cap}"/>
        </g>
      </svg>
    `;
  }

  function syncFavicon(theme = getTheme()) {
    const icon = document.getElementById("app-favicon");
    if (!icon) return;
    icon.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(theme))}`;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function slugify(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const mojibakeMap = [
    ["Ä…", "ą"], ["Ä„", "Ą"], ["Ä‡", "ć"], ["Ä†", "Ć"], ["Ä™", "ę"], ["Ä", "Ę"],
    ["Ĺ‚", "ł"], ["Ĺ", "Ł"], ["Ĺ„", "ń"], ["Ĺ", "Ń"], ["Ăł", "ó"], ["Ă“", "Ó"],
    ["Ĺ›", "ś"], ["Ĺš", "Ś"], ["Ĺş", "ź"], ["Ĺą", "Ź"], ["ĹĽ", "ż"], ["Ĺ»", "Ż"],
    ["Â·", "·"], ["Â§", "§"], ["â€“", "-"], ["â€”", "-"], ["â€ž", "„"], ["â€ť", "”"],
    ["â€™", "’"], ["â€ś", "“"], ["â€¦", "..."], ["âš", "√"], ["â‰¤", "≤"], ["â‰Ą", "≥"],
    ["â‰ ", "≠"], ["âž", "∞"], ["â", "∈"], ["â‰", "∉"], ["Ă—", "×"]
  ];

  function repairMojibake(value) {
    let text = String(value == null ? "" : value);
    mojibakeMap.forEach(([broken, fixed]) => {
      text = text.split(broken).join(fixed);
    });
    return text;
  }

  function repairRenderedText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fixed = repairMojibake(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    });
    root.querySelectorAll("[placeholder], [title], [aria-label], [alt], input[value], textarea").forEach((element) => {
      ["placeholder", "title", "aria-label", "alt"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const fixed = repairMojibake(element.getAttribute(attribute));
        if (fixed !== element.getAttribute(attribute)) element.setAttribute(attribute, fixed);
      });
      if ((element.matches("input[value]") || element.matches("textarea")) && element.value) {
        const fixed = repairMojibake(element.value);
        if (fixed !== element.value) element.value = fixed;
      }
    });
  }

  function normalizeSubjectColor(value) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : "";
  }

  function subjectAccentColor(subject) {
    const fallback = defaultSubjectThemes[subject && subject.slug] || subjectThemePresets[0];
    return normalizeSubjectColor(subject && subject.accentColor) || fallback.accentColor;
  }

  function subjectStyle(subject) {
    return `--subject-accent: ${subjectAccentColor(subject)};`;
  }

  function subjectStyleAttr(subject) {
    return ` style="${escapeHtml(subjectStyle(subject))}"`;
  }

  function isCustomSubject(subject) {
    return Boolean(subject && (subject.isCustom === true || !defaultSubjectSlugs.has(subject.slug)));
  }

  function renderColorPicker(selectedColor = colorPalette[0].accentColor, fieldName = "accentColor", label = "Kolor") {
    const normalized = normalizeSubjectColor(selectedColor) || colorPalette[0].accentColor;
    const allColors = [...colorPalette, ...(state.customColors || [])];
    return `
      <div class="field-group">
        <span class="field-label">${escapeHtml(label)}</span>
        <div class="subject-color-grid">
          ${allColors
        .map((preset) => {
          const color = normalizeSubjectColor(preset.accentColor);
          return `
                <label class="subject-color-option" style="--swatch-color: ${color}">
                  <input type="radio" name="${escapeHtml(fieldName)}" value="${escapeHtml(color)}" ${color === normalized ? "checked" : ""} />
                  <span class="subject-color-swatch" aria-hidden="true"></span>
                  <span>${escapeHtml(preset.label)}</span>
                </label>
              `;
        })
        .join("")}
        </div>
      </div>
    `;
  }

  function renderSubjectColorPicker(selectedColor = colorPalette[0].accentColor) {
    return renderColorPicker(selectedColor, "accentColor", "Kolor tła przedmiotu");
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9.,+-]+/g, " ")
      .trim();
  }

  function toParagraphs(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return "<p class=\"muted\">Brak treści.</p>";
    if (/<[a-z][\s\S]*>/i.test(raw)) return prepareHtmlForMath(raw);
    return raw
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${preparePlainTextForMath(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function taskContentClass(task) {
    return `task-content${task && task.sourceLayout === "exam-paper" ? " imported-exam-paper" : ""}`;
  }

  function preparePlainTextForMath(value) {
    return escapeHtml(prepareTextForMath(value));
  }

  function prepareHtmlForMath(value) {
    if (typeof document === "undefined") return value;
    const template = document.createElement("template");
    template.innerHTML = value;
    const ignoredTags = new Set(["SCRIPT", "NOSCRIPT", "STYLE", "TEXTAREA", "PRE", "CODE", "OPTION", "INPUT"]);

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = prepareTextForMath(node.nodeValue, false);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || ignoredTags.has(node.tagName)) return;
      Array.from(node.childNodes).forEach(walk);
    };

    Array.from(template.content.childNodes).forEach(walk);
    return template.innerHTML;
  }

  function prepareTextForMath(value, displayStandalone = true) {
    return String(value == null ? "" : value)
      .split("\n")
      .map((line) => {
        if (hasMathDelimiters(line)) return line;
        const trimmed = line.trim();
        if (looksLikeStandaloneLatex(trimmed)) {
          const leading = line.match(/^\s*/)[0];
          const trailing = line.match(/\s*$/)[0];
          const left = displayStandalone ? "\\[" : "\\(";
          const right = displayStandalone ? "\\]" : "\\)";
          return `${leading}${left}${trimmed}${right}${trailing}`;
        }
        return wrapBareInlineLatexExpressions(wrapInlineLatexCommands(line));
      })
      .join("\n");
  }

  function hasMathDelimiters(value) {
    return /(?:\$\$?[^$]+\$\$?|\\\([^]*?\\\)|\\\[[^]*?\\\])/.test(value);
  }

  function looksLikeStandaloneLatex(value) {
    if (!value || /^[^\s\\$]+:/.test(value)) return false;
    const hasLatexCommand = /\\[a-zA-Z]+/.test(value);
    const hasMathSymbol = /(?:\^|_|=|\\frac|\\sqrt|\\sum|\\int|\\lim|\\cdot|\\times|\\leq?|\\geq?|\\neq)/.test(value);
    if (!hasLatexCommand && !hasMathSymbol) return false;
    const allowedLatexText = /^[A-Za-z0-9\\{}()[\]\s_^=+\-*/.,;]+$/.test(value);
    if (allowedLatexText && !/\s/.test(value)) return true;
    const words = value
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/[{}[\]^_=+\-*/(),.;:&|0-9]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
    if (hasLatexCommand) return words.length <= 2;
    return allowedLatexText && words.every((word) => word.length <= 3);
  }

  function wrapInlineLatexCommands(value) {
    return value.replace(
      /(^|[\s([])(\\(?:frac|sqrt|binom|alpha|beta|gamma|delta|Delta|pi|theta|infty|leq?|geq?|neq|cdot|times)(?:\{[^{}<>\n]*\}){0,3})(?=$|[\s).,;:])/g,
      "$1\\($2\\)"
    );
  }

  function wrapBareInlineLatexExpressions(value) {
    if (hasMathDelimiters(value)) return value;
    return value.replace(
      /(^|[\s([{])([A-Za-z0-9\\{}()[\]^_+\-*/.]+[=^_][A-Za-z0-9\\{}()[\]^_+\-*/.=]*)(?=$|[\s)\]},.;:])/g,
      (match, prefix, expression) => {
        if (!looksLikeStandaloneLatex(expression)) return match;
        return `${prefix}\\(${expression}\\)`;
      }
    );
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function loadState() {
    const existing = localStorage.getItem(STORE_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed && parsed.version === 1) {
          const normalized = normalizeState(parsed);
          localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
          return normalized;
        }
      } catch (error) {
        console.warn("Nie udało się wczytać stanu, używam danych startowych.", error);
      }
    }
    const seeded = createSeedState();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function normalizeState(nextState) {
    const settings = nextState.settings || {};
    const applyVisibilityDefaults = settings.visibilityDefaultsApplied !== true;

    nextState.settings = {
      ...settings,
      navVisibility: applyVisibilityDefaults
        ? { ...defaultNavVisibility }
        : {
          ...defaultNavVisibility,
          ...(settings.navVisibility || {}),
        },
      adminPreviewEnabled: settings.adminPreviewEnabled !== false,
      visibilityDefaultsApplied: true,
    };
    nextState.subjects = (nextState.subjects || []).map((subject) => ({
      ...subject,
      isPublic: applyVisibilityDefaults ? true : subject.isPublic !== false,
      isCustom: isCustomSubject(subject),
      accentColor: subjectAccentColor(subject),
    }));
    nextState.tasks = (nextState.tasks || []).map((task) => ({
      ...task,
      isPublished: applyVisibilityDefaults ? true : task.isPublished !== false,
      categories: Array.isArray(task.categories) ? task.categories : [],
      tags: Array.isArray(task.tags) ? task.tags : [],
      sourceName: task.sourceName || "",
      type: task.type === "closed" || closedAnswerMode(task) ? "closed" : task.type || "ai_open",
    }));
    nextState.categories = (nextState.categories || []).map((category) => ({
      ...category,
      accentColor: normalizeSubjectColor(category.accentColor) || colorPalette[0].accentColor,
    }));
    nextState.tags = (nextState.tags || []).map((tag) => ({
      ...tag,
      accentColor: normalizeSubjectColor(tag.accentColor) || colorPalette[0].accentColor,
    }));
    nextState.users = (nextState.users || []).map((user) => ({
      ...user,
      email:
        user.email === "admin@maturalab.pl"
          ? "admin@arkuszownik.pl"
          : user.email === "user@maturalab.pl"
            ? "user@arkuszownik.pl"
            : user.email,
    }));
    nextState.examSheets = (nextState.examSheets && nextState.examSheets.length
      ? nextState.examSheets
      : buildSeedExamSheets(nextState.subjects || [], nextState.levels || [], nextState.tasks || [], new Date().toISOString())
    ).map((sheet) => {
      const title = normalizeExamSheetTitle(sheet.title);
      return {
        ...sheet,
        title,
        slug: sheet.slug && !/^symulacja-matury/i.test(sheet.slug) ? sheet.slug : slugify(title),
        isPublished: sheet.isPublished !== false,
        taskIds: sheet.taskIds || [],
      };
    });
    nextState.examAttempts = (nextState.examAttempts || []).map((attempt) => ({
      ...attempt,
      sheetTitle: normalizeExamSheetTitle(attempt.sheetTitle),
      taskTimes: attempt.taskTimes || {},
      answers: attempt.answers || {},
      scores: attempt.scores || [],
    }));
    nextState.difficultyRatings = nextState.difficultyRatings || [];
    nextState.submissions = nextState.submissions || [];
    nextState.userTaskNotes = nextState.userTaskNotes || [];
    nextState.userTaskFavorites = nextState.userTaskFavorites || [];
    nextState.userTaskFolders = (nextState.userTaskFolders || []).map((folder) => ({
      ...folder,
      taskIds: Array.isArray(folder.taskIds) ? folder.taskIds : [],
    }));
    nextState.examTaskCompletionEvents = nextState.examTaskCompletionEvents || [];
    nextState.customColors = (nextState.customColors || []).map((color) => ({
      ...color,
      accentColor: normalizeSubjectColor(color.accentColor) || colorPalette[0].accentColor,
    }));
    return nextState;
  }

  function normalizeExamSheetTitle(title) {
    return String(title || "").replace(/^Symulacja matury\b/i, "Arkusz maturalny");
  }

  function buildSeedExamSheets(subjects, levels, tasks, now) {
    const subject = (slug) => subjects.find((item) => item.slug === slug);
    const level = (subjectId, slug) => levels.find((item) => item.subjectId === subjectId && item.slug === slug);
    const taskIds = (subjectId, levelId) =>
      tasks
        .filter((task) => task.subjectId === subjectId && task.levelId === levelId)
        .map((task) => task.id);
    const rows = [];

    const pushSheet = (subjectSlug, levelSlug, title, durationMinutes) => {
      const foundSubject = subject(subjectSlug);
      if (!foundSubject) return;
      const foundLevel = level(foundSubject.id, levelSlug);
      if (!foundLevel) return;
      const ids = taskIds(foundSubject.id, foundLevel.id);
      if (!ids.length) return;
      rows.push({
        id: `exam_${subjectSlug}_${levelSlug}`,
        title,
        slug: slugify(title),
        subjectId: foundSubject.id,
        levelId: foundLevel.id,
        durationMinutes,
        description: "Arkusz próbny z zadań dostępnych w prototypie.",
        isPublished: true,
        taskIds: ids,
        createdAt: now,
        updatedAt: now,
      });
    };

    pushSheet("matematyka", "podstawa", "Arkusz maturalny - matematyka podstawowa", 170);
    pushSheet("matematyka", "rozszerzenie", "Arkusz maturalny - matematyka rozszerzona", 180);
    pushSheet("fizyka", "rozszerzenie", "Arkusz maturalny - fizyka rozszerzona", 180);
    pushSheet("angielski", "rozszerzenie", "Arkusz maturalny - angielski rozszerzony", 150);
    pushSheet("informatyka", "rozszerzenie", "Arkusz maturalny - informatyka rozszerzona", 210);

    return rows;
  }

  function createSeedState() {
    const now = new Date().toISOString();
    const subjects = [
      {
        id: "sub_math",
        name: "Matematyka",
        slug: "matematyka",
        description: "Rachunki, dowody, geometria i zadania otwarte zgodne z arkuszem maturalnym.",
        icon: "∑",
        accentColor: defaultSubjectThemes.matematyka.accentColor,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub_physics",
        name: "Fizyka",
        slug: "fizyka",
        description: "Modele, prawa fizyczne, obliczenia i interpretacja doświadczeń.",
        icon: "F",
        accentColor: defaultSubjectThemes.fizyka.accentColor,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub_english",
        name: "Angielski",
        slug: "angielski",
        description: "Gramatyka, środki językowe, parafrazy i wypowiedź pisemna.",
        icon: "EN",
        accentColor: defaultSubjectThemes.angielski.accentColor,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub_info",
        name: "Informatyka",
        slug: "informatyka",
        description: "Algorytmika, programowanie, Excel, Access i zadania z danymi.",
        icon: "</>",
        accentColor: defaultSubjectThemes.informatyka.accentColor,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const levels = [
      { id: "lev_math_basic", subjectId: "sub_math", name: "Podstawa", slug: "podstawa" },
      { id: "lev_math_ext", subjectId: "sub_math", name: "Rozszerzenie", slug: "rozszerzenie" },
      { id: "lev_physics_ext", subjectId: "sub_physics", name: "Rozszerzenie", slug: "rozszerzenie" },
      { id: "lev_english_basic", subjectId: "sub_english", name: "Podstawa", slug: "podstawa" },
      { id: "lev_english_ext", subjectId: "sub_english", name: "Rozszerzenie", slug: "rozszerzenie" },
      { id: "lev_info_ext", subjectId: "sub_info", name: "Rozszerzenie", slug: "rozszerzenie" },
    ];

    const tags = defaultTags.map(([name, slug, description], index) => ({
      id: `tag_${index + 1}`,
      name,
      slug,
      description,
      createdAt: now,
      updatedAt: now,
    }));

    const categories = [];
    subjects.forEach((subject) => {
      const subjectLevels = levels.filter((level) => level.subjectId === subject.id);
      categorySeed[subject.slug].forEach((name, index) => {
        categories.push({
          id: `cat_${subject.slug}_${index + 1}`,
          subjectId: subject.id,
          levelId: subjectLevels.length === 1 ? subjectLevels[0].id : null,
          name,
          slug: slugify(name),
          description: `Kategoria: ${name}.`,
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    const cat = (subjectSlug, categoryName) => {
      const subject = subjects.find((item) => item.slug === subjectSlug);
      const found = categories.find((item) => item.subjectId === subject.id && item.slug === slugify(categoryName));
      return found ? found.id : undefined;
    };
    const tag = (slug) => {
      const found = tags.find((item) => item.slug === slug);
      return found ? found.id : undefined;
    };

    const tasks = [
      {
        id: "task_math_1",
        title: "Zadanie 12 - funkcja kwadratowa",
        slug: "funkcja-kwadratowa",
        subjectId: "sub_math",
        levelId: "lev_math_basic",
        difficulty: 2,
        maxScore: 4,
        type: "ai_open",
        content: `
          <p>Dana jest funkcja kwadratowa <strong>f(x)=x^2-6x+5</strong>.</p>
          <ol>
            <li>Wyznacz miejsca zerowe funkcji.</li>
            <li>Wyznacz współrzędne wierzchołka paraboli.</li>
            <li>Podaj zbiór wartości funkcji i uzasadnij odpowiedź.</li>
          </ol>
        `,
        officialSolution: `
          <p>Rozkładamy trójmian: <strong>x^2-6x+5=(x-1)(x-5)</strong>, więc miejsca zerowe to <strong>1</strong> i <strong>5</strong>.</p>
          <p>Współrzędna x wierzchołka wynosi <strong>x_w = -b/(2a)=3</strong>. Wtedy <strong>f(3)=9-18+5=-4</strong>, więc wierzchołek to <strong>(3,-4)</strong>.</p>
          <p>Parabola ma ramiona skierowane w górę, dlatego zbiór wartości to <strong>[-4, +∞)</strong>.</p>
        `,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("matematyka", "funkcje"), cat("matematyka", "równania i nierówności")],
        tags: [tag("arkusz-cke"), tag("czesto-na-maturze"), tag("latwe-obliczenia")],
        files: [],
        scoringCriteria: [
          {
            id: "crit_math_1_1",
            description: "Poprawne zapisanie lub wykorzystanie równania funkcji kwadratowej.",
            points: 1,
            aiHint: "funkcja, równanie, trójmian, x^2-6x+5",
            order: 1,
            isPartial: false,
          },
          {
            id: "crit_math_1_2",
            description: "Poprawne obliczenie miejsc zerowych.",
            points: 1,
            aiHint: "miejsca zerowe, x=1, x=5, pierwiastki",
            order: 2,
            isPartial: false,
          },
          {
            id: "crit_math_1_3",
            description: "Poprawne wyznaczenie wierzchołka paraboli.",
            points: 1,
            aiHint: "wierzchołek, (3,-4), xw, -b/2a",
            order: 3,
            isPartial: false,
          },
          {
            id: "crit_math_1_4",
            description: "Poprawna odpowiedź końcowa ze zbiorem wartości i uzasadnieniem.",
            points: 1,
            aiHint: "zbiór wartości, [-4, nieskończoność), ramiona w górę, uzasadnienie",
            order: 4,
            isPartial: false,
          },
        ],
        checkerConfig: null,
      },
      {
        id: "task_math_2",
        title: "Zadanie 21 - suma ciągu geometrycznego",
        slug: "suma-ciagu-geometrycznego",
        subjectId: "sub_math",
        levelId: "lev_math_ext",
        difficulty: 3,
        maxScore: 5,
        type: "ai_open",
        content: `
          <p>Dany jest ciąg geometryczny, w którym <strong>a1=3</strong>, a iloraz <strong>q=2</strong>.</p>
          <p>Oblicz sumę sześciu początkowych wyrazów ciągu i uzasadnij użyty wzór.</p>
        `,
        officialSolution: `
          <p>Korzystamy ze wzoru <strong>S_n = a1(q^n-1)/(q-1)</strong> dla q różnego od 1.</p>
          <p><strong>S_6 = 3(2^6-1)/(2-1)=3·63=189</strong>.</p>
        `,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("matematyka", "ciągi")],
        tags: [tag("czesto-na-maturze"), tag("dluga-odpowiedz")],
        files: [],
        scoringCriteria: [
          {
            id: "crit_math_2_1",
            description: "Rozpoznanie ciągu geometrycznego i danych a1 oraz q.",
            points: 1,
            aiHint: "ciąg geometryczny, a1=3, q=2",
            order: 1,
            isPartial: false,
          },
          {
            id: "crit_math_2_2",
            description: "Poprawne zapisanie wzoru na sumę n początkowych wyrazów.",
            points: 2,
            aiHint: "S_n, a1(q^n-1)/(q-1), suma",
            order: 2,
            isPartial: true,
          },
          {
            id: "crit_math_2_3",
            description: "Poprawne podstawienie i obliczenie wartości sumy.",
            points: 1,
            aiHint: "2^6, 63, 189",
            order: 3,
            isPartial: false,
          },
          {
            id: "crit_math_2_4",
            description: "Jasna odpowiedź końcowa.",
            points: 1,
            aiHint: "odpowiedź, S6=189",
            order: 4,
            isPartial: false,
          },
        ],
        checkerConfig: null,
      },
      {
        id: "task_physics_1",
        title: "Zadanie 8 - energia kinetyczna i praca",
        slug: "energia-kinetyczna-praca",
        subjectId: "sub_physics",
        levelId: "lev_physics_ext",
        difficulty: 2,
        maxScore: 4,
        type: "ai_open",
        content: `
          <p>Ciało o masie <strong>2 kg</strong> porusza się z prędkością <strong>3 m/s</strong>. Stała siła zwiększyła jego prędkość do <strong>7 m/s</strong>.</p>
          <p>Oblicz pracę wykonaną przez siłę. Przyjmij, że nie ma strat energii.</p>
        `,
        officialSolution: `
          <p>Z twierdzenia o pracy i energii: <strong>W = ΔE_k</strong>.</p>
          <p><strong>E_k1 = mv1^2/2 = 2·9/2 = 9 J</strong>.</p>
          <p><strong>E_k2 = mv2^2/2 = 2·49/2 = 49 J</strong>.</p>
          <p><strong>W = 49 J - 9 J = 40 J</strong>.</p>
        `,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("fizyka", "praca, moc, energia"), cat("fizyka", "dynamika")],
        tags: [tag("arkusz-cke"), tag("latwe-obliczenia")],
        files: [],
        scoringCriteria: [
          {
            id: "crit_phys_1_1",
            description: "Zastosowanie zależności W = ΔEk.",
            points: 1,
            aiHint: "praca, energia kinetyczna, delta Ek, W=ΔEk",
            order: 1,
            isPartial: false,
          },
          {
            id: "crit_phys_1_2",
            description: "Poprawne obliczenie początkowej energii kinetycznej.",
            points: 1,
            aiHint: "9 J, v1, 3 m/s",
            order: 2,
            isPartial: false,
          },
          {
            id: "crit_phys_1_3",
            description: "Poprawne obliczenie końcowej energii kinetycznej.",
            points: 1,
            aiHint: "49 J, v2, 7 m/s",
            order: 3,
            isPartial: false,
          },
          {
            id: "crit_phys_1_4",
            description: "Poprawny wynik pracy z jednostką.",
            points: 1,
            aiHint: "40 J, dżul, jednostka",
            order: 4,
            isPartial: false,
          },
        ],
        checkerConfig: null,
      },
      {
        id: "task_english_1",
        title: "Zadanie 5 - transformacje zdań",
        slug: "transformacje-zdan-used-to",
        subjectId: "sub_english",
        levelId: "lev_english_ext",
        difficulty: 2,
        maxScore: 3,
        type: "ai_open",
        content: `
          <p>Przekształć zdania tak, aby zachować znaczenie zdania wyjściowego. Użyj podanego słowa i nie zmieniaj jego formy.</p>
          <ol>
            <li>When I was a child, I played tennis every weekend. <strong>USED</strong></li>
            <li>It is possible that Mark forgot about the meeting. <strong>MIGHT</strong></li>
            <li>They started learning Spanish two years ago. <strong>FOR</strong></li>
          </ol>
        `,
        officialSolution: `
          <ol>
            <li>I used to play tennis every weekend when I was a child.</li>
            <li>Mark might have forgotten about the meeting.</li>
            <li>They have been learning Spanish for two years.</li>
          </ol>
        `,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("angielski", "transformacje zdań"), cat("angielski", "środki językowe")],
        tags: [tag("arkusz-cke"), tag("krotkie-zadanie")],
        files: [],
        scoringCriteria: [
          {
            id: "crit_eng_1_1",
            description: "Poprawne użycie konstrukcji used to.",
            points: 1,
            aiHint: "used to play",
            order: 1,
            isPartial: false,
          },
          {
            id: "crit_eng_1_2",
            description: "Poprawne użycie might have forgotten.",
            points: 1,
            aiHint: "might have forgotten",
            order: 2,
            isPartial: false,
          },
          {
            id: "crit_eng_1_3",
            description: "Poprawne użycie czasu present perfect continuous z for.",
            points: 1,
            aiHint: "have been learning, for two years",
            order: 3,
            isPartial: false,
          },
        ],
        checkerConfig: null,
      },
      {
        id: "task_info_1",
        title: "Zadanie 3 - krótka odpowiedź z systemów liczbowych",
        slug: "krotka-odpowiedz-systemy-liczbowe",
        subjectId: "sub_info",
        levelId: "lev_info_ext",
        difficulty: 1,
        maxScore: 2,
        type: "short_answer",
        content: `
          <p>Liczbę binarną <strong>10000000</strong> zapisz w systemie dziesiętnym.</p>
        `,
        officialSolution: `<p><strong>10000000₂ = 128₁₀</strong>.</p>`,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("informatyka", "zadania tekstowe z odpowiedzią"), cat("informatyka", "analiza danych")],
        tags: [tag("krotkie-zadanie"), tag("teoria")],
        files: [],
        scoringCriteria: [
          {
            id: "crit_info_1_1",
            description: "Podanie poprawnej wartości dziesiętnej.",
            points: 2,
            aiHint: "128",
            order: 1,
            isPartial: false,
          },
        ],
        checkerConfig: {
          checkerType: "short_answer",
          correctAnswer: "128",
          acceptedAnswers: ["128", "128.0"],
          caseSensitive: false,
          tolerance: 0,
          ignoreSpaces: true,
        },
      },
      {
        id: "task_info_2",
        title: "Zadanie 9 - NWD dwóch liczb",
        slug: "nwd-dwoch-liczb",
        subjectId: "sub_info",
        levelId: "lev_info_ext",
        difficulty: 2,
        maxScore: 5,
        type: "info_algorithm",
        content: `
          <p>Napisz program, który dla dwóch dodatnich liczb całkowitych <strong>a</strong> i <strong>b</strong> wypisze ich największy wspólny dzielnik.</p>
          <p>Wejście: jedna linia z liczbami a i b. Wyjście: jedna liczba.</p>
          <pre class="code-block">Wejście:
48 18
Wyjście:
6</pre>
        `,
        officialSolution: `
          <pre class="code-block">while (b != 0) {
  int r = a % b;
  a = b;
  b = r;
}
cout << a;</pre>
        `,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("informatyka", "algorytmika"), cat("informatyka", "programowanie C++")],
        tags: [tag("arkusz-cke"), tag("czesto-na-maturze")],
        files: [
          {
            id: "file_info_2_1",
            taskId: "task_info_2",
            fileName: "testy-przykladowe.txt",
            fileUrl: "#",
            fileType: "txt",
            description: "Przykładowe dane testowe.",
            isPublic: true,
            createdAt: now,
          },
        ],
        scoringCriteria: [
          {
            id: "crit_info_2_1",
            description: "Poprawne wczytanie dwóch liczb.",
            points: 1,
            aiHint: "cin, input, a, b, scanf, int",
            order: 1,
            isPartial: false,
          },
          {
            id: "crit_info_2_2",
            description: "Zastosowanie algorytmu Euklidesa lub równoważnej poprawnej metody.",
            points: 2,
            aiHint: "while, %, gcd, euklides",
            order: 2,
            isPartial: true,
          },
          {
            id: "crit_info_2_3",
            description: "Poprawne wypisanie wyniku.",
            points: 1,
            aiHint: "cout, print, wynik",
            order: 3,
            isPartial: false,
          },
          {
            id: "crit_info_2_4",
            description: "Program działa dla przypadków brzegowych.",
            points: 1,
            aiHint: "b != 0, a==b, jedna liczba dzieli drugą",
            order: 4,
            isPartial: false,
          },
        ],
        checkerConfig: {
          checkerType: "programming",
          languages: ["cpp", "python"],
          timeLimitMs: 1000,
          memoryLimitMb: 64,
          tests: [
            { input: "48 18", expectedOutput: "6", isHidden: false, points: 1, order: 1 },
            { input: "17 13", expectedOutput: "1", isHidden: true, points: 1, order: 2 },
            { input: "120 45", expectedOutput: "15", isHidden: true, points: 1, order: 3 },
            { input: "9 9", expectedOutput: "9", isHidden: true, points: 1, order: 4 },
            { input: "1000000 2", expectedOutput: "2", isHidden: true, points: 1, order: 5 },
          ],
          architectureNote: "W prototypie wynik jest symulowany. Docelowo ten obiekt trafia do izolowanego workera/sandboxa.",
        },
      },
      {
        id: "task_info_3",
        title: "Zadanie 14 - analiza danych w Excelu",
        slug: "analiza-danych-excel",
        subjectId: "sub_info",
        levelId: "lev_info_ext",
        difficulty: 2,
        maxScore: 4,
        type: "info_excel",
        content: `
          <p>Pobierz plik bazowy z wynikami pomiarów. W arkuszu oblicz średnią, medianę i oznacz rekordy powyżej progu.</p>
          <p>W MVP przesłanie pliku pokazuje przepływ oceny, a właściwy skrypt sprawdzający jest elementem konfiguracji admina.</p>
        `,
        officialSolution: `<p>Rozwiązanie powinno zawierać poprawne formuły średniej, mediany oraz kolumnę z warunkiem logicznym.</p>`,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        categories: [cat("informatyka", "arkusz kalkulacyjny Excel"), cat("informatyka", "analiza danych")],
        tags: [tag("arkusz-cke"), tag("wymaga-rysunku")],
        files: [
          {
            id: "file_info_3_1",
            taskId: "task_info_3",
            fileName: "pomiary-baza.xlsx",
            fileUrl: "#",
            fileType: "xlsx",
            description: "Plik bazowy dla ucznia.",
            isPublic: true,
            createdAt: now,
          },
        ],
        scoringCriteria: [
          {
            id: "crit_info_3_1",
            description: "Poprawna formuła średniej.",
            points: 1,
            aiHint: "AVERAGE, ŚREDNIA",
            order: 1,
            isPartial: false,
          },
          {
            id: "crit_info_3_2",
            description: "Poprawna formuła mediany.",
            points: 1,
            aiHint: "MEDIAN, MEDIANA",
            order: 2,
            isPartial: false,
          },
          {
            id: "crit_info_3_3",
            description: "Poprawne oznaczenie rekordów powyżej progu.",
            points: 1,
            aiHint: "IF, JEŻELI, próg",
            order: 3,
            isPartial: false,
          },
          {
            id: "crit_info_3_4",
            description: "Zachowanie czytelnej struktury arkusza.",
            points: 1,
            aiHint: "nagłówki, formatowanie, arkusz",
            order: 4,
            isPartial: false,
          },
        ],
        checkerConfig: {
          checkerType: "script",
          language: "python",
          script:
            "def check(submission_path: str, expected_path: str) -> dict:\n    # openpyxl checker placeholder\n    return {\"score\": 0, \"maxScore\": 4, \"details\": []}",
          settingsJson: { library: "openpyxl" },
        },
      },
    ];
    const examSheets = buildSeedExamSheets(subjects, levels, tasks, now);

    return {
      version: 1,
      users: [
        {
          id: "user_admin",
          email: "admin@arkuszownik.pl",
          password: "admin123",
          username: "Administrator",
          role: "admin",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "user_demo",
          email: "user@arkuszownik.pl",
          password: "user123",
          username: "Kursant",
          role: "user",
          createdAt: now,
          updatedAt: now,
        },
      ],
      subjects,
      levels,
      categories,
      tags,
      tasks,
      examSheets,
      examAttempts: [],
      submissions: [],
      difficultyRatings: [],
      userTaskNotes: [],
      userTaskFavorites: [],
      userTaskFolders: [],
      examTaskCompletionEvents: [],
      settings: {
        navVisibility: { ...defaultNavVisibility },
        adminPreviewEnabled: true,
        visibilityDefaultsApplied: true,
      },
    };
  }

  function currentUser() {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return state.users.find((user) => user.id === userId) || null;
  }

  function setSession(userId) {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  }

  function getRoute() {
    const raw = window.location.hash.slice(1) || "/";
    const [path, query = ""] = raw.split("?");
    return { path: path || "/", query: new URLSearchParams(query) };
  }

  function subjectById(id) {
    return state.subjects.find((item) => item.id === id);
  }

  function isAdmin(user = currentUser()) {
    return user && user.role === "admin";
  }

  function adminPreviewEnabled() {
    return !state.settings || state.settings.adminPreviewEnabled !== false;
  }

  function canSeeSubject(subject, user = currentUser()) {
    return Boolean(subject) && (subject.isPublic !== false || isAdmin(user));
  }

  function canSeeTask(task, user = currentUser()) {
    const subject = task ? subjectById(task.subjectId) : null;
    return Boolean(task && canSeeSubject(subject, user) && (task.isPublished !== false || isAdmin(user)));
  }

  function visibleSubjects(user = currentUser()) {
    return state.subjects.filter((subject) => canSeeSubject(subject, user));
  }

  function getInterestedSubjectIds(user = currentUser()) {
    if (user) {
      return Array.isArray(user.interestedSubjectIds) ? user.interestedSubjectIds : null;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(GUEST_SUBJECT_INTERESTS_KEY) || "null");
      return Array.isArray(stored) ? stored : null;
    } catch (error) {
      return null;
    }
  }

  function setInterestedSubjectIds(ids, user = currentUser()) {
    const visibleIds = new Set(visibleSubjects(user).map((subject) => subject.id));
    const normalized = Array.isArray(ids)
      ? Array.from(new Set(ids.filter((id) => visibleIds.has(id))))
      : null;
    if (user) {
      if (normalized) user.interestedSubjectIds = normalized;
      else delete user.interestedSubjectIds;
      user.updatedAt = new Date().toISOString();
      saveState();
      return;
    }
    if (normalized) localStorage.setItem(GUEST_SUBJECT_INTERESTS_KEY, JSON.stringify(normalized));
    else localStorage.removeItem(GUEST_SUBJECT_INTERESTS_KEY);
  }

  function subjectInterestFilteredSubjects(user = currentUser()) {
    const subjects = visibleSubjects(user);
    const interestedIds = getInterestedSubjectIds(user);
    if (!interestedIds) return subjects;
    const interestedSet = new Set(interestedIds);
    return subjects.filter((subject) => interestedSet.has(subject.id));
  }

  function levelById(id) {
    return state.levels.find((item) => item.id === id);
  }

  function categoryById(id) {
    return state.categories.find((item) => item.id === id);
  }

  function tagById(id) {
    return state.tags.find((item) => item.id === id);
  }

  function taskById(id) {
    return state.tasks.find((item) => item.id === id);
  }

  function examSheetById(id) {
    return state.examSheets.find((item) => item.id === id);
  }

  function examAttemptById(id) {
    return state.examAttempts.find((item) => item.id === id);
  }

  function canSeeExamSheet(sheet, user = currentUser()) {
    const subject = sheet ? subjectById(sheet.subjectId) : null;
    return Boolean(sheet && canSeeSubject(subject, user) && (sheet.isPublished !== false || isAdmin(user)));
  }

  function visibleExamSheets(subjectId = "", levelId = "", user = currentUser()) {
    return state.examSheets.filter(
      (sheet) =>
        canSeeExamSheet(sheet, user) &&
        (!subjectId || sheet.subjectId === subjectId) &&
        (!levelId || sheet.levelId === levelId)
    );
  }

  function userTaskNote(taskId, user = currentUser()) {
    if (!user) return null;
    return (state.userTaskNotes || []).find((note) => note.userId === user.id && note.taskId === taskId) || null;
  }

  function userTaskFolders(user = currentUser()) {
    if (!user) return [];
    return (state.userTaskFolders || []).filter((folder) => folder.userId === user.id);
  }

  function taskFoldersForUser(taskId, user = currentUser()) {
    return userTaskFolders(user).filter((folder) => (folder.taskIds || []).includes(taskId));
  }

  function isFavoriteTask(taskId, user = currentUser()) {
    return Boolean(user && (state.userTaskFavorites || []).some((item) => item.userId === user.id && item.taskId === taskId));
  }

  function userTaskDifficultyRating(taskId, user = currentUser()) {
    if (!user) return null;
    return (state.difficultyRatings || []).find((rating) => rating.taskId === taskId && rating.userId === user.id) || null;
  }

  function averageTaskTimeForUser(taskId, user = currentUser()) {
    if (!user) return 0;
    const times = (state.submissions || [])
      .filter((submission) => submission.userId === user.id && submission.taskId === taskId && Number(submission.timeSpentSeconds || 0) > 0)
      .map((submission) => Number(submission.timeSpentSeconds || 0));
    if (!times.length) return 0;
    return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
  }

  function taskSourceLabel(task) {
    const explicit = String(task && task.sourceName || "").trim();
    if (explicit) return explicit;
    const file = String(task && task.sourceFile || "").toLowerCase();
    if (file.includes("zadania.info")) return "zadania.info";
    if ((task && task.tags || []).some((tagId) => {
      const tag = tagById(tagId);
      return tag && /cke/i.test(`${tag.name} ${tag.slug}`);
    })) return "CKE";
    if (task && task.sourceType === "pdf") return "PDF";
    if (task && task.sourceType === "screen") return "Screen";
    return "";
  }

  function renderTaskSourceBadges(task) {
    const label = taskSourceLabel(task);
    if (!label) return "";
    return `<span class="source-badge" title="Źródło: ${escapeHtml(label)}">${iconSvg("file")} ${escapeHtml(label)}</span>`;
  }

  function latestExamTaskCompletionEvent(sheetId, taskId, user = currentUser()) {
    if (!user) return null;
    return (state.examTaskCompletionEvents || [])
      .filter((event) => event.userId === user.id && event.sheetId === sheetId && event.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }

  function isExamTaskDone(sheetId, taskId, user = currentUser()) {
    const event = latestExamTaskCompletionEvent(sheetId, taskId, user);
    return Boolean(event && event.checked);
  }

  function examTasks(sheet, user = currentUser()) {
    return (sheet.taskIds || [])
      .map((id) => taskById(id))
      .filter((task) => task && canSeeTask(task, user));
  }

  function readExamSession() {
    try {
      return JSON.parse(sessionStorage.getItem(EXAM_SESSION_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function saveExamSession(session) {
    sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(session));
  }

  function clearExamSession() {
    sessionStorage.removeItem(EXAM_SESSION_KEY);
  }

  function normalizeExamSession(session, sheet) {
    const tasks = examTasks(sheet);
    const taskIds = tasks.map((task) => task.id);
    const now = new Date().toISOString();
    return {
      sheetId: sheet.id,
      taskIds,
      startedAt: session.startedAt || now,
      finishedAt: session.finishedAt || null,
      currentIndex: Math.max(0, Math.min(taskIds.length - 1, Number(session.currentIndex || 0))),
      currentTaskStartedAt: session.currentTaskStartedAt || now,
      taskTimes: session.taskTimes || {},
      answers: session.answers || {},
      timedOut: Boolean(session.timedOut),
    };
  }

  function recordCurrentTaskTime() {
    const session = readExamSession();
    if (!session || session.finishedAt) return session;
    const sheet = examSheetById(session.sheetId);
    if (!sheet) return session;
    const normalized = normalizeExamSession(session, sheet);
    const taskId = normalized.taskIds[normalized.currentIndex];
    if (taskId) {
      const delta = Math.max(0, Math.round((Date.now() - new Date(normalized.currentTaskStartedAt).getTime()) / 1000));
      normalized.taskTimes[taskId] = Number(normalized.taskTimes[taskId] || 0) + delta;
      normalized.answers = {
        ...(normalized.answers || {}),
        ...readVisibleExamAnswer(),
      };
      normalized.currentTaskStartedAt = new Date().toISOString();
      saveExamSession(normalized);
    }
    return normalized;
  }

  function readVisibleExamAnswer() {
    const field = document.querySelector("[data-exam-answer]");
    if (!field || !field.dataset.taskId) return {};
    return { [field.dataset.taskId]: field.value || "" };
  }

  function saveExamAnswerField(field) {
    if (!field || !field.dataset.taskId) return;
    const session = readExamSession();
    if (!session || session.finishedAt) return;
    session.answers = {
      ...(session.answers || {}),
      [field.dataset.taskId]: field.value || "",
    };
    saveExamSession(session);
  }

  function setExamAnswerValue(taskId, value) {
    const field = document.querySelector(`[data-exam-answer][data-task-id="${cssEscape(taskId)}"]`);
    if (!field) return;
    field.value = value || "";
    saveExamAnswerField(field);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  let lastFocusedLatexField = null;

  document.addEventListener("focusin", (e) => {
    const target = e.target;
    if (target.matches("[data-latex-source], [data-exam-answer], [contenteditable], .formula-input")) {
      lastFocusedLatexField = target;
    }
  });

  function insertLatexSnippet(field, snippet) {
    if (!field) return;
    const markerIndex = snippet.indexOf("§");
    const cleanSnippet = snippet.replace("§", "");

    if (field.isContentEditable) {
      field.focus();
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(cleanSnippet);
        range.insertNode(textNode);
        
        // Move cursor after snippet (or at marker if we want to be fancy, but let's keep it simple for now)
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        field.textContent += cleanSnippet;
      }
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    const start = field.selectionStart == null ? field.value.length : field.selectionStart;
    const end = field.selectionEnd == null ? field.value.length : field.selectionEnd;
    field.value = `${field.value.slice(0, start)}${cleanSnippet}${field.value.slice(end)}`;
    const cursor = markerIndex >= 0 ? start + markerIndex : start + cleanSnippet.length;
    field.focus();
    field.setSelectionRange(cursor, cursor);
    saveExamAnswerField(field);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function latexTargetField(target, excludeContainer = null) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    let candidate = lastFocusedLatexField;
    
    // If we're clicking a "Wstaw" button, we don't want to insert into the builder itself
    if (excludeContainer && candidate && excludeContainer.contains(candidate)) {
      candidate = null;
    }

    if (!root) return candidate || document.querySelector("[data-exam-answer]");
    if (candidate && root.contains(candidate)) {
      return candidate;
    }
    return root.querySelector("[data-latex-source], [data-exam-answer]");
  }

  function insertFractionFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const numeratorField = root.querySelector("[data-fraction-numerator]");
    const denominatorField = root.querySelector("[data-fraction-denominator]");
    const numerator = numeratorField ? numeratorField.textContent.trim() : "";
    const denominator = denominatorField ? denominatorField.textContent.trim() : "";
    const snippet = `\\frac{${numerator || "§"}}{${denominator || (numerator ? "§" : "")}}`;
    insertLatexSnippet(field, snippet);
    if (numeratorField) numeratorField.textContent = "";
    if (denominatorField) denominatorField.textContent = "";
  }

  function insertRootFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const contentField = root.querySelector("[data-root-content]");
    const content = contentField ? contentField.textContent.trim() : "";
    insertLatexSnippet(field, `\\sqrt{${content || "§"}}`);
    if (contentField) contentField.textContent = "";
  }

  function insertPowerFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const baseField = root.querySelector("[data-power-base]");
    const exponentField = root.querySelector("[data-power-exponent]");
    const base = baseField ? baseField.textContent.trim() : "";
    const exponent = exponentField ? exponentField.textContent.trim() : "";
    insertLatexSnippet(field, `${base || "§"}^{${exponent || "§"}}`);
    if (baseField) baseField.textContent = "";
    if (exponentField) exponentField.textContent = "";
  }

  function insertLogFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const baseField = root.querySelector("[data-log-base]");
    const argField = root.querySelector("[data-log-arg]");
    const base = baseField ? baseField.textContent.trim() : "";
    const arg = argField ? argField.textContent.trim() : "";
    insertLatexSnippet(field, `\\log_{${base || "§"}} ${arg || "§"}`);
    if (baseField) baseField.textContent = "";
    if (argField) argField.textContent = "";
  }

  function insertAbsFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const contentField = root.querySelector("[data-abs-content]");
    const content = contentField ? contentField.textContent.trim() : "";
    insertLatexSnippet(field, `\\left| ${content || "§"} \\right|`);
    if (contentField) contentField.textContent = "";
  }

  function insertIndexFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const baseField = root.querySelector("[data-index-base]");
    const indexField = root.querySelector("[data-index-val]");
    const base = baseField ? baseField.textContent.trim() : "";
    const index = indexField ? indexField.textContent.trim() : "";
    insertLatexSnippet(field, `${base || "§"}_{${index || "§"}}`);
    if (baseField) baseField.textContent = "";
    if (indexField) indexField.textContent = "";
  }

  function insertLimFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const varField = root.querySelector("[data-lim-var]");
    const toField = root.querySelector("[data-lim-to]");
    const argField = root.querySelector("[data-lim-arg]");
    
    const v = varField ? varField.textContent.trim() : "";
    const t = toField ? toField.textContent.trim() : "";
    const a = argField ? argField.textContent.trim() : "";
    
    insertLatexSnippet(field, `\\lim_{${v || "§"} \\to ${t || "§"}} ${a || "§"}`);
    
    if (varField) varField.textContent = "";
    if (toField) toField.textContent = "";
    if (argField) argField.textContent = "";
  }

  function insertBinomFromBuilder(target, forcedField) {
    const root = target.closest(".latex-editor, .exam-answer-box");
    if (!root) return;
    const field = forcedField || root.querySelector("[data-latex-source], [data-exam-answer]");
    const n = root.querySelector("[data-binom-n]").textContent.trim();
    const k = root.querySelector("[data-binom-k]").textContent.trim();
    insertLatexSnippet(field, `\\binom{${n || "§"}}{${k || "§"}}`);
    root.querySelector("[data-binom-n]").textContent = "";
    root.querySelector("[data-binom-k]").textContent = "";
  }

  function updateLatexPreview(source) {
    const preview = source && source.dataset.previewId ? document.getElementById(source.dataset.previewId) : null;
    if (!preview) return;
    preview.innerHTML = toParagraphs(source.value);
    renderMath(preview);
  }

  function updateExamAnswerPreview(source) {
    const root = source.closest(".exam-answer-box");
    const preview = root ? root.querySelector("[data-exam-answer-preview]") : null;
    if (!preview) return;
    preview.innerHTML = source.value.trim() ? toParagraphs(source.value) : `<p class="muted">Podgląd pojawi się po wpisaniu odpowiedzi.</p>`;
    renderMath(preview);
  }

  function elapsedForTask(session, taskId) {
    const base = Number(session.taskTimes[taskId] || 0);
    const currentTaskId = session.taskIds[session.currentIndex];
    if (session.finishedAt || currentTaskId !== taskId) return base;
    return base + Math.max(0, Math.round((Date.now() - new Date(session.currentTaskStartedAt).getTime()) / 1000));
  }

  function examElapsedSeconds(session) {
    const end = session.finishedAt ? new Date(session.finishedAt).getTime() : Date.now();
    return Math.max(0, Math.round((end - new Date(session.startedAt).getTime()) / 1000));
  }

  function examRemainingSeconds(session) {
    const sheet = examSheetById(session.sheetId);
    const limit = Number(sheet && sheet.durationMinutes ? sheet.durationMinutes : 180) * 60;
    return Math.max(0, limit - examElapsedSeconds(session));
  }

  function finishExamSession(timedOut = false) {
    let session = recordCurrentTaskTime();
    if (!session) return null;
    session = {
      ...session,
      finishedAt: session.finishedAt || new Date().toISOString(),
      timedOut,
    };
    saveExamSession(session);
    return session;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function starRating(value, max = 3) {
    const rating = Math.max(0, Math.min(max, Math.round((Number(value) || 0) * 2) / 2));
    const full = Math.floor(rating);
    const half = rating % 1 ? 1 : 0;
    const empty = Math.max(0, max - full - half);
    return `<span class="stars" aria-label="Trudność ${rating}/${max}">${"★".repeat(full)}${half ? "½" : ""}${"☆".repeat(empty)}</span>`;
  }

  function scoreStatus(score, maxScore) {
    if (score >= maxScore && maxScore > 0) return "max";
    if (score <= 0) return "zero";
    return "partial";
  }

  function statusLabel(status) {
    const labels = {
      max: "max punktów",
      partial: "częściowo",
      zero: "0 punktów",
      unsolved: "nierozwiązane",
      pending: "sprawdzanie",
      accepted: "Accepted",
      rejected: "Wrong Answer",
    };
    return labels[status] || status;
  }

  function latestSubmission(taskId, userId) {
    if (!userId) return null;
    return state.submissions
      .filter((submission) => submission.taskId === taskId && submission.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }

  function taskSubmissions(taskId, userId) {
    if (!userId) return [];
    return state.submissions
      .filter((submission) => submission.taskId === taskId && submission.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function textExcerpt(value, limit = 260) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.length > limit ? `${text.slice(0, limit).trimEnd()}...` : text;
  }

  function taskStatusForUser(task, user) {
    if (!user) return { status: "unsolved", label: "nierozwiązane", submission: null };
    const submission = latestSubmission(task.id, user.id);
    if (!submission) return { status: "unsolved", label: "nierozwiązane", submission: null };
    const status = scoreStatus(submission.score, submission.maxScore);
    return { status, label: statusLabel(status), submission };
  }

  function subjectTaskCount(subjectId, includePrivate = false) {
    return state.tasks.filter((task) => task.subjectId === subjectId && (includePrivate || task.isPublished !== false)).length;
  }

  function taskTypeLabel(type) {
    const found = taskTypes.find(([value]) => value === type);
    return found ? found[1] : type;
  }

  function displayTaskTitle(task) {
    return String(task.title || "").replace(/^Zadanie\s+\d+\s*[—-]\s*/i, "").trim() || task.title;
  }

  function subjectLevels(subjectId) {
    return state.levels.filter((level) => level.subjectId === subjectId);
  }

  function iconSvg(name) {
    const icons = {
      home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 4l8 7.5v7a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 18.5v-7Z"/></svg>',
      book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.75C5 4.784 5.784 4 6.75 4H19V17.5H6.75C5.784 17.5 5 18.284 5 19.25V5.75Z"/><path d="M5 19.25C5 20.216 5.784 21 6.75 21H19"/><path d="M8.5 8H16.5"/><path d="M8.5 11H14.5"/><path d="M7 17.5V4"/></svg>',
      chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10m7 10V4m7 16v-7"/></svg>',
      file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l3 3V20.5H7V3.5Z"/><path d="M14 3.5V7h3"/><path d="M9.5 11h5m-5 3h5m-5 3h3"/></svg>',
      clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>',
      sheetCustom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.75H14.25L18.75 8.25V19.25C18.75 20.078 18.078 20.75 17.25 20.75H6.75C5.922 20.75 5.25 20.078 5.25 19.25V5.25C5.25 4.422 5.922 3.75 6.75 3.75Z"/><path d="M14.25 3.75V8.25H18.75"/><path d="M8.5 11.25H15.5"/><path d="M8.5 14.25H15.5"/><path d="M8.5 17.25H12.75"/></svg>',
      clockCustom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M12 7.75V12.25L15.25 14.25"/><path d="M7.25 3.75L5.25 5.25"/><path d="M16.75 3.75L18.75 5.25"/></svg>',
      physicsRelaxed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.7"/><ellipse cx="12" cy="12" rx="8.2" ry="2.8" transform="rotate(28 12 12)"/><ellipse cx="12" cy="12" rx="8.2" ry="2.8" transform="rotate(-28 12 12)"/><ellipse cx="12" cy="12" rx="8.2" ry="2.8" transform="rotate(90 12 12)"/><circle class="svg-fill" cx="18.2" cy="10" r="1"/><circle class="svg-fill" cx="6.9" cy="10.9" r="1"/><circle class="svg-fill" cx="14.55" cy="19.1" r="1"/></svg>',
      star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.5Z"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5V19M5 12H19"/></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/></svg>',
      trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-6v6"/></svg>',
      tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM6.5 6.5h.01"/></svg>',
      layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      palette: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="12.5" cy="14.5" r=".5"/><circle cx="7.5" cy="10.5" r=".5"/><path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10c0-2.2-.8-4.2-2.2-5.8-.8-.8-1.8-1.2-2.8-1.2h-2c-1.1 0-2-.9-2-2V3a1 1 0 0 0-1-1z"/></svg>',
      settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      sync: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0 4a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M3 4v4h4m14 12v-4h-4"/></svg>',
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none"/></svg>',
      rocket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c2.5.2 4.5-.5 6-2l6-6c1.8-1.8 2.8-4.2 2.8-6.8A10.8 10.8 0 0 0 13 7L7 13c-1.5 1.5-2.2 3.5-2 6Zm7-7 3 3M6 18l-2 2m11-12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z"/></svg>',
      calculator: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2"/></svg>',
      atom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.5"/><path d="M19 12c0 3.8-3.1 7-7 7s-7-3.2-7-7 3.1-7 7-7 7 3.2 7 7Z"/><path d="M4.5 7.5c3.4-2 8.4-.6 11.2 3.2 2.8 3.8 2.4 8.4-.8 10.3M19.5 7.5c-3.4-2-8.4-.6-11.2 3.2-2.8 3.8-2.4 8.4.8 10.3"/></svg>',
      message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4.5 4v-4A2.5 2.5 0 0 1 5 12.5v-6Z"/></svg>',
      code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-4 3 4 3m8-6 4 3-4 3m-2-8-4 10"/></svg>',
      list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
      level: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19H20"/><path d="M5.5 16.5H9V13H12.5V9.5H16V6H19.5"/><path d="M15.75 6H19.5V9.75"/><circle cx="7.25" cy="16.5" r="0.8" fill="currentColor" stroke="none"/><circle cx="10.75" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="14.25" cy="9.5" r="0.8" fill="currentColor" stroke="none"/></svg>',
      shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
      user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>',
      target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3m10-10h-3M5 12H2"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
      filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M7 12h10m-7 7h4"/></svg>',
      search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>',
      grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/></svg>',
      mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Z"/><path d="m4 7 8 6 8-6"/></svg>',
      addUser: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="4" fill="currentColor" stroke="none"/><path d="M2.75 19.25C2.75 15.798 5.548 13 9 13C12.452 13 15.25 15.798 15.25 19.25C15.25 19.664 14.914 20 14.5 20H3.5C3.086 20 2.75 19.664 2.75 19.25Z" fill="currentColor" stroke="none"/><path d="M18.75 6.25C18.75 5.836 18.414 5.5 18 5.5C17.586 5.5 17.25 5.836 17.25 6.25V8.25H15.25C14.836 8.25 14.5 8.586 14.5 9C14.5 9.414 14.836 9.75 15.25 9.75H17.25V11.75C17.25 12.164 17.586 12.5 18 12.5C18.414 12.5 18.75 12.164 18.75 11.75V9.75H20.75C21.164 9.75 21.5 9.414 21.5 9C21.5 8.586 21.164 8.25 20.75 8.25H18.75V6.25Z" fill="currentColor" stroke="none"/></svg>',
      x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
      spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Zm6 12 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
      login: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-7A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h7a1.5 1.5 0 0 0 1.5-1.5V17m-4-5h10m0 0-3-3m3 3-3 3"/></svg>',
      logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5V17m4-5H4m0 0 3-3m-3 3 3 3"/></svg>',
      sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2M4.6 4.6 6 6m12 12 1.4 1.4M2.5 12h2m15 0h2M4.6 19.4 6 18m12-12 1.4-1.4"/></svg>',
      moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" fill-rule="evenodd" clip-rule="evenodd" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.598.748-3.752a.75.75 0 0 0-.955-.955A11.24 11.24 0 0 0 1.5 11.25 11.25 11.25 0 0 0 12.75 22.5a11.24 11.24 0 0 0 9.957-6.543.75.75 0 0 0-.955-.955Z"/></svg>',
    };
    return icons[name] || "";
  }

  function subjectEmoji(subject) {
    const map = {
      matematyka: "🖩",
      fizyka: "🛰️",
      angielski: "💬",
      informatyka: "💻",
    };
    return map[subject.slug] || "📚";
  }

  function subjectIconName(subject) {
    const map = {
      matematyka: "calculator",
      fizyka: "physicsRelaxed",
      angielski: "message",
      informatyka: "code",
    };
    return map[subject.slug] || "book";
  }

  function nav(path) {
    const user = currentUser();
    const theme = getTheme();
    const active = (prefix) => (path === prefix || path.startsWith(`${prefix}/`) ? "active" : "");
    const navVisibility = state.settings && state.settings.navVisibility ? state.settings.navVisibility : defaultNavVisibility;
    const navItems = [
      ["start", "#/", path === "/" ? "active" : "", iconSvg("home"), "Start"],
      ["subjects", "#/subjects", active("/subjects"), iconSvg("book"), "Przedmioty"],
      ["ranking", "#/ranking", path === "/ranking" ? "active" : "", iconSvg("chart"), "Ranking"],
      ["contact", "#/contact", path === "/contact" ? "active" : "", iconSvg("mail"), "Kontakt"],
    ].filter(([key]) => navVisibility[key] !== false || isAdmin(user));
    const renderNavItem = ([key, href, activeClass, icon, label]) => {
      if (key !== "subjects") {
        return `<a class="nav-link ${activeClass}" href="${href}">${icon} ${label}</a>`;
      }
      return `
        <div class="nav-dropdown">
          <a class="nav-link ${activeClass}" href="${href}" aria-haspopup="true" aria-expanded="false">${icon} ${label}</a>
          <div class="nav-menu nav-subject-mode-menu" role="menu" aria-label="Przedmioty: zadania i arkusze">
            <a class="nav-menu-item" href="#/subjects?mode=tasks" role="menuitem">${iconSvg("file")} zadania</a>
            <a class="nav-menu-item" href="#/subjects?mode=exam" role="menuitem">${iconSvg("grid")} arkusze</a>
          </div>
        </div>
      `;
    };
    return `
      <header class="topbar">
        <nav class="nav" aria-label="Główna nawigacja">
          <a class="brand" href="#/">
            <span class="brand-mark">${brandLogoSvg()}</span>
            <span>Arkuszownik</span>
          </a>
          <div class="nav-links">
            ${navItems
        .map(renderNavItem)
        .join("")}
          </div>
          <div class="nav-actions">
            <button class="icon-btn theme-toggle" type="button" data-action="toggle-theme" aria-label="Zmień motyw">
              ${iconSvg(theme === "dark" ? "sun" : "moon")}
            </button>
            ${user
        ? `
                  <a class="user-pill" href="#/profile">
                    <span class="avatar">${escapeHtml(user.username.slice(0, 1))}</span>
                    <span>${escapeHtml(user.username)}</span>
                  </a>
                  ${user.role === "admin" ? `<a class="btn" href="#/admin">Panel admina</a>` : ""}
                  <button class="nav-login" type="button" data-action="logout">${iconSvg("logout")} Wyloguj</button>
                `
        : `
                  <a class="nav-login" href="#/login">${iconSvg("login")} Zaloguj się</a>
                  <a class="btn primary nav-cta" href="#/register">${iconSvg("addUser")} Załóż konto</a>
                `
      }
          </div>
        </nav>
      </header>
    `;
  }

  function shell(content) {
    const route = getRoute();
    const modal = state.editingColorModal ? renderColorEditModal() : "";
    return `<div class="app-shell">${nav(route.path)}<main>${content}</main>${modal}</div>`;
  }

  function renderRoute() {
    const app = document.getElementById("app");
    if (!app) return;

    const route = getRoute();
    const path = route.path;
    let content = "";

    try {
      if (path === "/") content = renderHome();
      else if (path === "/about") content = renderAbout();
      else if (path === "/contact") content = renderContact();
      else if (path === "/ranking") content = renderRanking();
      else if (path === "/login") content = renderLogin();
      else if (path === "/register") content = renderRegister();
      else if (path === "/profile") content = renderProfile();
      else if (path === "/profile/exams") content = renderProfileExamDashboard();
      else if (path.startsWith("/profile/exams/")) content = renderExamAttemptDetail(path.split("/")[3]);
      else if (path.startsWith("/profile/subjects/")) content = renderProfileSubject(path.split("/")[3]);
      else if (path === "/subjects") content = renderSubjectsIndex(route.query);
      else if (path.startsWith("/subjects/")) content = renderSubject(path.split("/")[2], route.query);
      else if (path.startsWith("/tasks/")) content = renderTaskDetail(path.split("/")[2]);
      else if (/^\/exams\/[^/]+\/run$/.test(path)) content = renderExamRun(path.split("/")[2]);
      else if (/^\/exams\/[^/]+\/score$/.test(path)) content = renderExamScoring(path.split("/")[2]);
      else if (path.startsWith("/exams/")) content = renderExamIntro(path.split("/")[2]);
      else if (path === "/admin") content = renderAdminDashboard();
      else if (path === "/admin/subjects") content = renderAdminSubjects();
      else if (path === "/admin/categories") content = renderAdminCategories();
      else if (path === "/admin/colors") content = renderAdminColors();
      else if (path === "/admin/tags") content = renderAdminTags();
      else if (path === "/admin/tasks") content = renderAdminTasks();
      else if (path === "/admin/tasks/new") content = renderAdminTaskForm();
      else if (path === "/admin/tasks/screen") content = renderAdminTaskScreenImport();
      else if (/^\/admin\/tasks\/[^/]+\/edit$/.test(path)) content = renderAdminTaskForm(path.split("/")[3]);
      else if (path === "/admin/exams") content = renderAdminExams();
      else if (path === "/admin/exams/new") content = renderAdminExamForm();
      else if (path === "/admin/exams/import") content = renderAdminExamImport();
      else if (/^\/admin\/exams\/[^/]+\/edit$/.test(path)) content = renderAdminExamForm(path.split("/")[3]);
      else if (path === "/admin/settings") content = renderAdminSettings();
      else content = renderNotFound();

      app.innerHTML = shell(content);
      repairRenderedText(app);
      afterRender();
    } catch (error) {
      console.error("Nie udało się wyrenderować widoku.", error);
      app.innerHTML = renderLoadError();
      repairRenderedText(app);
    }
  }

  function renderLoadError() {
    return `
      <div class="app-shell">
        ${nav(getRoute().path)}
        <main>
          <div class="container">
            <section class="empty-state">
              <h2>Nie udało się wczytać widoku</h2>
              <p class="muted">Odśwież stronę. Szczegóły błędu są dostępne w konsoli przeglądarki.</p>
            </section>
          </div>
        </main>
      </div>
    `;
  }

  function renderHome() {
    const subjectCards = subjectInterestFilteredSubjects().map(renderSubjectCard).join("");
    return `
      <div class="container">
        <section class="hero">
          <div>
            <h1>Ucz się do matury<br />z zadaniami i oceną <span class="accent-text">AI</span></h1>
            <p class="hero-copy">
              Wybieraj przedmioty, rozwiązuj zadania, sprawdzaj punktację i przesyłaj rozwiązania do analizy AI.
            </p>
            <div class="hero-actions">
              <a class="btn primary" href="#/subjects">${iconSvg("rocket")} Rozpocznij naukę</a>
              <a class="btn" href="#/subjects">${iconSvg("book")} Zobacz przedmioty</a>
            </div>
          </div>
          <div class="hero-preview" aria-label="Podgląd zadania">
            <div class="preview-top">
              <div>
                <span class="preview-label">${iconSvg("spark")} Zadanie maturalne</span>
                <strong>Funkcja kwadratowa</strong>
              </div>
              <span class="status partial">3/4 pkt</span>
            </div>
            <div class="preview-lines">
              <span style="width: 92%"></span>
              <span style="width: 76%"></span>
              <span style="width: 58%"></span>
            </div>
            <div class="preview-metrics">
              <div>
                ${iconSvg("spark")}
                <span>Trudność</span>
                <strong>★★★</strong>
              </div>
              <div>
                ${iconSvg("target")}
                <span>Maks. punkty</span>
                <strong>4 pkt</strong>
              </div>
              <div>
                ${iconSvg("check")}
                <span>Twój wynik</span>
                <strong>3 pkt</strong>
              </div>
            </div>
            <div class="preview-progress">
              <span>Twój postęp w matematyce</span>
              <div class="progress-bar"><div class="progress-fill" style="width: 74%"></div></div>
              <strong>74%</strong>
            </div>
          </div>
        </section>

        <section class="section" id="subjects">
          <div class="subjects-heading">
            ${iconSvg("book")}
            <h2>Wybierz przedmiot</h2>
            <p class="muted">Przejdź do interesującego Cię przedmiotu i zacznij ćwiczyć.</p>
          </div>
          <div class="subjects-stage">
            <div class="subjects-grid">${subjectCards}</div>
          </div>
        </section>
      </div>
    `;
  }

  function renderSubjectCard(subject, mode = "") {
    const levels = subjectLevels(subject.id);
    const taskCount = subjectTaskCount(subject.id, isAdmin());
    const sheetCount = visibleExamSheets(subject.id).length;
    const modeQuery = mode ? `?mode=${mode}` : "";
    return `
      <a class="subject-card subject-card-${subject.slug}" href="#/subjects/${subject.slug}${modeQuery}" data-subject-name="${escapeHtml(subject.name)}"${subjectStyleAttr(subject)}>
        <div class="subject-card-emoji" aria-hidden="true">${subjectEmoji(subject)}</div>
        <div class="subject-card-main">
          <span class="subject-icon">${iconSvg(subjectIconName(subject))}</span>
          <strong class="subject-name">${escapeHtml(subject.name)}</strong>
          <div class="chip-row">
            ${levels.map((level) => `<span class="level-badge">${escapeHtml(level.name)}</span>`).join("")}
          </div>
        </div>
        <div class="subject-card-foot">
          <div class="subject-meta">
            <span>${iconSvg("sheetCustom")} ${sheetCount} ${sheetCount === 1 ? "arkusz" : "arkuszy"}</span>
            <span>${iconSvg("book")} ${taskCount} ${taskCount === 1 ? "zadanie" : "zadań"}</span>
          </div>
          <span class="subject-arrow">${iconSvg("arrow")}</span>
        </div>
      </a>
    `;
  }

  function levelSwitchLink(subject, levels, selectedLevel, mode = "") {
    const otherLevels = levels.filter((level) => level.id !== selectedLevel.id);
    if (!otherLevels.length) return "";
    const targetLevel = otherLevels[0];
    const modeQuery = mode ? `?mode=${mode}&level=${targetLevel.slug}` : `?level=${targetLevel.slug}`;
    return `<a class="btn" href="#/subjects/${subject.slug}${modeQuery}">Zmień poziom na ${escapeHtml(targetLevel.name.toLowerCase())}</a>`;
  }

  function renderAbout() {
    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">O stronie</h1>
            <p class="muted">Arkuszownik to prototyp MVP aplikacji do nauki matury z zadaniami, punktacją i oceną AI.</p>
          </div>
        </div>
        <div class="grid grid-3">
          <div class="card">
            <h3>Uczeń</h3>
            <p class="muted">Wybór przedmiotu, filtrowanie zadań, rozwiązywanie, upload i historia wyników.</p>
          </div>
          <div class="card">
            <h3>AI</h3>
            <p class="muted">Ocena jest zwracana jako JSON i rozbita na kryteria punktacji przypisane do zadania.</p>
          </div>
          <div class="card">
            <h3>Admin</h3>
            <p class="muted">Panel pozwala zarządzać przedmiotami, kategoriami, tagami, zadaniami i konfiguracją sprawdzania.</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderRanking() {
    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">Ranking</h1>
            <p class="muted">Ranking jest poza zakresem MVP, więc ten widok jest przygotowany jako miejsce na przyszłą funkcję.</p>
          </div>
        </div>
        <div class="empty-state">
          <h2>Ranking zostanie dodany później</h2>
          <p class="muted">W pierwszej wersji priorytetem są zadania, ocena AI, profil i panel administratora.</p>
        </div>
      </div>
    `;
  }

  function renderContact() {
    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">Kontakt</h1>
            <p class="muted">Miejsce na kontakt z administracją Arkuszownika.</p>
          </div>
        </div>
        <div class="grid grid-2">
          <section class="panel">
            <h2>Kontakt</h2>
            <p class="muted">W MVP ten widok jest gotowy pod formularz kontaktowy i zgłoszenia błędów.</p>
          </section>
          <section class="panel">
            <h2>Dane</h2>
            <div class="grid" style="margin-top: 14px">
              <div class="split"><span class="muted">Email</span><strong>kontakt@arkuszownik.pl</strong></div>
              <div class="split"><span class="muted">Tematy</span><strong>konto, zadania, panel admina</strong></div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderLogin(message = "") {
    return `
      <div class="container auth-page">
        <section class="auth-card">
          <h1>Logowanie</h1>
          <p class="muted">Konta testowe: admin@arkuszownik.pl/admin123 albo user@arkuszownik.pl/user123.</p>
          ${message ? `<div class="error-box">${escapeHtml(message)}</div>` : ""}
          <form id="loginForm" class="form-grid">
            <label>
              <span class="field-label">Email</span>
              <input class="input" name="email" type="email" required autocomplete="email" />
            </label>
            <label>
              <span class="field-label">Hasło</span>
              <input class="input" name="password" type="password" required autocomplete="current-password" />
            </label>
            <button class="btn primary full" type="submit">Zaloguj się</button>
            <a class="btn full" href="#/register">Załóż konto</a>
          </form>
        </section>
      </div>
    `;
  }

  function renderRegister(message = "") {
    return `
      <div class="container auth-page">
        <section class="auth-card">
          <h1>Rejestracja</h1>
          <p class="muted">Konto użytkownika zapisuje się lokalnie w przeglądarce.</p>
          ${message ? `<div class="error-box">${escapeHtml(message)}</div>` : ""}
          <form id="registerForm" class="form-grid">
            <label>
              <span class="field-label">Nazwa użytkownika</span>
              <input class="input" name="username" required maxlength="40" />
            </label>
            <label>
              <span class="field-label">Email</span>
              <input class="input" name="email" type="email" required autocomplete="email" />
            </label>
            <label>
              <span class="field-label">Hasło</span>
              <input class="input" name="password" type="password" required minlength="4" autocomplete="new-password" />
            </label>
            <label>
              <span class="field-label">Potwierdzenie hasła</span>
              <input class="input" name="passwordConfirm" type="password" required minlength="4" autocomplete="new-password" />
            </label>
            <button class="btn primary full" type="submit">Utwórz konto</button>
            <a class="btn full" href="#/login">Mam już konto</a>
          </form>
        </section>
      </div>
    `;
  }

  function renderSubjectInterestPicker(subjects, interestedIds) {
    const activeIds = new Set(interestedIds || subjects.map((subject) => subject.id));
    return `
      <div class="subject-interest-panel">
        <div>
          <strong>Interesujące przedmioty</strong>
          <p class="muted">Zaznaczone przedmioty będą widoczne na tej liście dla tego użytkownika.</p>
        </div>
        <div class="subject-interest-list">
          ${subjects
        .map(
          (subject) => `
            <label class="check-item subject-interest-option" style="${escapeHtml(subjectStyle(subject))}">
              <input type="checkbox" data-action="subject-interest-toggle" value="${subject.id}" ${activeIds.has(subject.id) ? "checked" : ""} />
              ${escapeHtml(subject.name)}
            </label>
          `
        )
        .join("")}
        </div>
        <div class="button-row">
          <button class="btn" type="button" data-action="subject-interests-all">${iconSvg("check")} Pokaż wszystkie</button>
          <button class="btn" type="button" data-action="toggle-subject-interests">Zamknij</button>
        </div>
      </div>
    `;
  }

  function renderSubjectsIndex(queryParams = new URLSearchParams()) {
    const requestedMode = queryParams.get("mode");
    const subjectMode = requestedMode === "exam" ? "exam" : requestedMode === "tasks" ? "tasks" : "";
    const allSubjects = visibleSubjects();
    const interestedIds = getInterestedSubjectIds();
    const selectedCount = interestedIds
      ? allSubjects.filter((subject) => interestedIds.includes(subject.id)).length
      : allSubjects.length;
    const query = normalizeText(subjectListState.query);
    const subjects = subjectInterestFilteredSubjects()
      .filter((subject) => !query || normalizeText(subject.name).includes(query))
      .sort((a, b) => {
        if (subjectListState.sort === "alphabetical") return a.name.localeCompare(b.name, "pl");
        return subjectTaskCount(b.id) - subjectTaskCount(a.id);
      });
    return `
      <div class="container">
        <div class="subjects-page-head">
          <div>
            <h1 class="page-title">Przedmioty</h1>
            <p class="muted">Wybierz przedmiot maturalny i zacznij rozwiązywać zadania dostosowane do poziomu i kategorii.</p>
          </div>
          <label class="search-box">
            ${iconSvg("search")}
            <input type="search" value="${escapeHtml(subjectListState.query)}" placeholder="Szukaj przedmiotu..." aria-label="Szukaj przedmiotu" data-action="subject-search" />
          </label>
        </div>
        <div class="subjects-controls">
          <label class="sort-control">
            <span>Sortowanie:</span>
            <select class="select" aria-label="Sortowanie przedmiotów" data-action="subject-sort">
              <option value="popular" ${subjectListState.sort === "popular" ? "selected" : ""}>Popularne</option>
              <option value="alphabetical" ${subjectListState.sort === "alphabetical" ? "selected" : ""}>Alfabetycznie</option>
            </select>
          </label>
          <button class="btn subject-interest-toggle ${subjectListState.interestsOpen ? "active" : ""}" type="button" data-action="toggle-subject-interests">
            ${iconSvg("filter")} Przedmioty: ${interestedIds ? selectedCount : "wszystkie"}
          </button>
        </div>
        ${subjectListState.interestsOpen ? renderSubjectInterestPicker(allSubjects, interestedIds) : ""}
        <div class="subjects-stage">
          ${subjects.length
        ? `<div class="subjects-grid">${subjects.map((subject) => renderSubjectCard(subject, subjectMode)).join("")}</div>`
        : `<div class="empty-state"><h2>Brak przedmiotów</h2><p class="muted">Zmień frazę wyszukiwania.</p></div>`
      }
        </div>
        <div class="feature-strip">
          <div>${iconSvg("target")} <strong>Dopasowane zadania</strong><span>Filtry i kategorie dobrane do poziomu</span></div>
          <div>${iconSvg("chart")} <strong>Śledź postępy</strong><span>Wyniki, statystyki i rozwój</span></div>
          <div>${iconSvg("shield")} <strong>Bezpieczne i prywatne</strong><span>Twoje dane pozostają u Ciebie</span></div>
        </div>
      </div>
    `;
  }

  function renderSubject(slug, query) {
    const subject = state.subjects.find((item) => item.slug === slug);
    if (!subject) return renderNotFound();
    if (!canSeeSubject(subject)) return renderForbidden("Ten przedmiot jest prywatny.");

    const levels = subjectLevels(subject.id);
    const levelFromQuery = query.get("level");
    const selectedLevel =
      levels.find((level) => level.slug === levelFromQuery || level.id === levelFromQuery) ||
      (levels.length === 1 ? levels[0] : null);

    if (levels.length > 1 && !selectedLevel) {
      return renderLevelChoice(subject, levels, query.get("mode") || "");
    }

    if (!selectedLevel) return renderNotFound();

    const mode = query.get("mode") || "tasks";
    if (!["tasks", "exam"].includes(mode)) return renderNotFound();
    if (mode === "exam") {
      return renderExamList(subject, selectedLevel, levels);
    }
    const key = `${subject.slug}:${selectedLevel.id}`;
    const filters = filterState[key] || {
      difficulty: [],
      categories: [],
      tags: [],
      status: "all",
      sort: "newest",
    };

    const subjectCategories = state.categories.filter(
      (category) =>
        category.subjectId === subject.id && (!category.levelId || category.levelId === selectedLevel.id)
    );
    const tasks = filteredTasks(subject.id, selectedLevel.id, filters);
    const filtersOpen = openFilterKey === key;

    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">${escapeHtml(subject.name)}</h1>
            <p class="muted">Poziom: ${escapeHtml(selectedLevel.name)}</p>
          </div>
          <div class="button-row">
            ${levels.length > 1 ? levelSwitchLink(subject, levels, selectedLevel, "tasks") : ""}
            <a class="btn" href="#/subjects/${subject.slug}?mode=exam&level=${selectedLevel.slug}">${iconSvg("sheetCustom")} Arkusze</a>
          </div>
        </div>

        <section class="task-browser">
          <div class="task-toolbar">
            <div>
              <h2>Zadania</h2>
              <p class="muted">${tasks.length} wyników dla poziomu ${escapeHtml(selectedLevel.name)}.</p>
            </div>
            <button class="btn filter-toggle" type="button" data-action="toggle-filters" data-filter-key="${key}">
              ${iconSvg("filter")} Filtry
            </button>
          </div>

          <div class="filter-overlay ${filtersOpen ? "open" : ""}" data-filter-key="${key}">
            <div class="filter-panel filter-modal" id="filtersPanel">
              <div class="filter-modal-head">
                <div>
                  <h2>Filtry</h2>
                  <p class="muted">Dopasuj listę zadań do tematu i poziomu.</p>
                </div>
                <button class="icon-btn" type="button" data-action="close-filters" data-filter-key="${key}" aria-label="Zamknij filtry">${iconSvg("x")}</button>
              </div>
              <form id="filtersForm" data-subject="${subject.id}" data-level="${selectedLevel.id}" data-key="${key}">
              <div class="field-group">
                <span class="field-label">Trudność</span>
                <div class="star-filter">
                  ${[1, 2, 3]
        .map(
          (value) => `
                        <label class="star-option ${filters.difficulty.includes(String(value)) ? "active" : ""}">
                          <input type="checkbox" data-filter="difficulty" value="${value}" ${filters.difficulty.includes(String(value)) ? "checked" : ""}/>
                          <span>${"★".repeat(value)}${"☆".repeat(3 - value)}</span>
                        </label>`
        )
        .join("")}
                </div>
              </div>

              <div class="filter-grid">
                <div class="combo-filter">
                  <label class="field-label" for="categorySearch">Kategorie</label>
                  <input class="input" id="categorySearch" type="search" placeholder="Wpisz kategorię..." data-action="filter-options" data-target="categoryOptions" />
                  <div class="option-list" id="categoryOptions">
                  ${subjectCategories
        .map(
          (category) => `
                        <label class="check-item option-item">
                          <input type="checkbox" data-filter="category" value="${category.id}" ${filters.categories.includes(category.id) ? "checked" : ""}/>
                          ${escapeHtml(category.name)}
                        </label>`
        )
        .join("")}
                  </div>
                </div>

                <div class="combo-filter">
                  <label class="field-label" for="tagSearch">Tagi</label>
                  <input class="input" id="tagSearch" type="search" placeholder="Wpisz tag..." data-action="filter-options" data-target="tagOptions" />
                  <div class="option-list" id="tagOptions">
                  ${state.tags
        .map(
          (tag) => `
                        <label class="check-item option-item">
                          <input type="checkbox" data-filter="tag" value="${tag.id}" ${filters.tags.includes(tag.id) ? "checked" : ""}/>
                          ${escapeHtml(tag.name)}
                        </label>`
        )
        .join("")}
                  </div>
                </div>
              </div>

              <div class="field-group">
                <span class="field-label">Status</span>
                <div class="status-filter-grid">
                  ${[
        ["all", "wszystkie"],
        ["solved", "rozwiązane"],
        ["unsolved", "nierozwiązane"],
      ]
        .map(
          ([value, label]) => `
                        <label class="status-option ${filters.status === value ? "active" : ""}">
                          <input type="radio" name="taskStatus" data-filter="status" value="${value}" ${filters.status === value ? "checked" : ""}/>
                          <span>${escapeHtml(label)}</span>
                        </label>`
        )
        .join("")}
                </div>
              </div>

              <div class="field-group">
                <label>
                  <span class="field-label">Sortowanie</span>
                  <select class="select" data-filter="sort">
                    ${[
        ["newest", "najnowsze"],
        ["easiest", "najłatwiejsze"],
        ["hardest", "najtrudniejsze"],
        ["best", "najlepiej oceniane"],
        ["popular", "najczęściej rozwiązywane"],
      ]
        .map(
          ([value, label]) => `<option value="${value}" ${filters.sort === value ? "selected" : ""}>${label}</option>`
        )
        .join("")}
                  </select>
                </label>
              </div>
              <div class="modal-actions">
                <button class="btn" type="button" data-action="reset-filters" data-filter-key="${key}">Wyczyść filtry</button>
                <button class="btn primary" type="button" data-action="apply-filters" data-filter-key="${key}">${iconSvg("check")} Zastosuj filtry</button>
              </div>
              </form>
            </div>
          </div>

          ${tasks.length
        ? `<div class="task-list">${tasks.map(renderTaskCard).join("")}</div>`
        : `<div class="empty-state"><h2>Brak zadań dla filtrów</h2><p class="muted">Zmień kategorię, tag albo poziom trudności.</p></div>`
      }
        </section>
      </div>
    `;
  }

  function renderSubjectModeChoice(subject, selectedLevel = null, levels = subjectLevels(subject.id)) {
    const activeLevel = selectedLevel || (levels.length === 1 ? levels[0] : null);
    const levelQuery = activeLevel ? `&level=${activeLevel.slug}` : "";
    const publicTasks = state.tasks.filter(
      (task) =>
        canSeeTask(task) &&
        task.subjectId === subject.id &&
        (!activeLevel || task.levelId === activeLevel.id)
    );
    const publicSheets = visibleExamSheets(subject.id, activeLevel ? activeLevel.id : "");
    const categoryCount = state.categories.filter(
      (category) => category.subjectId === subject.id && (!activeLevel || !category.levelId || category.levelId === activeLevel.id)
    ).length;
    return `
      <div class="container">
        <div class="level-choice-head">
          <h1 class="page-title">${escapeHtml(subject.name)}</h1>
          <p class="muted">${activeLevel ? `Poziom: ${escapeHtml(activeLevel.name)}. ` : ""}Wybierz tryb nauki i przejdź dalej.</p>
          ${levels.length > 1 && activeLevel ? `<a class="btn" href="#/subjects/${subject.slug}">Zmień poziom</a>` : ""}
        </div>
        <div class="mode-choice-grid">
          <a class="level-choice-card mode-tasks-card subject-card-${subject.slug}" href="#/subjects/${subject.slug}?mode=tasks${levelQuery}" data-texture="zadania  cwiczenia  lista" ${subjectStyleAttr(subject)}>
            <strong>Zadania</strong>
            <p class="muted">Ćwicz pojedyncze zadania, filtruj kategorie i sprawdzaj rozwiązania.</p>
            <span class="level-card-line"></span>
            <div class="level-card-bottom">
              <span>${iconSvg("book")} ${publicTasks.length} zadań</span>
              <span>${iconSvg("level")} ${categoryCount} kategorii</span>
              <span class="level-card-arrow">${iconSvg("arrow")}</span>
              <span class="level-card-hint">Przejdź do zadań</span>
            </div>
          </a>
          <a class="level-choice-card exam-mode-card subject-card-${subject.slug}" href="#/subjects/${subject.slug}?mode=exam${levelQuery}" data-texture="arkusz  timer  wynik" ${subjectStyleAttr(subject)}>
            <strong>Arkusze</strong>
            <p class="muted">Wybierz arkusz, uruchom limit czasu i przejdź zadanie po zadaniu.</p>
            <span class="level-card-line"></span>
            <div class="level-card-bottom">
              <span>${iconSvg("sheetCustom")} ${publicSheets.length} arkusz${publicSheets.length === 1 ? "" : "y"}</span>
              <span>${iconSvg("clockCustom")} pomiar czasu</span>
              <span class="level-card-arrow">${iconSvg("arrow")}</span>
              <span class="level-card-hint">Wybierz arkusz</span>
            </div>
          </a>
        </div>
      </div>
    `;
  }

  function renderLevelChoice(subject, levels, mode = "") {
    return `
      <div class="container">
        <div class="level-choice-head">
          <h1 class="page-title">${escapeHtml(subject.name)}</h1>
          <p class="muted">Wybierz poziom matury, a potem zdecyduj, czy chcesz robić zadania czy arkusz.</p>
        </div>
        <div class="level-choice-grid">
          ${levels
        .map((level) => {
          const taskCount = state.tasks.filter(
            (task) => canSeeTask(task) && task.subjectId === subject.id && task.levelId === level.id
          ).length;
          const sheetCount = visibleExamSheets(subject.id, level.id).length;
          const categoryCount = state.categories.filter(
            (category) => category.subjectId === subject.id && (!category.levelId || category.levelId === level.id)
          ).length;
          return `
                <a class="level-choice-card level-choice-${level.slug} subject-card-${subject.slug}" href="#/subjects/${subject.slug}?${mode === "exam" || mode === "tasks" ? `mode=${mode}&` : ""}level=${level.slug}" data-texture="${escapeHtml(level.name)}" ${subjectStyleAttr(subject)}>
                  <strong>${escapeHtml(level.name)}</strong>
                  <span class="level-card-line"></span>
                  <div class="level-card-bottom">
                    <span>${iconSvg("level")} ${categoryCount} kategorii</span>
                    <span>${iconSvg("book")} ${taskCount} ${taskCount === 1 ? "zadanie" : "zadań"}</span>
                    <span>${iconSvg("chart")} ${sheetCount} ${sheetCount === 1 ? "arkusz" : "arkuszy"}</span>
                    <span class="level-card-arrow">${iconSvg("arrow")}</span>
                    <span class="level-card-hint">Wybierz poziom</span>
                  </div>
                </a>
              `;
        })
        .join("")}
        </div>
      </div>
    `;
  }

  function renderExamList(subject, selectedLevel, levels) {
    const sheets = visibleExamSheets(subject.id, selectedLevel.id);
    const user = currentUser();
    const searchKey = `${subject.slug}:${selectedLevel.id}`;
    const searchQuery = examSearchState[searchKey] || "";
    const normalizedQuery = normalizeText(searchQuery);
    const filteredSheets = normalizedQuery
      ? sheets.filter((sheet) => normalizeText(`${sheet.title} ${sheet.description || ""}`).includes(normalizedQuery))
      : sheets;
    return `
      <div class="container">
        <div class="page-head exam-list-head">
          <div>
            <h1 class="page-title">Arkusze</h1>
            <p class="muted">${escapeHtml(subject.name)} · ${escapeHtml(selectedLevel.name)} · wybierz arkusz próbny.</p>
          </div>
          <div class="button-row">
            ${levels.length > 1 ? levelSwitchLink(subject, levels, selectedLevel, "exam") : ""}
            <a class="btn" href="#/subjects/${subject.slug}?mode=tasks&level=${selectedLevel.slug}">${iconSvg("book")} Zadania</a>
          </div>
        </div>
        ${sheets.length
        ? `<div class="exam-controls">
                <label class="search-box exam-search-box">
                  ${iconSvg("search")}
                  <input type="search" value="${escapeHtml(searchQuery)}" placeholder="Szukaj arkusza..." aria-label="Szukaj arkusza" data-action="exam-search" data-search-key="${escapeHtml(searchKey)}" />
                </label>
              </div>`
        : ""
      }
        ${filteredSheets.length
        ? `<div class="exam-grid">${filteredSheets.map(renderExamSheetCard).join("")}</div>`
        : sheets.length
          ? `<div class="empty-state"><h2>Brak arkuszy dla wyszukiwania</h2><p class="muted">Zmień wpisaną nazwę albo wyczyść pole wyszukiwania.</p></div>`
          : `<div class="empty-state"><h2>Brak arkuszy</h2><p class="muted">Admin może dodać arkusz w panelu administracyjnym.</p></div>`
      }
      </div>
    `;
  }

  function subjectExamAttempts(subject, level, user) {
    return state.examAttempts
      .filter(
        (attempt) =>
          attempt.userId === user.id &&
          attempt.subjectId === subject.id &&
          (!level || attempt.levelId === level.id)
      )
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
  }

  function renderSubjectExamProgress(subject, level, user) {
    const attempts = subjectExamAttempts(subject, level, user);
    const best = attempts.reduce((value, attempt) => Math.max(value, attempt.percent || 0), 0);
    const avg = attempts.length
      ? Math.round(attempts.reduce((sum, attempt) => sum + Number(attempt.percent || 0), 0) / attempts.length)
      : 0;
    const latest = attempts[0] ? attempts[0].percent : 0;
    const recent = attempts.slice(0, 6).reverse();
    return `
      <section class="profile-block exam-progress-panel section">
        <div class="section-head">
          <div>
            <h2>Postęp z arkuszy</h2>
            <p class="muted">${escapeHtml(subject.name)} · ${escapeHtml(level.name)} · wykres ostatnich podejść.</p>
          </div>
          <strong>${avg}% średnio</strong>
        </div>
        <div class="grid grid-3">
          <div class="stat-card"><span class="muted small">Podejścia</span><span class="stat-value">${attempts.length}</span></div>
          <div class="stat-card"><span class="muted small">Najlepszy wynik</span><span class="stat-value">${best}%</span></div>
          <div class="stat-card"><span class="muted small">Ostatni wynik</span><span class="stat-value">${latest}%</span></div>
        </div>
        ${recent.length
        ? `<div class="exam-progress-bars">
                ${recent
          .map(
            (attempt) => `
                      <a class="exam-progress-bar" href="#/profile/exams/${attempt.id}" title="${escapeHtml(attempt.sheetTitle)}: ${attempt.percent}%">
                        <span style="height: ${Math.max(8, attempt.percent)}%"></span>
                        <strong>${attempt.percent}%</strong>
                      </a>`
          )
          .join("")}
              </div>`
        : `<div class="empty-state"><p class="muted">Po rozwiązaniu arkusza pojawi się tutaj wykres postępu.</p></div>`
      }
      </section>
    `;
  }

  function renderSubjectExamAttempts(subject, level, user) {
    const attempts = subjectExamAttempts(subject, level, user);
    const key = `${subject.slug}:${level.id}`;
    const search = examAttemptSearchState[key] || "";
    const status = examAttemptStatusState[key] || "all";
    const phrase = normalizeText(search);
    const filtered = attempts.filter((attempt) => {
      const matchesSearch = !phrase || normalizeText(`${attempt.sheetTitle || ""} ${attempt.percent || 0}`).includes(phrase);
      const matchesStatus = status === "all" || scoreStatus(attempt.totalScore, attempt.maxScore) === status;
      return matchesSearch && matchesStatus;
    });
    return `
      <section class="profile-block section">
        <div class="section-head">
          <div>
            <h2>Moje arkusze</h2>
            <p class="muted">Twoje podejścia z wybranego przedmiotu i poziomu.</p>
          </div>
        </div>
        ${attempts.length
        ? `<div class="exam-controls profile-exam-controls">
                <label class="search-box exam-search-box">
                  ${iconSvg("search")}
                  <input type="search" value="${escapeHtml(search)}" placeholder="Filtruj moje arkusze..." aria-label="Filtruj moje arkusze" data-action="exam-attempt-search" data-search-key="${escapeHtml(key)}" />
                </label>
                <select class="select" data-action="exam-attempt-status" data-search-key="${escapeHtml(key)}" aria-label="Status arkusza">
                  <option value="all" ${status === "all" ? "selected" : ""}>Wszystkie wyniki</option>
                  <option value="max" ${status === "max" ? "selected" : ""}>Maksimum</option>
                  <option value="partial" ${status === "partial" ? "selected" : ""}>Częściowe</option>
                  <option value="zero" ${status === "zero" ? "selected" : ""}>Zero</option>
                </select>
              </div>`
        : ""
      }
        ${filtered.length
        ? `<div class="exam-attempt-list">${filtered.map(renderExamAttemptCard).join("")}</div>`
        : attempts.length
          ? `<div class="empty-state"><p class="muted">Brak arkuszy dla wybranego filtra.</p></div>`
          : `<div class="empty-state"><p class="muted">Nie masz jeszcze rozwiązanego arkusza z tego przedmiotu.</p></div>`
      }
      </section>
    `;
  }

  function renderExamAttemptCard(attempt) {
    const sheet = examSheetById(attempt.sheetId);
    const subject = subjectById(attempt.subjectId);
    return `
      <a class="task-card" href="#/profile/exams/${attempt.id}">
        <div class="task-card-top">
          <div>
            <strong>${escapeHtml(attempt.sheetTitle || (sheet ? sheet.title : "Arkusz"))}</strong>
            <div class="small muted">${escapeHtml(subject ? subject.name : "")} · ${new Date(attempt.finishedAt).toLocaleString("pl-PL")} · czas ${formatDuration(attempt.durationSeconds)}</div>
          </div>
          <span class="status ${scoreStatus(attempt.totalScore, attempt.maxScore)}">${attempt.percent}%</span>
        </div>
      </a>
    `;
  }

  function renderExamSheetCard(sheet) {
    const subject = subjectById(sheet.subjectId);
    const level = levelById(sheet.levelId);
    const tasks = examTasks(sheet);
    const maxScore = tasks.reduce((sum, task) => sum + task.maxScore, 0);
    return `
      <a class="exam-card subject-card-${subject ? subject.slug : ""}" href="#/exams/${sheet.id}"${subject ? subjectStyleAttr(subject) : ""}>
        <div class="exam-card-head">
          <span class="exam-level-pill">${escapeHtml(level ? level.name : "")}</span>
          <span class="exam-card-play">${iconSvg("play")}</span>
        </div>
        <div class="exam-card-main">
          <h2>${escapeHtml(sheet.title)}</h2>
          <p class="muted">${escapeHtml(sheet.description || "Arkusz próbny z limitem czasu.")}</p>
        </div>
        <div class="exam-meta">
          <span>${iconSvg("sheetCustom")}<strong>${tasks.length}</strong><small>${tasks.length === 1 ? "zadanie" : "zadań"}</small></span>
          <span>${iconSvg("star")}<strong>${maxScore}</strong><small>pkt</small></span>
          <span>${iconSvg("clock")}<strong>${sheet.durationMinutes || 180}</strong><small>min</small></span>
        </div>
        <div class="exam-card-foot">
          <span>${iconSvg("book")} ${escapeHtml(subject ? subject.name : "")}</span>
        </div>
      </a>
    `;
  }

  function renderExamIntro(sheetId) {
    const sheet = examSheetById(sheetId);
    if (!sheet) return renderNotFound();
    if (!canSeeExamSheet(sheet)) return renderForbidden("Ten arkusz jest prywatny.");
    const user = currentUser();
    const subject = subjectById(sheet.subjectId);
    const level = levelById(sheet.levelId);
    const tasks = examTasks(sheet);
    const maxScore = tasks.reduce((sum, task) => sum + task.maxScore, 0);
    const active = readExamSession();
    const canResume = active && active.sheetId === sheet.id && !active.finishedAt;
    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">${escapeHtml(sheet.title)}</h1>
            <p class="muted">${escapeHtml(subject ? subject.name : "")} · ${escapeHtml(level ? level.name : "")}</p>
          </div>
          <a class="btn" href="#/subjects/${subject ? subject.slug : ""}?mode=exam&level=${level ? level.slug : ""}">Wróć do arkuszy</a>
        </div>
        <section class="exam-intro panel">
          <div>
            <h2>Przebieg symulacji</h2>
            <p class="muted">${escapeHtml(sheet.description || "Rozwiązujesz zadania po kolei, aplikacja mierzy całkowity czas i czas spędzony przy każdym zadaniu.")}</p>
            <div class="exam-meta large">
              <span>${iconSvg("sheetCustom")}<strong>${tasks.length}</strong><small>${tasks.length === 1 ? "zadanie" : "zadań"}</small></span>
              <span>${iconSvg("star")}<strong>${maxScore}</strong><small>pkt</small></span>
              <span>${iconSvg("clockCustom")}<strong>${sheet.durationMinutes || 180}</strong><small>min</small></span>
            </div>
          </div>
        </section>
        ${user
        ? `<div class="button-row section">
                <button class="btn primary" type="button" data-action="start-exam" data-sheet-id="${sheet.id}">${canResume ? "Zacznij od nowa" : "Rozpocznij arkusz"}</button>
                ${canResume ? `<a class="btn" href="#/exams/${sheet.id}/run">Kontynuuj aktywną próbę</a>` : ""}
              </div>`
        : `<div class="info-box section">Zaloguj się, żeby rozpocząć arkusz i zapisać wynik w profilu.</div>`
      }
      </div>
    `;
  }

  function renderExamRun(sheetId) {
    const user = currentUser();
    if (!user) return renderForbidden("Zaloguj się, żeby rozwiązywać arkusze.");
    const sheet = examSheetById(sheetId);
    if (!sheet) return renderNotFound();
    if (!canSeeExamSheet(sheet, user)) return renderForbidden("Ten arkusz jest prywatny.");
    let session = readExamSession();
    if (!session || session.sheetId !== sheet.id) return renderExamIntro(sheet.id);
    session = normalizeExamSession(session, sheet);
    saveExamSession(session);
    if (examRemainingSeconds(session) <= 0) {
      finishExamSession(true);
      return renderExamScoring(sheet.id);
    }
    const tasks = examTasks(sheet);
    const index = Math.max(0, Math.min(tasks.length - 1, Number(session.currentIndex || 0)));
    const task = tasks[index];
    if (!task) return renderExamIntro(sheet.id);
    const subject = subjectById(sheet.subjectId);
    return `
      <div class="container exam-run">
        <div class="exam-run-top">
          <div>
            <span class="chip">${escapeHtml(subject ? subject.name : "")}</span>
            <h1>${escapeHtml(sheet.title)}</h1>
            <p class="muted">Zadanie ${index + 1} z ${tasks.length}</p>
          </div>
          <div class="exam-clock" data-exam-clock>
            <span>Pozostało</span>
            <strong>${formatDuration(examRemainingSeconds(session))}</strong>
          </div>
        </div>
        <div class="exam-run-layout">
          <aside class="exam-sidebar">
            ${tasks
        .map((item, taskIndex) => {
          const spent = taskIndex === index
            ? elapsedForTask(session, item.id)
            : Number(session.taskTimes[item.id] || 0);
          return `
                  <button class="exam-step ${taskIndex === index ? "active" : ""}" type="button" data-action="exam-jump" data-index="${taskIndex}">
                    <span>${taskIndex + 1}. ${escapeHtml(displayTaskTitle(item))}</span>
                    <small>${formatDuration(spent)}</small>
                  </button>`;
        })
        .join("")}
          </aside>
          <section class="${taskContentClass(task)} exam-task-panel">
            <div class="task-card-top">
              <div>
                <h2>${escapeHtml(displayTaskTitle(task))}</h2>
                <div class="task-meta">${starRating(task.difficulty)} · ${task.maxScore} pkt</div>
              </div>
              <span class="status unsolved">${formatDuration(elapsedForTask(session, task.id))}</span>
            </div>
            ${toParagraphs(task.content)}
            ${renderTaskFiles(task.files, true)}
            ${renderExamAnswerPanel(task, session, subject, sheet)}
            <div class="exam-nav">
              <button class="btn" type="button" data-action="exam-prev" ${index === 0 ? "disabled" : ""}>Poprzednie</button>
              <button class="btn" type="button" data-action="exam-next" ${index === tasks.length - 1 ? "disabled" : ""}>Następne</button>
              <button class="btn primary" type="button" data-action="finish-exam">Zakończ arkusz</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderExamAnswerPanel(task, session, subject, sheet) {
    const answer = session.answers && session.answers[task.id] ? session.answers[task.id] : "";
    const done = sheet ? isExamTaskDone(sheet.id, task.id) : false;
    const closedMode = closedAnswerMode(task);
    if (closedMode) {
      return `
        <section class="exam-answer-box">
          <div class="section-head">
            <h3>Twoja odpowiedź</h3>
            <label class="check-item exam-done-toggle">
              <input type="checkbox" data-action="exam-task-done" data-sheet-id="${sheet ? escapeHtml(sheet.id) : ""}" data-task-id="${escapeHtml(task.id)}" ${done ? "checked" : ""} />
              zadanie zrobione
            </label>
          </div>
          ${renderClosedChoiceAnswer(task, answer, closedMode)}
        </section>
      `;
    }
    return `
      <section class="exam-answer-box">
        <div class="section-head">
          <h3>Twoja odpowiedź</h3>
          <label class="check-item exam-done-toggle">
            <input type="checkbox" data-action="exam-task-done" data-sheet-id="${sheet ? escapeHtml(sheet.id) : ""}" data-task-id="${escapeHtml(task.id)}" ${done ? "checked" : ""} />
            zadanie zrobione
          </label>
        </div>
        ${supportsLatexKeyboard(subject) ? renderLatexToolbar() : ""}
        <div class="latex-editor">
          <textarea
            class="textarea exam-answer-textarea"
            data-action="exam-answer"
            data-exam-answer
            data-task-id="${escapeHtml(task.id)}"
            data-preview-id="exam_answer_preview_${task.id}"
            placeholder="Wpisz odpowiedź, tok rozumowania albo obliczenia. LaTeX możesz pisać np. a_k=k_i+s_x, \\sqrt{16}, \\frac{1}{2}."
          >${escapeHtml(answer)}</textarea>
          <div class="latex-preview-head">
            <span class="field-label">Podgląd odpowiedzi</span>
          </div>
          <div class="latex-preview task-content" id="exam_answer_preview_${task.id}" data-exam-answer-preview data-latex-preview>
            ${answer.trim() ? toParagraphs(answer) : `<p class="muted">Podgląd pojawi się po wpisaniu odpowiedzi.</p>`}
          </div>
        </div>
      </section>
    `;
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  }

  function inferTaskTypeFromContent(content) {
    return closedAnswerMode({ content }) ? "closed" : "ai_open";
  }

  function closedAnswerMode(task) {
    const content = stripHtml(task && task.content);
    const config = task && task.checkerConfig ? task.checkerConfig : {};
    if (config.answerMode === "abcd" || config.answerMode === "pf") return config.answerMode;
    if (looksLikePfTask(content)) return "pf";
    if (extractAbcdOptions(content).length >= 2) return "abcd";
    return "";
  }

  function isClosedChoiceTask(task) {
    return Boolean(task && (task.type === "closed" || closedAnswerMode(task)));
  }

  function extractAbcdOptions(content) {
    const text = stripHtml(content).replace(/\r\n/g, "\n");
    const marker = /(^|[\n\s])([A-D])[\.)]\s+/g;
    const matches = [];
    let match;
    while ((match = marker.exec(text))) {
      matches.push({ key: match[2], index: match.index + match[1].length, end: marker.lastIndex });
    }
    if (matches.length < 2) return [];
    return matches
      .map((item, index) => {
        const next = matches[index + 1];
        return { key: item.key, text: text.slice(item.end, next ? next.index : text.length).trim() };
      })
      .filter((item) => item.text || item.key);
  }

  function looksLikePfTask(content) {
    const plain = stripHtml(content);
    const text = normalizeText(plain);
    return /\bP\s*F\b/.test(plain) || text.includes("prawda falsz");
  }

  function inferPfRowCount(content) {
    const text = stripHtml(content).replace(/\r\n/g, "\n");
    const explicitRows = text.match(/(?:^|\n)\s*\d+[\.)].*?\bP\s*F\b/gi);
    if (explicitRows && explicitRows.length > 1) return explicitRows.length;
    const numberedStatements = text.match(/(?:^|\n)\s*\d+[\.)]\s+\S/g);
    if (numberedStatements && /\bP\s*F\b/i.test(text) && numberedStatements.length > 1) return Math.min(6, numberedStatements.length);
    return 1;
  }

  function normalizeClosedAnswer(value) {
    return String(value || "").toUpperCase().replace(/[^A-DPF]/g, "");
  }

  function renderClosedChoiceAnswer(task, answer, mode) {
    const value = normalizeClosedAnswer(answer);
    if (mode === "pf") return renderPfAnswer(task, value);
    return renderAbcdAnswer(task, value);
  }

  function renderAbcdAnswer(task, value) {
    const options = extractAbcdOptions(task.content);
    const fallback = ["A", "B", "C", "D"].map((key) => ({ key, text: "" }));
    const rows = (options.length ? options : fallback).slice(0, 6);
    return `
      <div class="closed-answer-panel" data-closed-mode="abcd">
        <input type="hidden" data-exam-answer data-task-id="${escapeHtml(task.id)}" value="${escapeHtml(value)}" />
        <div class="closed-choice-grid">
          ${rows.map((option) => `
            <button class="closed-choice ${value === option.key ? "selected" : ""}" type="button" data-action="choose-closed-answer" data-task-id="${escapeHtml(task.id)}" data-answer="${escapeHtml(option.key)}">
              <strong>${escapeHtml(option.key)}</strong>
              ${option.text ? `<span>${preparePlainTextForMath(option.text)}</span>` : ""}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderPfAnswer(task, value) {
    const count = inferPfRowCount(task.content);
    const normalized = value.replace(/[^PF]/g, "");
    return `
      <div class="closed-answer-panel" data-closed-mode="pf">
        <input type="hidden" data-exam-answer data-task-id="${escapeHtml(task.id)}" value="${escapeHtml(normalized)}" />
        <div class="pf-choice-list">
          ${Array.from({ length: count }).map((_, index) => {
      const selected = normalized[index] || "";
      return `
              <div class="pf-choice-row">
                ${count > 1 ? `<span class="pf-choice-index">${index + 1}</span>` : ""}
                <button class="closed-choice pf-choice ${selected === "P" ? "selected" : ""}" type="button" data-action="choose-pf-answer" data-task-id="${escapeHtml(task.id)}" data-pf-index="${index}" data-answer="P">Prawda</button>
                <button class="closed-choice pf-choice ${selected === "F" ? "selected" : ""}" type="button" data-action="choose-pf-answer" data-task-id="${escapeHtml(task.id)}" data-pf-index="${index}" data-answer="F">Fałsz</button>
              </div>
            `;
    }).join("")}
        </div>
      </div>
    `;
  }

  function supportsLatexKeyboard(subject) {
    return Boolean(subject && ["matematyka", "fizyka"].includes(subject.slug));
  }

  function renderVisualEquationTools() {
    return `
      <div class="visual-tools-grid">
        <div class="fraction-builder-visual">
          <div class="builder-controls">
            <div class="fraction-box">
              <div class="fraction-numerator" contenteditable="true" data-fraction-numerator placeholder="licznik"></div>
              <div class="fraction-bar"></div>
              <div class="fraction-denominator" contenteditable="true" data-fraction-denominator placeholder="mianownik"></div>
            </div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-fraction">Wstaw</button>
        </div>

        <div class="root-builder-visual">
          <div class="builder-controls">
            <div class="root-symbol">√</div>
            <div class="root-box" contenteditable="true" data-root-content placeholder="liczba"></div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-root">Wstaw</button>
        </div>

        <div class="power-builder-visual">
          <div class="builder-controls">
            <div class="base-box" contenteditable="true" data-power-base placeholder="pod"></div>
            <div class="exponent-box" contenteditable="true" data-power-exponent placeholder="x²"></div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-power">Wstaw</button>
        </div>

        <div class="log-builder-visual">
          <div class="builder-controls">
            <span>log</span>
            <div class="log-base" contenteditable="true" data-log-base placeholder="a"></div>
            <div class="log-arg" contenteditable="true" data-log-arg placeholder="b"></div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-log">Wstaw</button>
        </div>

        <div class="abs-builder-visual">
          <div class="builder-controls">
            <span>|</span>
            <div class="abs-box" contenteditable="true" data-abs-content placeholder="x"></div>
            <span>|</span>
          </div>
          <button class="btn primary small" type="button" data-action="insert-abs">Wstaw</button>
        </div>

        <div class="index-builder-visual">
          <div class="builder-controls">
            <div class="base-box" contenteditable="true" data-index-base placeholder="a"></div>
            <div class="index-box" contenteditable="true" data-index-val placeholder="n"></div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-index">Wstaw</button>
        </div>

        <div class="lim-builder-visual">
          <div class="builder-controls">
            <div class="lim-container">
              <div class="lim-text">lim</div>
              <div class="lim-sub-manual">
                <div class="lim-var" contenteditable="true" data-lim-var placeholder="x"></div>
                <span class="lim-arrow">→</span>
                <div class="lim-to" contenteditable="true" data-lim-to placeholder="∞"></div>
                <div class="lim-side-tools">
                  <button type="button" class="btn-side" data-action="lim-side" data-val="^+">+</button>
                  <button type="button" class="btn-side" data-action="lim-side" data-val="^-">-</button>
                </div>
              </div>
            </div>
            <div class="lim-arg" contenteditable="true" data-lim-arg placeholder="f(x)"></div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-lim">Wstaw</button>
        </div>

        <div class="binom-builder-visual">
          <div class="builder-controls">
            <div class="binom-box">
              <div class="binom-n" contenteditable="true" data-binom-n placeholder="n"></div>
              <div class="binom-k" contenteditable="true" data-binom-k placeholder="k"></div>
            </div>
          </div>
          <button class="btn primary small" type="button" data-action="insert-binom">Wstaw</button>
        </div>
      </div>
      <div class="quick-symbols-bar" style="margin-top: 16px; border-top: 1px solid var(--line); padding-top: 16px;">
        <div style="font-size: 0.85rem; color: var(--muted); margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Przydatne znaki</div>
        <div class="quick-symbols-grid" style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\le">≤</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\ge">≥</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="<">&lt;</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet=">">&gt;</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="+\\infty">+∞</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="-\\infty">-∞</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\infty">∞</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\approx">≈</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\neq">≠</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\pm">±</button>
          <button class="btn surface small" type="button" data-action="insert-latex" data-snippet="\\cdot">·</button>
        </div>
      </div>
    `;
  }

  function renderLatexToolbar() {
    const categories = [
      {
        name: "Logarytmy",
        formulas: [
          ["Definicja", "\\log_{{a}} {b} = {c}", ["a", "b", "c"]],
          ["Suma logarytmów", "\\log_{{a}} ({x} \\cdot {y}) = \\log_{{a}} {x} + \\log_{{a}} {y}", ["a", "x", "y"]],
          ["Różnica logarytmów", "\\log_{{a}} \\frac{{x}}{{y}} = \\log_{{a}} {x} - \\log_{{a}} {y}", ["a", "x", "y"]],
          ["Wzór na potęgę", "\\log_{{a}} {x}^{{k}} = {k} \\cdot \\log_{{a}} {x}", ["a", "x", "k"]],
          ["Zamiana podstawy", "\\log_{{b}} {c} = \\frac{\\log_{{a}} {c}}{\\log_{{a}} {b}}", ["a", "b", "c"]],
          ["Odwrotność podstawy", "\\log_{{a}} {b} = \\frac{1}{\\log_{{b}} {a}}", ["a", "b"]],
          ["Logarytm dziesiętny", "\\log {x} = \\log_{10} {x}", ["x"]]
        ]
      },
      {
        name: "Funkcja kwadratowa",
        formulas: [
          ["Postać ogólna", "f({x}) = {a} \\cdot {x}^2 + {b} \\cdot {x} + {c}", ["x", "a", "b", "c"]],
          ["Postać kanoniczna", "f({x}) = {a} \\cdot ({x}-{p})^2 + {q}", ["x", "a", "p", "q"]],
          ["Postać iloczynowa", "f({x}) = {a} \\cdot ({x}-{x_1}) \\cdot ({x}-{x_2})", ["x", "a", "x_1", "x_2"]],
          ["Wyróżnik Delta", "\\Delta = {b}^2 - 4 \\cdot {a} \\cdot {c}", ["a", "b", "c"]],
          ["Współrzędna p", "{p} = -\\frac{{b}}{2 \\cdot {a}}", ["p", "a", "b"]],
          ["Współrzędna q", "{q} = -\\frac{{\\Delta}}{4 \\cdot {a}}", ["q", "\\Delta", "a"]]
        ]
      },
      {
        name: "Ciągi",
        formulas: [
          ["Arytmetyczny (n-ty)", "{a_n} = {a_1} + ({n}-1) \\cdot {r}", ["a_n", "a_1", "n", "r"]],
          ["Arytmetyczny (suma)", "{S_n} = \\frac{{a_1} + {a_n}}{2} \\cdot {n}", ["S_n", "a_1", "a_n", "n"]],
          ["Geometryczny (n-ty)", "{a_n} = {a_1} \\cdot {q}^{{n}-1}", ["a_n", "a_1", "q", "n"]],
          ["Geometryczny (suma)", "{S_n} = {a_1} \\cdot \\frac{1-{q}^{{n}}}{1-{q}}", ["S_n", "a_1", "q", "n"]],
          ["Sąsiednie (arytm.)", "{a_n} = \\frac{{a_{n-1}} + {a_{n+1}}}{2}", ["a_n", "a_{n-1}", "a_{n+1}"]],
          ["Sąsiednie (geom.)", "({a_n})^2 = {a_{n-1}} \\cdot {a_{n+1}}", ["a_n", "a_{n-1}", "a_{n+1}"]],
          ["Suma szer. geom.", "{S} = \\lim_{n \\to \\infty} S_n = \\frac{{a_1}}{1-{q}}", ["S", "a_1", "q"]]
        ]
      },
      {
        name: "Trygonometria",
        formulas: [
          ["Jedynka tryg.", "{\\sin^2 \\alpha} + {\\cos^2 \\alpha} = 1", ["\\sin^2 \\alpha", "\\cos^2 \\alpha"]],
          ["Tangens", "{\\text{tg} \\alpha} = \\frac{{\\sin \\alpha}}{{\\cos \\alpha}}", ["\\text{tg} \\alpha", "\\sin \\alpha", "\\cos \\alpha"]],
          ["Sinus sumy", "{\\sin(\\alpha + \\beta)} = {\\sin \\alpha} \\cdot {\\cos \\beta} + {\\cos \\alpha} \\cdot {\\sin \\beta}", ["\\sin(\\alpha + \\beta)", "\\sin \\alpha", "\\cos \\beta", "\\cos \\alpha", "\\sin \\beta"]],
          ["Sinus różnicy", "{\\sin(\\alpha - \\beta)} = {\\sin \\alpha} \\cdot {\\cos \\beta} - {\\cos \\alpha} \\cdot {\\sin \\beta}", ["\\sin(\\alpha - \\beta)", "\\sin \\alpha", "\\cos \\beta", "\\cos \\alpha", "\\sin \\beta"]],
          ["Cosinus sumy", "{\\cos(\\alpha + \\beta)} = {\\cos \\alpha} \\cdot {\\cos \\beta} - {\\sin \\alpha} \\cdot {\\sin \\beta}", ["\\cos(\\alpha + \\beta)", "\\cos \\alpha", "\\cos \\beta", "\\sin \\alpha", "\\sin \\beta"]],
          ["Cosinus różnicy", "{\\cos(\\alpha - \\beta)} = {\\cos \\alpha} \\cdot {\\cos \\beta} + {\\sin \\alpha} \\cdot {\\sin \\beta}", ["\\cos(\\alpha - \\beta)", "\\cos \\alpha", "\\cos \\beta", "\\sin \\alpha", "\\sin \\beta"]],
          ["Tangens sumy", "{\\text{tg}(\\alpha + \\beta)} = \\frac{{\\text{tg} \\alpha} + {\\text{tg} \\beta}}{1 - {\\text{tg} \\alpha} \\cdot {\\text{tg} \\beta}}", ["\\text{tg}(\\alpha + \\beta)", "\\text{tg} \\alpha", "\\text{tg} \\beta"]],
          ["Tangens różnicy", "{\\text{tg}(\\alpha - \\beta)} = \\frac{{\\text{tg} \\alpha} - {\\text{tg} \\beta}}{1 + {\\text{tg} \\alpha} \\cdot {\\text{tg} \\beta}}", ["\\text{tg}(\\alpha - \\beta)", "\\text{tg} \\alpha", "\\text{tg} \\beta"]],
          ["Sinus podwojonego", "{\\sin 2\\alpha} = 2 \\cdot {\\sin \\alpha} \\cdot {\\cos \\alpha}", ["\\sin 2\\alpha", "\\sin \\alpha", "\\cos \\alpha"]],
          ["Cosinus podw. (podst.)", "{\\cos 2\\alpha} = {\\cos^2 \\alpha} - {\\sin^2 \\alpha}", ["\\cos 2\\alpha", "\\cos^2 \\alpha", "\\sin^2 \\alpha"]],
          ["Cosinus podw. (cos)", "{\\cos 2\\alpha} = 2 \\cdot {\\cos^2 \\alpha} - 1", ["\\cos 2\\alpha", "\\cos^2 \\alpha"]],
          ["Cosinus podw. (sin)", "{\\cos 2\\alpha} = 1 - 2 \\cdot {\\sin^2 \\alpha}", ["\\cos 2\\alpha", "\\sin^2 \\alpha"]],
          ["Tangens podwojonego", "{\\text{tg} 2\\alpha} = \\frac{2 \\cdot {\\text{tg} \\alpha}}{1 - {\\text{tg}^2 \\alpha}}", ["\\text{tg} 2\\alpha", "\\text{tg} \\alpha", "\\text{tg}^2 \\alpha"]],
          ["Suma sinusów", "{\\sin \\alpha} + {\\sin \\beta} = 2 \\cdot {\\sin \\frac{\\alpha + \\beta}{2}} \\cdot {\\cos \\frac{\\alpha - \\beta}{2}}", ["\\sin \\alpha", "\\sin \\beta", "\\sin \\frac{\\alpha + \\beta}{2}", "\\cos \\frac{\\alpha - \\beta}{2}"]],
          ["Różnica sinusów", "{\\sin \\alpha} - {\\sin \\beta} = 2 \\cdot {\\cos \\frac{\\alpha + \\beta}{2}} \\cdot {\\sin \\frac{\\alpha - \\beta}{2}}", ["\\sin \\alpha", "\\sin \\beta", "\\cos \\frac{\\alpha + \\beta}{2}", "\\sin \\frac{\\alpha - \\beta}"]],
          ["Suma cosinusów", "{\\cos \\alpha} + {\\cos \\beta} = 2 \\cdot {\\cos \\frac{\\alpha + \\beta}{2}} \\cdot {\\cos \\frac{\\alpha - \\beta}{2}}", ["\\cos \\alpha", "\\cos \\beta", "\\cos \\frac{\\alpha + \\beta}{2}", "\\cos \\frac{\\alpha - \\beta}{2}"]],
          ["Różnica cosinusów", "{\\cos \\alpha} - {\\cos \\beta} = -2 \\cdot {\\sin \\frac{\\alpha + \\beta}{2}} \\cdot {\\sin \\frac{\\alpha - \\beta}{2}}", ["\\cos \\alpha", "\\cos \\beta", "\\sin \\frac{\\alpha + \\beta}{2}", "\\sin \\frac{\\alpha - \\beta}{2}"]],
          ["Iloczyn sinusów", "{\\sin \\alpha} \\cdot {\\sin \\beta} = -\\frac{1}{2} \\cdot [{\\cos(\\alpha + \\beta)} - {\\cos(\\alpha - \\beta)}]", ["\\sin \\alpha", "\\sin \\beta", "\\cos(\\alpha + \\beta)", "\\cos(\\alpha - \\beta)"]],
          ["Iloczyn cosinusów", "{\\cos \\alpha} \\cdot {\\cos \\beta} = \\frac{1}{2} \\cdot [{\\cos(\\alpha + \\beta)} + {\\cos(\\alpha - \\beta)}]", ["\\cos \\alpha", "\\cos \\beta", "\\cos(\\alpha + \\beta)", "\\cos(\\alpha - \\beta)"]],
          ["Iloczyn sin i cos", "{\\sin \\alpha} \\cdot {\\cos \\beta} = \\frac{1}{2} \\cdot [{\\sin(\\alpha + \\beta)} + {\\sin(\\alpha - \\beta)}]", ["\\sin \\alpha", "\\cos \\beta", "\\sin(\\alpha + \\beta)", "\\sin(\\alpha - \\beta)"]]
        ]
      },
      {
        name: "Planimetria",
        formulas: [
          ["Twierdzenie Pitagorasa", "{a}^2 + {b}^2 = {c}^2", ["a", "b", "c"]],
          ["Twierdzenie sinusów (boki)", "\\frac{{a}}{\\sin {\\alpha}} = \\frac{{b}}{\\sin {\\beta}}", ["a", "b", "\\alpha", "\\beta"]],
          ["Twierdzenie sinusów (promień)", "\\frac{{a}}{\\sin {\\alpha}} = 2 \\cdot {R}", ["a", "\\alpha", "R"]],
          ["Twierdzenie cosinusów", "{a}^2 = {b}^2 + {c}^2 - 2 \\cdot {b} \\cdot {c} \\cdot \\cos {\\alpha}", ["a", "b", "c", "\\alpha"]],
          ["Pole trójkąta (podst. i wys.)", "{P} = \\frac{1}{2} \\cdot {a} \\cdot {h_a}", ["P", "a", "h_a"]],
          ["Pole trójkąta (boki i kąt)", "{P} = \\frac{1}{2} \\cdot {a} \\cdot {b} \\cdot \\sin {\\gamma}", ["P", "a", "b", "\\gamma"]],
          ["Pole trójkąta (promień opis.)", "{P} = \\frac{{a} \\cdot {b} \\cdot {c}}{4 \\cdot {R}}", ["P", "a", "b", "c", "R"]],
          ["Pole trójkąta (promień wpis.)", "{P} = {p} \\cdot {r}", ["P", "p", "r"]],
          ["Wzór Herona", "{P} = \\sqrt{{p} \\cdot ({p}-{a}) \\cdot ({p}-{b}) \\cdot ({p}-{c})}", ["P", "p", "a", "b", "c"]],
          ["Pole trójkąta (kąty i R)", "{P} = 2 \\cdot {R}^2 \\cdot \\sin {\\alpha} \\cdot \\sin {\\beta} \\cdot \\sin {\\gamma}", ["P", "R", "\\alpha", "\\beta", "\\gamma"]],
          ["Trójkąt równoboczny (h)", "{h} = \\frac{{a}\\sqrt{3}}{2}", ["h", "a"]],
          ["Trójkąt równoboczny (P)", "{P} = \\frac{{a}^2\\sqrt{3}}{4}", ["P", "a"]],
          ["Trójkąt równoboczny (r wpis.)", "{r} = \\frac{1}{3} \\cdot {h}", ["r", "h"]],
          ["Trójkąt równoboczny (R opis.)", "{R} = \\frac{2}{3} \\cdot {h}", ["R", "h"]],
          ["Trójkąt prostokątny (h_c)", "{h_c} = \\frac{{a} \\cdot {b}}{{c}}", ["h_c", "a", "b", "c"]],
          ["Trójkąt prostokątny (r wpis.)", "{r} = \\frac{{a}+{b}-{c}}{2}", ["r", "a", "b", "c"]],
          ["Trójkąt prostokątny (R opis.)", "{R} = \\frac{1}{2} \\cdot {c}", ["R", "c"]],
          ["Pole koła", "{P} = \\pi \\cdot {r}^2", ["P", "r"]],
          ["Obwód koła", "{L} = 2\\pi \\cdot {r}", ["L", "r"]],
          ["Pole trapezu", "{P} = \\frac{{a}+{b}}{2} \\cdot {h}", ["P", "a", "b", "h"]]
        ]
      },
      {
        name: "Geometria analityczna",
        formulas: [
          ["Długość odcinka", "|{AB}| = \\sqrt{({x_B}-{x_A})^2 + ({y_B}-{y_A})^2}", ["AB", "x_A", "x_B", "y_A", "y_B"]],
          ["Środek odcinka", "{S} = \\left(\\frac{{x_A}+{x_B}}{2}, \\frac{{y_A}+{y_B}}{2}\\right)", ["S", "x_A", "x_B", "y_A", "y_B"]],
          ["Równanie okręgu", "({x}-{a})^2 + ({y}-{b})^2 = {r}^2", ["x", "y", "a", "b", "r"]],
          ["Równanie kier. prostej", "{y} = {a} \\cdot {x} + {b}", ["y", "x", "a", "b"]],
          ["Wsp. kierunkowy prostej", "{a} = \\text{tg} {\\alpha}", ["a", "\\alpha"]],
          ["Prosta przez punkt", "{y} = {a} \\cdot ({x} - {x_0}) + {y_0}", ["y", "x", "a", "x_0", "y_0"]],
          ["Prosta przez 2 punkty", "{y} = \\frac{{y_B} - {y_A}}{{x_B} - {x_A}} \\cdot ({x} - {x_A}) + {y_A}", ["y", "x", "x_A", "y_A", "x_B", "y_B"]],
          ["Równanie ogólne prostej", "{A} \\cdot {x} + {B} \\cdot {y} + {C} = 0", ["A", "B", "C", "x", "y"]],
          ["Proste równoległe", "{a_1} = {a_2}", ["a_1", "a_2"]],
          ["Proste prostopadłe", "{a_1} \\cdot {a_2} = -1", ["a_1", "a_2"]],
          ["Odległość pkt od prostej", "{d} = \\frac{|{A} \\cdot {x_0} + {B} \\cdot {y_0} + {C}|}{\\sqrt{{A}^2 + {B}^2}}", ["d", "A", "B", "C", "x_0", "y_0"]],
          ["Wektor AB", "\\vec{AB} = [{x_B} - {x_A}, {y_B} - {y_A}]", ["x_A", "y_A", "x_B", "y_B"]],
          ["Pole trójkąta (wierzch.)", "{P_{\\Delta}} = \\frac{1}{2} \\cdot |({x_B} - {x_A}) \\cdot ({y_C} - {y_A}) - ({y_B} - {y_A}) \\cdot ({x_C} - {x_A})|", ["P_{\\Delta}", "x_A", "y_A", "x_B", "y_B", "x_C", "y_C"]],
          ["Środek ciężkości (S)", "{S} = \\left(\\frac{{x_A}+{x_B}+{x_C}}{3}, \\frac{{y_A}+{y_B}+{y_C}}{3}\\right)", ["S", "x_A", "y_A", "x_B", "y_B", "x_C", "y_C"]]
        ]
      },
      {
        name: "Stereometria",
        formulas: [
          ["Prostopadłościan (P_c)", "{P_c} = 2 \\cdot ({a} \\cdot {b} + {b} \\cdot {c} + {c} \\cdot {a})", ["P_c", "a", "b", "c"]],
          ["Prostopadłościan (V)", "{V} = {a} \\cdot {b} \\cdot {c}", ["V", "a", "b", "c"]],
          ["Graniastosłup (P_b)", "{P_b} = {Ob} \\cdot {h}", ["P_b", "Ob", "h"]],
          ["Graniastosłup (V)", "{V} = {P_p} \\cdot {h}", ["V", "P_p", "h"]],
          ["Ostrosłup (V)", "{V} = \\frac{1}{3} \\cdot {P_p} \\cdot {h}", ["V", "P_p", "h"]],
          ["Walec (P_b)", "{P_b} = 2\\pi \\cdot {r} \\cdot {h}", ["P_b", "r", "h"]],
          ["Walec (P_c)", "{P_c} = 2\\pi \\cdot {r} \\cdot ({r} + {h})", ["P_c", "r", "h"]],
          ["Walec (V)", "{V} = \\pi \\cdot {r}^2 \\cdot {h}", ["V", "r", "h"]],
          ["Stożek (P_b)", "{P_b} = \\pi \\cdot {r} \\cdot {l}", ["P_b", "r", "l"]],
          ["Stożek (P_c)", "{P_c} = \\pi \\cdot {r} \\cdot ({r} + {l})", ["P_c", "r", "l"]],
          ["Stożek (V)", "{V} = \\frac{1}{3} \\cdot \\pi \\cdot {r}^2 \\cdot {h}", ["V", "r", "h"]],
          ["Kula (P_c)", "{P_c} = 4\\pi \\cdot {r}^2", ["P_c", "r"]],
          ["Kula (V)", "{V} = \\frac{4}{3} \\cdot \\pi \\cdot {r}^3", ["V", "r"]]
        ]
      },
      {
        name: "Prawdopodobieństwo",
        formulas: [
          ["Prawdopodobieństwo sumy", "P({A} \\cup {B}) = P({A}) + P({B}) - P({A} \\cap {B})", ["A", "B"]],
          ["Nierówność Boole'a", "P({A} \\cup {B}) \\le P({A}) + P({B})", ["A", "B"]],
          ["Klasyczna def. prawd.", "P({A}) = \\frac{|{A}|}{|{\\Omega}|}", ["A", "\\Omega"]],
          ["Prawd. warunkowe", "P({A}|{B}) = \\frac{P({A} \\cap {B})}{P({B})}", ["A", "B"]],
          ["Schemat Bernoulliego", "P_{{n}}({k}) = \\binom{{n}}{{k}} \\cdot {p}^{k} \\cdot {q}^{{n}-{k}}", ["n", "k", "p", "q"]]
        ]
      },
      {
        name: "Statystyka",
        formulas: [
          ["Średnia arytmetyczna", "\\bar{a} = \\frac{{a_1} + {a_2} + \\dots + {a_n}}{{n}}", ["a_1", "a_2", "a_n", "n"]],
          ["Średnia geometryczna", "\\bar{g} = \\sqrt[{n}]{{a_1} \\cdot {a_2} \\cdot \\dots \\cdot {a_n}}", ["n", "a_1", "a_2", "a_n"]],
          ["Średnia kwadratowa", "\\bar{k} = \\sqrt{\\frac{{a_1}^2 + {a_2}^2 + \\dots + {a_n}^2}{{n}}}", ["a_1", "a_2", "a_n", "n"]],
          ["Średnia ważona", "\\bar{s} = \\frac{{w_1} \\cdot {a_1} + {w_2} \\cdot {a_2} + \\dots + {w_n} \\cdot {a_n}}{{w_1} + {w_2} + \\dots + {w_n}}", ["w_1", "a_1", "w_2", "a_2", "w_n", "a_n"]],
          ["Nierówność średnich", "\\bar{k} \\ge \\bar{a} \\ge \\bar{g}", []]
        ]
      },
      {
        name: "Pochodna funkcji",
        formulas: [
          ["Iloczyn przez stałą", "[{c} \\cdot ({f(x)})]' = {c} \\cdot ({f'(x)})", ["c", "f(x)", "f'(x)"]],
          ["Pochodna sumy", "[({f(x)}) + ({g(x)})]' = ({f'(x)}) + ({g'(x)})", ["f(x)", "g(x)", "f'(x)", "g'(x)"]],
          ["Pochodna różnicy", "[({f(x)}) - ({g(x)})]' = ({f'(x)}) - ({g'(x)})", ["f(x)", "g(x)", "f'(x)", "g'(x)"]],
          ["Pochodna iloczynu", "[({f(x)}) \\cdot ({g(x)})]' = ({f'(x)}) \\cdot ({g(x)}) + ({f(x)}) \\cdot ({g'(x)})", ["f(x)", "g(x)", "f'(x)", "g'(x)"]],
          ["Pochodna ilorazu", "\\left[ \\frac{{f(x)}}{{g(x)}} \\right]' = \\frac{({f'(x)}) \\cdot ({g(x)}) - ({f(x)}) \\cdot ({g'(x)})}{({g(x)})^2}", ["f(x)", "g(x)", "f'(x)", "g'(x)"]],
          ["Pochodna złożonej", "[{g}({f(x)})]' = {g'}({f(x)}) \\cdot ({f'(x)})", ["g", "g'", "f(x)", "f'(x)"]],
          ["Równanie stycznej", "{y} = {f'(x_0)} \\cdot ({x} - {x_0}) + {f(x_0)}", ["y", "x", "f'(x_0)", "x_0", "f(x_0)"]]
        ]
      }
    ];

    return `
      <div class="latex-editor-toolbar" aria-label="Narzędzia LaTeX">
        <div class="visual-creators-container">
          <button type="button" class="visual-creators-toggle" data-action="toggle-visual-creators">
            <span>Kreatory wizualne</span>
            <span class="chevron">↓</span>
          </button>
          <div class="visual-creators-content">
            <div class="visual-creators-inner">
              ${renderVisualEquationTools()}
            </div>
          </div>
        </div>
        
        <div class="formula-database-container">
          <button type="button" class="formula-database-toggle" data-action="toggle-formula-database">
            <span>Baza wzorów maturalnych</span>
            <span class="chevron">↓</span>
          </button>
          <div class="formula-database-content">
            <div class="formula-categories">
              ${categories.map(cat => `
                <div class="formula-category">
                  <button type="button" class="formula-category-header" data-action="toggle-formula-category">
                    <div class="cat-info">
                      <span>${cat.name}</span>
                    </div>
                    <span class="chevron">↓</span>
                  </button>
                  <div class="formula-category-content">
                    <div class="formula-grid-inner">
                      ${cat.formulas.map(([label, snippet, placeholders]) => `
                        <div class="formula-item" data-template="${escapeHtml(snippet)}">
                          <strong>${label}</strong>
                          <div class="formula-inputs">
                            ${placeholders.map(p => `
                              <input type="text" class="formula-input" placeholder="${p.replace('\\', '')}" data-placeholder="${p}" data-action="update-formula-preview">
                            `).join('')}
                          </div>
                          <div class="formula-preview">$$${snippet}$$</div>
                          <button type="button" class="btn primary small" data-action="insert-latex-templated">
                            Wstaw
                          </button>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderLatexEditor(name, value = "", options = {}) {
    const previewId = uid("latex_preview");
    const placeholder = options.placeholder || "Wpisz treść. LaTeX działa np. jako a_k=k_i+s_x, \\sqrt{16}, \\frac{1}{2}.";
    return `
      <div class="latex-editor">
        ${renderLatexToolbar()}
        <textarea
          class="textarea"
          name="${escapeHtml(name)}"
          data-latex-source
          data-preview-id="${previewId}"
          placeholder="${escapeHtml(placeholder)}"
          ${options.required ? "required" : ""}
        >${escapeHtml(value)}</textarea>
        <div class="latex-preview-head">
          <span class="field-label">Podgląd LaTeX</span>
          <span class="small muted">Renderuje się tak, jak potem w zadaniu.</span>
        </div>
        <div class="latex-preview task-content" id="${previewId}" data-latex-preview>
          ${toParagraphs(value)}
        </div>
      </div>
    `;
  }

  function renderExamScoring(sheetId) {
    const user = currentUser();
    if (!user) return renderForbidden("Zaloguj się, żeby zapisać wynik arkusza.");
    const sheet = examSheetById(sheetId);
    if (!sheet) return renderNotFound();
    let session = readExamSession();
    if (!session || session.sheetId !== sheet.id) return renderExamIntro(sheet.id);
    session = normalizeExamSession(session, sheet);
    const tasks = examTasks(sheet);
    const totalTime = Math.max(0, Math.round((new Date(session.finishedAt || new Date().toISOString()) - new Date(session.startedAt)) / 1000));
    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">Podsumowanie czasu</h1>
            <p class="muted">${escapeHtml(sheet.title)} · łączny czas ${formatDuration(totalTime)}</p>
          </div>
        </div>
        <form id="examScoreForm" data-sheet-id="${sheet.id}">
          <div class="task-list">
            ${tasks
        .map((task, index) => {
          const answer = session.answers && session.answers[task.id];
          const autoScore = autoGradeClosedTask(task, answer);
          return `
                <section class="task-card exam-score-row" data-task-id="${task.id}">
                  <div class="task-card-top">
                    <div>
                      <strong>${index + 1}. ${escapeHtml(displayTaskTitle(task))}</strong>
                      <div class="small muted">Czas przy zadaniu: ${formatDuration(Number(session.taskTimes[task.id] || 0))}${autoScore ? " - sprawdzone automatycznie" : ""}</div>
                    </div>
                    <label class="score-input">
                      <span class="field-label">Twoja ocena</span>
                      <input class="input" name="score_${task.id}" type="number" min="0" max="${task.maxScore}" step="1" value="${autoScore ? autoScore.score : 0}" ${autoScore ? "readonly" : ""} data-auto-score="${autoScore ? "true" : "false"}" />
                      <span class="small muted">/ ${task.maxScore} pkt</span>
                    </label>
                  </div>
                  ${autoScore ? `<div class="${autoScore.correct ? "success-box" : "info-box"}">Zadanie zamkniete: ${autoScore.correct ? "odpowiedz poprawna" : "odpowiedz niepoprawna"}.</div>` : ""}
                  ${renderExamAnswerReview(session.answers && session.answers[task.id])}
                  <div class="accordion">
                    <button class="accordion-trigger" type="button" data-action="toggle-accordion">
                      <span>Pokaż rozwiązanie</span><span>+</span>
                    </button>
                    <div class="accordion-body">${renderSolutions(task)}</div>
                  </div>
                </section>`;
        })
        .join("")}
          </div>
          <div class="modal-actions">
            <a class="btn" href="#/exams/${sheet.id}/run">Wróć do arkusza</a>
            <button class="btn primary" type="submit">Zakończ i policz wynik</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderExamAnswerReview(answer) {
    const value = String(answer || "").trim();
    if (!value) return `<div class="info-box">Nie wpisano odpowiedzi do tego zadania.</div>`;
    return `
      <div class="submission-answer-card">
        <strong>Twoja odpowiedź</strong>
        <div class="submitted-text">${toParagraphs(value)}</div>
      </div>
    `;
  }

  function renderExamAttemptDetail(attemptId) {
    const user = currentUser();
    if (!user) return renderForbidden("Zaloguj się, żeby zobaczyć arkusze.");
    const attempt = examAttemptById(attemptId);
    if (!attempt || attempt.userId !== user.id) return renderNotFound();
    const sheet = examSheetById(attempt.sheetId);
    const subject = subjectById(attempt.subjectId || (sheet ? sheet.subjectId : ""));
    const scoredTasks = (attempt.scores || [])
      .map((score, index) => ({ score, index, task: taskById(score.taskId) }))
      .filter((row) => row.task);
    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">${escapeHtml(attempt.sheetTitle || (sheet ? sheet.title : "Arkusz"))}</h1>
            <p class="muted">${new Date(attempt.finishedAt).toLocaleString("pl-PL")} · ${escapeHtml(subject ? subject.name : "")}</p>
          </div>
          <a class="btn" href="#/profile">Wróć do profilu</a>
        </div>
        <div class="grid grid-4">
          <div class="stat-card"><span class="muted small">Wynik</span><span class="stat-value">${attempt.totalScore}/${attempt.maxScore}</span></div>
          <div class="stat-card"><span class="muted small">Procent</span><span class="stat-value">${attempt.percent}%</span></div>
          <div class="stat-card"><span class="muted small">Czas</span><span class="stat-value">${formatDuration(attempt.durationSeconds)}</span></div>
          <div class="stat-card"><span class="muted small">Zadań</span><span class="stat-value">${scoredTasks.length}</span></div>
        </div>
        <div class="task-list section">
          ${scoredTasks.length ? scoredTasks.map(({ score, index, task }) => {
      return `
              <section class="task-card">
                <div class="task-card-top">
                  <div>
                    <strong>${index + 1}. ${escapeHtml(displayTaskTitle(task))}</strong>
                    <div class="small muted">Czas: ${formatDuration(Number(attempt.taskTimes[task.id] || 0))}</div>
                  </div>
                  <span class="status ${scoreStatus(score.score, score.maxScore)}">${score.score}/${score.maxScore}</span>
                </div>
                <div class="chip-row">${renderTaskSourceBadges(task)}</div>
                <div class="${taskContentClass(task)} task-preview">
                  ${toParagraphs(textExcerpt(task.content, 520))}
                </div>
                ${renderExamAnswerReview(attempt.answers && attempt.answers[task.id])}
                <div class="accordion">
                  <button class="accordion-trigger" type="button" data-action="toggle-accordion">
                    <span>Rozwiązanie</span><span>+</span>
                  </button>
                  <div class="accordion-body">${renderSolutions(task)}</div>
                </div>
                <a class="btn" href="#/tasks/${task.id}">Otwórz zadanie</a>
              </section>`;
    }).join("") : `<div class="empty-state"><p class="muted">Zadania z tego podejścia nie są już dostępne do podglądu.</p></div>`}
        </div>
      </div>
    `;
  }

  function filteredTasks(subjectId, levelId, filters) {
    const user = currentUser();
    let tasks = state.tasks.filter(
      (task) => canSeeTask(task) && task.subjectId === subjectId && task.levelId === levelId
    );

    if (filters.difficulty.length) {
      tasks = tasks.filter((task) => filters.difficulty.includes(String(task.difficulty)));
    }
    if (filters.categories.length) {
      tasks = tasks.filter((task) => filters.categories.every((categoryId) => task.categories.includes(categoryId)));
    }
    if (filters.tags.length) {
      tasks = tasks.filter((task) => filters.tags.every((tagId) => task.tags.includes(tagId)));
    }
    if (filters.status && filters.status !== "all") {
      tasks = tasks.filter((task) => {
        const userTaskStatus = taskStatusForUser(task, user);
        if (filters.status === "solved") return userTaskStatus.status !== "unsolved";
        if (filters.status === "review") return hasRating(task.id, user ? user.id : undefined, 3);
        return userTaskStatus.status === filters.status;
      });
    }

    const avgRating = (task) => {
      const ratings = state.difficultyRatings.filter((rating) => rating.taskId === task.id);
      if (!ratings.length) return task.difficulty;
      return ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
    };
    const solves = (task) => state.submissions.filter((submission) => submission.taskId === task.id).length;

    return tasks.sort((a, b) => {
      if (filters.sort === "easiest") return a.difficulty - b.difficulty;
      if (filters.sort === "hardest") return b.difficulty - a.difficulty;
      if (filters.sort === "best") return avgRating(b) - avgRating(a);
      if (filters.sort === "popular") return solves(b) - solves(a);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function hasRating(taskId, userId, value) {
    if (!userId) return false;
    return state.difficultyRatings.some(
      (rating) => rating.taskId === taskId && rating.userId === userId && rating.rating === value
    );
  }

  function renderTaskCard(task) {
    const user = currentUser();
    const subject = subjectById(task.subjectId);
    const level = levelById(task.levelId);
    const status = taskStatusForUser(task, user);
    const favorite = isFavoriteTask(task.id, user);
    const averageTime = averageTaskTimeForUser(task.id, user);
    const categories = task.categories
      .map(categoryById)
      .filter(Boolean);
    const categoriesHtml = categories
      .map((category) => {
        const categoryColor = normalizeSubjectColor(category.accentColor) || colorPalette[0].accentColor;
        return `<span class="tag" style="--swatch-color: ${escapeHtml(categoryColor)}; border-color: ${escapeHtml(categoryColor)}; color: ${escapeHtml(categoryColor)}">${escapeHtml(category.name)}</span>`;
      })
      .join("");
    const tagsHtml = task.tags
      .map(tagById)
      .filter(Boolean)
      .map((tag) => {
        const tagColor = normalizeSubjectColor(tag.accentColor) || colorPalette[0].accentColor;
        // Używamy jawnej klasy i stylu
        return `<span class="tag" style="--swatch-color: ${escapeHtml(tagColor)}; border-color: ${escapeHtml(tagColor)}; color: ${escapeHtml(tagColor)}">${escapeHtml(tag.name)}</span>`;
      })
      .join("");
    const points = status.submission
      ? `${status.submission.score}/${status.submission.maxScore} pkt`
      : `${task.maxScore} pkt do zdobycia`;

    return `
      <article class="task-card">
        <div class="task-card-top">
          <div>
            <h3 class="task-title">${escapeHtml(displayTaskTitle(task))}</h3>
            <div class="task-meta">${escapeHtml(subject ? subject.name : "")} · ${escapeHtml(level ? level.name : "")} · ${escapeHtml(taskTypeLabel(task.type))}</div>
          </div>
          <span class="status ${status.status}">${escapeHtml(status.label)}</span>
        </div>
        <div class="chip-row">${renderTaskSourceBadges(task)}${categoriesHtml}${tagsHtml}</div>
        <div class="split">
          <span>${starRating(task.difficulty)}</span>
          <strong>${escapeHtml(points)}</strong>
        </div>
        ${averageTime ? `<div class="small muted">Twój średni czas: ${formatDuration(averageTime)}</div>` : ""}
        <div class="button-row">
          <a class="btn primary" href="#/tasks/${task.id}">Rozwiąż</a>
          ${user ? `<button class="btn icon-text favorite-toggle ${favorite ? "active" : ""}" type="button" data-action="toggle-task-favorite" data-task-id="${task.id}" aria-pressed="${favorite ? "true" : "false"}">${iconSvg("star")} ${favorite ? "Ulubione" : "Do ulubionych"}</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderTaskDetail(taskId) {
    const task = taskById(taskId);
    if (!task) return renderNotFound();
    const user = currentUser();
    if (!canSeeTask(task, user)) return renderForbidden("To zadanie jest prywatne.");
    const subject = subjectById(task.subjectId);
    const level = levelById(task.levelId);
    const status = taskStatusForUser(task, user);
    const categories = task.categories.map(categoryById).filter(Boolean);
    const tags = task.tags.map(tagById).filter(Boolean);
    const averageTime = averageTaskTimeForUser(task.id, user);
    const userRating = userTaskDifficultyRating(task.id, user);

    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">${escapeHtml(displayTaskTitle(task))}</h1>
            <p class="muted">${escapeHtml(subject.name)} · ${escapeHtml(level.name)} · ${escapeHtml(taskTypeLabel(task.type))}</p>
          </div>
          <span class="status ${status.status}">${escapeHtml(status.label)}</span>
        </div>

        <div class="task-detail-layout">
          <section class="grid">
            <div class="${taskContentClass(task)}">
              <div class="chip-row">
                ${renderTaskSourceBadges(task)}
                ${categories.map((category) => {
      const categoryColor = normalizeSubjectColor(category.accentColor) || colorPalette[0].accentColor;
      return `<span class="tag" style="--swatch-color: ${escapeHtml(categoryColor)}">${escapeHtml(category.name)}</span>`;
    }).join("")}
                ${tags.map((tag) => {
      const tagColor = normalizeSubjectColor(tag.accentColor) || colorPalette[0].accentColor;
      return `<span class="tag" style="--swatch-color: ${escapeHtml(tagColor)}; border-color: ${escapeHtml(tagColor)}; color: ${escapeHtml(tagColor)}">${escapeHtml(tag.name)}</span>`;
    }).join("")}
              </div>
              <div class="meta-row" style="margin: 14px 0 18px">
                <span>${starRating(task.difficulty)}</span>
                <strong>Maksymalnie: ${task.maxScore} pkt</strong>
              </div>
              ${toParagraphs(task.content)}
              ${renderTaskFiles(task.files, true)}
            </div>

            ${renderAccordion("solution", "Pokaż rozwiązanie", renderSolutions(task))}
            ${renderAccordion("scoring", "Pokaż punktację", renderScoring(task))}
            ${renderSubmissionPanel(task, user, status.submission)}
          </section>

          <aside class="panel">
            <h2 class="panel-title">Podsumowanie</h2>
            <div class="grid" style="margin-top: 14px">
              <div class="split"><span class="muted">Przedmiot</span><strong>${escapeHtml(subject.name)}</strong></div>
              <div class="split"><span class="muted">Poziom</span><strong>${escapeHtml(level.name)}</strong></div>
              <div class="split"><span class="muted">Punkty</span><strong>${status.submission ? `${status.submission.score}/${status.submission.maxScore}` : `0/${task.maxScore}`}</strong></div>
              <div class="split"><span class="muted">Trudność</span><strong>${starRating(task.difficulty)}</strong></div>
              ${userRating ? `<div class="split"><span class="muted">Moja ocena</span><strong>${starRating(userRating.rating, 5)}</strong></div>` : ""}
              ${averageTime ? `<div class="split"><span class="muted">Mój średni czas</span><strong>${formatDuration(averageTime)}</strong></div>` : ""}
            </div>
            ${renderUserTaskWorkspace(task, user)}
            ${status.submission
        ? renderSubmissionResult(status.submission.aiFeedbackJson, true)
        : `<div class="info-box" style="margin-top: 16px">Rozwiąż zadanie i prześlij odpowiedź, aby zapisać wynik w profilu.</div>`
      }
          </aside>
        </div>
      </div>
    `;
  }

  function renderTaskFiles(files, publicOnly) {
    const visibleFiles = (files || []).filter((file) => !publicOnly || file.isPublic);
    if (!visibleFiles.length) return "";
    return `
      <div class="file-list">
        ${visibleFiles
        .map(
          (file) => `
              <div class="file-item">
                <div>
                  <strong>${escapeHtml(file.fileName)}</strong>
                  <div class="small muted">${escapeHtml(file.description || file.fileType || "plik")}</div>
                </div>
                <span class="chip">${escapeHtml(file.fileType || "plik")}</span>
              </div>`
        )
        .join("")}
      </div>
    `;
  }

  function renderSolutions(task) {
    return renderSolutionChoices(task, true);
  }

  function renderSolutionChoices(task, includeOfficial) {
    const additionalSolutions = task.additionalSolutions || [];
    const solutionFiles = task.solutionFiles || [];
    const choices = [
      ...(includeOfficial
        ? [
          {
            id: "official",
            title: "Rozwiązanie wzorcowe",
            content: task.officialSolution,
          },
        ]
        : []),
      ...additionalSolutions.map((solution, index) => ({
        id: solution.id || `additional_${index + 1}`,
        title: solution.title || `Rozwiązanie ${index + 2}`,
        content: solution.content,
      })),
    ];
    if (includeOfficial && choices.length === 1 && !solutionFiles.length) {
      return `
        <div class="solution-list">
          <section class="solution-entry">
            ${toParagraphs(choices[0].content)}
          </section>
        </div>
      `;
    }
    return `
      <div class="solution-list solution-choice-list">
        ${choices.length
        ? choices.map((solution, index) => renderSolutionChoice(solution, index)).join("")
        : `<p class="muted">Brak dodatkowych rozwiązań.</p>`}
        ${solutionFiles.length ? renderTaskFiles(solutionFiles, true) : ""}
      </div>
    `;
  }

  function renderSolutionChoice(solution, index) {
    return `
      <section class="accordion solution-choice">
        <button class="accordion-trigger" type="button" data-action="toggle-accordion" aria-expanded="false">
          <span>${escapeHtml(solution.title || `Rozwiązanie ${index + 1}`)}</span>
          <span>+</span>
        </button>
        <div class="accordion-body solution-choice-body">
          ${toParagraphs(solution.content)}
        </div>
      </section>
    `;
  }

  function renderAccordion(id, title, body) {
    return `
      <section class="accordion" id="acc-${id}">
        <button class="accordion-trigger" type="button" data-action="toggle-accordion" aria-expanded="false">
          <span>${escapeHtml(title)}</span>
          <span>+</span>
        </button>
        <div class="accordion-body">${body}</div>
      </section>
    `;
  }

  function renderScoring(task) {
    return `
      <div>
        <p><strong>Maksymalnie: ${task.maxScore} punktów</strong></p>
        <div class="feedback-list">
          ${task.scoringCriteria
        .sort((a, b) => a.order - b.order)
        .map(
          (criterion) => `
                <div class="feedback-item">
                  <span class="mark ok">${criterion.points}</span>
                  <div>
                    <strong>${escapeHtml(criterion.points)} pkt - ${escapeHtml(criterion.description)}</strong>
                    ${criterion.aiHint ? `<div class="small muted">Wskazówka AI: ${escapeHtml(criterion.aiHint)}</div>` : ""}
                  </div>
                </div>`
        )
        .join("")}
        </div>
      </div>
    `;
  }

  function renderUserTaskWorkspace(task, user) {
    if (!user) return "";
    const note = userTaskNote(task.id, user);
    const folders = userTaskFolders(user);
    const favorite = isFavoriteTask(task.id, user);
    return `
      <div class="task-user-workspace">
        <div class="section-head compact">
          <h3>Moje materiały</h3>
          <button class="btn small favorite-toggle ${favorite ? "active primary" : ""}" type="button" data-action="toggle-task-favorite" data-task-id="${task.id}" aria-pressed="${favorite ? "true" : "false"}">
            ${iconSvg("star")} ${favorite ? "Ulubione" : "Do ulubionych"}
          </button>
        </div>
        <form class="form-grid compact-form" data-action-form="task-note" data-task-id="${task.id}">
          <label>
            <span class="field-label">Prywatna notatka</span>
            <textarea class="textarea small-textarea" name="note" placeholder="Zapisz własny komentarz, pomysł albo błąd do poprawy.">${escapeHtml(note ? note.note : "")}</textarea>
          </label>
          <button class="btn small" type="submit">Zapisz notatkę</button>
        </form>
        <div class="folder-picker">
          <span class="field-label">Prywatne foldery</span>
          <div class="folder-list">
            ${folders.length
        ? folders.map((folder) => `
              <label class="check-item">
                <input type="checkbox" data-action="toggle-task-folder" data-task-id="${task.id}" data-folder-id="${folder.id}" ${(folder.taskIds || []).includes(task.id) ? "checked" : ""} />
                ${escapeHtml(folder.name)}
              </label>
            `).join("")
        : `<p class="small muted">Nie masz jeszcze folderów.</p>`
      }
          </div>
          <form class="folder-create-form" data-action-form="task-folder" data-task-id="${task.id}">
            <input class="input" name="folderName" maxlength="48" placeholder="Nowy folder, np. Trygonometria" />
            <button class="btn small" type="submit">Utwórz</button>
          </form>
        </div>
        ${renderDifficultyRating(task, user)}
      </div>
    `;
  }

  function renderSubmissionPanel(task, user, latest) {
    if (!user) {
      return `
        <section class="accordion">
          <button class="accordion-trigger" type="button" data-action="toggle-accordion" aria-expanded="false">
            <span>Sprawdź moje rozwiązanie AI</span>
            <span>+</span>
          </button>
          <div class="accordion-body">
            <div class="info-box">Zaloguj się, aby przesłać swoje rozwiązanie i otrzymać ocenę AI.</div>
            <div class="button-row" style="margin-top: 12px">
              <a class="btn primary" href="#/login">Zaloguj się</a>
              <a class="btn" href="#/register">Załóż konto</a>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="accordion">
        <button class="accordion-trigger" type="button" data-action="toggle-accordion" aria-expanded="false">
          <span>Sprawdź moje rozwiązanie AI</span>
          <span>+</span>
        </button>
        <div class="accordion-body">
          <form id="submissionForm" class="form-grid" data-task-id="${task.id}" data-started-at="${Date.now()}">
            ${renderSubmissionFields(task)}
            <label>
              <span class="field-label">Pliki rozwiązania</span>
              <input class="input" name="files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.cpp,.py,.xlsx,.accdb,.txt,.csv,.zip" />
              <span class="small muted">Dozwolone w MVP: zdjęcia, PDF oraz pliki wymagane przez typ zadania.</span>
            </label>
            <button class="btn primary" type="submit">Wyślij do sprawdzenia</button>
          </form>
          <div id="submissionStatus"></div>
          ${latest ? renderSubmissionResult(latest.aiFeedbackJson, false) : ""}
          ${latest ? renderSavedAnswer(latest, "Ostatnia odpowiedź") : ""}
          ${latest ? renderSavedAnswersHistory(task.id, user.id, latest.id) : ""}
        </div>
      </section>
    `;
  }

  function renderSubmissionFields(task) {
    if (task.type === "short_answer" || task.type === "closed") {
      return `
        <label>
          <span class="field-label">Odpowiedź</span>
          <input class="input" name="shortAnswer" placeholder="np. 128" required />
        </label>
        <label>
          <span class="field-label">Opcjonalne uzasadnienie</span>
          <textarea class="textarea" name="submittedText" placeholder="Możesz dopisać tok rozumowania."></textarea>
        </label>
      `;
    }

    if (task.type === "info_algorithm") {
      return `
        <div class="two-col">
          <label>
            <span class="field-label">Język</span>
            <select class="select" name="language">
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
          </label>
          <label>
            <span class="field-label">Tryb</span>
            <input class="input" value="lokalny runner MVP - symulacja" disabled />
          </label>
        </div>
        <label>
          <span class="field-label">Kod programu</span>
          <textarea class="textarea" name="submittedText" required placeholder="Wklej kod C++ albo Python."></textarea>
        </label>
      `;
    }

    return `
      <label>
        <span class="field-label">Rozwiązanie tekstowe</span>
        <textarea class="textarea" name="submittedText" placeholder="Wpisz tok rozumowania, odpowiedź albo opis przesłanego pliku."></textarea>
      </label>
    `;
  }

  function renderSubmissionResult(feedback, compact) {
    if (!feedback) return "";
    const status = scoreStatus(feedback.score, feedback.maxScore);
    return `
      <div class="result-card">
        <div class="result-score">
          <div>
            <div class="small muted">Wynik</div>
            <div class="score-big">${feedback.score}/${feedback.maxScore} pkt</div>
          </div>
          <span class="status ${status}">${escapeHtml(statusLabel(status))}</span>
        </div>
        ${compact ? "" : `<p>${escapeHtml(feedback.summary)}</p>`}
        <div class="feedback-list">
          ${feedback.criteria
        .map(
          (criterion) => `
                <div class="feedback-item">
                  <span class="mark ${criterion.pointsAwarded > 0 ? "ok" : "no"}">${criterion.pointsAwarded > 0 ? "✓" : "×"}</span>
                  <div>
                    <strong>${escapeHtml(criterion.pointsAwarded)}/${escapeHtml(criterion.pointsMax)} pkt - ${escapeHtml(criterion.name)}</strong>
                    <div class="small muted">${escapeHtml(criterion.comment)}</div>
                  </div>
                </div>`
        )
        .join("")}
        </div>
        ${compact
        ? ""
        : `
              <div class="grid grid-2">
                <div>
                  <strong>Co było dobrze</strong>
                  <ul>${feedback.whatWasGood.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </div>
                <div>
                  <strong>Co poprawić</strong>
                  <ul>${feedback.whatToImprove.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </div>
              </div>
              <p class="small muted">Wynik jest symulacją oceny, a nie oficjalną oceną CKE.</p>
            `
      }
      </div>
    `;
  }

  function renderSavedAnswer(submission, title) {
    const excerpt = textExcerpt(submission.submittedText, 420);
    return `
      <div class="submission-answer-card">
        <div class="submission-answer-head">
          <strong>${escapeHtml(title)}</strong>
          <span class="small muted">${new Date(submission.createdAt).toLocaleString("pl-PL")}</span>
        </div>
        ${submission.language
        ? `<div class="small muted">Język: ${escapeHtml(String(submission.language).toUpperCase())}</div>`
        : ""
      }
        ${excerpt
        ? `<div class="submitted-text">${escapeHtml(excerpt).replace(/\n/g, "<br>")}</div>`
        : `<div class="small muted">Brak treści tekstowej. Zachowano ocenę i metadane przesłanych plików.</div>`
      }
        ${submission.files && submission.files.length
        ? `<div class="chip-row">${submission.files.map((file) => `<span class="chip">${escapeHtml(file.fileName)}</span>`).join("")}</div>`
        : ""
      }
      </div>
    `;
  }

  function renderSavedAnswersHistory(taskId, userId, latestId) {
    const older = taskSubmissions(taskId, userId).filter((submission) => submission.id !== latestId).slice(0, 5);
    if (!older.length) return "";
    return `
      <div class="submission-history">
        <h3>Poprzednie odpowiedzi</h3>
        <div class="task-list">
          ${older
        .map((submission) => {
          const status = scoreStatus(submission.score, submission.maxScore);
          return `
                <div class="submission-answer-card">
                  <div class="submission-answer-head">
                    <strong>${submission.score}/${submission.maxScore} pkt</strong>
                    <span class="status ${status}">${escapeHtml(statusLabel(status))}</span>
                  </div>
                  <div class="small muted">${new Date(submission.createdAt).toLocaleString("pl-PL")}</div>
                  ${textExcerpt(submission.submittedText, 260)
              ? `<div class="submitted-text">${escapeHtml(textExcerpt(submission.submittedText, 260)).replace(/\n/g, "<br>")}</div>`
              : `<div class="small muted">Brak treści tekstowej.</div>`
            }
                  ${submission.files && submission.files.length
              ? `<div class="chip-row">${submission.files.map((file) => `<span class="chip">${escapeHtml(file.fileName)}</span>`).join("")}</div>`
              : ""
            }
                </div>
              `;
        })
        .join("")}
        </div>
      </div>
    `;
  }

  function renderDifficultyRating(task, user) {
    const existing = userTaskDifficultyRating(task.id, user);
    const value = existing ? Number(existing.rating || 0) : 0;
    const fill = `${(value / 5) * 100}%`;
    return `
      <div class="difficulty-rating-box">
        <h3>Moja trudność</h3>
        <div class="star-slider" data-star-slider style="--rating-fill: ${fill}">
          <div class="star-meter" aria-hidden="true">
            <span class="star-meter-empty">★★★★★</span>
            <span class="star-meter-fill">★★★★★</span>
          </div>
          <div class="star-slider-row">
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value="${value}"
              data-action="rate-difficulty-slider"
              data-task-id="${task.id}"
              aria-label="Moja ocena trudności zadania"
            />
            <strong data-rating-value>${value ? value.toFixed(1).replace(".0", "") : "0"}/5</strong>
          </div>
        </div>
      </div>
    `;
  }

  function updateDifficultySliderPreview(input) {
    const value = Math.max(0, Math.min(5, Number(input.value || 0)));
    const slider = input.closest("[data-star-slider]");
    if (!slider) return;
    slider.style.setProperty("--rating-fill", `${(value / 5) * 100}%`);
    const label = slider.querySelector("[data-rating-value]");
    if (label) label.textContent = `${value ? value.toFixed(1).replace(".0", "") : "0"}/5`;
  }

  function saveDifficultyRating(taskId, rating) {
    const user = currentUser();
    if (!user || !taskId) return;
    const normalized = Math.max(0, Math.min(5, Math.round((Number(rating) || 0) * 2) / 2));
    state.difficultyRatings = (state.difficultyRatings || []).filter(
      (item) => !(item.userId === user.id && item.taskId === taskId)
    );
    if (normalized > 0) {
      state.difficultyRatings.push({
        id: uid("rating"),
        userId: user.id,
        taskId,
        rating: normalized,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    saveState();
  }

  function renderProfile() {
    const user = currentUser();
    if (!user) return renderForbidden("Zaloguj się, aby zobaczyć profil użytkownika.");
    const stats = userStats(user.id, user);
    const subjects = visibleSubjects(user);

    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">Profil</h1>
            <p class="muted">${escapeHtml(user.username)} · konto od ${new Date(user.createdAt).toLocaleDateString("pl-PL")}</p>
          </div>
        </div>
        <section class="profile-block">
          <div class="section-head">
            <div>
              <h2>Statystyki przedmiotu</h2>
              <p class="muted">Wybierz przedmiot, żeby zobaczyć mapę umiejętności i aktywność dzienną.</p>
            </div>
            <label class="profile-subject-select">
              <span class="field-label">Przedmiot</span>
              <select class="select" data-action="profile-subject-open">
                <option value="">Wybierz przedmiot</option>
                ${subjects.map((subject) => `<option value="${escapeHtml(subject.slug)}">${escapeHtml(subject.name)}</option>`).join("")}
              </select>
            </label>
          </div>
        </section>
        <div class="grid grid-2 profile-stats-grid">
          <div class="stat-card"><span class="muted small">Rozwiązane</span><span class="stat-value">${stats.totalSolved}</span></div>
          <div class="stat-card"><span class="muted small">Średni wynik</span><span class="stat-value">${stats.avgPercent}%</span></div>
        </div>

        <div class="profile-grid profile-grid-compact section">
          <aside class="profile-block">
            <h2>Ostatnie rozwiązania</h2>
            ${renderRecentSubmissions(user.id)}
          </aside>
        </div>
        <section class="profile-block section" id="favorite-tasks">
          <div class="section-head">
            <div>
              <h2>Ulubione zadania</h2>
              <p class="muted">Zadania oznaczone wypełnioną gwiazdką.</p>
            </div>
          </div>
          ${renderFavoriteTasks(user)}
        </section>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Moje arkusze</h2>
              <p class="muted">Historia symulacji matury z wynikiem, procentami i czasem.</p>
            </div>
            <a class="btn" href="#/profile/exams">${iconSvg("chart")} Otwórz panel</a>
          </div>
          ${renderExamAttempts(user.id)}
        </section>
      </div>
    `;
  }

  function userStats(userId, user = currentUser()) {
    const submissions = state.submissions
      .filter((submission) => {
        const task = taskById(submission.taskId);
        return submission.userId === userId && (!task || canSeeTask(task, user));
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestByTask = new Map();
    submissions.forEach((submission) => {
      if (!latestByTask.has(submission.taskId)) latestByTask.set(submission.taskId, submission);
    });
    const latest = Array.from(latestByTask.values());
    const earned = latest.reduce((sum, submission) => sum + submission.score, 0);
    const max = latest.reduce((sum, submission) => sum + submission.maxScore, 0);
    const maxCount = latest.filter((submission) => submission.score === submission.maxScore).length;
    const zeroCount = latest.filter((submission) => submission.score === 0).length;
    const partialCount = latest.filter((submission) => submission.score > 0 && submission.score < submission.maxScore).length;
    return {
      submissions,
      latest,
      totalSolved: latest.length,
      avgPercent: max ? Math.round((earned / max) * 100) : 0,
      maxCount,
      zeroCount,
      partialCount,
    };
  }

  function userSubjectScoreMap(userId, subjectId, user = currentUser()) {
    const rows = [];
    (state.submissions || []).forEach((submission) => {
      const task = taskById(submission.taskId);
      if (!task || task.subjectId !== subjectId || !canSeeTask(task, user)) return;
      if (submission.userId !== userId) return;
      rows.push({
        taskId: task.id,
        score: Number(submission.score || 0),
        maxScore: Number(submission.maxScore || task.maxScore || 0),
        createdAt: submission.createdAt,
        source: "task",
      });
    });
    (state.examAttempts || []).forEach((attempt) => {
      if (attempt.userId !== userId || attempt.subjectId !== subjectId) return;
      (attempt.scores || []).forEach((score) => {
        const task = taskById(score.taskId);
        if (!task || !canSeeTask(task, user)) return;
        rows.push({
          taskId: task.id,
          score: Number(score.score || 0),
          maxScore: Number(score.maxScore || task.maxScore || 0),
          createdAt: attempt.finishedAt || attempt.createdAt,
          source: "exam",
        });
      });
    });
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = new Map();
    rows.forEach((row) => {
      if (!latest.has(row.taskId)) latest.set(row.taskId, row);
    });
    return { rows, latest };
  }

  function dateKey(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function renderSubjectProgress(subject, stats) {
    const subjectTasks = state.tasks.filter((task) => task.subjectId === subject.id && canSeeTask(task));
    const subjectSubmissions = stats.latest.filter((submission) => {
      const task = taskById(submission.taskId);
      return task && task.subjectId === subject.id;
    });
    const earned = subjectSubmissions.reduce((sum, submission) => sum + submission.score, 0);
    const max = subjectSubmissions.reduce((sum, submission) => sum + submission.maxScore, 0);
    const percent = max ? Math.round((earned / max) * 100) : 0;
    const maxCount = subjectSubmissions.filter((submission) => submission.score === submission.maxScore).length;
    const zeroCount = subjectSubmissions.filter((submission) => submission.score === 0).length;
    const partialCount = subjectSubmissions.filter((submission) => submission.score > 0 && submission.score < submission.maxScore).length;
    const denominator = Math.max(1, subjectSubmissions.length);

    return `
      <a class="profile-block profile-subject-link" href="#/profile/subjects/${subject.slug}">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(subject.name)}</h2>
            <p class="muted">Rozwiązane zadania: ${subjectSubmissions.length}/${subjectTasks.length}</p>
          </div>
          <strong>${percent}%</strong>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div>
        <div class="mini-chart" style="margin-top: 16px">
          <div class="chart-row">
            <span>Max</span>
            <div class="chart-track"><div class="chart-fill max" style="width: ${(maxCount / denominator) * 100}%"></div></div>
            <strong>${maxCount}</strong>
          </div>
          <div class="chart-row">
            <span>Część</span>
            <div class="chart-track"><div class="chart-fill partial" style="width: ${(partialCount / denominator) * 100}%"></div></div>
            <strong>${partialCount}</strong>
          </div>
          <div class="chart-row">
            <span>Zero</span>
            <div class="chart-track"><div class="chart-fill zero" style="width: ${(zeroCount / denominator) * 100}%"></div></div>
            <strong>${zeroCount}</strong>
          </div>
        </div>
      </a>
    `;
  }

  function renderFavoriteTasks(user) {
    const favoriteIds = (state.userTaskFavorites || [])
      .filter((item) => item.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => item.taskId);
    const tasks = favoriteIds
      .map((taskId) => taskById(taskId))
      .filter((task) => task && canSeeTask(task, user));
    if (!tasks.length) {
      return `<div class="empty-state"><p class="muted">Nie masz jeszcze ulubionych zadań. Kliknij gwiazdkę przy zadaniu, żeby dodać je tutaj.</p></div>`;
    }
    return `
      <div class="task-list">
        ${tasks.map((task) => {
      const subject = subjectById(task.subjectId);
      const level = levelById(task.levelId);
      return `
          <a class="task-card favorite-task-row" href="#/tasks/${task.id}">
            <div class="task-card-top">
              <div>
                <strong>${escapeHtml(displayTaskTitle(task))}</strong>
                <div class="small muted">${escapeHtml(subject ? subject.name : "")} · ${escapeHtml(level ? level.name : "")} · ${task.maxScore} pkt</div>
                <div class="chip-row">${renderTaskSourceBadges(task)}</div>
              </div>
              <span class="favorite-mark active">${iconSvg("star")}</span>
            </div>
          </a>
        `;
    }).join("")}
      </div>
    `;
  }

  function renderProfileSubject(subjectSlug) {
    const user = currentUser();
    if (!user) return renderForbidden("Zaloguj się, aby zobaczyć statystyki przedmiotu.");
    const subject = state.subjects.find((item) => item.slug === subjectSlug);
    if (!canSeeSubject(subject, user)) return renderNotFound();
    const stats = userStats(user.id, user);
    const tasks = state.tasks.filter((task) => task.subjectId === subject.id && canSeeTask(task, user));
    const subjectCategories = state.categories.filter((category) => category.subjectId === subject.id);
    const subjectScores = userSubjectScoreMap(user.id, subject.id, user);
    const submissionsByTask = subjectScores.latest;
    const filterKey = subject.slug;
    const taskFilter = profileSubjectTaskFilterState[filterKey] || "all";
    const taskSearch = profileSubjectTaskSearchState[filterKey] || "";
    const selectedCategoryIds = (profileSubjectCategoryState[filterKey] || []).filter((id) =>
      subjectCategories.some((category) => category.id === id)
    );
    const chartTasks = selectedCategoryIds.length
      ? tasks.filter((task) => selectedCategoryIds.some((categoryId) => (task.categories || []).includes(categoryId)))
      : tasks;
    const filteredTasks = filterProfileSubjectTasks(tasks, submissionsByTask, taskFilter, taskSearch);
    const solved = chartTasks.filter((task) => submissionsByTask.has(task.id));
    const earned = solved.reduce((sum, task) => sum + submissionsByTask.get(task.id).score, 0);
    const max = solved.reduce((sum, task) => sum + submissionsByTask.get(task.id).maxScore, 0);
    const percent = max ? Math.round((earned / max) * 100) : 0;
    const maxCount = solved.filter((task) => {
      const submission = submissionsByTask.get(task.id);
      return submission.score === submission.maxScore;
    }).length;
    const partialCount = solved.filter((task) => {
      const submission = submissionsByTask.get(task.id);
      return submission.score > 0 && submission.score < submission.maxScore;
    }).length;
    const zeroCount = solved.filter((task) => submissionsByTask.get(task.id).score === 0).length;

    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">${escapeHtml(subject.name)}</h1>
            <p class="muted">Twoje statystyki i zadania z tego przedmiotu.</p>
          </div>
          <a class="btn" href="#/profile">Wróć do profilu</a>
        </div>
        <div class="grid grid-2">
          <div class="stat-card"><span class="muted small">Rozwiązane</span><span class="stat-value">${solved.length}/${chartTasks.length}</span></div>
          <div class="stat-card"><span class="muted small">Średni wynik</span><span class="stat-value">${percent}%</span></div>
        </div>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Mapa umiejętności</h2>
              <p class="muted">Opanowanie kategorii ważone punktami z ostatnich wyników.</p>
            </div>
          </div>
          ${renderSubjectSkillMap(subject, tasks, subjectCategories, submissionsByTask)}
        </section>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Aktywność</h2>
              <p class="muted">Liczba zadań rozwiązanych w poszczególne dni.</p>
            </div>
          </div>
          ${renderSubjectActivity(subjectScores.rows)}
        </section>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Postęp</h2>
              <p class="muted">Podsumowanie ostatnich ocenionych rozwiązań z przedmiotu.</p>
            </div>
            <strong>${percent}%</strong>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div>
          <div class="mini-chart" style="margin-top: 16px">
            ${renderChartRow("Max", maxCount, Math.max(1, solved.length), "max")}
            ${renderChartRow("Część", partialCount, Math.max(1, solved.length), "partial")}
            ${renderChartRow("Zero", zeroCount, Math.max(1, solved.length), "zero")}
          </div>
          ${subjectCategories.length ? `
            <div class="category-chart-picker">
              <span class="field-label">Kategorie na wykresie</span>
              <div class="selectable-grid">
                ${subjectCategories.map((category) => `
                  <label class="selectable-chip" style="--swatch-color: ${escapeHtml(category.accentColor || colorPalette[0].accentColor)}">
                    <input type="checkbox" data-action="profile-subject-category" data-subject-slug="${escapeHtml(subject.slug)}" value="${category.id}" ${selectedCategoryIds.includes(category.id) ? "checked" : ""} />
                    <span class="subject-admin-swatch" style="--swatch-color: ${escapeHtml(category.accentColor || colorPalette[0].accentColor)}" aria-hidden="true"></span>
                    ${escapeHtml(category.name)}
                  </label>
                `).join("")}
              </div>
            </div>
          ` : ""}
        </section>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Zadania</h2>
              <p class="muted">Lista zadań z Twoim ostatnim wynikiem albo statusem nierozwiązane.</p>
            </div>
            <a class="btn" href="#/subjects/${subject.slug}?mode=tasks">Ćwicz zadania</a>
          </div>
          <div class="exam-controls profile-exam-controls">
            <label class="search-box exam-search-box">
              ${iconSvg("search")}
              <input type="search" value="${escapeHtml(taskSearch)}" placeholder="Szukaj zadania..." aria-label="Szukaj zadania" data-action="profile-subject-task-search" data-subject-slug="${escapeHtml(subject.slug)}" />
            </label>
            <select class="select" data-action="profile-subject-task-filter" data-subject-slug="${escapeHtml(subject.slug)}" aria-label="Filtr zadań">
              <option value="all" ${taskFilter === "all" ? "selected" : ""}>Wszystkie</option>
              <option value="max" ${taskFilter === "max" ? "selected" : ""}>Na maksimum</option>
              <option value="partial" ${taskFilter === "partial" ? "selected" : ""}>Częściowe</option>
              <option value="zero" ${taskFilter === "zero" ? "selected" : ""}>Zero</option>
            </select>
          </div>
          <div class="task-list">
            ${filteredTasks.map((task) => renderProfileSubjectTask(task, submissionsByTask.get(task.id))).join("") || `<div class="empty-state"><p class="muted">Brak zadań dla wybranego filtra.</p></div>`}
          </div>
        </section>
      </div>
    `;
  }

  function filterProfileSubjectTasks(tasks, submissionsByTask, filter, search) {
    const phrase = normalizeText(search || "");
    return tasks.filter((task) => {
      const submission = submissionsByTask.get(task.id);
      const status = submission ? scoreStatus(submission.score, submission.maxScore) : "unsolved";
      const matchesSearch = !phrase || normalizeText(`${displayTaskTitle(task)} ${taskTypeLabel(task.type)}`).includes(phrase);
      const matchesFilter =
        filter === "all" ||
        (filter === "attempted" && Boolean(submission)) ||
        (filter === "unattempted" && !submission) ||
        status === filter;
      return matchesSearch && matchesFilter;
    });
  }

  function categoryMasteryRows(categories, tasks, submissionsByTask) {
    return categories.map((category) => {
      const categoryTasks = tasks.filter((task) => (task.categories || []).includes(category.id));
      const solved = categoryTasks.filter((task) => submissionsByTask.has(task.id));
      const earned = solved.reduce((sum, task) => sum + Number(submissionsByTask.get(task.id).score || 0), 0);
      const max = solved.reduce((sum, task) => sum + Number(submissionsByTask.get(task.id).maxScore || task.maxScore || 0), 0);
      const percent = max ? Math.round((earned / max) * 100) : 0;
      return { category, tasks: categoryTasks, solved, earned, max, percent };
    });
  }

  function renderSubjectSkillMap(subject, tasks, categories, submissionsByTask) {
    if (!categories.length) {
      return `<div class="empty-state"><p class="muted">Ten przedmiot nie ma jeszcze kategorii.</p></div>`;
    }
    const rows = categoryMasteryRows(categories, tasks, submissionsByTask);
    const chartRows = rows.slice(0, 12);
    const center = 150;
    const radius = 104;
    const points = chartRows.map((row, index) => {
      const angle = -Math.PI / 2 + (index / chartRows.length) * Math.PI * 2;
      const valueRadius = radius * (row.percent / 100);
      return {
        row,
        x: center + Math.cos(angle) * valueRadius,
        y: center + Math.sin(angle) * valueRadius,
        labelX: center + Math.cos(angle) * (radius + 34),
        labelY: center + Math.sin(angle) * (radius + 34),
      };
    });
    const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const grid = [0.25, 0.5, 0.75, 1].map((scale) => {
      const ring = chartRows.map((_, index) => {
        const angle = -Math.PI / 2 + (index / chartRows.length) * Math.PI * 2;
        return `${(center + Math.cos(angle) * radius * scale).toFixed(1)},${(center + Math.sin(angle) * radius * scale).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${ring}" class="skill-map-ring" />`;
    }).join("");
    return `
      <div class="skill-map-layout">
        <div class="skill-radar" style="--subject-accent: ${escapeHtml(subjectAccentColor(subject))}">
          <svg viewBox="0 0 300 300" role="img" aria-label="Mapa kategorii">
            ${grid}
            ${points.map((point) => `<line class="skill-map-axis" x1="${center}" y1="${center}" x2="${point.labelX}" y2="${point.labelY}" />`).join("")}
            <polygon class="skill-map-area" points="${polygon || `${center},${center}`}" />
            ${points.map((point) => `<circle class="skill-map-point" cx="${point.x}" cy="${point.y}" r="4" />`).join("")}
          </svg>
          ${points.map((point) => `
            <span class="skill-map-label" style="left:${(point.labelX / 3).toFixed(2)}%; top:${(point.labelY / 3).toFixed(2)}%">
              ${escapeHtml(point.row.category.name)}
            </span>
          `).join("")}
        </div>
        <div class="skill-category-list">
          ${rows.map((row) => `
            <div class="skill-category-row">
              <strong>${escapeHtml(row.category.name)}</strong>
              <span>${row.max ? `${row.earned}/${row.max} pkt - ${row.percent}%` : "brak danych"}</span>
              <div class="chart-track"><div class="chart-fill max" style="width:${row.percent}%"></div></div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderSubjectActivity(rows) {
    const counts = new Map();
    rows.forEach((row) => {
      const key = dateKey(row.createdAt);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const today = new Date();
    const days = Array.from({ length: 365 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (364 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, date, count: counts.get(key) || 0 };
    });
    const max = Math.max(1, ...days.map((day) => day.count));
    const last14 = days.slice(-14);
    const total = days.reduce((sum, day) => sum + day.count, 0);
    const activeDays = days.filter((day) => day.count > 0).length;
    const lastMonth = days.slice(-30).reduce((sum, day) => sum + day.count, 0);
    const weekCount = Math.ceil(days.length / 7);
    const monthFormatter = new Intl.DateTimeFormat("pl-PL", { month: "short" });
    const seenMonths = new Set();
    const monthLabels = days
      .map((day, index) => {
        const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
        if (seenMonths.has(monthKey)) return null;
        seenMonths.add(monthKey);
        return {
          label: monthFormatter.format(day.date).replace(".", ""),
          column: Math.floor(index / 7) + 1,
        };
      })
      .filter(Boolean);
    return `
      <div class="activity-layout">
        <div class="activity-year" style="--activity-weeks: ${weekCount}">
          <div class="activity-months" aria-hidden="true">
            ${monthLabels.map((month) => `<span style="grid-column: ${month.column}">${escapeHtml(month.label)}</span>`).join("")}
          </div>
          <div class="activity-heatmap" aria-label="Aktywność dzienna z ostatnich 365 dni">
            ${days.map((day) => `<span class="activity-day level-${Math.ceil((day.count / max) * 4)}" title="${day.key}: ${day.count} zadań"></span>`).join("")}
          </div>
        </div>
        <div class="activity-summary">
          <div><strong>${total}</strong><span>zadań razem</span></div>
          <div><strong>${activeDays}</strong><span>aktywnych dni</span></div>
          <div><strong>${lastMonth}</strong><span>zadań w 30 dni</span></div>
        </div>
        <div class="activity-bars">
          ${last14.map((day) => `
            <div class="activity-bar" title="${day.key}: ${day.count}">
              <span style="height:${Math.max(6, (day.count / max) * 100)}%"></span>
              <small>${day.date.getDate()}</small>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderChartRow(label, value, denominator, status) {
    return `
      <div class="chart-row">
        <span>${escapeHtml(label)}</span>
        <div class="chart-track"><div class="chart-fill ${status}" style="width: ${(value / denominator) * 100}%"></div></div>
        <strong>${value}</strong>
      </div>
    `;
  }

  function renderProfileSubjectTask(task, submission) {
    const level = levelById(task.levelId);
    const status = submission ? scoreStatus(submission.score, submission.maxScore) : "unsolved";
    return `
      <a class="task-card" href="#/tasks/${task.id}">
        <div class="task-card-top">
          <div>
            <strong>${escapeHtml(displayTaskTitle(task))}</strong>
            <div class="small muted">${escapeHtml(level ? level.name : "")} · ${task.maxScore} pkt · ${taskTypeLabel(task.type)}</div>
            <div class="chip-row">${renderTaskSourceBadges(task)}</div>
            ${submission
        ? `<div class="small muted">Ostatnio: ${new Date(submission.createdAt).toLocaleString("pl-PL")}</div>`
        : `<div class="small muted">Jeszcze nierozwiązane.</div>`
      }
          </div>
          <span class="status ${status}">${submission ? `${submission.score}/${submission.maxScore}` : "0/" + task.maxScore}</span>
        </div>
      </a>
    `;
  }

  function renderRecentSubmissions(userId) {
    const submissions = state.submissions
      .filter((submission) => submission.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
    if (!submissions.length) {
      return `<div class="empty-state"><p class="muted">Brak przesłanych rozwiązań.</p><a class="btn primary" href="#/subjects">Rozpocznij naukę</a></div>`;
    }
    return `
      <div class="task-list">
        ${submissions
        .map((submission) => {
          const task = taskById(submission.taskId);
          if (!task) return "";
          const subject = subjectById(task.subjectId);
          const level = levelById(task.levelId);
          const status = scoreStatus(submission.score, submission.maxScore);
          return `
              <a class="task-card" href="#/tasks/${task.id}">
                <div class="task-card-top">
                  <div>
                    <strong>${escapeHtml(displayTaskTitle(task))}</strong>
                    <div class="small muted">${escapeHtml(subject.name)} · ${escapeHtml(level.name)} · ${new Date(submission.createdAt).toLocaleString("pl-PL")}</div>
                    <div class="chip-row">${renderTaskSourceBadges(task)}</div>
                    ${textExcerpt(submission.submittedText, 140)
              ? `<div class="small submission-snippet">${escapeHtml(textExcerpt(submission.submittedText, 140))}</div>`
              : ""
            }
                  </div>
                  <span class="status ${status}">${submission.score}/${submission.maxScore}</span>
                </div>
              </a>
            `;
        })
        .join("")}
      </div>
    `;
  }

  function renderProfileExamDashboard() {
    const user = currentUser();
    if (!user) return renderForbidden("Zaloguj się, aby zobaczyć swoje arkusze.");
    const subjects = visibleSubjects(user);
    const selectedSubjectId = subjects.some((subject) => subject.id === profileExamSubjectState)
      ? profileExamSubjectState
      : "all";
    profileExamSubjectState = selectedSubjectId;
    const selectedSubject = selectedSubjectId === "all" ? null : subjectById(selectedSubjectId);
    const allAttempts = state.examAttempts
      .filter((attempt) => attempt.userId === user.id && (!selectedSubject || attempt.subjectId === selectedSubject.id))
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
    const filterKey = `profile-exams:${selectedSubjectId}`;
    const search = examAttemptSearchState[filterKey] || "";
    const status = examAttemptStatusState[filterKey] || "all";
    const phrase = normalizeText(search);
    const attempts = allAttempts.filter((attempt) => {
      const matchesSearch = !phrase || normalizeText(`${attempt.sheetTitle || ""} ${attempt.percent || 0}`).includes(phrase);
      const matchesStatus = status === "all" || scoreStatus(attempt.totalScore, attempt.maxScore) === status;
      return matchesSearch && matchesStatus;
    });
    const totalSeconds = allAttempts.reduce((sum, attempt) => sum + Number(attempt.durationSeconds || 0), 0);
    const avgSeconds = allAttempts.length ? Math.round(totalSeconds / allAttempts.length) : 0;
    const avgPercent = allAttempts.length
      ? Math.round(allAttempts.reduce((sum, attempt) => sum + Number(attempt.percent || 0), 0) / allAttempts.length)
      : 0;
    const bestPercent = allAttempts.reduce((best, attempt) => Math.max(best, Number(attempt.percent || 0)), 0);
    const recent = allAttempts.slice(0, 6).reverse();
    const maxDuration = Math.max(1, ...allAttempts.map((attempt) => Number(attempt.durationSeconds || 0)));
    const completionEvents = (state.examTaskCompletionEvents || [])
      .filter((event) => {
        if (event.userId !== user.id) return false;
        if (!selectedSubject) return true;
        const sheet = examSheetById(event.sheetId);
        return sheet && sheet.subjectId === selectedSubject.id;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);

    return `
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="page-title">Moje arkusze</h1>
            <p class="muted">Statystyki czasu i wyników z rozwiązanych arkuszy.</p>
          </div>
          <a class="btn" href="#/profile">Wróć do profilu</a>
        </div>
        <section class="profile-block">
          <div class="exam-controls profile-exam-controls">
            <label>
              <span class="field-label">Przedmiot</span>
              <select class="select" data-action="profile-exam-subject" aria-label="Przedmiot arkuszy">
                <option value="all" ${selectedSubjectId === "all" ? "selected" : ""}>Wszystkie przedmioty</option>
                ${subjects.map((subject) => `<option value="${subject.id}" ${selectedSubjectId === subject.id ? "selected" : ""}>${escapeHtml(subject.name)}</option>`).join("")}
              </select>
            </label>
            <label class="search-box exam-search-box">
              ${iconSvg("search")}
              <input type="search" value="${escapeHtml(search)}" placeholder="Filtruj arkusze..." aria-label="Filtruj arkusze" data-action="exam-attempt-search" data-search-key="${escapeHtml(filterKey)}" />
            </label>
            <select class="select" data-action="exam-attempt-status" data-search-key="${escapeHtml(filterKey)}" aria-label="Status arkusza">
              <option value="all" ${status === "all" ? "selected" : ""}>Wszystkie wyniki</option>
              <option value="max" ${status === "max" ? "selected" : ""}>Maksimum</option>
              <option value="partial" ${status === "partial" ? "selected" : ""}>Częściowe</option>
              <option value="zero" ${status === "zero" ? "selected" : ""}>Zero</option>
            </select>
          </div>
        </section>
        <div class="grid grid-4 section">
          <div class="stat-card"><span class="muted small">Podejścia</span><span class="stat-value">${allAttempts.length}</span></div>
          <div class="stat-card"><span class="muted small">Średni wynik</span><span class="stat-value">${avgPercent}%</span></div>
          <div class="stat-card"><span class="muted small">Najlepszy wynik</span><span class="stat-value">${bestPercent}%</span></div>
          <div class="stat-card"><span class="muted small">Łączny czas</span><span class="stat-value">${formatDuration(totalSeconds)}</span></div>
        </div>
        <div class="grid grid-2 section">
          <section class="profile-block exam-progress-panel">
            <div class="section-head">
              <div>
                <h2>Wyniki</h2>
                <p class="muted">Ostatnie podejścia według procentów.</p>
              </div>
              <strong>${avgPercent}% średnio</strong>
            </div>
            ${recent.length
        ? `<div class="exam-progress-bars">
                    ${recent
          .map(
            (attempt) => `
                          <a class="exam-progress-bar" href="#/profile/exams/${attempt.id}" title="${escapeHtml(attempt.sheetTitle)}: ${attempt.percent}%">
                            <span style="height: ${Math.max(8, attempt.percent)}%"></span>
                            <strong>${attempt.percent}%</strong>
                          </a>`
          )
          .join("")}
                  </div>`
        : `<div class="empty-state"><p class="muted">Brak rozwiązanych arkuszy dla wybranego przedmiotu.</p></div>`
      }
          </section>
          <section class="profile-block">
            <div class="section-head">
              <div>
                <h2>Czas pracy</h2>
                <p class="muted">Średnio ${formatDuration(avgSeconds)} na arkusz.</p>
              </div>
            </div>
            <div class="mini-chart">
              ${recent.length ? recent.map((attempt) => renderExamTimeRow(attempt, maxDuration)).join("") : `<div class="empty-state"><p class="muted">Brak danych czasu.</p></div>`}
            </div>
          </section>
        </div>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Oś zrobionych zadań</h2>
              <p class="muted">Każde zaznaczenie w arkuszu zostaje pokazane na wykresie czasu.</p>
            </div>
          </div>
          ${renderExamCompletionTimeline(completionEvents)}
        </section>
        <section class="profile-block section">
          <div class="section-head">
            <div>
              <h2>Lista arkuszy</h2>
              <p class="muted">Wyniki po zastosowaniu aktualnych filtrów.</p>
            </div>
          </div>
          ${attempts.length
        ? `<div class="exam-attempt-list">${attempts.map(renderExamAttemptCard).join("")}</div>`
        : allAttempts.length
          ? `<div class="empty-state"><p class="muted">Brak arkuszy dla wybranego filtra.</p></div>`
          : `<div class="empty-state"><p class="muted">Nie masz jeszcze rozwiązanych arkuszy.</p></div>`
      }
        </section>
      </div>
    `;
  }

  function renderExamTimeRow(attempt, maxDuration) {
    return `
      <a class="chart-row profile-time-row" href="#/profile/exams/${attempt.id}">
        <span>${escapeHtml(textExcerpt(attempt.sheetTitle || "Arkusz", 16))}</span>
        <div class="chart-track"><div class="chart-fill partial" style="width: ${(Number(attempt.durationSeconds || 0) / maxDuration) * 100}%"></div></div>
        <strong>${formatDuration(attempt.durationSeconds)}</strong>
      </a>
    `;
  }

  function renderExamCompletionTimeline(events) {
    if (!events.length) {
      return `<div class="empty-state"><p class="muted">Zaznacz „zadanie zrobione” podczas pracy z arkuszem, aby zobaczyć tutaj punkty na osi czasu.</p></div>`;
    }
    return `
      <div class="completion-timeline">
        ${events.map((event) => {
      const task = taskById(event.taskId);
      const sheet = examSheetById(event.sheetId);
      return `
          <div class="completion-event ${event.checked ? "done" : "undone"}">
            <span class="completion-dot"></span>
            <div>
              <strong>${escapeHtml(task ? displayTaskTitle(task) : "Zadanie")}</strong>
              <div class="small muted">${escapeHtml(sheet ? sheet.title : "Arkusz")} · ${new Date(event.createdAt).toLocaleString("pl-PL")}</div>
            </div>
            <span class="status ${event.checked ? "max" : "unsolved"}">${event.checked ? "zrobione" : "cofnięte"}</span>
          </div>
        `;
    }).join("")}
      </div>
    `;
  }

  function renderExamAttempts(userId) {
    const attempts = state.examAttempts
      .filter((attempt) => attempt.userId === userId)
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
    if (!attempts.length) {
      return `<div class="empty-state"><p class="muted">Nie masz jeszcze rozwiązanych arkuszy.</p><a class="btn primary" href="#/subjects">Wybierz przedmiot</a></div>`;
    }
    return `
      <div class="exam-attempt-list">
        ${attempts.map(renderExamAttemptCard).join("")}
      </div>
    `;
  }

  function adminGuard() {
    const user = currentUser();
    return user && user.role === "admin";
  }

  function renderAdminLayout(active, content) {
    if (!adminGuard()) return renderForbidden("403 - dostęp tylko dla administratora.");
    const links = [
      ["/admin", "Dashboard", "home"],
      ["/admin/subjects", "Przedmioty", "book"],
      ["/admin/categories", "Kategorie", "layers"],
      ["/admin/tags", "Tagi", "tag"],
      ["/admin/tasks", "Zadania", "file"],
      ["/admin/tasks/new", "Dodaj zadanie", "plus"],
      ["/admin/tasks/screen", "Zadanie ze screena", "target"],
      ["/admin/exams", "Arkusze", "sheetCustom"],
      ["/admin/exams/new", "Dodaj arkusz", "plus"],
      ["/admin/exams/import", "Import z PDF", "file"],
      ["/admin/colors", "Paleta kolorów", "palette"],
      ["/admin/settings", "Ustawienia", "settings"],
    ];
    return `
      <div class="container">
        <div class="admin-layout">
          <aside class="admin-sidebar">
            ${links
        .map(
          ([href, label, icon]) => `<a class="admin-link ${active === href ? "active" : ""}" href="#${href}">${iconSvg(icon)} ${escapeHtml(label)}</a>`
        )
        .join("")}
          </aside>
          <section>${content}</section>
        </div>
      </div>
    `;
  }

  function renderAdminDashboard() {
    return renderAdminLayout(
      "/admin",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Panel admina</h1>
            <p class="muted">Zarządzanie treściami, punktacją i konfiguracją sprawdzania.</p>
          </div>
          <div class="button-row">
            <a class="btn primary" href="#/admin/tasks/new">${iconSvg("plus")} Dodaj zadanie</a>
            <a class="btn" href="#/admin/tasks/screen">${iconSvg("target")} Dodaj ze screena</a>
          </div>
        </div>
        <div class="grid grid-4">
          <div class="stat-card"><span class="muted small">Przedmioty</span><span class="stat-value">${state.subjects.length}</span></div>
          <div class="stat-card"><span class="muted small">Kategorie</span><span class="stat-value">${state.categories.length}</span></div>
          <div class="stat-card"><span class="muted small">Tagi</span><span class="stat-value">${state.tags.length}</span></div>
          <div class="stat-card"><span class="muted small">Zadania</span><span class="stat-value">${state.tasks.length}</span></div>
          <div class="stat-card"><span class="muted small">Arkusze</span><span class="stat-value">${state.examSheets.length}</span></div>
        </div>
        <div class="section grid grid-2">
          <div class="panel">
            <h2>Architektura AI</h2>
            <p class="muted">Każde zadanie ma punktację kryterialną. Endpoint docelowy /api/ai/grade otrzymuje treść zadania, rozwiązanie, pliki, punktację i zwraca JSON z oceną.</p>
          </div>
          <div class="panel">
            <h2>Informatyka</h2>
            <p class="muted">Typy krótkiej odpowiedzi, algorytmiki, Excela i Accessa mają osobną konfigurację sprawdzania, gotową do podpięcia pod worker/sandbox.</p>
          </div>
        </div>
      `
    );
  }

  function renderColorEditModal() {
    if (!state.editingColorModal) return "";
    const { type, id } = state.editingColorModal;
    let item = null;
    let title = "";
    if (type === "subject") {
      item = state.subjects.find((s) => s.id === id);
      title = `Zmień kolor dla przedmiotu: ${item?.name || ""}`;
    } else if (type === "category") {
      item = state.categories.find((c) => c.id === id);
      title = `Zmień kolor dla kategorii: ${item?.name || ""}`;
    } else if (type === "tag") {
      item = state.tags.find((t) => t.id === id);
      title = `Zmień kolor dla tagu: ${item?.name || ""}`;
    }
    if (!item) return "";
    const allColors = [...colorPalette, ...(state.customColors || [])];
    const colorGrid = allColors
      .map(
        (c) => `
        <div class="color-modal-option" data-action="save-color-edit" data-color="${escapeHtml(c.accentColor)}" style="--swatch-color: ${escapeHtml(c.accentColor)}">
          <div class="color-modal-swatch"></div>
          <div class="color-modal-label">${escapeHtml(c.label)}</div>
          ${item.accentColor === c.accentColor ? `<div class="color-modal-check">${iconSvg("check")}</div>` : ""}
        </div>
      `
      )
      .join("");
    return `
      <div class="modal-overlay" data-action="close-color-modal">
        <div class="modal-dialog" data-action="dummy">
          <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            <button class="btn-close" type="button" data-action="close-color-modal">✕</button>
          </div>
          <div class="modal-body">
            <div class="color-modal-grid">${colorGrid}</div>
          </div>
          <div class="modal-footer">
            <button class="btn" type="button" data-action="close-color-modal">Anuluj</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderAdminSubjects() {
    return renderAdminLayout(
      "/admin/subjects",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Przedmioty</h1>
            <p class="muted">Dodawanie paneli przedmiotowych i poziomów.</p>
          </div>
        </div>
        <div class="admin-compact-grid">
          <form id="subjectForm" class="form-section">
            <h2>Dodaj przedmiot</h2>
            <label><span class="field-label">Nazwa</span><input class="input" name="name" required /></label>
            <label><span class="field-label">Ikona lub skrót</span><input class="input" name="icon" maxlength="4" placeholder="np. BIO" /></label>
            <div>
              <span class="field-label">Opis</span>
              ${renderLatexEditor("description", "", { required: true, placeholder: "Opis przedmiotu..." })}
            </div>
            ${renderSubjectColorPicker()}
            <label class="check-item"><input type="checkbox" name="isPublic" checked /> Widoczny dla użytkowników</label>
            <div>
              <span class="field-label">Poziomy</span>
              <label class="check-item"><input type="checkbox" name="levels" value="podstawa" checked /> Podstawa</label>
              <label class="check-item"><input type="checkbox" name="levels" value="rozszerzenie" checked /> Rozszerzenie</label>
            </div>
            <button class="btn primary" type="submit">Dodaj przedmiot</button>
          </form>
          <div class="panel">
            <h2>Lista</h2>
            <div class="task-list" style="margin-top: 14px">
              ${state.subjects
        .map(
          (subject) => {
            const canDelete = isCustomSubject(subject);
            return `
                    <div class="task-card">
                      <div class="task-card-top">
                        <div>
                          <strong class="admin-subject-name">
                            <span class="subject-admin-swatch" style="${escapeHtml(subjectStyle(subject))}" aria-hidden="true"></span>
                            ${escapeHtml(subject.name)}
                          </strong>
                          <div class="small muted">${escapeHtml(subject.slug)}</div>
                        </div>
                        <span class="chip">${subjectTaskCount(subject.id, true)} zadań</span>
                      </div>
                      <p class="muted">${escapeHtml(subject.description)}</p>
                      <div class="button-row">
                        <span class="status ${subject.isPublic === false ? "unsolved" : "max"}">${subject.isPublic === false ? "prywatny" : "publiczny"}</span>
                        <button class="btn" type="button" data-action="toggle-subject-visibility" data-subject-id="${subject.id}">
                          ${subject.isPublic === false ? "Pokaż użytkownikom" : "Ukryj"}
                        </button>
                        <button class="btn" type="button" data-action="edit-subject" data-subject-id="${subject.id}">Edytuj</button>
                        <button class="btn" type="button" data-action="edit-subject-color" data-subject-id="${subject.id}">Zmień kolor</button>
                        ${canDelete
                ? `<button class="btn danger" type="button" data-action="delete-subject" data-subject-id="${subject.id}">Usuń</button>`
                : ""
              }
                      </div>
                    </div>`;
          }
        )
        .join("")}
            </div>
          </div>
        </div>
      `
    );
  }

  function renderAdminCategories() {
    return renderAdminLayout(
      "/admin/categories",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Kategorie</h1>
            <p class="muted">Kategorie są przypisane do przedmiotu i opcjonalnie poziomu.</p>
          </div>
        </div>
        <div class="admin-compact-grid">
          <form id="categoryForm" class="form-section">
            <h2>Dodaj kategorię</h2>
            ${renderCategorySubjectPicker()}
            <label><span class="field-label">Poziom opcjonalnie</span>${levelSelect("levelId", "", true)}</label>
            <label><span class="field-label">Nazwa</span><input class="input" name="name" required /></label>
            <div>
              <span class="field-label">Opis</span>
              ${renderLatexEditor("description", "", { placeholder: "Opis kategorii..." })}
            </div>
            ${renderColorPicker(colorPalette[0].accentColor, "accentColor", "Kolor kategorii")}
            <button class="btn primary" type="submit">Dodaj kategorię</button>
          </form>
          <div class="panel">
            <h2>Lista kategorii</h2>
            <table class="table">
              <thead><tr><th>Nazwa</th><th>Przedmiot</th><th>Poziom</th><th></th><th></th></tr></thead>
              <tbody>
                ${state.categories
        .map((category) => {
          const subject = subjectById(category.subjectId);
          const level = category.levelId ? levelById(category.levelId) : null;
          const categoryColor = normalizeSubjectColor(category.accentColor) || colorPalette[0].accentColor;
          return `
                      <tr>
                        <td><span class="subject-admin-swatch" style="--swatch-color: ${escapeHtml(categoryColor)}" aria-hidden="true"></span> ${escapeHtml(category.name)}</td>
                        <td>${escapeHtml(subject ? subject.name : "")}</td>
                        <td>${escapeHtml(level ? level.name : "wszystkie")}</td>
                        <td></td>
                        <td class="table-actions">
                          <div class="button-row">
                            <button class="btn" type="button" data-action="edit-category" data-category-id="${category.id}">${iconSvg("edit")} Edytuj</button>
                            <button class="btn" type="button" data-action="edit-category-color" data-category-id="${category.id}">${iconSvg("palette")} Zmień kolor</button>
                            <button class="btn danger" type="button" data-action="delete-category" data-category-id="${category.id}">${iconSvg("trash")} Usuń</button>
                          </div>
                        </td>
                      </tr>`;
        })
        .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
    );
  }

  function renderCategorySubjectPicker(selectedIds = []) {
    const selected = selectedIds.length ? selectedIds : (state.subjects[0] ? [state.subjects[0].id] : []);
    return `
      <div class="field-group">
        <span class="field-label">Przypisz do przedmiotów</span>
        <div class="selectable-grid category-subject-picker">
          ${state.subjects.map((subject) => `
            <label class="selectable-chip" style="--swatch-color: ${escapeHtml(subjectAccentColor(subject))}">
              <input type="checkbox" name="subjectIds" value="${escapeHtml(subject.id)}" ${selected.includes(subject.id) ? "checked" : ""} />
              <span class="subject-admin-swatch" style="--swatch-color: ${escapeHtml(subjectAccentColor(subject))}" aria-hidden="true"></span>
              ${escapeHtml(subject.name)}
            </label>
          `).join("")}
        </div>
        <span class="small muted">Przy zapisie nowej kategorii system utworzy ją osobno dla każdego zaznaczonego przedmiotu.</span>
      </div>
    `;
  }

  function renderAdminColors() {
    const allColors = [...colorPalette, ...(state.customColors || [])];
    return renderAdminLayout(
      "/admin/colors",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Paleta kolorów</h1>
            <p class="muted">Zarządzaj dostępnymi kolorami dla przedmiotów, kategorii i tagów.</p>
          </div>
        </div>
        <div class="admin-compact-grid">
          <form id="colorForm" class="form-section">
            <h2>Dodaj kolor</h2>
            <div class="color-picker-container">
              <div class="color-input-group">
                <label><span class="field-label">Nazwa koloru (opcjonalnie)</span><input class="input" name="colorName" placeholder="np. Mięta, Brzoskwinia" /></label>
              </div>
              <div class="rgb-sliders">
                <div class="slider-group">
                  <label><span class="field-label">Czerwony (R)</span>
                    <div class="slider-with-value">
                      <input type="range" name="colorR" min="0" max="255" value="100" class="slider rgb-slider" />
                      <span class="slider-value" data-target="colorR">100</span>
                    </div>
                  </label>
                </div>
                <div class="slider-group">
                  <label><span class="field-label">Zielony (G)</span>
                    <div class="slider-with-value">
                      <input type="range" name="colorG" min="0" max="255" value="150" class="slider rgb-slider" />
                      <span class="slider-value" data-target="colorG">150</span>
                    </div>
                  </label>
                </div>
                <div class="slider-group">
                  <label><span class="field-label">Niebieski (B)</span>
                    <div class="slider-with-value">
                      <input type="range" name="colorB" min="0" max="255" value="200" class="slider rgb-slider" />
                      <span class="slider-value" data-target="colorB">200</span>
                    </div>
                  </label>
                </div>
              </div>
              <div class="color-preview">
                <div class="preview-swatch" id="colorPreview"></div>
                <div class="preview-info">
                  <div class="preview-name" id="previewName">Nazwa</div>
                  <div class="preview-hex" id="previewHex">#6496c8</div>
                </div>
              </div>
            </div>
            <button class="btn primary" type="submit">Dodaj kolor</button>
          </form>
          <div class="panel">
            <h2>Dostępne kolory</h2>
            <div class="color-grid">
              ${allColors
        .map(
          (color, idx) => {
            const isCustom = idx >= colorPalette.length;
            return `
                      <div class="color-card">
                        <div class="color-swatch" style="--swatch-color: ${escapeHtml(color.accentColor)}"></div>
                        <div class="color-details">
                          <div class="color-label">${escapeHtml(color.label)}</div>
                          <div class="color-hex">${escapeHtml(color.accentColor)}</div>
                        </div>
                        <div class="button-row">
                          <button class="btn btn-small" type="button" data-action="edit-color" data-color-index="${idx}">Edytuj</button>
                          ${isCustom ? `<button class="btn danger btn-small" type="button" data-action="delete-custom-color" data-color-index="${idx}">Usuń</button>` : `<button class="btn danger btn-small" type="button" data-action="delete-default-color" data-color-index="${idx}">Usuń</button>`}
                        </div>
                      </div>
                    `;
          }
        )
        .join("")}
            </div>
          </div>
        </div>
      `
    );
  }

  function renderAdminTags() {
    return renderAdminLayout(
      "/admin/tags",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Tagi</h1>
            <p class="muted">Tagi mogą być używane między przedmiotami.</p>
          </div>
        </div>
        <div class="admin-compact-grid">
          <form id="tagForm" class="form-section">
            <h2>Dodaj tag</h2>
            <label><span class="field-label">Nazwa</span><input class="input" name="name" required /></label>
            <label><span class="field-label">Opis</span><textarea class="textarea" name="description"></textarea></label>
            ${renderColorPicker(colorPalette[0].accentColor, "accentColor", "Kolor tagu")}
            <button class="btn primary" type="submit">Dodaj tag</button>
          </form>
          <div class="panel">
            <h2>Lista tagów</h2>
            <table class="table">
              <thead><tr><th>Nazwa</th><th>Opis</th><th>Kolor</th><th></th></tr></thead>
              <tbody>
                ${state.tags
        .map(
          (tag) => `
                      <tr>
                        <td>${escapeHtml(tag.name)}</td>
                        <td>${escapeHtml(tag.description || "")}</td>
                        <td>
                          <span class="subject-admin-swatch" style="--swatch-color: ${escapeHtml(tag.accentColor || colorPalette[0].accentColor)}" aria-hidden="true"></span>
                        </td>
                        <td class="table-actions">
                          <div class="button-row">
                            <button class="btn" type="button" data-action="edit-tag" data-tag-id="${tag.id}">${iconSvg("edit")} Edytuj</button>
                            <button class="btn" type="button" data-action="edit-tag-color" data-tag-id="${tag.id}">${iconSvg("palette")} Zmień kolor</button>
                            <button class="btn danger" type="button" data-action="delete-tag" data-tag-id="${tag.id}">${iconSvg("trash")} Usuń</button>
                          </div>
                        </td>
                      </tr>`
        )
        .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
    );
  }

  function renderAdminTasks() {
    return renderAdminLayout(
      "/admin/tasks",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Zadania</h1>
            <p class="muted">Lista dodanych zadań i szybka edycja.</p>
          </div>
          <div class="button-row">
            <a class="btn primary" href="#/admin/tasks/new">${iconSvg("plus")} Dodaj zadanie</a>
            <a class="btn" href="#/admin/tasks/screen">${iconSvg("target")} Dodaj ze screena</a>
          </div>
        </div>
        <div class="panel">
          <table class="table">
            <thead><tr><th>Tytuł</th><th>Przedmiot</th><th>Poziom</th><th>Typ</th><th>Punkty</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${state.tasks
        .map((task) => {
          const subject = subjectById(task.subjectId);
          const level = levelById(task.levelId);
          return `
                    <tr>
                      <td><strong>${escapeHtml(displayTaskTitle(task))}</strong><div class="small muted">${escapeHtml(task.slug)}</div></td>
                      <td>${escapeHtml(subject ? subject.name : "")}</td>
                      <td>${escapeHtml(level ? level.name : "—")}</td>
                      <td>${escapeHtml(taskTypeLabel(task.type))}</td>
                      <td>${task.maxScore}</td>
                      <td><span class="status ${task.isPublished ? "max" : "unsolved"}">${task.isPublished ? "publiczne" : "prywatne"}</span></td>
                      <td>
                        <div class="button-row">
                          ${adminPreviewEnabled() ? `<a class="btn" href="#/tasks/${task.id}">${iconSvg("target")} Podgląd</a>` : ""}
                          <a class="btn" href="#/admin/tasks/${task.id}/edit">${iconSvg("edit")} Edytuj</a>
                          <button class="btn" type="button" data-action="toggle-task-visibility" data-task-id="${task.id}">${iconSvg("sync")} ${task.isPublished ? "Ukryj" : "Pokaż"}</button>
                          <button class="btn danger" type="button" data-action="delete-task" data-task-id="${task.id}">${iconSvg("trash")} Usuń</button>
                        </div>
                      </td>
                    </tr>`;
        })
        .join("")}
            </tbody>
          </table>
        </div>
      `
    );
  }

  function renderAdminTaskScreenImport() {
    const selectedSubjectId = state.subjects[0] ? state.subjects[0].id : "";
    const hasPreview = screenImportState.tasks && screenImportState.tasks.length;
    return renderAdminLayout(
      "/admin/tasks/screen",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">${iconSvg("target")} Zadanie ze screena</h1>
            <p class="muted">Wczytaj obraz, popraw rozpoznaną treść i zapisz zadanie bezpośrednio do bazy.</p>
          </div>
          <a class="btn" href="#/admin/tasks">Wróć do zadań</a>
        </div>

        <section class="form-section screen-import-section">
          <div class="info-box">Import ze screena działa lokalnie przez Ollama/Qwen. Uruchom agenta PDF i lokalną Ollamę z modelem vision.</div>
          <div style="margin: 14px 0 18px; max-width: 360px">
            ${renderVisionModelSelect("screenVisionModelSelect")}
          </div>
          <div class="pdf-upload-zone ${hasPreview ? "hidden" : ""}" id="screenDropZone" role="button" tabindex="0" aria-controls="screenFileInput" aria-label="Wybierz screen zadania">
            <div class="pdf-upload-icon">${iconSvg("target")}</div>
            <h3>Przeciągnij screen zadania tutaj</h3>
            <p class="muted">obsługiwane: JPG, PNG, WEBP</p>
            <input type="file" id="screenFileInput" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
            <span class="btn primary pdf-upload-cta">${iconSvg("plus")} Wybierz screen</span>
          </div>
          <div id="screenProcessingStatus" class="hidden" role="status" aria-live="polite">
            <div class="pdf-processing-spinner"></div>
            <p class="muted" id="screenProcessingMessage">Rozpoznawanie screena...</p>
          </div>
        </section>

        <section class="form-section ${hasPreview ? "" : "hidden"}" id="screenImportSettings">
          <h2>Ustawienia zapisu</h2>
          <form id="screenImportForm" class="admin-form">
            <div class="three-col">
              <label><span class="field-label">Przedmiot</span>${subjectSelect("subjectId", selectedSubjectId, "screenImportSubject")}</label>
              <label><span class="field-label">Poziom</span>${levelSelect("levelId", "", true, selectedSubjectId, "screenImportLevel")}</label>
              <label class="check-item" style="align-self: end"><input type="checkbox" name="isPublished" checked /> Widoczne dla użytkowników</label>
            </div>
          </form>
        </section>

        <section class="form-section ${hasPreview ? "" : "hidden"}" id="screenImportPreview">
          <div class="section-head">
            <h2>Rozpoznane zadanie</h2>
            <div class="button-row">
              <button class="btn" type="button" data-action="screen-add-empty-task">${iconSvg("plus")} Dodaj ręcznie</button>
              <button class="btn" type="button" data-action="screen-import-reset">${iconSvg("x")} Wczytaj inny screen</button>
            </div>
          </div>
          <div id="screenImportTaskList" class="grid">${hasPreview ? renderPdfImportPreview(screenImportState.tasks, "screen") : ""}</div>
          <div class="button-row" style="margin-top:24px">
            <button class="btn primary" type="button" data-action="import-save-selected-to-db" data-import-source="screen">${iconSvg("check")} Zapisz zadanie do bazy</button>
          </div>
        </section>
      `
    );
  }

  function renderAdminExams() {
    return renderAdminLayout(
      "/admin/exams",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Arkusze</h1>
            <p class="muted">Symulacje matury z limitem czasu i zestawem zadań.</p>
          </div>
          <a class="btn primary" href="#/admin/exams/new">${iconSvg("plus")} Dodaj arkusz</a>
          <a class="btn" href="#/admin/exams/import">${iconSvg("file")} Import z PDF</a>
        </div>
        <div class="panel">
          <table class="table">
            <thead><tr><th>Tytuł</th><th>Przedmiot</th><th>Poziom</th><th>Czas</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${state.examSheets
        .map((sheet) => {
          const subject = subjectById(sheet.subjectId);
          const level = levelById(sheet.levelId);
          return `
                    <tr>
                      <td><strong>${escapeHtml(sheet.title)}</strong><div class="small muted">${(sheet.taskIds || []).length} zadań</div></td>
                      <td>${escapeHtml(subject ? subject.name : "")}</td>
                      <td>${escapeHtml(level ? level.name : "")}</td>
                      <td>${sheet.durationMinutes || 180} min</td>
                      <td><span class="status ${sheet.isPublished ? "max" : "unsolved"}">${sheet.isPublished ? "publiczny" : "prywatny"}</span></td>
                      <td class="table-actions">
                        <div class="button-row">
                          ${adminPreviewEnabled() ? `<a class="btn" href="#/exams/${sheet.id}">${iconSvg("target")} Podgląd</a>` : ""}
                          <a class="btn" href="#/admin/exams/${sheet.id}/edit">${iconSvg("edit")} Edytuj</a>
                          <button class="btn" type="button" data-action="toggle-exam-visibility" data-exam-id="${sheet.id}">${iconSvg("sync")} ${sheet.isPublished ? "Ukryj" : "Pokaż"}</button>
                          <button class="btn danger" type="button" data-action="delete-exam" data-exam-id="${sheet.id}">${iconSvg("trash")} Usuń</button>
                        </div>
                      </td>
                    </tr>`;
        })
        .join("")}
            </tbody>
          </table>
        </div>
      `
    );
  }

  function renderAdminExamForm(examId) {
    const sheet = examId ? examSheetById(examId) : null;
    if (examId && !sheet) return renderNotFound();
    const selectedSubjectId = sheet && sheet.subjectId ? sheet.subjectId : (state.subjects[0] ? state.subjects[0].id : "");
    const subjectLevels = state.levels.filter((level) => level.subjectId === selectedSubjectId);
    const fallbackLevel = subjectLevels[0];
    const selectedLevelId = sheet && sheet.levelId ? sheet.levelId : (fallbackLevel ? fallbackLevel.id : "");
    
    const availableTasks = state.tasks.filter((task) => {
      const matchSubject = task.subjectId === selectedSubjectId;
      const matchLevel = !selectedLevelId || task.levelId === selectedLevelId;
      return matchSubject && matchLevel;
    });
    const selectedTaskIds = sheet ? (sheet.taskIds || []).map(String) : [];
    return renderAdminLayout(
      sheet ? "" : "/admin/exams/new",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">${sheet ? "Edytuj arkusz" : "Dodaj arkusz"}</h1>
            <p class="muted">Wybierz istniejące zadania albo dodaj nowe bez wychodzenia z formularza.</p>
          </div>
          ${sheet && adminPreviewEnabled() ? `<a class="btn" href="#/exams/${sheet.id}">Podgląd</a>` : ""}
        </div>
        <form id="examForm" class="admin-form" data-exam-id="${sheet ? sheet.id : ""}">
          <section class="form-section">
            <h2>Dane arkusza</h2>
            <div class="two-col">
              <label><span class="field-label">Tytuł</span><input class="input" name="title" value="${escapeHtml(sheet ? sheet.title : "")}" required /></label>
              <label><span class="field-label">Limit czasu w minutach</span><input class="input" name="durationMinutes" type="number" min="1" step="1" value="${sheet ? sheet.durationMinutes : 180}" required /></label>
            </div>
            <div class="three-col">
              <label><span class="field-label">Przedmiot</span>${subjectSelect("subjectId", selectedSubjectId, "examSubjectSelect")}</label>
              <label><span class="field-label">Poziom</span>${levelSelect("levelId", selectedLevelId, true, selectedSubjectId, "examLevelSelect")}</label>
              <label class="check-item" style="align-self: end"><input type="checkbox" name="isPublished" ${!sheet || sheet.isPublished !== false ? "checked" : ""}/> Widoczny dla użytkowników</label>
            </div>
            <div>
              <span class="field-label">Opis arkusza</span>
              ${renderLatexEditor("description", sheet ? sheet.description || "" : "", { placeholder: "Opis arkusza..." })}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head">
              <h2>Istniejące zadania</h2>
              <span class="muted small">Zaznaczone zadania trafią do arkusza w tej kolejności.</span>
            </div>
            <div id="examTaskBox" class="check-list exam-task-picker">
              ${renderExamTaskPicker(availableTasks, selectedTaskIds)}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head">
              <h2>Nowe zadania do arkusza</h2>
              <div class="button-row">
                <button class="btn" type="button" data-action="add-exam-new-task-row">Dodaj nowe zadanie</button>
                <label class="btn" for="examScreenFileInput">${iconSvg("target")} Dodaj ze screena</label>
                <input type="file" id="examScreenFileInput" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
                ${renderVisionModelSelect("examScreenVisionModel", "Czat/model screena")}
                <button class="btn" type="button" data-action="save-exam-new-tasks-to-db">${iconSvg("plus")} Zapisz nowe w bazie</button>
              </div>
            </div>
            <div id="examScreenProcessingStatus" class="hidden" role="status" aria-live="polite">
              <div class="pdf-processing-spinner"></div>
              <p class="muted" id="examScreenProcessingMessage">Lokalny Qwen rozpoznaje zadanie ze screena...</p>
            </div>
            <div id="examNewTasksBox" class="grid">
              <!-- Tu trafią nowe zadania po kliknięciu przycisku -->
            </div>
          </section>

          <div class="button-row">
            <button class="btn primary" type="submit">${sheet ? "Zapisz arkusz" : "Dodaj arkusz"}</button>
            <a class="btn" href="#/admin/exams">Anuluj</a>
          </div>
        </form>
      `
    );
  }

  function renderExamTaskPicker(tasks, selectedIds) {
    if (!tasks.length) return `<p class="muted">Brak zadań dla tego przedmiotu i poziomu.</p>`;
    return `<div class="selectable-grid">` + tasks
      .map(
        (task) => `
          <label class="selectable-chip">
            <input type="checkbox" name="taskIds" value="${task.id}" ${selectedIds.includes(task.id) ? "checked" : ""}/>
            <span>${escapeHtml(displayTaskTitle(task))} <span class="small muted">· ${task.maxScore} pkt</span></span>
          </label>`
      )
      .join("") + `</div>`;
  }

  function renderExamNewTaskRow() {
    return `
      <div class="exam-new-task-row">
        <div class="exam-new-task-header">
          <label><span class="field-label">Tytuł zadania</span><input class="input" name="examTaskTitle" placeholder="np. Funkcja liniowa" /></label>
          <label><span class="field-label">Punkty</span><input class="input" name="examTaskMaxScore" type="number" min="1" step="1" value="2" /></label>
          <button class="btn danger" type="button" data-action="remove-row" style="margin-bottom: 2px">${iconSvg("trash")} Usuń</button>
        </div>
        <div class="exam-new-task-body">
          <div><span class="field-label">Treść zadania</span>${renderLatexEditor("examTaskContent", "", { placeholder: "Wpisz treść zadania..." })}</div>
          <div><span class="field-label">Wzorcowe rozwiązanie <span class="muted small">(opcjonalne)</span></span>${renderLatexEditor("examTaskSolution", "", { placeholder: "Wzorcowe rozwiązanie..." })}</div>
        </div>
      </div>
    `;
  }

  function renderExamNewTaskRowFromData(task = {}) {
    const title = String(task.title || "").trim();
    const maxScore = Math.max(1, Number(task.maxScore || 2));
    const content = String(task.content || "");
    const solution = String(task.officialSolution || task.solution || "");
    const sourceType = String(task.sourceType || "");
    return `
      <div class="exam-new-task-row" ${sourceType ? `data-source-type="${escapeHtml(sourceType)}"` : ""}>
        <div class="exam-new-task-header">
          <label><span class="field-label">Tytuł zadania</span><input class="input" name="examTaskTitle" placeholder="np. Funkcja liniowa" value="${escapeHtml(title)}" /></label>
          <label><span class="field-label">Punkty</span><input class="input" name="examTaskMaxScore" type="number" min="1" step="1" value="${maxScore}" /></label>
          <label class="check-item exam-task-db-check"><input type="checkbox" name="examTaskSaveToDatabase" checked /> Do bazy zadań</label>
          <button class="btn danger" type="button" data-action="remove-row" style="margin-bottom: 2px">${iconSvg("trash")} Usuń</button>
        </div>
        <div class="exam-new-task-body">
          <div><span class="field-label">Treść zadania</span>${renderLatexEditor("examTaskContent", content, { placeholder: "Wpisz treść zadania..." })}</div>
          <div>
            <div class="field-action-head">
              <span class="field-label">Wzorcowe rozwiązanie <span class="muted small">(opcjonalne)</span></span>
              <button class="btn small" type="button" data-action="pick-exam-solution-screen">${iconSvg("target")} Ze screena</button>
              <input class="exam-solution-screen-input" type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
            </div>
            ${renderLatexEditor("examTaskSolution", solution, { placeholder: "Wzorcowe rozwiązanie..." })}
          </div>
        </div>
      </div>
    `;
  }

  // ========== PDF IMPORT SYSTEM ==========

  const PDF_AGENT_ORIGIN = "http://127.0.0.1:8765";
  const PDFJS_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";
  const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
  let pdfImportState = { tasks: [], rawText: "", fileName: "", status: "idle", agentMeta: null };
  let screenImportState = { tasks: [], fileName: "", previewUrl: "", status: "idle", agentMeta: null };
  let pdfJsLoadPromise = null;

  function renderVisionModelSelect(id = "screenVisionModelSelect", label = "Czat/model vision") {
    return `
      <label>
        <span class="field-label">${escapeHtml(label)}</span>
        <select id="${escapeHtml(id)}" class="input">
          <option value="qwen2.5vl:7b">Ollama - qwen2.5vl:7b</option>
          <option value="qwen3-vl:4b-instruct" selected>Ollama - qwen3-vl:4b-instruct</option>
          <option value="qwen2.5vl:3b">Ollama - qwen2.5vl:3b</option>
        </select>
      </label>
    `;
  }

  function selectedVisionModel(id) {
    const select = document.getElementById(id);
    return select ? String(select.value || "").trim() : "";
  }

  function renderAdminExamImport() {
    return renderAdminLayout(
      "/admin/exams/import",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">${iconSvg("file")} Import arkusza z PDF</h1>
            <p class="muted">Wczytaj arkusz maturalny z pliku PDF. System automatycznie rozpozna zadania i ich punktację.</p>
          </div>
          <a class="btn" href="#/admin/exams">Wróć do arkuszy</a>
        </div>

        <section class="form-section pdf-import-section">
          <div style="margin-bottom: 24px; max-width: 400px;">
            <label><span class="field-label">Tryb odczytu arkusza (dopasuj do przedmiotu)</span>
              <select id="pdfImportFormat" class="input">
                <option value="agent">Lokalny agent ML (wymaga serwera)</option>
                <option value="ollama:qwen2.5vl:7b">Ollama — qwen2.5vl:7b (najlepszy, ~8GB)</option>
                <option value="ollama:qwen3-vl:4b-instruct">Ollama — qwen3-vl:4b-instruct (średni, ~4GB)</option>
                <option value="ollama:qwen2.5vl:3b">Ollama — qwen2.5vl:3b (lekki, ~3GB)</option>
                <option value="standard">Standardowy (tekst ciągły)</option>
                <option value="math">Matematyka (CKE - zachowaj układ 2D i filtruj marginesy)</option>
              </select>
            </label>
          </div>
          <div class="pdf-agent-panel">
            <div>
              <strong>Lokalny agent PDF</strong>
              <p class="muted small">Uruchom: <code>.\start_pdf_agent.ps1</code>. Agent działa w pełni lokalnie pod adresem 127.0.0.1:8765.</p>
            </div>
            <div class="pdf-import-statuses">
              <span class="status unsolved" id="pdfAgentStatus">agent ML: sprawdzam</span>
              <span class="status unsolved" id="pdfOllamaStatus">Ollama: sprawdzam</span>
            </div>
          </div>
          <div class="pdf-upload-zone" id="pdfDropZone" role="button" tabindex="0" aria-controls="pdfFileInput" aria-label="Wybierz plik PDF">
            <div class="pdf-upload-icon">${iconSvg("file")}</div>
            <h3>Przeciągnij plik PDF tutaj</h3>
            <p class="muted">lub kliknij, żeby wybrać z dysku</p>
            <input type="file" id="pdfFileInput" accept=".pdf" style="display:none" />
            <span class="btn primary pdf-upload-cta">${iconSvg("plus")} Wybierz plik PDF</span>
          </div>
          <div id="pdfProcessingStatus" class="hidden" role="status" aria-live="polite">
            <div class="pdf-processing-spinner"></div>
            <p class="muted" id="pdfProcessingMessage">Przetwarzanie pliku PDF...</p>
          </div>
        </section>

        <section class="form-section hidden" id="pdfImportSettings">
          <h2>Ustawienia arkusza</h2>
          <form id="pdfImportForm" class="admin-form">
            <div class="two-col">
              <label><span class="field-label">Tytuł arkusza</span><input class="input" name="title" id="pdfImportTitle" value="" required /></label>
              <label><span class="field-label">Limit czasu (min)</span><input class="input" name="durationMinutes" type="number" min="1" step="1" value="180" required /></label>
            </div>
            <div class="three-col">
              <label><span class="field-label">Przedmiot</span>${subjectSelect("subjectId", state.subjects[0] ? state.subjects[0].id : "", "pdfImportSubject")}</label>
              <label><span class="field-label">Poziom</span>${levelSelect("levelId", "", true, state.subjects[0] ? state.subjects[0].id : "", "pdfImportLevel")}</label>
              <label class="check-item" style="align-self: end"><input type="checkbox" name="isPublished" checked /> Widoczny dla użytkowników</label>
            </div>
          </form>
        </section>

        <section class="form-section hidden" id="pdfImportPreview">
          <div class="section-head">
            <h2>Rozpoznane zadania</h2>
            <div class="button-row">
              <span class="muted small" id="pdfTaskCount"></span>
              <button class="btn" type="button" data-action="pdf-add-empty-task">${iconSvg("plus")} Dodaj ręcznie</button>
              <label class="btn" for="pdfScreenFileInput">${iconSvg("target")} Dodaj ze screena</label>
              <input type="file" id="pdfScreenFileInput" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
              ${renderVisionModelSelect("pdfScreenVisionModel", "Czat/model screena")}
            </div>
          </div>
          <div id="pdfImportTaskList" class="grid"></div>
          <div class="button-row" style="margin-top:24px">
            <button class="btn primary" type="button" data-action="pdf-import-confirm">${iconSvg("check")} Utwórz arkusz z tych zadań</button>
            <button class="btn" type="button" data-action="import-save-selected-to-db" data-import-source="pdf">${iconSvg("plus")} Zapisz wybrane do bazy</button>
            <button class="btn" type="button" data-action="pdf-import-reset">${iconSvg("x")} Anuluj i wczytaj inny</button>
          </div>
        </section>

        <section class="form-section hidden" id="pdfRawTextSection">
          <details>
            <summary class="field-label" style="cursor:pointer">Podgląd surowego tekstu z PDF (debug)</summary>
            <pre id="pdfRawText" class="pdf-raw-text"></pre>
          </details>
        </section>
      `
    );
  }

  function setPdfProcessingMessage(message) {
    const el = document.getElementById("pdfProcessingMessage");
    if (el) el.textContent = message;
  }

  function pdfAgentBaseUrl() {
    if (window.location.protocol === "http:" && window.location.host === "127.0.0.1:8765") {
      return "/api/pdf-agent";
    }
    if (window.location.protocol === "http:" && window.location.host === "localhost:8765") {
      return "/api/pdf-agent";
    }
    return `${PDF_AGENT_ORIGIN}/api/pdf-agent`;
  }

  function pdfAgentPageHint() {
    if (window.location.protocol === "file:") {
      return "Strona jest otwarta jako plik. Otwórz http://127.0.0.1:8765/ i odśwież Ctrl+F5.";
    }
    if (window.location.protocol === "https:") {
      return "Strona działa przez HTTPS, a agent lokalny przez HTTP. Otwórz http://127.0.0.1:8765/.";
    }
    return "";
  }

  function describePdfAgentError(error) {
    const hint = pdfAgentPageHint();
    const message = error && error.message ? error.message : String(error || "nieznany błąd");
    return hint ? `${message}. ${hint}` : message;
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfJsLoadPromise) {
      pdfJsLoadPromise = import(PDFJS_MODULE_URL)
        .then((pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          window.pdfjsLib = pdfjs;
          return pdfjs;
        })
        .catch((error) => {
          pdfJsLoadPromise = null;
          throw error;
        });
    }
    return pdfJsLoadPromise;
  }

  async function checkPdfAgentStatus() {
    const status = document.getElementById("pdfAgentStatus");
    const ollamaStatus = document.getElementById("pdfOllamaStatus");
    if (!status) return;
    try {
      const response = await fetch(`${pdfAgentBaseUrl()}/status`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("Agent nie odpowiedział.");
      const result = await response.json();
      status.textContent = result.trained ? "agent ML: gotowy" : "agent ML: bez modelu";
      status.className = result.trained ? "status solved" : "status unsolved";
      if (ollamaStatus) {
        const ollama = result.ollama || {};
        if (ollama.available && ollama.modelInstalled) {
          ollamaStatus.textContent = `Ollama: ${ollama.model} gotowa`;
          ollamaStatus.className = "status solved";
          ollamaStatus.title = "";
        } else if (ollama.available) {
          ollamaStatus.textContent = `Ollama: pobierz ${ollama.model || "model Qwen"}`;
          ollamaStatus.className = "status unsolved";
          ollamaStatus.title = `Uruchom: ollama pull ${ollama.model || "qwen3-vl:4b-instruct"}`;
        } else {
          ollamaStatus.textContent = "Ollama: nie działa";
          ollamaStatus.className = "status rejected";
          ollamaStatus.title = ollama.error || "Uruchom lokalną Ollamę.";
        }
      }
    } catch (error) {
      status.textContent = "agent ML: nie działa";
      status.className = "status rejected";
      status.title = describePdfAgentError(error);
      if (ollamaStatus) {
        ollamaStatus.textContent = "Ollama: brak statusu";
        ollamaStatus.className = "status rejected";
        ollamaStatus.title = describePdfAgentError(error);
      }
    }
  }

  async function parsePdfWithLocalAgent(file, importer = "ml", ollamaModel = "") {
    const headers = {
      "Content-Type": "application/pdf",
      "X-Filename": encodeURIComponent(file.name || "arkusz.pdf"),
      "X-Pdf-Importer": importer,
    };
    if (ollamaModel) headers["X-Ollama-Model"] = ollamaModel;
    const response = await fetch(`${pdfAgentBaseUrl()}/import`, {
      method: "POST",
      headers,
      body: await file.arrayBuffer(),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.ok === false) {
      throw new Error((result && result.error) || "Lokalny agent PDF nie przetworzył pliku.");
    }
    return {
      rawText: result.rawText || "",
      title: result.title || "",
      tasks: (result.tasks || []).map((task) => ({
        number: Number(task.number || 0),
        title: String(task.title || `Zadanie ${task.number || ""}`).trim(),
        content: String(task.content || "").trim(),
        maxScore: Math.max(1, Number(task.maxScore || 1)),
        enabled: task.enabled !== false,
        type: task.type || inferTaskTypeFromContent(task.content || ""),
        sourcePage: task.sourcePage || null,
        sourceLine: task.sourceLine || null,
      })).filter((task) => task.content),
      meta: {
        trained: Boolean(result.trained),
        confidence: result.stats && result.stats.confidence,
        lines: result.stats && result.stats.lines,
        agentVersion: result.agentVersion || "",
        importer,
        modelType: result.modelType || "",
        modelPath: result.modelPath || "",
        ollamaModel: result.ollamaModel || "",
      },
    };
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Nie udało się odczytać pliku."));
      reader.readAsDataURL(file);
    });
  }

  async function parseImageWithLocalQwen(file, ollamaModel = "") {
    const dataUrl = await fileToDataUrl(file);
    const headers = {
      "Content-Type": file.type || "image/png",
      "X-Filename": encodeURIComponent(file.name || "screen.png"),
    };
    if (ollamaModel) headers["X-Ollama-Model"] = ollamaModel;
    const response = await fetch(`${pdfAgentBaseUrl()}/import-image`, {
      method: "POST",
      headers,
      body: await file.arrayBuffer(),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((result && result.error) || `HTTP ${response.status}`);
    }

    const tasks = ((result && result.tasks) || [])
      .filter((task) => task && task.content && String(task.content).trim().length >= 5)
      .map((task, index) => ({
        number: parseFloat(String(task.number || index + 1).replace(",", ".")) || index + 1,
        title: String(task.title || `Zadanie ${task.number || index + 1}`).trim(),
        content: String(task.content || "").trim(),
        maxScore: Math.max(1, parseInt(task.maxScore, 10) || 1),
        enabled: true,
        type: inferTaskTypeFromContent(task.content || ""),
        sourcePage: null,
        sourceLine: null,
      }));
    return {
      tasks,
      previewUrl: dataUrl,
      meta: {
        trained: true,
        modelType: (result && result.modelType) || "ollama_qwen_vision",
        importer: "screen_qwen",
        agentVersion: (result && result.agentVersion) || "",
        ollamaModel: (result && result.ollamaModel) || ollamaModel || "",
      },
    };
  }

  async function parseSolutionImageWithLocalQwen(file, ollamaModel = "") {
    const dataUrl = await fileToDataUrl(file);
    const headers = {
      "Content-Type": file.type || "image/png",
      "X-Filename": encodeURIComponent(file.name || "solution.png"),
    };
    if (ollamaModel) headers["X-Ollama-Model"] = ollamaModel;
    const response = await fetch(`${pdfAgentBaseUrl()}/import-solution-image`, {
      method: "POST",
      headers,
      body: await file.arrayBuffer(),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((result && result.error) || `HTTP ${response.status}`);
    }
    return {
      content: String((result && result.content) || "").trim(),
      previewUrl: dataUrl,
      meta: {
        trained: true,
        modelType: (result && result.modelType) || "ollama_qwen_vision",
        importer: "solution_screen_qwen",
        agentVersion: (result && result.agentVersion) || "",
        ollamaModel: (result && result.ollamaModel) || ollamaModel || "",
      },
    };
  }

  function submitPdfImportFeedback(payload) {
    if (!payload || !payload.tasks || !payload.tasks.length) return Promise.resolve();
    const url = `${pdfAgentBaseUrl()}/feedback`;
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return Promise.resolve();
    }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).then(() => undefined);
  }

  async function extractTextFromPdf(file, format = "standard") {
    try {
      await loadPdfJs();
    } catch(e) {
      throw new Error("Nie udało się załadować biblioteki pdf.js. Odśwież stronę i spróbuj ponownie.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      const items = [];
      for (const item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;
        
        // 1. ODRZUCAMY OBRÓCONY TEKST (pionowy znak wodny)
        const isRotated = Math.abs(item.transform[1]) > 0.1 || Math.abs(item.transform[2]) > 0.1;
        if (isRotated) continue;
        
        // NORMALIZE UNICODE
        let str = item.str.normalize("NFKC");
        str = str.trim();
        
        // 2. ODRZUCAMY RAMKI OCENIANIA I STOPKI
        if (item.transform[4] < 100 && /^[\d\-]+$/.test(str)) continue; // Lewy margines
        if (item.transform[4] > 480 && /^[\d\.\-]+$/.test(str)) continue; // Prawy margines
        if (item.transform[5] < 60 && (str.includes("Strona") || str.includes("MMA"))) continue; // Stopka
        if (/^[\-\s]+$/.test(str) && item.transform[4] < 120) continue; // Śmieci z ramek
        
        items.push({
          text: str,
          x: item.transform[4],
          y: item.transform[5],
          w: item.width || 0,
          h: Math.abs(item.transform[0]) || 12
        });
      }

      if (format === "math") {
        // Algorytm 1D Math Flattening
        const blocks = [];
        for (const item of items) {
          let added = false;
          const itemMidY = item.y + item.h / 2;
          for (const block of blocks) {
            const blockMidY = (block.minY + block.maxY) / 2;
            if (Math.abs(blockMidY - itemMidY) < Math.max(5, item.h * 0.4)) {
              const gap = Math.max(0, Math.max(block.minX - (item.x + item.w), item.x - block.maxX));
              if (gap < 24) {
                block.items.push(item);
                block.minX = Math.min(block.minX, item.x);
                block.maxX = Math.max(block.maxX, item.x + item.w);
                block.minY = Math.min(block.minY, item.y);
                block.maxY = Math.max(block.maxY, item.y + item.h);
                added = true;
                break;
              }
            }
          }
          if (!added) {
            blocks.push({ items: [item], minX: item.x, maxX: item.x + item.w, minY: item.y, maxY: item.y + item.h });
          }
        }
        
        for (const block of blocks) {
          block.items.sort((a, b) => a.x - b.x);
          block.text = "";
          let lastX = null;
          for (const it of block.items) {
             if (lastX !== null && it.x - lastX > 3) block.text += " ";
             block.text += it.text;
             lastX = it.x + it.w;
          }
          block.text = block.text.trim();
        }
        
        const lines = [];
        for (const block of blocks) {
          let added = false;
          for (const line of lines) {
            if (block.maxY >= line.minY - 2 && block.minY <= line.maxY + 2) {
              line.blocks.push(block);
              line.maxY = Math.max(line.maxY, block.maxY);
              line.minY = Math.min(line.minY, block.minY);
              added = true;
              break;
            }
          }
          if (!added) {
            lines.push({ minY: block.minY, maxY: block.maxY, blocks: [block] });
          }
        }
        
        lines.sort((a, b) => b.minY - a.minY);
        
        let pageText = "";
        for (const line of lines) {
          line.blocks.sort((a, b) => {
            const overlap = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
            const minW = Math.min(a.maxX - a.minX, b.maxX - b.minX);
            if (minW > 0 && overlap / minW > 0.3) {
              return b.maxY - a.maxY;
            }
            return a.minX - b.minX;
          });
          
          let lineStr = "";
          for (let j = 0; j < line.blocks.length; j++) {
            const block = line.blocks[j];
            if (j > 0) {
              const prev = line.blocks[j-1];
              const overlap = Math.max(0, Math.min(prev.maxX, block.maxX) - Math.max(prev.minX, block.minX));
              const minW = Math.min(prev.maxX - prev.minX, block.maxX - block.minX);
              
              if (minW > 0 && overlap / minW > 0.3) {
                const pt = prev.text.toLowerCase();
                if (pt === "lim" || pt === "sum" || pt === "limite") {
                  lineStr += "_{" + block.text + "} ";
                } else {
                  lineStr += " / (" + block.text + ")";
                }
              } else {
                const gap = block.minX - prev.maxX;
                if (gap > 4) lineStr += " ";
                lineStr += block.text;
              }
            } else {
              lineStr += block.text;
            }
          }
          pageText += lineStr + "\n";
        }
        pages.push(pageText.trim());
      } else {
        items.sort((a, b) => b.y - a.y);
        const lines = [];
        for (const item of items) {
          let added = false;
          const itemTop = item.y + item.h;
          const itemBottom = item.y;
          for (const line of lines) {
            if (itemTop >= line.minY - 2 && itemBottom <= line.maxY + 2) {
              line.items.push(item);
              line.maxY = Math.max(line.maxY, itemTop);
              line.minY = Math.min(line.minY, itemBottom);
              added = true;
              break;
            }
          }
          if (!added) {
            lines.push({ maxY: itemTop, minY: itemBottom, items: [item] });
          }
        }
        
        lines.sort((a, b) => b.minY - a.minY);

        let pageText = "";
        for (const line of lines) {
          line.items.sort((a, b) => a.x - b.x);
          
          let lineStr = "";
          let lastEnd = null;
          for (let j = 0; j < line.items.length; j++) {
            const item = line.items[j];
            if (lastEnd !== null) {
              const gap = item.x - lastEnd;
              if (format === "math") {
                if (gap > 6) {
                  const spaces = Math.max(1, Math.round(gap / 4.5));
                  lineStr += " ".repeat(Math.min(spaces, 16));
                } else if (gap > 2.5) {
                  lineStr += " ";
                }
              } else {
                if (gap > 2.5) lineStr += " ";
              }
            }
            lineStr += item.text;
            lastEnd = item.x + item.w;
          }
          pageText += lineStr + "\n";
        }
        pages.push(pageText.trim());
      }
    }
    
    return pages.join("\n\n--- STRONA ---\n\n");
  }

  function reconstructMathLatex(text, format = "standard") {
    let r = text;
    // Replace characters that are definitely math symbols
    const replacements = {
      "∞": "\\infty", "→": "\\to", "⇒": "\\Rightarrow", "⇔": "\\Leftrightarrow",
      "≤": "\\leq", "≥": "\\geq", "≠": "\\neq", "±": "\\pm", "·": "\\cdot",
      "×": "\\times", "÷": "\\div", "π": "\\pi", "α": "\\alpha", "β": "\\beta",
      "γ": "\\gamma", "δ": "\\delta", "Δ": "\\Delta", "θ": "\\theta", "φ": "\\varphi",
      "∈": "\\in", "∉": "\\notin", "⊂": "\\subset", "∩": "\\cap", "∪": "\\cup",
      "∅": "\\emptyset", "ℝ": "\\mathbb{R}", "ℕ": "\\mathbb{N}", "ℤ": "\\mathbb{Z}"
    };
    
    Object.entries(replacements).forEach(([key, val]) => {
      // Don't double-wrap if it's already near backslashes or math blocks
      r = r.split(key).join(` ${val} `);
    });

    // Fix fractions squished together due to line grouping: "1 x + 1 y" -> "1/x + 1/y" (simple heuristic for common patterns)
    r = r.replace(/\b(\d+)\s+([a-zA-Z])\b/g, "$1/$2");
    
    // Patterns for formulas
    r = r.replace(/√\(([^)]+)\)/g, " \\sqrt{$1} ");
    r = r.replace(/√(\d+)/g, " \\sqrt{$1} ");
    r = r.replace(/(\w)\^(\d+)/g, " $1^{$2} ");
    r = r.replace(/(\w)\^\(([^)]+)\)/g, " $1^{$2} ");
    r = r.replace(/(\w)_(\d+)/g, " $1_{$2} ");
    
    // Limits
    r = r.replace(/lim\s*(?:n\s*→\s*\+?\s*\\?infty|n\s*\\to\s*\+?\s*\\?infty)/gi, " \\lim_{n \\to +\\infty} ");
    
    if (format === "math") {
      // W trybie math algorytm ekstrakcji sam złożył 1D string, 
      // nawiasy \( \) zepsułyby czytelność. Zwracamy po prostu oczyszczony tekst 1D.
      return r.replace(/\s+/g, " ").trim();
    }
    
    // Wrap expressions that contain math symbols with \( \) if they are not already wrapped.
    // We look for segments containing \infty, \to, \leq, \geq, \sqrt, ^, _, \frac, etc.
    const mathTokenRegex = /(\\infty|\\to|\\Rightarrow|\\Leftrightarrow|\\leq|\\geq|\\neq|\\pm|\\cdot|\\times|\\div|\\pi|\\alpha|\\beta|\\gamma|\\delta|\\Delta|\\theta|\\varphi|\\in|\\notin|\\subset|\\cap|\\cup|\\emptyset|\\mathbb{R}|\\mathbb{N}|\\mathbb{Z}|\\sqrt|\\lim|[_^=+\-*/<>]+)/;
    
    // Split into words and wrap consecutive math-like words
    const tokens = r.split(/(\s+)/);
    let finalStr = "";
    let inMath = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (/^\s+$/.test(token)) {
        finalStr += token;
        continue;
      }
      
      const nextToken = tokens[i+2];
      const prevToken = tokens[i-2];
      
      const isMath = mathTokenRegex.test(token) || /^[0-9a-zA-Z]+$/.test(token) && ((nextToken && mathTokenRegex.test(nextToken)) || (prevToken && mathTokenRegex.test(prevToken)));
      
      if (isMath && !inMath) {
        finalStr += "\\( " + token;
        inMath = true;
      } else if (!isMath && inMath) {
        // Close math if we hit a pure text word
        if (token.length > 2 && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/.test(token)) {
          finalStr += " \\)" + token;
          inMath = false;
        } else {
          finalStr += token;
        }
      } else {
        finalStr += token;
      }
    }
    if (inMath) finalStr += " \\)";

    // Clean up excessive wrappers
    r = finalStr.replace(/\\\)\s*\\\(/g, " ").replace(/\s+/g, " ").trim();
    
    return r;
  }

  function parsePdfToTasks(rawText, format = "standard") {
    const tasks = [];
    
    let normalizedText = rawText
      .replace(/\u2013|\u2014/g, "-")
      .replace(/Z\s*a\s*d\s*a\s*n\s*i\s*e/gi, "Zadanie");
      
    // Znajdź wszystkie nagłówki zadań
    const taskRegex = /Zadanie\s*(\d+)/gi;
    const taskMatches = [...normalizedText.matchAll(taskRegex)];
    
    for (let i = 0; i < taskMatches.length; i++) {
      const match = taskMatches[i];
      const taskNumber = parseInt(match[1], 10);
      
      const startIndex = match.index;
      const endIndex = (i + 1 < taskMatches.length) ? taskMatches[i+1].index : normalizedText.length;
      
      let block = normalizedText.substring(startIndex, endIndex);
      
      // Wyciągnięcie numeru i punktów
      const firstLineMatch = block.match(/^Zadanie\s*\d+[^\n]*/i);
      let firstLineText = firstLineMatch ? firstLineMatch[0] : match[0];
      
      let maxScore = 1;
      const ptMatch = firstLineText.match(/\(\s*0\s*-\s*(\d+)\s*\)/) || firstLineText.match(/\(\s*(\d+)\s*pkt\.?\s*\)/i);
      if (ptMatch) {
        maxScore = parseInt(ptMatch[1], 10);
      }
      
      let content = block.substring(firstLineText.length).trim();
      
      const stopPatterns = [
        /Zapisz\s+obliczenia/i,
        /Miejsce\s+na\s+obliczenia/i,
        /Dokończ\s+zdanie/i,
        /Wybierz\s+odpowiedź/i,
        /Brudnopis/i,
        /--- STRONA ---/i,
        /CKE/i,
        /Strona\s*\d+\s*z\s*\d+/i,
        /MMA[\s\-_]*[PR]/i
      ];
      
      let earliestStop = content.length;
      let cutWord = "";
      for (const pattern of stopPatterns) {
        const smatch = content.match(pattern);
        if (smatch && smatch.index < earliestStop) {
          earliestStop = smatch.index;
          cutWord = smatch[0];
        }
      }
      
      if (cutWord && cutWord.toLowerCase().includes("zapisz obliczenia")) {
        earliestStop += cutWord.length;
        if (content[earliestStop] === '.') earliestStop++;
      }
      
      content = content.substring(0, earliestStop).trim();
      
      // CZYSZCZENIE ZABRUDZEŃ (np. resztki punktacji "0-1-2", "02--13-")
      if (format === "math") {
        content = content
          .replace(/^[ \t]*[\d\-]{3,}[ \t]*$/gm, "")
          .replace(/[0-9]+\-+[0-9\-]+/g, "")
          .replace(/(\w) (ę|ą|ś|ć|ź|ż|ó|ł|ń) (\w)/gi, "$1$2$3")
          .replace(/(\w) (ę|ą|ś|ć|ź|ż|ó|ł|ń)([\s.,;:]|$)/gi, "$1$2$3")
          .replace(/^[ \t]+$/gm, "") // usuń spacje na końcach
          .replace(/\n{3,}/g, "\n\n") // redukuj duże przerwy
          .trim();
      } else {
        content = content
          .replace(/(?:^|\s)[\d\-]{3,}(?:\s|$)/g, " ")
          .replace(/[0-9]+\-+[0-9\-]+/g, "")
          .replace(/(\w) (ę|ą|ś|ć|ź|ż|ó|ł|ń) (\w)/gi, "$1$2$3")
          .replace(/(\w) (ę|ą|ś|ć|ź|ż|ó|ł|ń)(\s|[.,;:]|$)/gi, "$1$2$3")
          .replace(/\s+/g, " ")
          .trim();
      }
        
      content = reconstructMathLatex(content, format);
      
      if (content.length > 5) {
        tasks.push({
          number: taskNumber,
          title: `Zadanie ${taskNumber}`,
          content: content,
          maxScore: Math.max(1, maxScore),
          enabled: true
        });
      }
    }
    
    // Deduplikacja, jeśli zadanie jest na kilku stronach
    const uniqueTasks = [];
    const seen = new Set();
    for (const task of tasks) {
      if (!seen.has(task.number)) {
        seen.add(task.number);
        uniqueTasks.push(task);
      }
    }
    
    return uniqueTasks;
  }

  function importContextBySource(source) {
    return source === "screen"
      ? { state: screenImportState, sourceType: "screen" }
      : { state: pdfImportState, sourceType: "pdf" };
  }

  function syncImportStateFromRows(source = "pdf") {
    const context = importContextBySource(source);
    document.querySelectorAll(`.pdf-import-task[data-import-source="${source}"]`).forEach((row) => {
      const index = Number(row.dataset.pdfTaskIndex);
      const task = context.state.tasks[index];
      if (!task) return;
      const enabled = row.querySelector('[data-action="pdf-toggle-task"]');
      const titleInput = row.querySelector(".pdf-task-title");
      const scoreInput = row.querySelector(".pdf-task-score");
      const contentInput = row.querySelector(".pdf-task-content");
      task.enabled = !(enabled && !enabled.checked);
      task.title = titleInput ? titleInput.value.trim() || task.title : task.title;
      task.maxScore = scoreInput ? Math.max(1, Number(scoreInput.value) || 1) : task.maxScore;
      task.content = contentInput ? contentInput.value.trim() : task.content;
      if (row.dataset.savedTaskId) task.savedTaskId = row.dataset.savedTaskId;
    });
  }

  function importedTaskFromRow(row, source = "pdf") {
    if (!row) return null;
    const context = importContextBySource(source);
    const index = Number(row.dataset.pdfTaskIndex);
    const importedTask = context.state.tasks[index] || {};
    const titleInput = row.querySelector(".pdf-task-title");
    const scoreInput = row.querySelector(".pdf-task-score");
    const contentInput = row.querySelector(".pdf-task-content");
    const enabled = row.querySelector('[data-action="pdf-toggle-task"]');
    return {
      index,
      enabled: !(enabled && !enabled.checked),
      title: titleInput ? titleInput.value.trim() || `Zadanie ${index + 1}` : `Zadanie ${index + 1}`,
      content: contentInput ? contentInput.value.trim() : "",
      maxScore: scoreInput ? Math.max(1, Number(scoreInput.value) || 1) : 1,
      type: importedTask.type || inferTaskTypeFromContent(imported.content),
      number: importedTask.number || index + 1,
      sourcePage: importedTask.sourcePage || null,
      sourceLine: importedTask.sourceLine || null,
      importedTitle: importedTask.title || `Zadanie ${index + 1}`,
      importedContent: importedTask.content || "",
      savedTaskId: row.dataset.savedTaskId || importedTask.savedTaskId || "",
    };
  }

  function upsertImportedTaskToDatabase(imported, options) {
    const now = new Date().toISOString();
    const existing = imported.savedTaskId ? taskById(imported.savedTaskId) : null;
    const taskId = existing ? existing.id : uid("task");
    const task = {
      id: taskId,
      title: imported.title,
      slug: slugify(imported.title),
      subjectId: options.subjectId,
      levelId: options.levelId || "",
      difficulty: existing ? existing.difficulty || 2 : 2,
      maxScore: imported.maxScore,
      type: imported.type || "ai_open",
      content: imported.content,
      officialSolution: existing ? existing.officialSolution || "" : "",
      additionalSolutions: existing ? existing.additionalSolutions || [] : [],
      solutionFiles: existing ? existing.solutionFiles || [] : [],
      isPublished: options.isPublished,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      categories: existing ? existing.categories || [] : [],
      tags: existing ? existing.tags || [] : [],
      files: existing ? existing.files || [] : [],
      scoringCriteria: existing && existing.scoringCriteria && existing.scoringCriteria.length
        ? existing.scoringCriteria
        : [{
          id: uid("crit"),
          description: options.criterionDescription || "Poprawne rozwiązanie zadania.",
          points: imported.maxScore,
          aiHint: "",
          order: 1,
          isPartial: true,
        }],
      checkerConfig: existing ? existing.checkerConfig || null : null,
      sourceLayout: "exam-paper",
      sourceFile: options.sourceFile || "",
      sourcePage: imported.sourcePage || null,
      sourceTaskNumber: imported.number || imported.index + 1,
      sourceType: options.sourceType || "pdf",
    };

    if (existing) {
      state.tasks = state.tasks.map((item) => (item.id === existing.id ? task : item));
    } else {
      state.tasks.push(task);
    }
    return taskId;
  }

  function renderPdfImportPreview(tasks, source = "pdf") {
    return tasks.map((task, index) => `
      <div class="exam-new-task-row pdf-import-task ${task.enabled ? "" : "pdf-task-disabled"}" data-import-source="${source}" data-pdf-task-index="${index}" ${task.savedTaskId ? `data-saved-task-id="${escapeHtml(task.savedTaskId)}"` : ""}>
        <div class="exam-new-task-header">
          <label class="check-item">
            <input type="checkbox" data-action="pdf-toggle-task" data-task-index="${index}" ${task.enabled ? "checked" : ""} />
            <span class="field-label" style="margin:0">Uwzględnij</span>
          </label>
          <label><span class="field-label">Tytuł</span><input class="input pdf-task-title" value="${escapeHtml(task.title)}" data-task-index="${index}" /></label>
          <label><span class="field-label">Punkty</span><input class="input pdf-task-score" type="number" min="1" step="1" value="${task.maxScore}" data-task-index="${index}" /></label>
          <button class="btn" type="button" data-action="import-save-task-to-db" data-import-source="${source}" data-task-index="${index}">${iconSvg("plus")} Do bazy</button>
        </div>
        <div class="exam-new-task-body">
          <div style="grid-column: 1 / -1">
            <span class="field-label">Treść zadania <span class="muted small">(edytowalna)</span></span>
            <textarea class="input pdf-task-content" rows="6" data-task-index="${index}">${escapeHtml(task.content)}</textarea>
            <div class="pdf-agent-task-preview imported-exam-paper" data-pdf-preview="${index}">
              ${toParagraphs(task.content)}
            </div>
          </div>
        </div>
      </div>
    `).join("");
  }

  async function handlePdfImportConfirm() {
    const form = document.getElementById("pdfImportForm");
    if (!form) return;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const subjectId = String(data.get("subjectId") || "");
    const levelId = String(data.get("levelId") || "");
    if (!title || !subjectId) {
      alert("Wypełnij tytuł arkusza i wybierz przedmiot.");
      return;
    }

    // Read current state from DOM (user may have edited titles/content/scores)
    const taskRows = document.querySelectorAll(".pdf-import-task");
    const now = new Date().toISOString();
    const isPublished = data.get("isPublished") === "on";
    const newTaskIds = [];
    const feedbackTasks = [];

    taskRows.forEach((row) => {
      const index = Number(row.dataset.pdfTaskIndex);
      const enabled = row.querySelector('[data-action="pdf-toggle-task"]');
      const importedTask = pdfImportState.tasks[index] || {};

      const titleInput = row.querySelector(".pdf-task-title");
      const scoreInput = row.querySelector(".pdf-task-score");
      const contentInput = row.querySelector(".pdf-task-content");

      const taskTitle = titleInput ? titleInput.value.trim() : `Zadanie ${index + 1}`;
      const taskContent = contentInput ? contentInput.value.trim() : "";
      const taskScore = scoreInput ? Math.max(1, Number(scoreInput.value) || 1) : 2;
      const isEnabled = !(enabled && !enabled.checked);

      feedbackTasks.push({
        number: importedTask.number || index + 1,
        sourcePage: importedTask.sourcePage || null,
        sourceLine: importedTask.sourceLine || null,
        maxScore: taskScore,
        enabled: isEnabled,
        importedTitle: importedTask.title || `Zadanie ${index + 1}`,
        correctedTitle: taskTitle,
        importedContent: importedTask.content || "",
        correctedContent: taskContent,
      });

      if (!isEnabled) return;

      if (!taskContent) return;

      const taskId = row.dataset.savedTaskId || uid("task");
      if (row.dataset.savedTaskId) {
        state.tasks = state.tasks.filter((task) => task.id !== row.dataset.savedTaskId);
      }
      state.tasks.push({
        id: taskId,
        title: taskTitle,
        slug: slugify(taskTitle),
        subjectId,
        levelId: levelId || "",
        difficulty: 2,
        maxScore: taskScore,
        type: importedTask.type || inferTaskTypeFromContent(taskContent),
        content: taskContent,
        officialSolution: "",
        additionalSolutions: [],
        solutionFiles: [],
        isPublished,
        createdAt: now,
        updatedAt: now,
        categories: [],
        tags: [],
        files: [],
        scoringCriteria: [{
          id: uid("crit"),
          description: "Poprawne rozwiązanie zadania.",
          points: taskScore,
          aiHint: "",
          order: 1,
          isPartial: true,
        }],
        checkerConfig: null,
        sourceLayout: "exam-paper",
        sourceFile: pdfImportState.fileName,
        sourcePage: importedTask.sourcePage || null,
        sourceTaskNumber: importedTask.number || index + 1,
      });
      row.dataset.savedTaskId = taskId;
      newTaskIds.push(taskId);
    });

    if (!newTaskIds.length) {
      alert("Żadne zadanie nie zostało wybrane do importu.");
      return;
    }

    const sheet = {
      id: uid("exam"),
      title,
      slug: slugify(title),
      subjectId,
      levelId: levelId || "",
      durationMinutes: Number(data.get("durationMinutes") || 180),
      description: `Arkusz zaimportowany z pliku PDF: ${pdfImportState.fileName}`,
      isPublished,
      taskIds: newTaskIds,
      createdAt: now,
      updatedAt: now,
    };
    state.examSheets.push(sheet);
    saveState();

    try {
      await submitPdfImportFeedback({
        fileName: pdfImportState.fileName,
        title,
        subjectId,
        levelId: levelId || "",
        agentMeta: pdfImportState.agentMeta || {},
        tasks: feedbackTasks,
      });
    } catch (error) {
      console.warn("Nie udało się zapisać feedbacku importu PDF.", error);
    }

    pdfImportState = { tasks: [], rawText: "", fileName: "", status: "idle", agentMeta: null };
    alert(`Utworzono arkusz "${title}" z ${newTaskIds.length} zadaniami.`);
    window.location.hash = "#/admin/exams";
    renderRoute();
  }

  function importFormOptions(source) {
    const form = document.getElementById(source === "screen" ? "screenImportForm" : "pdfImportForm");
    if (!form) return null;
    const data = new FormData(form);
    const subjectId = String(data.get("subjectId") || "");
    if (!subjectId) {
      alert("Wybierz przedmiot przed zapisem do bazy.");
      return null;
    }
    return {
      subjectId,
      levelId: String(data.get("levelId") || ""),
      isPublished: data.get("isPublished") === "on",
      sourceFile: source === "screen" ? screenImportState.fileName : pdfImportState.fileName,
      sourceType: source,
    };
  }

  function saveImportedRowsToDatabase(source = "pdf", singleRow = null) {
    const options = importFormOptions(source);
    if (!options) return 0;
    const rows = singleRow ? [singleRow] : Array.from(document.querySelectorAll(`.pdf-import-task[data-import-source="${source}"]`));
    let saved = 0;
    rows.forEach((row) => {
      const imported = importedTaskFromRow(row, source);
      if (!imported || !imported.enabled || !imported.content) return;
      const taskId = upsertImportedTaskToDatabase(imported, options);
      row.dataset.savedTaskId = taskId;
      const context = importContextBySource(source);
      if (context.state.tasks[imported.index]) context.state.tasks[imported.index].savedTaskId = taskId;
      saved += 1;
    });
    if (saved) saveState();
    return saved;
  }

  function appendEmptyImportTask(source = "pdf") {
    syncImportStateFromRows(source);
    const context = importContextBySource(source);
    const nextNumber = context.state.tasks.length + 1;
    context.state.tasks.push({
      number: nextNumber,
      title: `Zadanie ${nextNumber}`,
      content: "",
      maxScore: 1,
      enabled: true,
      type: "ai_open",
      sourcePage: null,
      sourceLine: null,
    });
    const list = document.getElementById(source === "screen" ? "screenImportTaskList" : "pdfImportTaskList");
    if (list) {
      list.innerHTML = renderPdfImportPreview(context.state.tasks, source);
      renderMath(list);
    }
    const countEl = document.getElementById("pdfTaskCount");
    if (source === "pdf" && countEl) countEl.textContent = `Znaleziono ${pdfImportState.tasks.length} zadań`;
  }

  function updatePdfImportPreviewList() {
    const listEl = document.getElementById("pdfImportTaskList");
    const countEl = document.getElementById("pdfTaskCount");
    if (listEl) {
      listEl.innerHTML = renderPdfImportPreview(pdfImportState.tasks, "pdf");
      renderMath(listEl);
    }
    if (countEl) countEl.textContent = `Znaleziono ${pdfImportState.tasks.length} zadań`;
  }

  async function handlePdfFileUpload(file) {
    if (!file || file.type !== "application/pdf") {
      alert("Wybierz plik PDF.");
      return;
    }
    pdfImportState.fileName = file.name;
    pdfImportState.status = "processing";

    // Show spinner
    const statusEl = document.getElementById("pdfProcessingStatus");
    const dropZone = document.getElementById("pdfDropZone");
    if (statusEl) statusEl.classList.remove("hidden");
    if (dropZone) dropZone.classList.add("hidden");

    try {
      const formatSelect = document.getElementById("pdfImportFormat");
      const format = formatSelect ? formatSelect.value : "standard";
      let rawText = "";
      let tasks = [];
      let titleFromAgent = "";
      pdfImportState.agentMeta = null;

      if (format === "agent" || format === "ollama" || format.startsWith("ollama:")) {
        try {
          const usesOllama = format === "ollama" || format.startsWith("ollama:");
          const ollamaModel = format.startsWith("ollama:") ? format.slice(7) : "";
          setPdfProcessingMessage(usesOllama ? `Ollama ${ollamaModel || "Qwen"} czyta strony PDF...` : "Wysyłam PDF do lokalnego agenta ML...");
          const agentResult = await parsePdfWithLocalAgent(file, usesOllama ? "ollama" : "ml", ollamaModel);
          rawText = agentResult.rawText;
          tasks = agentResult.tasks;
          titleFromAgent = agentResult.title;
          pdfImportState.agentMeta = agentResult.meta;
        } catch (agentError) {
          if (format === "ollama" || format.startsWith("ollama:")) {
            console.warn("Ollama PDF importer unavailable, using local ML agent.", agentError);
            try {
              setPdfProcessingMessage(`Ollama niedostępna: ${describePdfAgentError(agentError)} Używam lokalnego agenta ML...`);
              const agentResult = await parsePdfWithLocalAgent(file, "ml");
              rawText = agentResult.rawText;
              tasks = agentResult.tasks;
              titleFromAgent = agentResult.title;
              pdfImportState.agentMeta = { ...agentResult.meta, fallbackFrom: "ollama", error: describePdfAgentError(agentError) };
            } catch (mlError) {
              console.warn("Local PDF agent unavailable, using browser fallback.", mlError);
              setPdfProcessingMessage(`Agent lokalny niedostępny: ${describePdfAgentError(mlError)} Używam parsera w przeglądarce...`);
              rawText = await extractTextFromPdf(file, "math");
              tasks = parsePdfToTasks(rawText, "math");
              pdfImportState.agentMeta = { fallback: true, fallbackFrom: "ollama", error: describePdfAgentError(mlError) };
            }
          } else {
            console.warn("Local PDF agent unavailable, using browser fallback.", agentError);
            setPdfProcessingMessage(`Agent lokalny niedostępny: ${describePdfAgentError(agentError)} Używam parsera w przeglądarce...`);
            rawText = await extractTextFromPdf(file, "math");
            tasks = parsePdfToTasks(rawText, "math");
            pdfImportState.agentMeta = { fallback: true, error: describePdfAgentError(agentError) };
          }
        }
      } else {
        setPdfProcessingMessage("Przetwarzanie pliku PDF w przeglądarce...");
        rawText = await extractTextFromPdf(file, format);
        tasks = parsePdfToTasks(rawText, format);
      }

      pdfImportState.rawText = rawText;
      pdfImportState.tasks = tasks;
      pdfImportState.status = "ready";

      // Auto-detect title from filename
      const titleGuess = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Show settings
      const settingsEl = document.getElementById("pdfImportSettings");
      const previewEl = document.getElementById("pdfImportPreview");
      const rawSection = document.getElementById("pdfRawTextSection");
      const titleInput = document.getElementById("pdfImportTitle");
      const countEl = document.getElementById("pdfTaskCount");
      const listEl = document.getElementById("pdfImportTaskList");
      const rawTextEl = document.getElementById("pdfRawText");

      if (titleInput) titleInput.value = titleFromAgent || titleGuess;
      if (countEl) {
        const meta = pdfImportState.agentMeta;
        const agentLabel = meta
          ? meta.fallback
            ? "fallback w przeglądarce"
            : meta.modelType === "ollama_qwen_vision"
              ? `Ollama ${meta.ollamaModel || "Qwen Vision"}`
              : meta.trained
                ? `agent ML${meta.confidence ? `, pewność ${Math.round(meta.confidence * 100)}%` : ""}`
              : "agent lokalny bez modelu"
          : "parser w przeglądarce";
        countEl.textContent = `Znaleziono ${pdfImportState.tasks.length} zadań · ${agentLabel}`;
      }
      if (listEl) {
        listEl.innerHTML = renderPdfImportPreview(pdfImportState.tasks, "pdf");
        renderMath(listEl);
      }
      if (rawTextEl) rawTextEl.textContent = rawText;

      if (settingsEl) settingsEl.classList.remove("hidden");
      if (previewEl) previewEl.classList.remove("hidden");
      if (rawSection) rawSection.classList.remove("hidden");
      if (statusEl) statusEl.classList.add("hidden");

      // Enhance any new selects
      enhanceSelects();

    } catch (error) {
      console.error("PDF parse error:", error);
      alert("Nie udało się przetworzyć pliku PDF: " + error.message);
      pdfImportState.status = "idle";
      if (statusEl) statusEl.classList.add("hidden");
      if (dropZone) dropZone.classList.remove("hidden");
    }
  }

  async function handlePdfScreenFileUpload(file) {
    if (!file || !/^image\//.test(file.type || "")) {
      alert("Wybierz plik obrazu: JPG, PNG albo WEBP.");
      return;
    }
    syncImportStateFromRows("pdf");
    const statusEl = document.getElementById("pdfProcessingStatus");
    const messageEl = document.getElementById("pdfProcessingMessage");
    try {
      if (statusEl) statusEl.classList.remove("hidden");
      if (messageEl) messageEl.textContent = "Lokalny Qwen rozpoznaje zadanie ze screena...";
      const result = await parseImageWithLocalQwen(file, selectedVisionModel("pdfScreenVisionModel"));
      const offset = pdfImportState.tasks.length;
      const appended = result.tasks.map((task, index) => ({
        ...task,
        number: task.number || offset + index + 1,
      }));
      if (!appended.length) throw new Error("Nie znaleziono zadania na screenie.");
      pdfImportState.tasks.push(...appended);
      updatePdfImportPreviewList();
    } catch (error) {
      console.error("Screen import in PDF flow error:", error);
      alert("Nie udało się dodać zadania ze screena: " + error.message);
    } finally {
      if (statusEl) statusEl.classList.add("hidden");
      const input = document.getElementById("pdfScreenFileInput");
      if (input) input.value = "";
    }
  }

  async function handleScreenFileUpload(file) {
    if (!file || !/^image\//.test(file.type || "")) {
      alert("Wybierz plik obrazu: JPG, PNG albo WEBP.");
      return;
    }
    screenImportState.fileName = file.name || "screen";
    screenImportState.status = "processing";
    const statusEl = document.getElementById("screenProcessingStatus");
    const dropZone = document.getElementById("screenDropZone");
    const messageEl = document.getElementById("screenProcessingMessage");
    try {
      if (dropZone) dropZone.classList.add("hidden");
      if (statusEl) statusEl.classList.remove("hidden");
      if (messageEl) messageEl.textContent = "Lokalny Qwen rozpoznaje zadanie ze screena...";
      const result = await parseImageWithLocalQwen(file, selectedVisionModel("screenVisionModelSelect"));
      if (!result.tasks.length) throw new Error("Nie znaleziono zadania na screenie.");
      screenImportState = {
        tasks: result.tasks,
        fileName: file.name || "screen",
        previewUrl: result.previewUrl,
        status: "ready",
        agentMeta: result.meta,
      };
      renderRoute();
    } catch (error) {
      console.error("Screen parse error:", error);
      alert("Nie udało się rozpoznać screena: " + error.message);
      screenImportState = { tasks: [], fileName: "", previewUrl: "", status: "idle", agentMeta: null };
      if (dropZone) dropZone.classList.remove("hidden");
      if (statusEl) statusEl.classList.add("hidden");
    }
  }

  async function handleExamScreenFileUpload(file) {
    if (!file || !/^image\//.test(file.type || "")) {
      alert("Wybierz plik obrazu: JPG, PNG albo WEBP.");
      return;
    }
    const box = document.getElementById("examNewTasksBox");
    const statusEl = document.getElementById("examScreenProcessingStatus");
    const messageEl = document.getElementById("examScreenProcessingMessage");
    try {
      if (statusEl) statusEl.classList.remove("hidden");
      if (messageEl) messageEl.textContent = "Lokalny Qwen rozpoznaje zadanie ze screena...";
      const result = await parseImageWithLocalQwen(file, selectedVisionModel("examScreenVisionModel"));
      if (!result.tasks.length) throw new Error("Nie znaleziono zadania na screenie.");
      if (box) {
        result.tasks.forEach((task) => {
          box.insertAdjacentHTML("beforeend", renderExamNewTaskRowFromData({ ...task, sourceType: "screen" }));
        });
        renderMath(box);
      }
    } catch (error) {
      console.error("Exam screen import error:", error);
      alert("Nie udało się dodać zadania ze screena do arkusza: " + error.message);
    } finally {
      if (statusEl) statusEl.classList.add("hidden");
      const input = document.getElementById("examScreenFileInput");
      if (input) input.value = "";
    }
  }

  async function handleSolutionScreenFileUpload(file, textarea) {
    if (!file || !/^image\//.test(file.type || "")) {
      alert("Wybierz plik obrazu: JPG, PNG albo WEBP.");
      return;
    }
    if (!textarea) return;
    try {
      const result = await parseSolutionImageWithLocalQwen(file);
      if (!result.content) throw new Error("Nie znaleziono treści rozwiązania na screenie.");
      const current = textarea.value.trim();
      textarea.value = current ? `${current}\n\n${result.content}` : result.content;
      updateLatexPreview(textarea);
    } catch (error) {
      console.error("Solution screen import error:", error);
      alert("Nie udało się dodać rozwiązania ze screena: " + error.message);
    }
  }

  function upsertExamNewTaskRow(row, subjectId, levelId, isPublished) {
    const title = fieldValue(row, '[name="examTaskTitle"]').trim();
    const content = fieldValue(row, '[name="examTaskContent"]').trim();
    if (!title || !content) return null;
    const maxScore = Math.max(1, Number(fieldValue(row, '[name="examTaskMaxScore"]') || 1));
    const existing = row.dataset.savedTaskId ? taskById(row.dataset.savedTaskId) : null;
    const taskId = existing ? existing.id : uid("task");
    const now = new Date().toISOString();
    const task = {
      id: taskId,
      title,
      slug: slugify(title),
      subjectId,
      levelId,
      difficulty: existing ? existing.difficulty || 2 : 2,
      maxScore,
      type: existing ? existing.type || inferTaskTypeFromContent(content) : inferTaskTypeFromContent(content),
      content,
      officialSolution: fieldValue(row, '[name="examTaskSolution"]').trim(),
      additionalSolutions: existing ? existing.additionalSolutions || [] : [],
      solutionFiles: existing ? existing.solutionFiles || [] : [],
      isPublished,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      categories: existing ? existing.categories || [] : [],
      tags: existing ? existing.tags || [] : [],
      files: existing ? existing.files || [] : [],
      scoringCriteria: existing && existing.scoringCriteria && existing.scoringCriteria.length
        ? existing.scoringCriteria
        : [{
          id: uid("crit"),
          description: "Poprawne rozwiązanie zgodne z odpowiedzią wzorcową.",
          points: maxScore,
          aiHint: "",
          order: 1,
          isPartial: true,
        }],
      checkerConfig: existing ? existing.checkerConfig || null : null,
      sourceLayout: row.dataset.sourceType ? "exam-paper" : existing && existing.sourceLayout,
      sourceType: row.dataset.sourceType || existing && existing.sourceType || "",
    };
    if (existing) {
      state.tasks = state.tasks.map((item) => (item.id === existing.id ? task : item));
    } else {
      state.tasks.push(task);
    }
    row.dataset.savedTaskId = taskId;
    return taskId;
  }

  function saveExamNewTasksToDatabase() {
    const form = document.getElementById("examForm");
    if (!form) return 0;
    const data = new FormData(form);
    const subjectId = String(data.get("subjectId") || "");
    const levelId = String(data.get("levelId") || "");
    if (!subjectId) {
      alert("Wybierz przedmiot przed zapisem zadań do bazy.");
      return 0;
    }
    const isPublished = data.get("isPublished") === "on";
    const rows = Array.from(form.querySelectorAll(".exam-new-task-row"));
    let saved = 0;
    rows.forEach((row) => {
      if (!fieldChecked(row, '[name="examTaskSaveToDatabase"]')) return;
      if (upsertExamNewTaskRow(row, subjectId, levelId, isPublished)) saved += 1;
    });
    if (saved) saveState();
    return saved;
  }


  function renderAdminTaskForm(taskId) {
    const task = taskId ? taskById(taskId) : null;
    if (taskId && !task) return renderNotFound();
    const selectedSubjectId = task && task.subjectId ? task.subjectId : (state.subjects[0] ? state.subjects[0].id : "");
    const fallbackLevel = state.levels.find((level) => level.subjectId === selectedSubjectId);
    const selectedLevelId =
      task && task.levelId ? task.levelId : (fallbackLevel ? fallbackLevel.id : "");
    const visibleCategories = state.categories.filter(
      (category) =>
        category.subjectId === selectedSubjectId && (!category.levelId || category.levelId === selectedLevelId)
    );
    const criteria = task && task.scoringCriteria && task.scoringCriteria.length
      ? task.scoringCriteria.sort((a, b) => a.order - b.order)
      : [
        { description: "", points: 1, aiHint: "", isPartial: false },
        { description: "", points: 1, aiHint: "", isPartial: false },
      ];
    const additionalSolutions = task && task.additionalSolutions && task.additionalSolutions.length
      ? task.additionalSolutions
      : [{ title: "", content: "" }];

    return renderAdminLayout(
      task ? "" : "/admin/tasks/new",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">${task ? "Edytuj zadanie" : "Dodaj zadanie"}</h1>
            <p class="muted">Treść, rozwiązanie, pliki, punktacja i konfiguracja sprawdzania.</p>
          </div>
        </div>

        <form id="taskForm" class="admin-form" data-task-id="${task ? task.id : ""}">
          <section class="form-section">
            <h2>Dane podstawowe</h2>
            <div class="two-col">
              <label><span class="field-label">Tytuł</span><input class="input" name="title" value="${escapeHtml(task ? task.title : "")}" required /></label>
              <label><span class="field-label">Typ zadania</span>${taskTypeSelect(task ? task.type : "ai_open")}</label>
            </div>
            <div class="three-col">
              <label><span class="field-label">Przedmiot</span>${subjectSelect("subjectId", selectedSubjectId, "taskSubjectSelect")}</label>
              <label><span class="field-label">Poziom</span>${levelSelect("levelId", selectedLevelId, false, selectedSubjectId, "taskLevelSelect")}</label>
              <label><span class="field-label">Trudność</span>
                <select class="select" name="difficulty">
                  <option value="1" ${task && task.difficulty === 1 ? "selected" : ""}>1 gwiazdka</option>
                  <option value="2" ${!task || task.difficulty === 2 ? "selected" : ""}>2 gwiazdki</option>
                  <option value="3" ${task && task.difficulty === 3 ? "selected" : ""}>3 gwiazdki</option>
                </select>
              </label>
            </div>
            <div class="two-col">
              <label><span class="field-label">Maksymalna liczba punktów</span><input class="input" name="maxScore" type="number" min="1" step="1" value="${task ? task.maxScore : 2}" required /></label>
              <label class="check-item" style="align-self: end"><input type="checkbox" name="isPublished" ${!task || task.isPublished !== false ? "checked" : ""}/> Widoczne dla użytkowników</label>
            </div>
            <label><span class="field-label">Źródło</span><input class="input" name="sourceName" value="${escapeHtml(task ? task.sourceName || "" : "")}" placeholder="np. CKE albo zadania.info" /></label>
          </section>

          <section class="form-section">
            <h2>Kategorie i tagi</h2>
            <div class="two-col">
              <div>
                <span class="field-label">Kategorie</span>
                <div id="taskCategoryBox" class="selectable-grid">
                  ${visibleCategories.map((category) => categoryCheckbox(category, task ? task.categories : [])).join("")}
                </div>
              </div>
              <div>
                <span class="field-label">Tagi</span>
                <div class="selectable-grid">
                  ${state.tags
        .map(
          (tag) => {
            const tagColor = normalizeSubjectColor(tag.accentColor) || colorPalette[0].accentColor;
            return `
                        <label class="selectable-chip" style="--swatch-color: ${escapeHtml(tagColor)}">
                          <input type="checkbox" name="tags" value="${tag.id}" ${(task ? task.tags : []).includes(tag.id) ? "checked" : ""}/>
                          <span class="subject-admin-swatch" style="--swatch-color: ${escapeHtml(tagColor)}" aria-hidden="true"></span>
                          ${escapeHtml(tag.name)}
                        </label>`;
          }
        )
        .join("")}
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h2>Treść zadania</h2>
            <div>
              <span class="field-label">Treść</span>
              ${renderLatexEditor("content", task ? task.content : "", { required: true })}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head">
              <h2>Rozwiązania</h2>
              <button class="btn" type="button" data-action="add-solution-row">Dodaj rozwiązanie</button>
            </div>
            <div>
              <div class="field-action-head">
                <span class="field-label">Wzorcowe rozwiązanie</span>
                <label class="btn small" for="taskSolutionScreenInput">${iconSvg("target")} Ze screena</label>
                <input id="taskSolutionScreenInput" type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
              </div>
              ${renderLatexEditor("officialSolution", task ? task.officialSolution : "", { required: true, placeholder: "Wzorcowe rozwiązanie z LaTeX." })}
            </div>
            <div id="additionalSolutionsBox" class="grid">
              ${additionalSolutions.map(renderSolutionRow).join("")}
            </div>
            <label>
              <span class="field-label">Pliki do rozwiązania</span>
              <input class="input" name="solutionFileUpload" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.zip,.cpp,.py,.xlsx,.accdb" />
              <span class="small muted">Pliki są zapisywane lokalnie jako metadane prototypu.</span>
            </label>
            <div id="solutionFilesBox" class="grid">
              ${(task && task.solutionFiles ? task.solutionFiles : []).map(renderSolutionFileRow).join("")}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head">
              <h2>Pliki do zadania</h2>
              <button class="btn" type="button" data-action="add-file-row">Dodaj plik</button>
            </div>
            <div id="taskFilesBox" class="grid">
              ${(task && task.files ? task.files : []).map(renderAdminFileRow).join("") || renderAdminFileRow()}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head">
              <h2>Punktacja</h2>
              <button class="btn" type="button" data-action="add-criterion-row">Dodaj kryterium</button>
            </div>
            <div id="criteriaBox">
              ${criteria.map((criterion) => renderCriterionRow(criterion)).join("")}
            </div>
            <div id="criteriaSum" class="info-box"></div>
          </section>

          <section class="form-section" id="checkerConfigSection">
            <h2>Konfiguracja sprawdzania</h2>
            ${renderCheckerConfig(task)}
          </section>

          <div class="button-row">
            <button class="btn primary" type="submit">${task ? "Zapisz zmiany" : "Dodaj zadanie"}</button>
            <a class="btn" href="#/admin/tasks">Anuluj</a>
          </div>
        </form>
      `
    );
  }

  function subjectSelect(name, selected = "", id = "") {
    return `<select class="select" name="${name}" ${id ? `id="${id}"` : ""}>
      ${state.subjects
        .map((subject) => `<option value="${subject.id}" ${subject.id === selected ? "selected" : ""}>${escapeHtml(subject.name)}</option>`)
        .join("")}
    </select>`;
  }

  function levelSelect(name, selected = "", includeEmpty = false, subjectId = "", id = "") {
    const levels = subjectId ? state.levels.filter((level) => level.subjectId === subjectId) : state.levels;
    return `<select class="select" name="${name}" ${id ? `id="${id}"` : ""}>
      ${includeEmpty ? `<option value="">wszystkie poziomy</option>` : ""}
      ${levels
        .map((level) => {
          const subject = subjectById(level.subjectId);
          const label = subjectId ? level.name : `${subject ? subject.name : ""} - ${level.name}`;
          return `<option value="${level.id}" ${level.id === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
        })
        .join("")}
    </select>`;
  }

  function taskTypeSelect(selected) {
    return `<select class="select" name="type" id="taskTypeSelect">
      ${taskTypes.map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
    </select>`;
  }

  function categoryCheckbox(category, selectedIds) {
    const categoryColor = normalizeSubjectColor(category.accentColor) || colorPalette[0].accentColor;
    return `
      <label class="selectable-chip" style="--swatch-color: ${escapeHtml(categoryColor)}">
        <input type="checkbox" name="categories" value="${category.id}" ${selectedIds.includes(category.id) ? "checked" : ""}/>
        <span class="subject-admin-swatch" style="--swatch-color: ${escapeHtml(categoryColor)}" aria-hidden="true"></span>
        ${escapeHtml(category.name)}
      </label>
    `;
  }

  function renderAdminFileRow(file = {}) {
    return `
      <div class="criterion-row file-row">
        <label><span class="field-label">Nazwa pliku</span><input class="input" name="fileName" value="${escapeHtml(file.fileName || "")}" placeholder="np. dane.csv" /></label>
        <label><span class="field-label">Typ</span><input class="input" name="fileType" value="${escapeHtml(file.fileType || "")}" placeholder="pdf, xlsx, csv" /></label>
        <label><span class="field-label">Opis</span><input class="input" name="fileDescription" value="${escapeHtml(file.description || "")}" /></label>
        <div>
          <label class="check-item"><input type="checkbox" name="filePublic" ${file.isPublic !== false ? "checked" : ""}/> publiczny</label>
          <button class="btn danger full" type="button" data-action="remove-row">Usuń</button>
        </div>
      </div>
    `;
  }

  function renderSolutionRow(solution = {}) {
    return `
      <div class="criterion-row solution-row">
        <label><span class="field-label">Nazwa rozwiązania</span><input class="input" name="solutionTitle" value="${escapeHtml(solution.title || "")}" placeholder="np. Metoda z deltą" /></label>
        <div>
          <span class="field-label">Treść rozwiązania</span>
          ${renderLatexEditor("solutionContent", solution.content || "", { placeholder: "Alternatywna metoda, LaTeX, kod albo komentarz." })}
        </div>
        <div>
          <span class="field-label">Akcja</span>
          <button class="btn danger full" type="button" data-action="remove-row">Usuń</button>
        </div>
      </div>
    `;
  }

  function renderSolutionFileRow(file = {}) {
    return `
      <div class="file-item solution-file-row">
        <div>
          <strong>${escapeHtml(file.fileName || "plik")}</strong>
          <div class="small muted">${escapeHtml(file.description || file.fileType || "plik")}</div>
          <input type="hidden" name="solutionFileName" value="${escapeHtml(file.fileName || "")}" />
          <input type="hidden" name="solutionFileType" value="${escapeHtml(file.fileType || "")}" />
          <input type="hidden" name="solutionFileDescription" value="${escapeHtml(file.description || "")}" />
          <input type="hidden" name="solutionFileUrl" value="${escapeHtml(file.fileUrl || "#")}" />
        </div>
        <button class="btn danger" type="button" data-action="remove-row">Usuń</button>
      </div>
    `;
  }

  function renderCriterionRow(criterion = {}) {
    return `
      <div class="criterion-row criterion-entry">
        <div>
          <span class="field-label">Opis kryterium</span>
          ${renderLatexEditor("criterionDescription", criterion.description || "", { required: true, placeholder: "Opis punktowania, np. obliczenie delty." })}
        </div>
        <label><span class="field-label">Punkty</span><input class="input" name="criterionPoints" type="number" min="0" step="1" value="${criterion.points != null ? criterion.points : 1}" required /></label>
        <label><span class="field-label">Wskazówka dla AI</span><input class="input" name="criterionHint" value="${escapeHtml(criterion.aiHint || "")}" placeholder="słowa kluczowe, alternatywna metoda" /></label>
        <div>
          <label class="check-item"><input type="checkbox" name="criterionPartial" ${criterion.isPartial ? "checked" : ""}/> punkt częściowy</label>
          <button class="btn danger full" type="button" data-action="remove-row">Usuń</button>
        </div>
      </div>
    `;
  }

  function renderCheckerConfig(task) {
    const config = task && task.checkerConfig ? task.checkerConfig : {};
    const shortAnswers = [config.correctAnswer, ...(config.acceptedAnswers || [])].filter(Boolean).join(", ");
    const testsText = config.tests ? JSON.stringify(config.tests, null, 2) : "";
    return `
      <div class="checker-panel" data-checker-panel="short_answer">
        <div class="two-col">
          <label><span class="field-label">Poprawne odpowiedzi</span><input class="input" name="shortAnswers" value="${escapeHtml(shortAnswers)}" placeholder="128, 128.0" /></label>
          <label><span class="field-label">Tolerancja liczbowa</span><input class="input" name="tolerance" type="number" step="0.001" value="${config.tolerance != null ? config.tolerance : 0}" /></label>
        </div>
        <label class="check-item"><input type="checkbox" name="ignoreSpaces" ${config.ignoreSpaces !== false ? "checked" : ""}/> Ignoruj spacje</label>
        <label class="check-item"><input type="checkbox" name="caseSensitive" ${config.caseSensitive ? "checked" : ""}/> Wielkość liter ma znaczenie</label>
      </div>
      <div class="checker-panel" data-checker-panel="info_algorithm">
        <div class="two-col">
          <label><span class="field-label">Limit czasu ms</span><input class="input" name="timeLimitMs" type="number" value="${config.timeLimitMs || 1000}" /></label>
          <label><span class="field-label">Limit pamięci MB</span><input class="input" name="memoryLimitMb" type="number" value="${config.memoryLimitMb || 64}" /></label>
        </div>
        <label><span class="field-label">Testy JSON</span><textarea class="textarea" name="testsJson" placeholder='[{"input":"48 18","expectedOutput":"6","isHidden":false,"points":1}]'>${escapeHtml(testsText)}</textarea></label>
        <div class="info-box">W prototypie runner jest symulowany. Struktura konfiguracji jest przygotowana pod izolowany worker.</div>
      </div>
      <div class="checker-panel" data-checker-panel="info_excel">
        <label><span class="field-label">Skrypt sprawdzający Excel</span><textarea class="textarea" name="excelScript">${escapeHtml(config.script || "def check(submission_path: str, expected_path: str) -> dict:\\n    return {\"score\": 0, \"maxScore\": 0, \"details\": []}")}</textarea></label>
      </div>
      <div class="checker-panel" data-checker-panel="info_access">
        <label><span class="field-label">Skrypt sprawdzający Access</span><textarea class="textarea" name="accessScript">${escapeHtml(config.script || "def check(submission_path: str, expected_path: str) -> dict:\\n    return {\"score\": 0, \"maxScore\": 0, \"details\": []}")}</textarea></label>
      </div>
      <div class="checker-panel" data-checker-panel="default">
        <div class="info-box">Ten typ używa punktacji kryterialnej i symulowanej oceny AI.</div>
      </div>
    `;
  }

  function renderAdminSettings() {
    const navVisibility = state.settings && state.settings.navVisibility ? state.settings.navVisibility : defaultNavVisibility;
    const navLabels = {
      start: "Start",
      subjects: "Przedmioty",
      ranking: "Ranking",
      contact: "Kontakt",
    };
    return renderAdminLayout(
      "/admin/settings",
      `
        <div class="page-head">
          <div>
            <h1 class="page-title">Ustawienia</h1>
            <p class="muted">Narzędzia prototypu.</p>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="panel">
            <h2>Pasek zadań</h2>
            <p class="muted">Ukryte linki nie są widoczne dla zwykłych użytkowników. Administrator nadal je widzi.</p>
            <div class="check-list" style="margin-top: 14px">
              ${Object.entries(navLabels)
        .map(
          ([key, label]) => `
                    <label class="check-item">
                      <input type="checkbox" data-action="toggle-nav-item" data-nav-key="${key}" ${navVisibility[key] !== false ? "checked" : ""} />
                      ${escapeHtml(label)}
                    </label>`
        )
        .join("")}
            </div>
          </div>
          <div class="panel">
            <h2>Reset danych lokalnych</h2>
            <p class="muted">Czyści rejestracje, zadania dodane w panelu i wyniki, a następnie ładuje dane startowe.</p>
            <button class="btn danger" type="button" data-action="reset-demo-data">Przywróć dane startowe</button>
          </div>
          <div class="panel">
            <h2>Podgląd admina</h2>
            <p class="muted">Włącza przyciski podglądu przy zadaniach i arkuszach, także dla treści prywatnych.</p>
            <label class="check-item" style="margin-top: 14px">
              <input type="checkbox" data-action="toggle-admin-preview" ${adminPreviewEnabled() ? "checked" : ""} />
              Pokazuj opcję podglądu
            </label>
          </div>
        </div>
      `
    );
  }

  function renderForbidden(message = "Nie masz dostępu do tego widoku.") {
    return `
      <div class="container">
        <div class="empty-state">
          <h1>403</h1>
          <p class="muted">${escapeHtml(message)}</p>
          <a class="btn primary" href="#/">Wróć na stronę główną</a>
        </div>
      </div>
    `;
  }

  function renderNotFound() {
    return `
      <div class="container">
        <div class="empty-state">
          <h1>Nie znaleziono widoku</h1>
          <p class="muted">Sprawdź adres albo wróć na stronę główną.</p>
          <a class="btn primary" href="#/">Strona główna</a>
        </div>
      </div>
    `;
  }

  function afterRender() {
    updateCheckerPanels();
    updateCriteriaSum();
    enhanceSelects();
    setupColorPicker();
    startExamTicker();
    setupPdfDropZone();
    setupScreenDropZone();
    checkPdfAgentStatus();
    renderMath();
  }

  function setupPdfDropZone() {
    const dropZone = document.getElementById("pdfDropZone");
    if (!dropZone) return;
    const openFilePicker = () => {
      const input = document.getElementById("pdfFileInput");
      if (input) input.click();
    };
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handlePdfFileUpload(file);
    });
    dropZone.addEventListener("click", (e) => {
      openFilePicker();
    });
    dropZone.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openFilePicker();
    });
  }

  function setupScreenDropZone() {
    const dropZone = document.getElementById("screenDropZone");
    if (!dropZone) return;
    const openFilePicker = () => {
      const input = document.getElementById("screenFileInput");
      if (input) input.click();
    };
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleScreenFileUpload(file);
    });
    dropZone.addEventListener("click", () => openFilePicker());
    dropZone.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openFilePicker();
    });
  }

  function setupColorPicker() {
    const sliders = document.querySelectorAll(".rgb-slider");
    const preview = document.getElementById("colorPreview");
    const previewName = document.getElementById("previewName");
    const previewHex = document.getElementById("previewHex");
    const colorNameInput = document.querySelector('input[name="colorName"]');

    if (sliders.length === 0) return;

    function updatePreview() {
      const r = parseInt(document.querySelector('input[name="colorR"]').value, 10);
      const g = parseInt(document.querySelector('input[name="colorG"]').value, 10);
      const b = parseInt(document.querySelector('input[name="colorB"]').value, 10);
      const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;

      if (preview) preview.style.setProperty("--swatch-color", hex);
      if (previewHex) previewHex.textContent = hex;
      if (previewName && colorNameInput) previewName.textContent = colorNameInput.value || "Nazwa";

      // Update slider value displays
      document.querySelectorAll(".slider-value").forEach((el) => {
        const target = el.dataset.target;
        if (target === "colorR") el.textContent = r;
        if (target === "colorG") el.textContent = g;
        if (target === "colorB") el.textContent = b;
      });
    }

    sliders.forEach((slider) => {
      slider.addEventListener("input", updatePreview);
    });

    if (colorNameInput) {
      colorNameInput.addEventListener("input", updatePreview);
    }

    updatePreview();
  }

  function enhanceSelects(root = document) {
    root.querySelectorAll("select.select:not([data-custom-select-ready])").forEach((select) => {
      select.dataset.customSelectReady = "true";
      select.classList.add("native-select-hidden");
      const ui = document.createElement("div");
      ui.className = "select-custom";
      ui.innerHTML = `
        <button class="select-custom-trigger" type="button" data-action="custom-select-toggle" aria-haspopup="listbox" aria-expanded="false">
          <span></span>
          <span class="select-custom-arrow" aria-hidden="true"></span>
        </button>
        <div class="select-custom-menu" role="listbox"></div>
      `;
      select.insertAdjacentElement("afterend", ui);
      updateCustomSelect(select);
      select.addEventListener("change", () => updateCustomSelect(select));
    });
  }

  function updateCustomSelect(select) {
    const ui = select.nextElementSibling && select.nextElementSibling.classList.contains("select-custom")
      ? select.nextElementSibling
      : null;
    if (!ui) return;
    const triggerLabel = ui.querySelector(".select-custom-trigger span:first-child");
    const menu = ui.querySelector(".select-custom-menu");
    const selectedOption = select.selectedOptions[0] || select.options[0];
    if (triggerLabel) triggerLabel.textContent = selectedOption ? selectedOption.textContent : "";
    if (!menu) return;
    menu.innerHTML = "";
    ui.style.setProperty("--select-option-count", String(select.options.length));
    Array.from(select.options).forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "select-custom-option";
      item.dataset.action = "custom-select-option";
      item.dataset.index = String(index);
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      item.textContent = option.textContent;
      if (option.disabled) item.disabled = true;
      if (option.selected) item.classList.add("selected");
      menu.appendChild(item);
    });
  }

  function closeCustomSelects(except = null) {
    document.querySelectorAll(".select-custom.open").forEach((ui) => {
      if (ui === except) return;
      ui.classList.remove("open");
      const trigger = ui.querySelector(".select-custom-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function syncChoiceOption(input) {
    const label = input.closest(".star-option, .status-option");
    if (!label) return;
    const name = input.name;
    const form = input.form || label.closest("form") || document;
    if (input.type === "radio") {
      form.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`).forEach((item) => {
        const itemLabel = item.closest(".star-option, .status-option");
        if (itemLabel) itemLabel.classList.toggle("active", item.checked);
      });
      return;
    }
    label.classList.toggle("active", input.checked);
  }

  function startExamTicker() {
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
    }
    if (!document.querySelector("[data-exam-clock]")) return;
    examTimer = setInterval(() => {
      const session = readExamSession();
      if (!session || session.finishedAt) {
        clearInterval(examTimer);
        examTimer = null;
        return;
      }
      const remaining = examRemainingSeconds(session);
      const clock = document.querySelector("[data-exam-clock] strong");
      if (clock) clock.textContent = formatDuration(remaining);
      const activeTime = document.querySelector(".exam-task-panel .status");
      const taskId = session.taskIds[session.currentIndex];
      if (activeTime && taskId) activeTime.textContent = formatDuration(elapsedForTask(session, taskId));
      if (remaining <= 0) {
        finishExamSession(true);
        window.location.hash = `#/exams/${session.sheetId}/score`;
        renderRoute();
      }
    }, 1000);
  }

  function renderMath(root = document.getElementById("app")) {
    if (!root) return;
    if (typeof window.renderMathInElement !== "function") {
      if (!mathRenderRetry && mathRenderRetries < 25) {
        mathRenderRetries += 1;
        mathRenderRetry = window.setTimeout(() => {
          mathRenderRetry = null;
          renderMath(root);
        }, 120);
      }
      return;
    }
    mathRenderRetries = 0;
    if (mathRenderRetry) {
      window.clearTimeout(mathRenderRetry);
      mathRenderRetry = null;
    }
    window.renderMathInElement(root, {
      delimiters: mathDelimiters,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option", "input"],
      ignoredClasses: ["katex", "math-ignore"],
      throwOnError: false,
    });
  }

  document.addEventListener("input", (e) => {
    const target = e.target;
    const action = target.dataset.action;

    if (action === "update-formula-preview") {
      const item = target.closest(".formula-item");
      if (!item) return;
      let snippet = item.dataset.template;
      const inputs = item.querySelectorAll(".formula-input");
      inputs.forEach(input => {
        const p = input.dataset.placeholder;
        const val = input.value.trim() || p;
        snippet = snippet.replaceAll(`{${p}}`, `{${val}}`);
      });
      const preview = item.querySelector(".formula-preview");
      if (preview) {
        preview.textContent = `$$${snippet}$$`;
        renderMath(preview);
      }
      return;
    }

    if (target.classList && target.classList.contains("pdf-task-content")) {
      const row = target.closest(".pdf-import-task");
      const preview = row && row.querySelector("[data-pdf-preview]");
      if (preview) {
        preview.innerHTML = toParagraphs(target.value);
        renderMath(preview);
      }
      return;
    }

    if (action === "rate-difficulty-slider") {
      updateDifficultySliderPreview(target);
      return;
    }
  });

  document.addEventListener("click", (event) => {
    const customSelect = event.target.closest(".select-custom");
    if (!customSelect) closeCustomSelects();

    if (event.target.classList && event.target.classList.contains("filter-overlay")) {
      openFilterKey = "";
      renderRoute();
      return;
    }

    const choiceOption = event.target.closest(".status-option, .star-option");
    if (choiceOption) {
      const input = choiceOption.querySelector("input");
      if (input && !input.disabled) {
        event.preventDefault();
        input.checked = input.type === "radio" ? true : !input.checked;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        syncChoiceOption(input);
      }
      return;
    }

    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "toggle-task-favorite") {
      const user = currentUser();
      if (!user) return;
      const taskId = target.dataset.taskId;
      const exists = isFavoriteTask(taskId, user);
      state.userTaskFavorites = (state.userTaskFavorites || []).filter((item) => !(item.userId === user.id && item.taskId === taskId));
      if (!exists) {
        state.userTaskFavorites.push({
          id: uid("task_fav"),
          userId: user.id,
          taskId,
          createdAt: new Date().toISOString(),
        });
      }
      saveState();
      renderRoute();
      return;
    }

    if (action === "toggle-subject-interests") {
      subjectListState.interestsOpen = !subjectListState.interestsOpen;
      renderRoute();
      return;
    }

    if (action === "subject-interests-all") {
      setInterestedSubjectIds(null);
      subjectListState.interestsOpen = false;
      renderRoute();
      return;
    }

    if (action === "custom-select-toggle") {
      const ui = target.closest(".select-custom");
      if (!ui) return;
      const willOpen = !ui.classList.contains("open");
      closeCustomSelects(ui);
      ui.classList.toggle("open", willOpen);
      target.setAttribute("aria-expanded", String(willOpen));
      return;
    }

    if (action === "custom-select-option") {
      const ui = target.closest(".select-custom");
      const select = ui && ui.previousElementSibling && ui.previousElementSibling.matches("select")
        ? ui.previousElementSibling
        : null;
      if (!select) return;
      select.selectedIndex = Number(target.dataset.index || 0);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      updateCustomSelect(select);
      closeCustomSelects();
      return;
    }

    if (action === "logout") {
      setSession(null);
      window.location.hash = "#/";
      renderRoute();
    }

    if (action === "toggle-theme") {
      setTheme(getTheme() === "dark" ? "light" : "dark");
      renderRoute();
    }

    if (action === "toggle-filters") {
      const key = target.dataset.filterKey || "";
      openFilterKey = openFilterKey === key ? "" : key;
      renderRoute();
    }

    if (action === "close-filters") {
      openFilterKey = "";
      renderRoute();
    }

    if (action === "apply-filters") {
      readFilters();
      openFilterKey = "";
      renderRoute();
    }

    if (action === "toggle-accordion") {
      const accordion = target.closest(".accordion");
      if (accordion) {
        const isOpen = accordion.classList.toggle("open");
        target.setAttribute("aria-expanded", String(isOpen));
        const icon = target.querySelector("span:last-child");
        if (icon) icon.textContent = isOpen ? "-" : "+";
      }
    }

    if (action === "reset-filters") {
      filterState[target.dataset.filterKey] = {
        difficulty: [],
        categories: [],
        tags: [],
        status: "all",
        sort: "newest",
      };
      renderRoute();
    }

    if (action === "insert-latex") {
      const field = latexTargetField(target);
      insertLatexSnippet(field, target.dataset.snippet || "");
      return;
    }

    if (action === "insert-fraction") {
      const builder = target.closest(".fraction-builder-visual");
      const field = latexTargetField(target, builder);
      insertFractionFromBuilder(target, field);
      return;
    }

    if (action === "insert-root") {
      const builder = target.closest(".root-builder-visual");
      const field = latexTargetField(target, builder);
      insertRootFromBuilder(target, field);
      return;
    }

    if (action === "insert-power") {
      const builder = target.closest(".power-builder-visual");
      const field = latexTargetField(target, builder);
      insertPowerFromBuilder(target, field);
      return;
    }

    if (action === "insert-log") {
      const builder = target.closest(".log-builder-visual");
      const field = latexTargetField(target, builder);
      insertLogFromBuilder(target, field);
      return;
    }

    if (action === "insert-abs") {
      const builder = target.closest(".abs-builder-visual");
      const field = latexTargetField(target, builder);
      insertAbsFromBuilder(target, field);
      return;
    }

    if (action === "insert-index") {
      const builder = target.closest(".index-builder-visual");
      const field = latexTargetField(target, builder);
      insertIndexFromBuilder(target, field);
      return;
    }

    if (action === "lim-side") {
      const val = target.dataset.val;
      const builder = target.closest(".lim-builder-visual");
      const toField = builder.querySelector("[data-lim-to]");
      if (toField) {
        toField.focus();
        toField.textContent += val;
        toField.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    if (action === "insert-lim") {
      const builder = target.closest(".lim-builder-visual");
      const field = latexTargetField(target, builder);
      insertLimFromBuilder(target, field);
      return;
    }

    if (action === "insert-binom") {
      const builder = target.closest(".binom-builder-visual");
      const field = latexTargetField(target, builder);
      insertBinomFromBuilder(target, field);
      return;
    }

    if (action === "toggle-visual-creators") {
      const container = target.closest(".visual-creators-container");
      container.classList.toggle("active");
      return;
    }

    if (action === "toggle-formula-category") {
      const category = target.closest(".formula-category");
      const isActive = category.classList.toggle("active");
      if (isActive) {
        renderMath(category.querySelector(".formula-category-content"));
      }
      return;
    }

    if (action === "toggle-formula-database") {
      const container = target.closest(".formula-database-container");
      container.classList.toggle("active");
      return;
    }

    if (action === "update-formula-preview") {
      const item = target.closest(".formula-item");
      let snippet = item.dataset.template;
      const inputs = item.querySelectorAll(".formula-input");
      inputs.forEach(input => {
        const p = input.dataset.placeholder;
        const val = input.value.trim() || p;
        snippet = snippet.replaceAll(`{${p}}`, `{${val}}`);
      });
      const preview = item.querySelector(".formula-preview");
      preview.textContent = `$$${snippet}$$`;
      renderMath(preview);
      return;
    }

    if (action === "insert-latex-templated") {
      const item = target.closest(".formula-item");
      const field = latexTargetField(target, item);
      let snippet = item.dataset.template;
      const inputs = item.querySelectorAll(".formula-input");
      inputs.forEach(input => {
        const p = input.dataset.placeholder;
        const val = input.value.trim() || p;
        snippet = snippet.replaceAll(`{${p}}`, `{${val}}`);
      });
      insertLatexSnippet(field, snippet);
      return;
    }

    if (action === "start-exam") {
      const user = currentUser();
      const sheet = examSheetById(target.dataset.sheetId);
      if (!user || !sheet || !canSeeExamSheet(sheet, user)) return;
      const tasks = examTasks(sheet, user);
      if (!tasks.length) return;
      const now = new Date().toISOString();
      saveExamSession({
        sheetId: sheet.id,
        taskIds: tasks.map((task) => task.id),
        startedAt: now,
        finishedAt: null,
        currentIndex: 0,
        currentTaskStartedAt: now,
        taskTimes: {},
        answers: {},
        timedOut: false,
      });
      window.location.hash = `#/exams/${sheet.id}/run`;
      renderRoute();
    }

    if (["exam-next", "exam-prev", "exam-jump"].includes(action)) {
      let session = recordCurrentTaskTime();
      const sheet = session ? examSheetById(session.sheetId) : null;
      if (!session || !sheet) return;
      session = normalizeExamSession(session, sheet);
      if (action === "exam-next") session.currentIndex = Math.min(session.taskIds.length - 1, session.currentIndex + 1);
      if (action === "exam-prev") session.currentIndex = Math.max(0, session.currentIndex - 1);
      if (action === "exam-jump") session.currentIndex = Math.max(0, Math.min(session.taskIds.length - 1, Number(target.dataset.index || 0)));
      session.currentTaskStartedAt = new Date().toISOString();
      saveExamSession(session);
      renderRoute();
    }

    if (action === "finish-exam") {
      const session = finishExamSession(false);
      if (!session) return;
      window.location.hash = `#/exams/${session.sheetId}/score`;
      renderRoute();
    }

    if (action === "choose-closed-answer") {
      const taskId = target.dataset.taskId;
      const value = target.dataset.answer || "";
      setExamAnswerValue(taskId, value);
      renderRoute();
      return;
    }

    if (action === "choose-pf-answer") {
      const taskId = target.dataset.taskId;
      const index = Math.max(0, Number(target.dataset.pfIndex || 0));
      const value = target.dataset.answer || "";
      const field = document.querySelector(`[data-exam-answer][data-task-id="${cssEscape(taskId)}"]`);
      const current = normalizeClosedAnswer(field ? field.value : "");
      const chars = current.split("");
      chars[index] = value;
      setExamAnswerValue(taskId, chars.join(""));
      renderRoute();
      return;
    }

    if (action === "rate-difficulty") {
      saveDifficultyRating(target.dataset.taskId, Number(target.dataset.rating));
      renderRoute();
    }

    if (action === "add-criterion-row") {
      const box = document.getElementById("criteriaBox");
      if (box) box.insertAdjacentHTML("beforeend", renderCriterionRow());
      updateCriteriaSum();
    }

    if (action === "add-file-row") {
      const box = document.getElementById("taskFilesBox");
      if (box) box.insertAdjacentHTML("beforeend", renderAdminFileRow());
    }

    if (action === "add-solution-row") {
      const box = document.getElementById("additionalSolutionsBox");
      if (box) {
        box.insertAdjacentHTML("beforeend", renderSolutionRow());
        renderMath(box);
      }
      return;
    }

    if (action === "add-exam-new-task-row") {
      const box = document.getElementById("examNewTasksBox");
      if (box) {
        box.insertAdjacentHTML("beforeend", renderExamNewTaskRowFromData());
        renderMath(box);
      }
      return;
    }

    if (action === "pick-exam-solution-screen") {
      const row = target.closest(".exam-new-task-row");
      const input = row && row.querySelector(".exam-solution-screen-input");
      if (input) input.click();
      return;
    }

    if (action === "save-exam-new-tasks-to-db") {
      const saved = saveExamNewTasksToDatabase();
      alert(saved ? `Zapisano ${saved} ${saved === 1 ? "zadanie" : "zadań"} w bazie zadań.` : "Nie zapisano żadnego zadania. Sprawdź tytuł, treść i zaznaczenie „Do bazy zadań”.");
      return;
    }

    if (action === "pdf-add-empty-task") {
      appendEmptyImportTask("pdf");
      return;
    }

    if (action === "screen-add-empty-task") {
      appendEmptyImportTask("screen");
      return;
    }

    if (action === "import-save-task-to-db") {
      const source = target.dataset.importSource || "pdf";
      const row = target.closest(".pdf-import-task");
      const saved = saveImportedRowsToDatabase(source, row);
      alert(saved ? "Zadanie zapisane do bazy." : "Nie zapisano zadania. Sprawdź treść i ustawienia.");
      return;
    }

    if (action === "import-save-selected-to-db") {
      const source = target.dataset.importSource || "pdf";
      const saved = saveImportedRowsToDatabase(source);
      alert(saved ? `Zapisano ${saved} ${saved === 1 ? "zadanie" : "zadań"} do bazy.` : "Nie zapisano żadnego zadania.");
      if (saved && source === "screen") {
        screenImportState = { tasks: [], fileName: "", previewUrl: "", status: "idle", agentMeta: null };
        window.location.hash = "#/admin/tasks";
        renderRoute();
      }
      return;
    }

    if (action === "pdf-import-confirm") {
      handlePdfImportConfirm().catch((error) => {
        console.error("PDF import confirm error:", error);
        alert("Nie udało się utworzyć arkusza z importu PDF: " + error.message);
      });
      return;
    }

    if (action === "pdf-import-reset") {
      pdfImportState = { tasks: [], rawText: "", fileName: "", status: "idle", agentMeta: null };
      renderRoute();
      return;
    }

    if (action === "screen-import-reset") {
      screenImportState = { tasks: [], fileName: "", previewUrl: "", status: "idle", agentMeta: null };
      renderRoute();
      return;
    }

    if (action === "pdf-toggle-task") {
      const row = target.closest(".pdf-import-task");
      if (row) row.classList.toggle("pdf-task-disabled", !target.checked);
      return;
    }

    if (action === "remove-row") {
      event.preventDefault();
      event.stopPropagation();
      const row = target.closest(".exam-new-task-row") || 
                  target.closest(".criterion-row") || 
                  target.closest(".solution-file-row") ||
                  target.closest(".criterion-entry");
      
      if (row) {
        row.remove();
        // Bezpieczne wywołanie aktualizacji sumy punktów (tylko w formularzu zadania)
        if (document.getElementById("taskForm")) {
          try { updateCriteriaSum(); } catch(e) {}
        }
      }
      return;
    }

    if (action === "delete-task") {
      if (!confirm("Usunąć zadanie?")) return;
      const taskId = target.dataset.taskId;
      state.tasks = state.tasks.filter((task) => task.id !== taskId);
      state.submissions = state.submissions.filter((submission) => submission.taskId !== taskId);
      state.examSheets = state.examSheets.map((sheet) => ({
        ...sheet,
        taskIds: (sheet.taskIds || []).filter((id) => id !== taskId),
      }));
      saveState();
      renderRoute();
    }

    if (action === "toggle-task-visibility") {
      const taskId = target.dataset.taskId;
      state.tasks = state.tasks.map((task) =>
        task.id === taskId ? { ...task, isPublished: task.isPublished === false } : task
      );
      saveState();
      renderRoute();
    }

    if (action === "toggle-subject-visibility") {
      const subjectId = target.dataset.subjectId;
      state.subjects = state.subjects.map((subject) =>
        subject.id === subjectId ? { ...subject, isPublic: subject.isPublic === false } : subject
      );
      saveState();
      renderRoute();
    }

    if (action === "edit-subject-color") {
      const subjectId = target.dataset.subjectId;
      if (!subjectId) return;
      state.editingColorModal = { type: "subject", id: subjectId };
      renderRoute();
    }

    if (action === "edit-category-color") {
      const categoryId = target.dataset.categoryId;
      if (!categoryId) return;
      state.editingColorModal = { type: "category", id: categoryId };
      renderRoute();
    }

    if (action === "edit-tag-color") {
      const tagId = target.dataset.tagId;
      if (!tagId) return;
      state.editingColorModal = { type: "tag", id: tagId };
      renderRoute();
    }

    if (action === "close-color-modal") {
      delete state.editingColorModal;
      renderRoute();
    }

    if (action === "save-color-edit") {
      if (!state.editingColorModal) return;
      const newColor = target.dataset.color;
      if (!newColor) return;
      if (state.editingColorModal.type === "subject") {
        const subject = state.subjects.find((s) => s.id === state.editingColorModal.id);
        if (subject) {
          subject.accentColor = newColor;
        }
      } else if (state.editingColorModal.type === "category") {
        const category = state.categories.find((c) => c.id === state.editingColorModal.id);
        if (category) {
          category.accentColor = newColor;
        }
      } else if (state.editingColorModal.type === "tag") {
        const tag = state.tags.find((t) => t.id === state.editingColorModal.id);
        if (tag) {
          tag.accentColor = newColor;
          tag.updatedAt = new Date().toISOString();
        }
      }
      delete state.editingColorModal;
      saveState();
      renderRoute();
    }

    if (action === "edit-subject") {
      const subjectId = target.dataset.subjectId;
      const subject = state.subjects.find((s) => s.id === subjectId);
      if (!subject) return;
      const form = document.getElementById("subjectForm");
      if (!form) return;
      form.dataset.subjectId = subjectId;
      form.querySelector("h2").textContent = "Edytuj przedmiot";
      form.querySelector("[name='name']").value = subject.name;
      form.querySelector("[name='icon']").value = subject.icon;
      form.querySelector("[name='description']").value = subject.description;
      form.querySelector("[name='isPublic']").checked = subject.isPublic !== false;
      const colorInput = form.querySelector(`[name='accentColor'][value='${subject.accentColor}']`);
      if (colorInput) colorInput.checked = true;
      form.querySelector("button[type='submit']").textContent = "Zapisz zmiany";
      form.scrollIntoView({ behavior: "smooth" });
    }

    if (action === "edit-category") {
      const categoryId = target.dataset.categoryId;
      const category = state.categories.find((c) => c.id === categoryId);
      if (!category) return;
      const form = document.getElementById("categoryForm");
      if (!form) return;
      form.dataset.categoryId = categoryId;
      form.querySelector("h2").textContent = "Edytuj kategorię";
      form.querySelectorAll("[name='subjectIds']").forEach((input) => {
        input.checked = input.value === category.subjectId;
      });
      form.querySelector("[name='levelId']").value = category.levelId || "";
      form.querySelector("[name='name']").value = category.name;
      form.querySelector("[name='description']").value = category.description || "";
      const colorInput = form.querySelector(`[name='accentColor'][value='${category.accentColor}']`);
      if (colorInput) colorInput.checked = true;
      form.querySelector("button[type='submit']").textContent = "Zapisz zmiany";
      form.scrollIntoView({ behavior: "smooth" });
    }

    if (action === "edit-tag") {
      const tagId = target.dataset.tagId;
      const tag = state.tags.find((t) => t.id === tagId);
      if (!tag) return;
      const form = document.getElementById("tagForm");
      if (!form) return;
      form.dataset.tagId = tagId;
      form.querySelector("h2").textContent = "Edytuj tag";
      form.querySelector("[name='name']").value = tag.name;
      form.querySelector("[name='description']").value = tag.description || "";
      const colorInput = form.querySelector(`[name='accentColor'][value='${tag.accentColor}']`);
      if (colorInput) colorInput.checked = true;
      form.querySelector("button[type='submit']").textContent = "Zapisz zmiany";
      form.scrollIntoView({ behavior: "smooth" });
    }

    if (action === "edit-color") {
      const colorIndex = parseInt(target.dataset.colorIndex, 10);
      const allColors = [...colorPalette, ...(state.customColors || [])];
      const color = allColors[colorIndex];
      if (!color) return;
      const form = document.getElementById("colorForm");
      if (!form) return;
      form.dataset.colorIndex = colorIndex;
      form.querySelector("h2").textContent = "Edytuj kolor";
      form.querySelector("[name='colorName']").value = color.label;
      const hex = color.accentColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      form.querySelector("[name='colorR']").value = r;
      form.querySelector("[name='colorG']").value = g;
      form.querySelector("[name='colorB']").value = b;
      // Trigger input event to update previews if they exist
      form.querySelectorAll("input[type='range']").forEach(i => i.dispatchEvent(new Event("input")));
      form.querySelector("button[type='submit']").textContent = "Zapisz zmiany";
      form.scrollIntoView({ behavior: "smooth" });
    }

    if (action === "delete-subject") {
      handleDeleteSubject(target.dataset.subjectId);
    }

    if (action === "toggle-exam-visibility") {
      const examId = target.dataset.examId;
      state.examSheets = state.examSheets.map((sheet) =>
        sheet.id === examId ? { ...sheet, isPublished: sheet.isPublished === false } : sheet
      );
      saveState();
      renderRoute();
    }

    if (action === "delete-exam") {
      handleDeleteExam(target.dataset.examId);
      return;
      if (!confirm("Usunąć arkusz? Historia użytkowników zostanie zachowana jako archiwalna.")) return;
      const examId = target.dataset.examId;
      state.examSheets = state.examSheets.filter((sheet) => sheet.id !== examId);
      saveState();
      renderRoute();
    }

    if (action === "delete-category") {
      const categoryId = target.dataset.categoryId;
      if (!categoryId || !confirm("Usunąć kategorię i odpiąć ją od wszystkich zadań?")) return;
      state.categories = state.categories.filter((category) => category.id !== categoryId);
      state.tasks = state.tasks.map((task) => ({
        ...task,
        categories: task.categories.filter((id) => id !== categoryId),
      }));
      Object.values(filterState).forEach((filters) => {
        filters.categories = (filters.categories || []).filter((id) => id !== categoryId);
      });
      saveState();
      renderRoute();
    }

    if (action === "delete-custom-color") {
      const colorIndex = parseInt(target.dataset.colorIndex, 10);
      if (isNaN(colorIndex) || !confirm("Usunąć ten kolor?")) return;
      const customIndex = colorIndex - colorPalette.length;
      if (customIndex >= 0 && state.customColors && state.customColors[customIndex]) {
        state.customColors.splice(customIndex, 1);
        saveState();
        renderRoute();
      }
    }

    if (action === "close-color-modal") {
      delete state.editingColorModal;
      renderRoute();
    }

    if (action === "save-color-edit" || action === "color-modal-option") {
      const color = target.dataset.color;
      if (!color) return;
      if (!state.editingColorModal) return;
      const { type, id } = state.editingColorModal;
      if (type === "subject") {
        const subject = state.subjects.find((s) => s.id === id);
        if (subject) {
          subject.accentColor = color;
        }
      } else if (type === "category") {
        const category = state.categories.find((c) => c.id === id);
        if (category) {
          category.accentColor = color;
        }
      } else if (type === "tag") {
        const tag = state.tags.find((t) => t.id === id);
        if (tag) {
          tag.accentColor = color;
        }
      }
      delete state.editingColorModal;
      saveState();
      renderRoute();
    }

    if (action === "delete-default-color") {
      const colorIndex = parseInt(target.dataset.colorIndex, 10);
      if (isNaN(colorIndex) || !confirm("Usunąć ten kolor? Wszystkie przedmioty i kategorie używające tego koloru zostaną zmienione na domyślny Zielony.")) return;
      const colorToDelete = colorPalette[colorIndex];
      if (!colorToDelete) return;
      colorPalette.splice(colorIndex, 1);
      state.subjects = (state.subjects || []).map((subject) => ({
        ...subject,
        accentColor: subject.accentColor === colorToDelete.accentColor ? colorPalette[0].accentColor : subject.accentColor,
      }));
      state.categories = (state.categories || []).map((category) => ({
        ...category,
        accentColor: category.accentColor === colorToDelete.accentColor ? colorPalette[0].accentColor : category.accentColor,
      }));
      saveState();
      renderRoute();
    }

    if (action === "delete-tag") {
      const tagId = target.dataset.tagId;
      if (!tagId || !confirm("Usunąć tag i odpiąć go od wszystkich zadań?")) return;
      state.tags = state.tags.filter((tag) => tag.id !== tagId);
      state.tasks = state.tasks.map((task) => ({
        ...task,
        tags: task.tags.filter((id) => id !== tagId),
      }));
      Object.values(filterState).forEach((filters) => {
        filters.tags = (filters.tags || []).filter((id) => id !== tagId);
      });
      saveState();
      renderRoute();
    }

    if (action === "reset-demo-data") {
      if (!confirm("Przywrócić dane startowe?")) return;
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(SESSION_KEY);
      state = loadState();
      window.location.hash = "#/";
      renderRoute();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches && event.target.matches(".star-option input, .status-option input")) {
      syncChoiceOption(event.target);
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "toggle-nav-item") {
      const key = event.target.dataset.navKey;
      state.settings = state.settings || {};
      state.settings.navVisibility = {
        ...defaultNavVisibility,
        ...(state.settings.navVisibility || {}),
        [key]: event.target.checked,
      };
      saveState();
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "toggle-admin-preview") {
      state.settings = state.settings || {};
      state.settings.adminPreviewEnabled = event.target.checked;
      saveState();
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "subject-sort") {
      subjectListState.sort = event.target.value || "popular";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "subject-interest-toggle") {
      const visibleIds = visibleSubjects().map((subject) => subject.id);
      const currentIds = getInterestedSubjectIds();
      const nextIds = currentIds ? currentIds.filter((id) => visibleIds.includes(id)) : [...visibleIds];
      if (event.target.checked && !nextIds.includes(event.target.value)) {
        nextIds.push(event.target.value);
      }
      if (!event.target.checked) {
        const index = nextIds.indexOf(event.target.value);
        if (index !== -1) nextIds.splice(index, 1);
      }
      setInterestedSubjectIds(nextIds);
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "toggle-task-folder") {
      const user = currentUser();
      if (!user) return;
      const taskId = event.target.dataset.taskId;
      const folderId = event.target.dataset.folderId;
      const folder = (state.userTaskFolders || []).find((item) => item.id === folderId && item.userId === user.id);
      if (!folder) return;
      const taskIds = new Set(folder.taskIds || []);
      if (event.target.checked) taskIds.add(taskId);
      else taskIds.delete(taskId);
      folder.taskIds = Array.from(taskIds);
      folder.updatedAt = new Date().toISOString();
      saveState();
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "exam-task-done") {
      const user = currentUser();
      if (!user) return;
      state.examTaskCompletionEvents = state.examTaskCompletionEvents || [];
      state.examTaskCompletionEvents.push({
        id: uid("exam_done"),
        userId: user.id,
        sheetId: event.target.dataset.sheetId,
        taskId: event.target.dataset.taskId,
        checked: Boolean(event.target.checked),
        createdAt: new Date().toISOString(),
      });
      saveState();
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "exam-attempt-status") {
      examAttemptStatusState[event.target.dataset.searchKey || ""] = event.target.value || "all";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "profile-exam-subject") {
      profileExamSubjectState = event.target.value || "all";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "profile-subject-task-filter") {
      profileSubjectTaskFilterState[event.target.dataset.subjectSlug || ""] = event.target.value || "all";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "profile-subject-open") {
      const slug = event.target.value || "";
      if (slug) window.location.hash = `#/profile/subjects/${slug}`;
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "profile-subject-category") {
      const key = event.target.dataset.subjectSlug || "";
      const current = new Set(profileSubjectCategoryState[key] || []);
      if (event.target.checked) current.add(event.target.value);
      else current.delete(event.target.value);
      profileSubjectCategoryState[key] = Array.from(current);
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "rate-difficulty-slider") {
      updateDifficultySliderPreview(event.target);
      saveDifficultyRating(event.target.dataset.taskId, Number(event.target.value || 0));
      renderRoute();
      return;
    }

    if (event.target.id === "taskSubjectSelect") {
      refreshTaskLevelsAndCategories();
      return;
    }

    if (event.target.id === "taskLevelSelect") {
      refreshTaskCategories();
      return;
    }

    if (event.target.id === "taskTypeSelect") {
      updateCheckerPanels();
    }

    if (event.target.id === "examSubjectSelect") {
      refreshExamLevelsAndTasks();
      return;
    }

    if (event.target.id === "examLevelSelect") {
      refreshExamTasks();
      return;
    }

    if (event.target.id === "pdfFileInput") {
      const file = event.target.files && event.target.files[0];
      if (file) handlePdfFileUpload(file);
      return;
    }

    if (event.target.id === "pdfScreenFileInput") {
      const file = event.target.files && event.target.files[0];
      if (file) handlePdfScreenFileUpload(file);
      return;
    }

    if (event.target.id === "screenFileInput") {
      const file = event.target.files && event.target.files[0];
      if (file) handleScreenFileUpload(file);
      return;
    }

    if (event.target.id === "examScreenFileInput") {
      const file = event.target.files && event.target.files[0];
      if (file) handleExamScreenFileUpload(file);
      return;
    }

    if (event.target.classList && event.target.classList.contains("exam-solution-screen-input")) {
      const file = event.target.files && event.target.files[0];
      const row = event.target.closest(".exam-new-task-row");
      const textarea = row && row.querySelector('[name="examTaskSolution"]');
      if (file) handleSolutionScreenFileUpload(file, textarea);
      event.target.value = "";
      return;
    }

    if (event.target.id === "taskSolutionScreenInput") {
      const file = event.target.files && event.target.files[0];
      const textarea = document.querySelector('[name="officialSolution"]');
      if (file) handleSolutionScreenFileUpload(file, textarea);
      event.target.value = "";
      return;
    }

    if (event.target.id === "pdfImportSubject") {
      const levelEl = document.getElementById("pdfImportLevel");
      if (levelEl) {
        const levels = state.levels.filter((l) => l.subjectId === event.target.value);
        levelEl.innerHTML = `<option value="">wszystkie poziomy</option>` + levels.map((l) => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join("");
        enhanceSelects();
      }
      return;
    }

    if (event.target.id === "screenImportSubject") {
      const levelEl = document.getElementById("screenImportLevel");
      if (levelEl) {
        const levels = state.levels.filter((l) => l.subjectId === event.target.value);
        levelEl.innerHTML = `<option value="">wszystkie poziomy</option>` + levels.map((l) => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join("");
        enhanceSelects();
      }
      return;
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.dataset && event.target.dataset.latexSource !== undefined) {
      updateLatexPreview(event.target);
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "exam-answer") {
      saveExamAnswerField(event.target);
      updateExamAnswerPreview(event.target);
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "subject-search") {
      subjectListState.query = event.target.value || "";
      const phrase = normalizeText(subjectListState.query);
      document.querySelectorAll(".subject-card[data-subject-name]").forEach((card) => {
        card.classList.toggle("hidden", phrase && !normalizeText(card.dataset.subjectName).includes(phrase));
      });
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "exam-search") {
      examSearchState[event.target.dataset.searchKey || ""] = event.target.value || "";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "exam-attempt-search") {
      examAttemptSearchState[event.target.dataset.searchKey || ""] = event.target.value || "";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "profile-subject-task-search") {
      profileSubjectTaskSearchState[event.target.dataset.subjectSlug || ""] = event.target.value || "";
      renderRoute();
      return;
    }

    if (event.target.dataset && event.target.dataset.action === "filter-options") {
      filterOptionList(event.target);
      return;
    }

    if (event.target.closest("#criteriaBox") || event.target.name === "maxScore") {
      updateCriteriaSum();
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.dataset && event.target.dataset.actionForm === "task-note") {
      event.preventDefault();
      handleTaskNoteForm(event.target);
      return;
    }

    if (event.target.dataset && event.target.dataset.actionForm === "task-folder") {
      event.preventDefault();
      handleTaskFolderForm(event.target);
      return;
    }

    if (event.target.id === "loginForm") {
      event.preventDefault();
      handleLogin(event.target);
    }

    if (event.target.id === "registerForm") {
      event.preventDefault();
      handleRegister(event.target);
    }

    if (event.target.id === "submissionForm") {
      event.preventDefault();
      handleSubmission(event.target);
    }

    if (event.target.id === "subjectForm") {
      event.preventDefault();
      handleSubjectForm(event.target);
    }

    if (event.target.id === "categoryForm") {
      event.preventDefault();
      handleCategoryForm(event.target);
    }

    if (event.target.id === "colorForm") {
      event.preventDefault();
      handleColorForm(event.target);
    }

    if (event.target.id === "tagForm") {
      event.preventDefault();
      handleTagForm(event.target);
    }

    if (event.target.id === "taskForm") {
      event.preventDefault();
      handleTaskForm(event.target);
    }

    if (event.target.id === "examScoreForm") {
      event.preventDefault();
      handleExamScoreForm(event.target);
    }

    if (event.target.id === "examForm") {
      event.preventDefault();
      handleExamForm(event.target);
    }
  });

  function handleTaskNoteForm(form) {
    const user = currentUser();
    if (!user) return;
    const taskId = form.dataset.taskId;
    const note = String(new FormData(form).get("note") || "").trim();
    const now = new Date().toISOString();
    state.userTaskNotes = (state.userTaskNotes || []).filter((item) => !(item.userId === user.id && item.taskId === taskId));
    if (note) {
      state.userTaskNotes.push({
        id: uid("task_note"),
        userId: user.id,
        taskId,
        note,
        createdAt: now,
        updatedAt: now,
      });
    }
    saveState();
    renderRoute();
  }

  function handleTaskFolderForm(form) {
    const user = currentUser();
    if (!user) return;
    const taskId = form.dataset.taskId;
    const name = String(new FormData(form).get("folderName") || "").trim();
    if (!name) return;
    const now = new Date().toISOString();
    state.userTaskFolders = state.userTaskFolders || [];
    state.userTaskFolders.push({
      id: uid("task_folder"),
      userId: user.id,
      name,
      taskIds: taskId ? [taskId] : [],
      createdAt: now,
      updatedAt: now,
    });
    saveState();
    renderRoute();
  }

  function handleLogin(form) {
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const user = state.users.find((item) => item.email.toLowerCase() === email && item.password === password);
    if (!user) {
      document.getElementById("app").innerHTML = shell(renderLogin("Nieprawidłowy email albo hasło."));
      return;
    }
    setSession(user.id);
    window.location.hash = user.role === "admin" ? "#/admin" : "#/subjects";
    renderRoute();
  }

  function handleRegister(form) {
    const data = new FormData(form);
    const username = String(data.get("username") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");
    if (state.users.some((user) => user.email.toLowerCase() === email)) {
      document.getElementById("app").innerHTML = shell(renderRegister("Konto z takim emailem już istnieje."));
      return;
    }
    if (password !== passwordConfirm) {
      document.getElementById("app").innerHTML = shell(renderRegister("Hasła muszą być takie same."));
      return;
    }
    const now = new Date().toISOString();
    const user = {
      id: uid("user"),
      email,
      password,
      username,
      role: "user",
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(user);
    saveState();
    setSession(user.id);
    window.location.hash = "#/subjects";
    renderRoute();
  }

  function handleSubmission(form) {
    const user = currentUser();
    if (!user) return;
    const task = taskById(form.dataset.taskId);
    if (!task) return;
    const data = new FormData(form);
    const fileInput = form.querySelector('input[type="file"]');
    const files = Array.from(fileInput ? fileInput.files : []).map((file) => {
      const ext = file.name.split(".").pop();
      return {
        id: uid("submission_file"),
        fileName: file.name,
        fileType: ext ? ext.toLowerCase() : file.type || "plik",
        size: file.size,
        createdAt: new Date().toISOString(),
      };
    });
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".cpp", ".py", ".xlsx", ".accdb", ".txt", ".csv", ".zip"];
    const invalid = files.find((file) => !allowed.some((ext) => file.fileName.toLowerCase().endsWith(ext)));
    const statusBox = document.getElementById("submissionStatus");
    if (invalid) {
      statusBox.innerHTML = `<div class="error-box" style="margin-top: 12px">Niedozwolony typ pliku: ${escapeHtml(invalid.fileName)}</div>`;
      return;
    }

    statusBox.innerHTML = `<div class="info-box" style="margin-top: 12px">Sprawdzanie...</div>`;
    const submittedText = [data.get("shortAnswer"), data.get("submittedText")].filter(Boolean).join("\n").trim();
    const language = data.get("language") || "";
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - Number(form.dataset.startedAt || Date.now())) / 1000));

    setTimeout(() => {
      const feedback = gradeTask(task, submittedText, files, { language });
      const now = new Date().toISOString();
      state.submissions.push({
        id: uid("submission"),
        userId: user.id,
        taskId: task.id,
        status: feedback.status,
        score: feedback.score,
        maxScore: feedback.maxScore,
        aiFeedbackJson: feedback,
        submittedText,
        language,
        files,
        timeSpentSeconds,
        createdAt: now,
        updatedAt: now,
      });
      saveState();
      renderRoute();
    }, 650);
  }

  function gradeTask(task, submittedText, files, meta = {}) {
    if (task.type === "short_answer" || task.type === "closed") return gradeShortAnswer(task, submittedText);
    if (task.type === "info_algorithm") return gradeAlgorithm(task, submittedText, meta.language);
    if (task.type === "info_excel" || task.type === "info_access" || task.type === "file") {
      return gradeFileTask(task, submittedText, files);
    }
    return gradeByCriteria(task, submittedText, files);
  }

  function autoGradeClosedTask(task, answer) {
    if (!isClosedChoiceTask(task)) return null;
    const expected = acceptedClosedAnswers(task);
    if (!expected.length) return null;
    const submitted = normalizeClosedAnswer(answer);
    if (!submitted) return { score: 0, maxScore: task.maxScore, correct: false };
    const correct = expected.some((item) => normalizeClosedAnswer(item) === submitted);
    return { score: correct ? task.maxScore : 0, maxScore: task.maxScore, correct };
  }

  function acceptedClosedAnswers(task) {
    const config = task.checkerConfig || {};
    const configured = [config.correctAnswer, ...(config.acceptedAnswers || [])].filter(Boolean);
    if (configured.length) return configured;
    const solution = stripHtml(task.officialSolution || "");
    if (!solution.trim()) return [];
    const direct = solution.trim().match(/^(?:odpowied[źz]\s*)?[:\-]?\s*([A-D]|[PF]{1,8})\.?$/i);
    if (direct) return [direct[1]];
    const labelled = solution.match(/(?:odpowied[źz]|poprawna odpowied[źz]|wynik)\s*[:\-]?\s*([A-D]|[PF]{1,8})\b/i);
    if (labelled) return [labelled[1]];
    const pfWords = solution.match(/\b(Prawda|Fałsz|Falsz)\b/gi);
    if (pfWords && pfWords.length <= 8) {
      return [pfWords.map((word) => normalizeText(word).startsWith("prawda") ? "P" : "F").join("")];
    }
    return [];
  }

  function gradeShortAnswer(task, text) {
    const closed = autoGradeClosedTask(task, text);
    if (closed) {
      return buildFeedback(task, [
        {
          name: "Poprawna odpowiedz",
          pointsAwarded: closed.score,
          pointsMax: task.maxScore,
          comment: closed.correct ? "Odpowiedz jest zgodna z kluczem." : "Odpowiedz nie jest zgodna z kluczem.",
        },
      ]);
    }
    const config = task.checkerConfig || {};
    const answers = [config.correctAnswer, ...(config.acceptedAnswers || [])].filter(Boolean);
    const raw = String(text || "").trim();
    const prepared = prepareShortAnswer(raw, config);
    const correct = answers.some((answer) => {
      const expected = prepareShortAnswer(answer, config);
      const tolerance = Number(config.tolerance || 0);
      const numericA = Number(prepared.replace(",", "."));
      const numericB = Number(expected.replace(",", "."));
      if (!Number.isNaN(numericA) && !Number.isNaN(numericB)) return Math.abs(numericA - numericB) <= tolerance;
      return prepared === expected;
    });
    const score = correct ? task.maxScore : 0;
    return buildFeedback(task, [
      {
        name: task.scoringCriteria[0] ? task.scoringCriteria[0].description : "Poprawna odpowiedź",
        pointsAwarded: score,
        pointsMax: task.maxScore,
        comment: correct
          ? "Odpowiedź jest zgodna z konfiguracją krótkiej odpowiedzi."
          : "Odpowiedź nie pasuje do zaakceptowanych wariantów.",
      },
    ]);
  }

  function prepareShortAnswer(value, config) {
    let output = String(value || "").trim();
    if (config.ignoreSpaces !== false) output = output.replace(/\s+/g, "");
    if (!config.caseSensitive) output = output.toLowerCase();
    return output;
  }

  function gradeAlgorithm(task, code, language) {
    const normalized = normalizeText(code);
    const hasCompileError = /syntax_error|compile error|nie kompiluje/.test(normalized);
    if (!code.trim() || hasCompileError) {
      return buildFeedback(task, [
        {
          name: "Kompilacja lub uruchomienie",
          pointsAwarded: 0,
          pointsMax: task.maxScore,
          comment: !code.trim()
            ? "Nie przesłano kodu do sprawdzenia."
            : "Symulowany runner wykrył oznaczenie błędu kompilacji.",
        },
      ]);
    }

    const criteria = task.scoringCriteria.map((criterion) => {
      const keywords = keywordsForCriterion(criterion);
      const hit = keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
      const algorithmHit =
        criterion.description.toLowerCase().includes("euklidesa") &&
        (/%/.test(code) || normalized.includes("gcd") || normalized.includes("while"));
      const outputHit =
        criterion.description.toLowerCase().includes("wypisanie") &&
        (normalized.includes("cout") || normalized.includes("print"));
      const inputHit =
        criterion.description.toLowerCase().includes("wczytanie") &&
        (normalized.includes("cin") || normalized.includes("input") || normalized.includes("scanf"));
      const awarded = hit || algorithmHit || outputHit || inputHit ? criterion.points : 0;
      return {
        name: criterion.description,
        pointsAwarded: awarded,
        pointsMax: criterion.points,
        comment: awarded
          ? "Element został rozpoznany w kodzie przez lokalny runner MVP."
          : "Ten element nie został jednoznacznie rozpoznany w kodzie.",
      };
    });

    const tests = task.checkerConfig && task.checkerConfig.tests ? task.checkerConfig.tests : [];
    const likelyAccepted = criteria.reduce((sum, item) => sum + item.pointsAwarded, 0) >= task.maxScore - 1;
    const passed = likelyAccepted ? tests.length : Math.max(0, Math.floor(tests.length * 0.6));
    criteria.push({
      name: "Testy programistyczne",
      pointsAwarded: likelyAccepted ? 0 : 0,
      pointsMax: 0,
      comment: `Symulacja: ${passed}/${tests.length || 5} testów. Docelowo kod trafia do izolowanego sandboxa.`,
    });

    const feedback = buildFeedback(task, criteria);
    feedback.runner = {
      language,
      status: feedback.score === task.maxScore ? "Accepted" : "Wrong Answer",
      passedTests: passed,
      totalTests: tests.length || 5,
      note: "To architektura pod runner, nie produkcyjny sandbox.",
    };
    return feedback;
  }

  function gradeFileTask(task, text, files) {
    const hasFile = files.length > 0;
    if (!hasFile && !text.trim()) {
      return buildFeedback(task, task.scoringCriteria.map((criterion) => ({
        name: criterion.description,
        pointsAwarded: 0,
        pointsMax: criterion.points,
        comment: "Nie przesłano pliku ani opisu rozwiązania.",
      })));
    }
    const normalized = normalizeText(text);
    const criteria = task.scoringCriteria.map((criterion) => {
      const keywords = keywordsForCriterion(criterion);
      const hit = keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
      const awarded = hit || hasFile ? criterion.points : 0;
      return {
        name: criterion.description,
        pointsAwarded: awarded,
        pointsMax: criterion.points,
        comment: awarded
          ? "W prototypie przyznano punkt na podstawie przesłanego pliku lub opisu."
          : "Brakuje potwierdzenia tego elementu.",
      };
    });
    return buildFeedback(task, criteria);
  }

  function gradeByCriteria(task, text, files) {
    const normalized = normalizeText(text);
    const fileOnly = files.length > 0 && !text.trim();
    const criteria = task.scoringCriteria.map((criterion) => {
      const keywords = keywordsForCriterion(criterion);
      const matched = keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
      const awarded = matched || (fileOnly && criterion.isPartial) ? criterion.points : 0;
      return {
        name: criterion.description,
        pointsAwarded: awarded,
        pointsMax: criterion.points,
        comment: awarded
          ? "Kryterium zostało potwierdzone w rozwiązaniu ucznia."
          : "Nie znaleziono wystarczającego potwierdzenia tego kryterium.",
      };
    });

    return buildFeedback(task, criteria);
  }

  function keywordsForCriterion(criterion) {
    const hints = String(criterion.aiHint || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (hints.length) return hints;
    return normalizeText(criterion.description)
      .split(" ")
      .filter((word) => word.length > 4)
      .slice(0, 5);
  }

  function buildFeedback(task, criteria) {
    const maxScore = task.maxScore;
    const rawScore = criteria.reduce((sum, criterion) => sum + Number(criterion.pointsAwarded || 0), 0);
    const score = Math.max(0, Math.min(maxScore, rawScore));
    const status = scoreStatus(score, maxScore);
    const good = criteria
      .filter((criterion) => criterion.pointsAwarded > 0)
      .map((criterion) => criterion.name)
      .slice(0, 4);
    const missing = criteria
      .filter((criterion) => criterion.pointsAwarded < criterion.pointsMax)
      .map((criterion) => criterion.name)
      .slice(0, 4);

    return {
      score,
      maxScore,
      status,
      summary:
        status === "max"
          ? "Rozwiązanie spełnia wszystkie kryteria punktacji."
          : status === "zero"
            ? "Rozwiązanie nie spełnia kryteriów punktacji albo jest zbyt niekompletne."
            : "Rozwiązanie jest częściowe. Część kryteriów została spełniona, ale brakuje elementów do pełnej punktacji.",
      criteria,
      whatWasGood: good.length ? good : ["Próba rozwiązania została zapisana i może być porównana z punktacją."],
      whatToImprove: missing.length ? missing : ["Dopilnuj zapisu końcowego i uzasadnienia jak w arkuszu CKE."],
      disclaimer: "Wynik jest symulacją oceny, a nie oficjalną oceną CKE.",
    };
  }

  function readFilters() {
    const form = document.getElementById("filtersForm");
    if (!form) return;
    const key = form.dataset.key;
    filterState[key] = {
      difficulty: Array.from(form.querySelectorAll('[data-filter="difficulty"]:checked')).map((item) => item.value),
      categories: Array.from(form.querySelectorAll('[data-filter="category"]:checked')).map((item) => item.value),
      tags: Array.from(form.querySelectorAll('[data-filter="tag"]:checked')).map((item) => item.value),
      status: form.querySelector('[data-filter="status"]:checked') ? form.querySelector('[data-filter="status"]:checked').value : "all",
      sort: form.querySelector('[data-filter="sort"]') ? form.querySelector('[data-filter="sort"]').value : "newest",
    };
  }

  function filterOptionList(input) {
    const targetId = input.dataset.target;
    const list = targetId ? document.getElementById(targetId) : null;
    if (!list) return;
    const phrase = normalizeText(input.value);
    Array.from(list.querySelectorAll(".option-item")).forEach((item) => {
      const visible = normalizeText(item.textContent).includes(phrase);
      item.classList.toggle("hidden", !visible);
    });
  }

  function handleExamScoreForm(form) {
    const user = currentUser();
    const sheet = examSheetById(form.dataset.sheetId);
    const session = readExamSession();
    if (!user || !sheet || !session || session.sheetId !== sheet.id) return;
    const finishedSession = session.finishedAt ? session : finishExamSession(false);
    const tasks = examTasks(sheet, user);
    const scores = tasks.map((task) => {
      const autoScore = autoGradeClosedTask(task, finishedSession.answers && finishedSession.answers[task.id]);
      if (autoScore) return { taskId: task.id, score: autoScore.score, maxScore: task.maxScore };
      const input = form.querySelector(`[name="score_${task.id}"]`);
      const raw = Number(input ? input.value : 0);
      const score = Math.max(0, Math.min(task.maxScore, raw));
      return { taskId: task.id, score, maxScore: task.maxScore };
    });
    const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
    const maxScore = scores.reduce((sum, item) => sum + item.maxScore, 0);
    const now = new Date().toISOString();
    const finishedAt = finishedSession.finishedAt || now;
    const attempt = {
      id: uid("exam_attempt"),
      userId: user.id,
      sheetId: sheet.id,
      sheetTitle: sheet.title,
      subjectId: sheet.subjectId,
      levelId: sheet.levelId,
      startedAt: finishedSession.startedAt,
      finishedAt,
      durationSeconds: examElapsedSeconds({ ...finishedSession, finishedAt }),
      taskTimes: finishedSession.taskTimes || {},
      answers: finishedSession.answers || {},
      scores,
      totalScore,
      maxScore,
      percent: maxScore ? Math.round((totalScore / maxScore) * 100) : 0,
      timedOut: Boolean(finishedSession.timedOut),
      createdAt: now,
      updatedAt: now,
    };
    state.examAttempts.push(attempt);
    saveState();
    clearExamSession();
    window.location.hash = `#/profile/exams/${attempt.id}`;
    renderRoute();
  }

  function handleDeleteSubject(subjectId) {
    const subject = subjectById(subjectId);
    if (!subject || !isCustomSubject(subject)) return;

    const taskIds = new Set((state.tasks || []).filter((task) => task.subjectId === subject.id).map((task) => task.id));
    const sheetIds = new Set((state.examSheets || []).filter((sheet) => sheet.subjectId === subject.id).map((sheet) => sheet.id));
    const categoryIds = new Set(
      (state.categories || []).filter((category) => category.subjectId === subject.id).map((category) => category.id)
    );
    const confirmation = prompt(
      `Usuwasz przedmiot "${subject.name}" wraz z poziomami, kategoriami, zadaniami, arkuszami i historią podejść. Wpisz POTWIERDZ, aby kontynuować.`
    );
    if (confirmation !== "POTWIERDZ") return;

    state.subjects = state.subjects.filter((item) => item.id !== subject.id);
    state.levels = (state.levels || []).filter((level) => level.subjectId !== subject.id);
    state.categories = (state.categories || []).filter((category) => category.subjectId !== subject.id);
    state.tasks = (state.tasks || []).filter((task) => task.subjectId !== subject.id);
    state.examSheets = (state.examSheets || []).filter((sheet) => sheet.subjectId !== subject.id);
    state.submissions = (state.submissions || []).filter((submission) => !taskIds.has(submission.taskId));
    state.examAttempts = (state.examAttempts || []).filter(
      (attempt) => attempt.subjectId !== subject.id && !sheetIds.has(attempt.sheetId)
    );

    Object.values(filterState).forEach((filters) => {
      filters.categories = (filters.categories || []).filter((id) => !categoryIds.has(id));
    });
    Object.keys(filterState).forEach((key) => {
      if (key.startsWith(`${subject.slug}:`)) delete filterState[key];
    });
    Object.keys(examSearchState).forEach((key) => {
      if (key.startsWith(`${subject.slug}:`)) delete examSearchState[key];
    });
    delete profileSubjectTaskFilterState[subject.slug];
    delete profileSubjectTaskSearchState[subject.slug];
    delete profileSubjectCategoryState[subject.slug];
    if (profileExamSubjectState === subject.id) profileExamSubjectState = "all";

    const activeExam = readExamSession();
    if (activeExam && sheetIds.has(activeExam.sheetId)) clearExamSession();

    saveState();
    renderRoute();
  }

  function removeTaskReferences(taskIds) {
    const ids = new Set(Array.from(taskIds || []).filter(Boolean));
    if (!ids.size) return;
    state.tasks = (state.tasks || []).filter((task) => !ids.has(task.id));
    state.submissions = (state.submissions || []).filter((submission) => !ids.has(submission.taskId));
    state.userTaskNotes = (state.userTaskNotes || []).filter((note) => !ids.has(note.taskId));
    state.userTaskFavorites = (state.userTaskFavorites || []).filter((item) => !ids.has(item.taskId));
    state.userTaskFolders = (state.userTaskFolders || []).map((folder) => ({
      ...folder,
      taskIds: (folder.taskIds || []).filter((id) => !ids.has(id)),
    }));
    state.examTaskCompletionEvents = (state.examTaskCompletionEvents || []).filter((event) => !ids.has(event.taskId));
  }

  function handleDeleteExam(examId) {
    const sheet = examSheetById(examId);
    if (!sheet) return;
    const taskIds = new Set(sheet.taskIds || []);
    const usedElsewhere = new Set(
      (state.examSheets || [])
        .filter((item) => item.id !== examId)
        .flatMap((item) => item.taskIds || [])
    );
    const orphanTaskIds = Array.from(taskIds).filter((id) => !usedElsewhere.has(id));
    const message = orphanTaskIds.length
      ? `Usunac arkusz oraz ${orphanTaskIds.length} zadania dodane tylko do tego arkusza?`
      : "Usunac arkusz?";
    if (!confirm(message)) return;

    state.examSheets = (state.examSheets || []).filter((item) => item.id !== examId);
    removeTaskReferences(orphanTaskIds);
    state.examAttempts = (state.examAttempts || []).filter((attempt) => attempt.sheetId !== examId);
    state.examTaskCompletionEvents = (state.examTaskCompletionEvents || []).filter((event) => event.sheetId !== examId);
    const activeExam = readExamSession();
    if (activeExam && activeExam.sheetId === examId) clearExamSession();
    saveState();
    renderRoute();
  }

  function handleSubjectForm(form) {
    const data = new FormData(form);
    const subjectId = form.dataset.subjectId;
    const name = String(data.get("name") || "").trim();
    const slug = slugify(name);
    if (!name) return;

    const now = new Date().toISOString();
    const accentColor = normalizeSubjectColor(data.get("accentColor")) || subjectThemePresets[0].accentColor;

    if (subjectId) {
      const subject = state.subjects.find((s) => s.id === subjectId);
      if (subject) {
        subject.name = name;
        subject.slug = slug;
        subject.icon = String(data.get("icon") || name.slice(0, 2)).toUpperCase();
        subject.description = String(data.get("description") || "").trim();
        subject.accentColor = accentColor;
        subject.isPublic = data.get("isPublic") === "on";
        subject.updatedAt = now;
      }
    } else {
      if (state.subjects.some((s) => s.slug === slug)) return;
      const subject = {
        id: uid("sub"),
        name,
        slug,
        icon: String(data.get("icon") || name.slice(0, 2)).toUpperCase(),
        description: String(data.get("description") || "").trim(),
        accentColor,
        isPublic: data.get("isPublic") === "on",
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      };
      state.subjects.push(subject);
      const levels = data.getAll("levels");
      levels.forEach((levelName) => {
        state.levels.push({
          id: uid("lev"),
          subjectId: subject.id,
          name: levelName === "podstawa" ? "Podstawa" : "Rozszerzenie",
          slug: levelName,
        });
      });
    }
    saveState();
    renderRoute();
  }

  function handleCategoryForm(form) {
    const data = new FormData(form);
    const categoryId = form.dataset.categoryId;
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const now = new Date().toISOString();
    const accentColor = normalizeSubjectColor(data.get("accentColor")) || colorPalette[0].accentColor;
    const subjectIds = data.getAll("subjectIds").map(String).filter(Boolean);
    if (!subjectIds.length) {
      alert("Wybierz przynajmniej jeden przedmiot dla kategorii.");
      return;
    }

    if (categoryId) {
      const category = state.categories.find((c) => c.id === categoryId);
      if (category) {
        category.subjectId = subjectIds[0];
        category.levelId = String(data.get("levelId") || "") || null;
        category.name = name;
        category.slug = slugify(name);
        category.description = String(data.get("description") || "").trim();
        category.accentColor = accentColor;
        category.updatedAt = now;
      }
    } else {
      subjectIds.forEach((subjectId) => {
        const slug = slugify(name);
        if (state.categories.some((category) => category.subjectId === subjectId && category.slug === slug)) return;
        state.categories.push({
          id: uid("cat"),
          subjectId,
          levelId: subjectIds.length === 1 ? String(data.get("levelId") || "") || null : null,
          name,
          slug,
          description: String(data.get("description") || "").trim(),
          accentColor,
          createdAt: now,
          updatedAt: now,
        });
      });
    }
    saveState();
    renderRoute();
  }

  function handleColorForm(form) {
    const data = new FormData(form);
    const colorIndex = form.dataset.colorIndex;
    const colorNameRaw = String(data.get("colorName") || "").trim();
    const r = Math.max(0, Math.min(255, parseInt(data.get("colorR"), 10) || 0));
    const g = Math.max(0, Math.min(255, parseInt(data.get("colorG"), 10) || 0));
    const b = Math.max(0, Math.min(255, parseInt(data.get("colorB"), 10) || 0));
    const accentColor = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    const colorName = colorNameRaw || accentColor.toUpperCase();

    if (colorIndex !== undefined) {
      const idx = parseInt(colorIndex, 10);
      const isCustom = idx >= colorPalette.length;
      if (isCustom) {
        const customIdx = idx - colorPalette.length;
        if (state.customColors && state.customColors[customIdx]) {
          state.customColors[customIdx].label = colorName;
          state.customColors[customIdx].accentColor = accentColor;
        }
      } else {
        colorPalette[idx].label = colorName;
        colorPalette[idx].accentColor = accentColor;
      }
    } else {
      if (!state.customColors) state.customColors = [];
      state.customColors.push({
        label: colorName,
        accentColor,
      });
    }
    saveState();
    renderRoute();
  }

  function handleTagForm(form) {
    const data = new FormData(form);
    const tagId = form.dataset.tagId;
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const now = new Date().toISOString();
    const accentColor = normalizeSubjectColor(data.get("accentColor")) || colorPalette[0].accentColor;

    if (tagId) {
      const tag = state.tags.find((t) => t.id === tagId);
      if (tag) {
        tag.name = name;
        tag.slug = slugify(name);
        tag.description = String(data.get("description") || "").trim();
        tag.accentColor = accentColor;
        tag.updatedAt = now;
      }
    } else {
      state.tags.push({
        id: uid("tag"),
        name,
        slug: slugify(name),
        description: String(data.get("description") || "").trim(),
        accentColor,
        createdAt: now,
        updatedAt: now,
      });
    }
    saveState();
    renderRoute();
  }

  function handleTaskForm(form) {
    const data = new FormData(form);
    const taskId = form.dataset.taskId;
    const title = String(data.get("title") || "").trim();
    const maxScore = Number(data.get("maxScore") || 0);
    const criteria = collectCriteria(form);
    const criteriaSum = criteria.reduce((sum, criterion) => sum + criterion.points, 0);
    if (!title || !maxScore || !criteria.length) return;
    if (criteriaSum !== maxScore && !confirm(`Suma punktów (${criteriaSum}) różni się od maksymalnej liczby punktów (${maxScore}). Zapisać mimo to?`)) {
      return;
    }
    const now = new Date().toISOString();
    const existing = taskId ? taskById(taskId) : null;
    const nextTaskId = existing ? existing.id : uid("task");
    const task = {
      id: nextTaskId,
      title,
      slug: slugify(title),
      subjectId: String(data.get("subjectId")),
      levelId: String(data.get("levelId")),
      difficulty: Number(data.get("difficulty") || 1),
      maxScore,
      type: String(data.get("type")),
      content: String(data.get("content") || ""),
      officialSolution: String(data.get("officialSolution") || ""),
      sourceName: String(data.get("sourceName") || "").trim(),
      sourceFile: existing ? existing.sourceFile || "" : "",
      sourceType: existing ? existing.sourceType || "" : "",
      sourceLayout: existing ? existing.sourceLayout || "" : "",
      sourcePage: existing ? existing.sourcePage || null : null,
      sourceTaskNumber: existing ? existing.sourceTaskNumber || null : null,
      additionalSolutions: collectAdditionalSolutions(form),
      solutionFiles: collectSolutionFiles(form, nextTaskId),
      isPublished: data.get("isPublished") === "on",
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      categories: data.getAll("categories").map(String),
      tags: data.getAll("tags").map(String),
      files: collectTaskFiles(form, nextTaskId),
      scoringCriteria: criteria,
      checkerConfig: collectCheckerConfig(form, String(data.get("type"))),
    };

    if (existing) {
      state.tasks = state.tasks.map((item) => (item.id === existing.id ? task : item));
    } else {
      state.tasks.push(task);
    }
    saveState();
    window.location.hash = "#/admin/tasks";
    renderRoute();
  }

  function handleExamForm(form) {
    const data = new FormData(form);
    const examId = form.dataset.examId;
    const title = String(data.get("title") || "").trim();
    const subjectId = String(data.get("subjectId") || "");
    const levelId = String(data.get("levelId") || "");
    if (!title || !subjectId) return;
    const now = new Date().toISOString();
    const existing = examId ? examSheetById(examId) : null;
    const newTaskIds = createTasksFromExamForm(form, subjectId, levelId, data.get("isPublished") === "on");
    const selectedTaskIds = data.getAll("taskIds").map(String);
    const taskIds = Array.from(new Set([...selectedTaskIds, ...newTaskIds]));
    if (!taskIds.length) {
      alert("Dodaj albo zaznacz przynajmniej jedno zadanie do arkusza.");
      return;
    }
    const sheet = {
      id: existing ? existing.id : uid("exam"),
      title,
      slug: slugify(title),
      subjectId,
      levelId,
      durationMinutes: Number(data.get("durationMinutes") || 180),
      description: String(data.get("description") || "").trim(),
      isPublished: data.get("isPublished") === "on",
      taskIds,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    if (existing) {
      state.examSheets = state.examSheets.map((item) => (item.id === existing.id ? sheet : item));
    } else {
      state.examSheets.push(sheet);
    }
    saveState();
    window.location.hash = "#/admin/exams";
    renderRoute();
  }

  function createTasksFromExamForm(form, subjectId, levelId, isPublished) {
    return Array.from(form.querySelectorAll(".exam-new-task-row"))
      .map((row) => {
        if (!fieldChecked(row, '[name="examTaskSaveToDatabase"]')) return null;
        return upsertExamNewTaskRow(row, subjectId, levelId, isPublished);
      })
      .filter(Boolean);

    const now = new Date().toISOString();
    return Array.from(form.querySelectorAll(".exam-new-task-row"))
      .map((row) => {
        const title = fieldValue(row, '[name="examTaskTitle"]').trim();
        const content = fieldValue(row, '[name="examTaskContent"]').trim();
        if (!title || !content) return null;
        const maxScore = Math.max(1, Number(fieldValue(row, '[name="examTaskMaxScore"]') || 1));
        const taskId = uid("task");
        const task = {
          id: taskId,
          title,
          slug: slugify(title),
          subjectId,
          levelId,
          difficulty: 2,
          maxScore,
          type: "ai_open",
          content,
          officialSolution: fieldValue(row, '[name="examTaskSolution"]').trim(),
          additionalSolutions: [],
          solutionFiles: [],
          isPublished,
          createdAt: now,
          updatedAt: now,
          categories: [],
          tags: [],
          files: [],
          scoringCriteria: [
            {
              id: uid("crit"),
              description: "Poprawne rozwiązanie zgodne z odpowiedzią wzorcową.",
              points: maxScore,
              aiHint: "",
              order: 1,
              isPartial: true,
            },
          ],
          checkerConfig: null,
        };
        state.tasks.push(task);
        return taskId;
      })
      .filter(Boolean);
  }

  function collectCriteria(form) {
    return Array.from(form.querySelectorAll(".criterion-entry"))
      .map((row, index) => ({
        id: uid("crit"),
        description: fieldValue(row, '[name="criterionDescription"]').trim(),
        points: Number(fieldValue(row, '[name="criterionPoints"]') || 0),
        aiHint: fieldValue(row, '[name="criterionHint"]').trim(),
        isPartial: fieldChecked(row, '[name="criterionPartial"]'),
        order: index + 1,
      }))
      .filter((criterion) => criterion.description && criterion.points >= 0);
  }

  function fieldValue(root, selector) {
    const field = root.querySelector(selector);
    return field ? field.value : "";
  }

  function fieldChecked(root, selector) {
    const field = root.querySelector(selector);
    return field ? field.checked : false;
  }

  function collectTaskFiles(form, taskId) {
    return Array.from(form.querySelectorAll(".file-row"))
      .map((row) => {
        const fileName = fieldValue(row, '[name="fileName"]').trim();
        if (!fileName) return null;
        return {
          id: uid("file"),
          taskId: taskId || "",
          fileName,
          fileUrl: "#",
          fileType: fieldValue(row, '[name="fileType"]').trim() || fileName.split(".").pop() || "plik",
          description: fieldValue(row, '[name="fileDescription"]').trim(),
          isPublic: fieldChecked(row, '[name="filePublic"]'),
          createdAt: new Date().toISOString(),
        };
      })
      .filter(Boolean);
  }

  function collectAdditionalSolutions(form) {
    return Array.from(form.querySelectorAll(".solution-row"))
      .map((row, index) => {
        const content = fieldValue(row, '[name="solutionContent"]').trim();
        if (!content) return null;
        return {
          id: uid("solution"),
          title: fieldValue(row, '[name="solutionTitle"]').trim() || `Rozwiązanie ${index + 2}`,
          content,
          order: index + 1,
        };
      })
      .filter(Boolean);
  }

  function collectSolutionFiles(form, taskId) {
    const savedFiles = Array.from(form.querySelectorAll(".solution-file-row"))
      .map((row) => {
        const fileName = fieldValue(row, '[name="solutionFileName"]').trim();
        if (!fileName) return null;
        return {
          id: uid("solution_file"),
          taskId: taskId || "",
          fileName,
          fileUrl: fieldValue(row, '[name="solutionFileUrl"]').trim() || "#",
          fileType: fieldValue(row, '[name="solutionFileType"]').trim() || fileName.split(".").pop() || "plik",
          description: fieldValue(row, '[name="solutionFileDescription"]').trim(),
          isPublic: true,
          createdAt: new Date().toISOString(),
        };
      })
      .filter(Boolean);
    const upload = form.querySelector('[name="solutionFileUpload"]');
    const uploadedFiles = Array.from(upload && upload.files ? upload.files : []).map((file) => ({
      id: uid("solution_file"),
      taskId: taskId || "",
      fileName: file.name,
      fileUrl: "#",
      fileType: file.name.split(".").pop() || file.type || "plik",
      description: "plik rozwiązania",
      isPublic: true,
      size: file.size,
      createdAt: new Date().toISOString(),
    }));
    return [...savedFiles, ...uploadedFiles];
  }

  function collectCheckerConfig(form, type) {
    const data = new FormData(form);
    if (type === "short_answer" || type === "closed") {
      const answers = String(data.get("shortAnswers") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        checkerType: "short_answer",
        correctAnswer: answers[0] || "",
        acceptedAnswers: answers.slice(1),
        caseSensitive: data.get("caseSensitive") === "on",
        tolerance: Number(data.get("tolerance") || 0),
        ignoreSpaces: data.get("ignoreSpaces") === "on",
      };
    }
    if (type === "info_algorithm") {
      let tests = [];
      try {
        tests = JSON.parse(String(data.get("testsJson") || "[]"));
      } catch (error) {
        tests = [];
      }
      return {
        checkerType: "programming",
        languages: ["cpp", "python"],
        timeLimitMs: Number(data.get("timeLimitMs") || 1000),
        memoryLimitMb: Number(data.get("memoryLimitMb") || 64),
        tests,
        architectureNote: "Docelowo konfiguracja trafia do izolowanego workera/sandboxa.",
      };
    }
    if (type === "info_excel") {
      return {
        checkerType: "script",
        language: "python",
        script: String(data.get("excelScript") || ""),
        settingsJson: { library: "openpyxl" },
      };
    }
    if (type === "info_access") {
      return {
        checkerType: "script",
        language: "python",
        script: String(data.get("accessScript") || ""),
        settingsJson: { format: "accdb" },
      };
    }
    return null;
  }

  function refreshTaskLevelsAndCategories() {
    const subjectSelectEl = document.getElementById("taskSubjectSelect");
    const levelSelectEl = document.getElementById("taskLevelSelect");
    if (!subjectSelectEl || !levelSelectEl) return;
    const levels = state.levels.filter((level) => level.subjectId === subjectSelectEl.value);
    levelSelectEl.innerHTML = levels
      .map((level) => `<option value="${level.id}">${escapeHtml(level.name)}</option>`)
      .join("");
    refreshTaskCategories();
  }

  function refreshExamLevelsAndTasks() {
    const subjectSelectEl = document.getElementById("examSubjectSelect");
    const levelSelectEl = document.getElementById("examLevelSelect");
    if (!subjectSelectEl || !levelSelectEl) return;
    const levels = state.levels.filter((level) => level.subjectId === subjectSelectEl.value);
    levelSelectEl.innerHTML = `<option value="">wszystkie poziomy</option>` + levels
      .map((level) => `<option value="${level.id}">${escapeHtml(level.name)}</option>`)
      .join("");
    refreshExamTasks();
  }

  function refreshExamTasks() {
    const subjectSelectEl = document.getElementById("examSubjectSelect");
    const levelSelectEl = document.getElementById("examLevelSelect");
    const box = document.getElementById("examTaskBox");
    const form = document.getElementById("examForm");
    if (!subjectSelectEl || !levelSelectEl || !box || !form) return;
    
    // Pobierz aktualnie zaznaczone ID, żeby ich nie zgubić przy zmianie filtrów
    // Używamy bezpieczniejszego sposobu zbierania danych
    const selectedIds = Array.from(form.querySelectorAll('input[name="taskIds"]:checked')).map(el => String(el.value));

    const sId = subjectSelectEl.value;
    const lId = levelSelectEl.value;

    const tasks = state.tasks.filter((task) => {
      const matchSubject = task.subjectId === sId;
      const matchLevel = !lId || task.levelId === lId;
      return matchSubject && matchLevel;
    });
    
    box.innerHTML = renderExamTaskPicker(tasks, selectedIds);
  }

  function refreshTaskCategories() {
    const subjectSelectEl = document.getElementById("taskSubjectSelect");
    const levelSelectEl = document.getElementById("taskLevelSelect");
    const box = document.getElementById("taskCategoryBox");
    if (!subjectSelectEl || !levelSelectEl || !box) return;
    const categories = state.categories.filter(
      (category) =>
        category.subjectId === subjectSelectEl.value && (!category.levelId || category.levelId === levelSelectEl.value)
    );
    box.innerHTML = categories.map((category) => categoryCheckbox(category, [])).join("") || `<p class="muted">Brak kategorii dla tego wyboru.</p>`;
  }

  function updateCheckerPanels() {
    const select = document.getElementById("taskTypeSelect");
    const panels = Array.from(document.querySelectorAll("[data-checker-panel]"));
    if (!select || !panels.length) return;
    const type = select.value;
    panels.forEach((panel) => {
      const panelType = panel.dataset.checkerPanel;
      const show =
        panelType === type ||
        (panelType === "short_answer" && (type === "short_answer" || type === "closed")) ||
        (panelType === "default" && !["short_answer", "closed", "info_algorithm", "info_excel", "info_access"].includes(type));
      panel.classList.toggle("hidden", !show);
    });
  }

  function updateCriteriaSum() {
    const box = document.getElementById("criteriaSum");
    const form = document.getElementById("taskForm");
    if (!box || !form) return;
    const maxScoreField = form.querySelector('[name="maxScore"]');
    const maxScore = Number(maxScoreField ? maxScoreField.value : 0);
    const sum = Array.from(form.querySelectorAll('[name="criterionPoints"]')).reduce(
      (total, input) => total + Number(input.value || 0),
      0
    );
    box.textContent = `Suma kryteriów: ${sum} pkt. Maksymalna liczba punktów: ${maxScore} pkt.`;
    box.className = sum === maxScore ? "success-box" : "info-box";
  }

  function bootApp() {
    applyTheme();
    window.addEventListener("hashchange", renderRoute);
    window.MaturaLabRenderMath = renderMath;
    renderRoute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApp);
  } else {
    bootApp();
  }
})();
