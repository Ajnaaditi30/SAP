/*
 * Generates the educational SAP troubleshooting corpus used by the local RAG
 * index. The records deliberately avoid SAP Note numbers and vendor-only fixes.
 */
const fs = require("fs/promises");
const path = require("path");

const modules = [
  ["MM", "Materials Management", ["ME21N", "ME22N", "ME23N", "MIGO", "MIRO", "MMBE"]],
  ["SD", "Sales and Distribution", ["VA01", "VA02", "VA03", "VL01N", "VF01", "VFX3"]],
  ["FI", "Financial Accounting", ["FB50", "FB03", "FBL3N", "F-02", "OB52", "FS00"]],
  ["CO", "Controlling", ["KB11N", "KSB1", "KOB1", "KS02", "OKB9", "KP06"]],
  ["PP", "Production Planning", ["MD04", "CO01", "CO02", "CO03", "COR1", "CS03"]],
  ["QM", "Quality Management", ["QA32", "QE51N", "QA11", "QP03", "QPR1", "QM02"]],
  ["PM", "Plant Maintenance", ["IW31", "IW32", "IW33", "IW38", "IL03", "IP24"]],
  ["WM", "Warehouse Management", ["LT01", "LT12", "LT21", "LX03", "LS24", "LB10"]],
  ["BASIS", "SAP Basis", ["SM21", "SM37", "SM50", "SM59", "SMGW", "ST22"]],
  ["ABAP", "ABAP Development", ["ST22", "SE80", "SE38", "SAT", "ST05", "SE11"]],
  ["Authorization", "Authorization", ["SU53", "SUIM", "PFCG", "ST01", "SM20", "SU01"]]
];

