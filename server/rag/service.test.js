const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyResponse, documentResponse, constrainToSources } = require('./service');

test('emptyResponse exposes every SAP record field', () => {
  const response = emptyResponse();

  assert.equal(response.id, '');
  assert.equal(response.error_code, '');
  assert.equal(response.module, '');
  assert.equal(response.title, '');
  assert.equal(response.description, 'No relevant SAP documentation was found.');
  assert.equal(response.business_context, '');
  assert.deepEqual(response.possible_causes, []);
  assert.deepEqual(response.diagnostic_steps, []);
  assert.deepEqual(response.recommended_actions, []);
  assert.deepEqual(response.related_transactions, []);
  assert.deepEqual(response.keywords, []);
  assert.equal(response.source, '');
  assert.equal(response.time_to_fix, '');
  assert.equal(response.who_can_fix, '');
  assert.equal(response.risk_level, '');
  assert.equal(response.confidence, 0);
});

test('documentResponse preserves all returned document fields', () => {
  const document = {
    id: 'sap-mm-004',
    error_code: 'MM_NUMBER_RANGE_EXHAUSTED',
    module: 'MM',
    title: 'Materials Management: Number range cannot issue a document number',
    description: 'Number range cannot issue a document number.',
    business_context: 'Use this record when troubleshooting materials management documents.',
    possible_causes: ['The number range is exhausted.'],
    diagnostic_steps: ['Capture the message.'],
    recommended_actions: ['Have the functional owner review the range.'],
    related_transactions: ['ME21N'],
    keywords: ['MM', 'number range'],
    source: 'knowledge_base/sap_errors.json'
  };

  const response = documentResponse({ document, score: 0.95 });

  assert.equal(response.id, document.id);
  assert.equal(response.error_code, document.error_code);
  assert.equal(response.module, document.module);
  assert.equal(response.title, document.title);
  assert.equal(response.description, document.description);
  assert.equal(response.business_context, document.business_context);
  assert.deepEqual(response.possible_causes, document.possible_causes);
  assert.deepEqual(response.diagnostic_steps, document.diagnostic_steps);
  assert.deepEqual(response.recommended_actions, document.recommended_actions);
  assert.deepEqual(response.related_transactions, document.related_transactions);
  assert.deepEqual(response.keywords, document.keywords);
  assert.equal(response.source, document.source);
  assert.equal(response.confidence, 0.95);
  assert.equal(response.time_to_fix, '15-60 minutes');
  assert.equal(response.who_can_fix, 'SAP MM Functional Consultant');
  assert.equal(response.risk_level, 'Medium');
});

test('constrainToSources merges generated values without dropping retrieved fields', () => {
  const primaryDocument = {
    id: 'sap-mm-004',
    error_code: 'MM_NUMBER_RANGE_EXHAUSTED',
    module: 'MM',
    title: 'Materials Management: Number range cannot issue a document number',
    description: 'Number range cannot issue a document number.',
    business_context: 'Use this record when troubleshooting materials management documents.',
    possible_causes: ['The number range is exhausted.'],
    diagnostic_steps: ['Capture the message.'],
    recommended_actions: ['Have the functional owner review the range.'],
    related_transactions: ['ME21N'],
    keywords: ['MM', 'number range'],
    source: 'knowledge_base/sap_errors.json'
  };

  const merged = constrainToSources({
    title: 'Generated title',
    description: 'Generated description',
    business_context: 'Generated context',
    possible_causes: ['Generated cause'],
    diagnostic_steps: ['Generated step'],
    recommended_actions: ['Generated action'],
    related_transactions: ['Generated transaction'],
    keywords: ['Generated keyword'],
    source: 'generated-source',
    time_to_fix: '10 minutes',
    who_can_fix: 'SAP MM Functional Consultant',
    risk_level: 'High',
    confidence: 0.9
  }, [{ document: primaryDocument, score: 0.91 }], 0.91);

  assert.equal(merged.title, 'Generated title');
  assert.equal(merged.description, 'Generated description');
  assert.equal(merged.business_context, 'Generated context');
  assert.deepEqual(merged.possible_causes, ['Generated cause']);
  assert.deepEqual(merged.diagnostic_steps, ['Generated step']);
  assert.deepEqual(merged.recommended_actions, ['Generated action']);
  assert.deepEqual(merged.related_transactions, ['Generated transaction']);
  assert.deepEqual(merged.keywords, ['Generated keyword']);
  assert.equal(merged.source, 'generated-source');
  assert.equal(merged.time_to_fix, '10 minutes');
  assert.equal(merged.who_can_fix, 'SAP MM Functional Consultant');
  assert.equal(merged.risk_level, 'High');
  assert.equal(merged.confidence, 0.95);
});
