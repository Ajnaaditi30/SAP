import React from "react";

const SECTION_TITLES = [
  "Title",
  "Meaning",
  "Business Context",
  "Possible Causes",
  "Diagnostic Steps",
  "Recommended Actions",
  "Related Transactions",
  "Keywords",
  "Time to Fix",
  "Who Can Fix",
  "Risk Level",
  "Source",
  "Confidence"
];

const SECTION_ALIASES = {
  title: "Title",
  meaning: "Meaning",
  business: "Business Context",
  "business context": "Business Context",
  cause: "Possible Causes",
  causes: "Possible Causes",
  "possible causes": "Possible Causes",
  diagnostic: "Diagnostic Steps",
  diagnostics: "Diagnostic Steps",
  "diagnostic steps": "Diagnostic Steps",
  recommendation: "Recommended Actions",
  recommendations: "Recommended Actions",
  "recommended actions": "Recommended Actions",
  transaction: "Related Transactions",
  transactions: "Related Transactions",
  "related transactions": "Related Transactions",
  keyword: "Keywords",
  keywords: "Keywords",
  fix: "Time to Fix",
  "time to fix": "Time to Fix",
  time: "Time to Fix",
  owner: "Who Can Fix",
  "who can fix": "Who Can Fix",
  risk: "Risk Level",
  "risk level": "Risk Level",
  source: "Source",
  confidence: "Confidence"
};

const SECTION_ICONS = {
  Title: "title",
  Meaning: "info",
  "Business Context": "business",
  "Possible Causes": "travel_explore",
  "Diagnostic Steps": "construction",
  "Recommended Actions": "checklist",
  "Related Transactions": "receipt_long",
  Keywords: "label",
  "Time to Fix": "schedule",
  "Who Can Fix": "group",
  "Risk Level": "warning",
  Source: "source",
  Confidence: "verified"
};

const isNumberedLine = (line) => /^\d+[.)]\s+/.test(line);
const isBulletLine = (line) => /^[-*\u2022]\s+/.test(line);
const stripNumber = (line) => line.replace(/^\d+[.)]\s+/, "");
const stripBullet = (line) => line.replace(/^[-*\u2022]\s+/, "");

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
  const headerPattern = /(?:^|\n)\s*(?:[*#\-\d.)\s]*|[^\w\s])*\s*(Title|Meaning|Business Context|Possible Causes|Diagnostic Steps|Recommended Actions|Related Transactions|Keywords|Time to Fix|Who Can Fix|Risk Level|Source|Confidence)\s*:\s*/gi;
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

const renderLine = (line) => {
  if (isNumberedLine(line)) {
    return (
      <div key={line} className="flex gap-3">
        <span className="mt-0.5 font-semibold text-blue-600 dark:text-blue-400">
          {line.match(/^\d+/)?.[0]}. 
        </span>
        <p>{stripNumber(line)}</p>
      </div>
    );
  }

  if (isBulletLine(line)) {
    return (
      <div key={line} className="flex gap-3">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
        <p>{stripBullet(line)}</p>
      </div>
    );
  }

  return <p key={line}>{line}</p>;
};

const renderContent = (content) => {
  const lines = String(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 md:text-base">Not provided.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300 md:text-base">
      {lines.map(renderLine)}
    </div>
  );
};

function ErrorOutputFormatter({ result }) {
  const sections = parseSections(result);

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-xl text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {SECTION_ICONS[section.title] || "article"}
            </span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {section.title}
            </h3>
          </div>
          {renderContent(section.content)}
        </section>
      ))}
    </div>
  );
}

export default ErrorOutputFormatter;
