import React from "react";

const SECTION_TITLES = [
  "Meaning",
  "Cause",
  "Fix Steps",
  "Time to Fix",
  "Who Can Fix",
  "Risk Level"
];

const SECTION_ALIASES = {
  meaning: "Meaning",
  cause: "Cause",
  fix: "Fix Steps",
  fixes: "Fix Steps",
  "fix steps": "Fix Steps",
  resolution: "Fix Steps",
  "time to fix": "Time to Fix",
  time: "Time to Fix",
  owner: "Who Can Fix",
  "who can fix": "Who Can Fix",
  risk: "Risk Level",
  "risk level": "Risk Level"
};

const SECTION_ICONS = {
  Meaning: "info",
  Cause: "travel_explore",
  "Fix Steps": "construction",
  "Time to Fix": "schedule",
  "Who Can Fix": "group",
  "Risk Level": "warning"
};

const normalizeTitle = (title) => {
  const cleanTitle = title.replace(/^[^\w]+/, "").trim().toLowerCase();
  return SECTION_ALIASES[cleanTitle] || title.trim();
};

const parseSections = (text) => {
  const source = String(text || "").trim();

  if (!source) {
    return SECTION_TITLES.map((title) => ({
      title,
      content: "Not provided."
    }));
  }

  const sections = [];
  const headerPattern = /(?:^|\n)\s*(?:[*#\-\d.)\s]*|[^\w\s])*\s*(Meaning|Cause|Fix(?:es| Steps)?|Resolution|Time(?: to Fix)?|Who Can Fix|Owner|Risk(?: Level)?)\s*:\s*/gi;
  const matches = [...source.matchAll(headerPattern)];

  if (!matches.length) {
    return [{ title: "Meaning", content: source }];
  }

  matches.forEach((match, index) => {
    const title = normalizeTitle(match[1]);
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    const content = source.slice(start, end).trim() || "Not provided.";

    sections.push({ title, content });
  });

  return SECTION_TITLES.map((title) => (
    sections.find((section) => section.title === title) || { title, content: "Not provided." }
  ));
};

function ErrorOutputFormatter({ result }) {
  const sections = parseSections(result);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-blue-600 dark:text-blue-400">
              {SECTION_ICONS[section.title] || "article"}
            </span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {section.title}
            </h3>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300 md:text-base">
            {section.content}
          </p>
        </section>
      ))}
    </div>
  );
}

export default ErrorOutputFormatter;