const scenarios = [
  ["MASTER_DATA_MISSING", "Required master data is missing or incomplete", "A required master-data record, view, or organizational assignment is not available for the process.", "Complete the missing master data through the approved maintenance process and repeat the transaction."],
  ["ORG_ASSIGNMENT_INVALID", "Organizational assignment is invalid", "The document or master data does not contain a valid company code, plant, sales area, controlling area, or warehouse assignment.", "Validate the organizational assignment and correct configuration or master data with the process owner."],
  ["POSTING_PERIOD_CLOSED", "Posting period is closed", "The requested posting date is outside an open posting period or the period controls exclude the document type.", "Use an allowed posting date or ask the authorized finance administrator to review period controls."],
  ["NUMBER_RANGE_EXHAUSTED", "Number range cannot issue a document number", "The relevant internal or external number range is exhausted, missing, or inconsistent for the document type.", "Have the functional owner review the assigned number range; do not change number ranges without change control."],
  ["STATUS_BLOCKED", "Document status prevents processing", "The business object is completed, locked, deleted, released incorrectly, or otherwise not eligible for the requested action.", "Review the status history, remove only valid business blocks, and follow the approved reversal or completion process."],
  ["QUANTITY_INCONSISTENT", "Quantity or stock values are inconsistent", "The entered quantity conflicts with available stock, open quantity, tolerance, unit conversion, or a previous document.", "Compare document history and stock or quantity details; correct the source document rather than forcing a posting."],
  ["ACCOUNT_ASSIGNMENT_INVALID", "Account assignment is incomplete or invalid", "A required cost object, G/L account, profit center, account assignment category, or derivation rule is missing or invalid.", "Complete the account assignment and have the functional owner verify derivation and configuration."],
  ["CONFIGURATION_MISSING", "Required configuration is missing", "A customizing rule needed for this process is not maintained for the combination of organizational data and document attributes.", "Record the exact message and configuration key, then have the module owner review customizing in a controlled system."],
  ["INTERFACE_PROCESSING_FAILED", "Inbound or outbound interface processing failed", "The message payload, mapping, destination, queue, or application posting failed during interface processing.", "Check the application log and interface monitor, correct the root data or connectivity problem, then reprocess only the affected message."],
  ["LOCK_CONFLICT", "Object is locked by another process", "Another user, job, or update task currently holds a lock on the business object.", "Identify the owner of the lock, wait for the active process to finish, and investigate stale locks before any administrative action."],
  ["AUTHORIZATION_DENIED", "Authorization check failed", "The user lacks an authorization value for the required activity, organizational level, or object.", "Use SU53 immediately after the failure and have the security team adjust roles only after validating the business need."],
  ["RFC_COMMUNICATION_FAILED", "RFC communication failed", "The target RFC destination, gateway, registered program, network route, or logon is unavailable.", "Test the destination in SM59 and have Basis or network support verify host, gateway, routing, and service availability."],
  ["UPDATE_TERMINATED", "Update task terminated", "A synchronous or asynchronous update failed after the dialog step because of data, lock, database, or application errors.", "Review SM13 and the related application log, correct the root cause, and reprocess only when the update status is understood."],
  ["BACKGROUND_JOB_FAILED", "Background processing failed", "A scheduled job stopped, was cancelled, or produced an application error while processing the selection.", "Inspect the job log and spool in SM37, identify the failing program or data record, and rerun with an approved corrected selection."],
  ["DATABASE_CONSTRAINT", "Database consistency check failed", "A unique key, foreign key, or application consistency rule rejected the attempted change.", "Use the dump or application log to identify the table and key; do not alter database tables directly without an approved recovery procedure."],
  ["PERFORMANCE_TIMEOUT", "Processing exceeded the allowed runtime", "The transaction or report processed too much data or inefficient logic caused a dialog timeout.", "Reduce the selection, use background processing where suitable, and analyze SQL or ABAP performance before changing runtime parameters."],
  ["OUTPUT_DETERMINATION_FAILED", "Output determination did not find a valid output", "No condition record, partner function, medium, or output configuration matched the document.", "Check the document's output analysis and maintain the required condition or partner data through controlled configuration."],
  ["VALIDATION_SUBSTITUTION", "Validation or substitution rejected the document", "A configured validation rule failed or a substitution derived an invalid value during processing.", "Capture the rule message and document values; have the process owner review the validation or substitution logic."],
  ["DATA_CONVERSION_ERROR", "Input format or conversion is invalid", "A date, amount, unit, code, or external payload value cannot be converted into the expected SAP field format.", "Validate the source value, user settings, and interface mapping; correct the input and retry the document."],
  ["CUSTOM_CODE_EXCEPTION", "Custom enhancement raised an exception", "A customer program, BAdI, user exit, or enhancement implementation terminated or rejected the process.", "Review the related short dump and application log; send the program, include, line, and reproducible data to the ABAP owner."]
];

function createRecord([moduleCode, moduleName, transactions], [suffix, title, cause, action], index) {
  const errorCode = `${moduleCode}_${suffix}`;
  return {
    id: `sap-${moduleCode.toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
    error_code: errorCode,
    module: moduleCode,
    title: `${moduleName}: ${title}`,
    description: `${title} in an ${moduleName} business process. ${cause}`,
    business_context: `Use this record when troubleshooting ${moduleName} documents, master data, jobs, or integrations. Confirm the exact message number and affected organizational data before making changes.`,
    possible_causes: [cause, "The issue may be triggered by recently changed master data, configuration, user input, or an upstream document."],
    diagnostic_steps: [
      `Capture the full SAP message, affected document, user, client, and time of failure.`,
      `Review the relevant document and application log using ${transactions.slice(0, 2).join(" or ")}.`,
      `Check related processing and technical evidence in ${transactions.slice(2, 4).join(" or ")} where applicable.`,
      "Confirm the root cause in a non-production or controlled process before retrying."
    ],
    recommended_actions: [action, "Document the correction and retest the smallest safe business scenario."],
    related_transactions: transactions,
    keywords: [moduleCode, moduleName, suffix.replaceAll("_", " ").toLowerCase(), title.toLowerCase()],
    source: "knowledge_base/sap_errors.json"
  };
}

async function main() {
  const records = modules.flatMap((module) => scenarios.map((scenario, index) => createRecord(module, scenario, index)));
  const output = path.resolve(__dirname, "..", "knowledge_base", "sap_errors.json");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  console.log(`Wrote ${records.length} SAP troubleshooting records to ${output}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
