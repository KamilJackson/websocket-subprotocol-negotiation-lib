import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProtocolHeader, selectProtocol } from '../src/index.js';

test('parseProtocolHeader returns empty array for absent header', () => {
  assert.deepEqual(parseProtocolHeader(null), []);
  assert.deepEqual(parseProtocolHeader(undefined), []);
  assert.deepEqual(parseProtocolHeader(''), []);
});

test('parseProtocolHeader splits on commas and preserves order', () => {
  assert.deepEqual(
    parseProtocolHeader('chat, superchat, mqtt'),
    ['chat', 'superchat', 'mqtt']
  );
});

test('parseProtocolHeader trims optional whitespace', () => {
  assert.deepEqual(
    parseProtocolHeader('  chat\t, superchat  '),
    ['chat', 'superchat']
  );
});

test('parseProtocolHeader rejects empty elements', () => {
  assert.throws(() => parseProtocolHeader('chat,,mqtt'), TypeError);
  assert.throws(() => parseProtocolHeader(','), TypeError);
  assert.throws(() => parseProtocolHeader('chat,'), TypeError);
});

test('parseProtocolHeader rejects non-token characters', () => {
  assert.throws(() => parseProtocolHeader('chat/1'), TypeError);
  assert.throws(() => parseProtocolHeader('"chat"'), TypeError);
  assert.throws(() => parseProtocolHeader('chat mqtt'), TypeError);
});

test('parseProtocolHeader rejects non-string input', () => {
  assert.throws(() => parseProtocolHeader(42), TypeError);
});

test('selectProtocol picks the client-preferred match', () => {
  const offered = ['mqtt', 'chat', 'superchat'];
  const supported = ['superchat', 'mqtt'];
  assert.equal(selectProtocol(offered, supported), 'mqtt');
});

test('selectProtocol returns null when there is no overlap', () => {
  assert.equal(selectProtocol(['chat'], ['mqtt']), null);
  assert.equal(selectProtocol([], ['mqtt']), null);
  assert.equal(selectProtocol(['chat'], []), null);
});

test('selectProtocol is case-sensitive', () => {
  assert.equal(selectProtocol(['Chat'], ['chat']), null);
});

test('selectProtocol rejects non-array arguments', () => {
  assert.throws(() => selectProtocol('chat', ['chat']), TypeError);
  assert.throws(() => selectProtocol(['chat'], 'chat'), TypeError);
});

test('end-to-end: parse then select', () => {
  const header = '  superchat , chat , mqtt ';
  const offered = parseProtocolHeader(header);
  const chosen = selectProtocol(offered, ['mqtt', 'chat']);
  assert.equal(chosen, 'chat');
});
