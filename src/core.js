/**
 * WebSocket subprotocol negotiation utilities.
 *
 * The Sec-WebSocket-Protocol header carries a comma-separated list of
 * protocol names the client is willing to speak. The server picks one
 * (or none) and echoes it back. This module provides the parsing and
 * selection logic for that exchange.
 *
 * Design decisions:
 *
 * - Header parsing is intentionally strict about token syntax. The RFC
 *   (7230) defines a token as one or more tchar characters, and the
 *   WebSocket subprotocol grammar reuses that definition. Accepting
 *   anything looser means a malformed header can smuggle a value into
 *   the selection step that the server did not intend to match.
 *
 * - Selection follows client preference order. The client lists its
 *   protocols in descending preference, so the first client protocol
 *   that also appears in the server list wins. This is the behaviour
 *   most servers actually want and is what the RFC's example implies.
 *
 * - The header may legitimately be absent. `parseProtocolHeader`
 *   returns an empty array for `null`, `undefined`, or an empty string,
 *   so callers do not need a separate existence check before calling
 *   `selectProtocol`.
 */

// RFC 7230 token characters. Kept as a Set for O(1) membership tests.
const TOKEN_CHARS = new Set(
  "!#$%&'*+-.^_`|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split('')
);

/**
 * Returns true if `value` is a non-empty string composed entirely of
 * HTTP token characters.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isToken(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  for (const ch of value) {
    if (!TOKEN_CHARS.has(ch)) {
      return false;
    }
  }
  return true;
}

/**
 * Parses a Sec-WebSocket-Protocol header value into an array of protocol
 * names in client preference order.
 *
 * Behaviour:
 *
 * - `null`, `undefined`, and `''` produce an empty array. The header is
 *   optional, and an absent header is equivalent to "no preference".
 * - Surrounding optional whitespace (spaces and horizontal tabs) around
 *   each element is stripped, as permitted by RFC 7230 section 7.
 * - Empty elements (e.g. `"a,,b"`) are rejected rather than skipped,
 *   because they indicate a malformed header and silently dropping them
 *   could hide a client bug. The function throws a `TypeError` in that
 *   case.
 * - Non-token elements throw a `TypeError`. This keeps the negotiated
 *   value inside the grammar the server can safely echo.
 *
 * @param {string|null|undefined} headerValue
 * @returns {string[]}
 * @throws {TypeError} when a non-empty header contains malformed elements
 */
export function parseProtocolHeader(headerValue) {
  if (headerValue === null || headerValue === undefined) {
    return [];
  }
  if (typeof headerValue !== 'string') {
    throw new TypeError('Sec-WebSocket-Protocol header must be a string');
  }
  if (headerValue === '') {
    return [];
  }

  const rawParts = headerValue.split(',');
  const protocols = [];

  for (const raw of rawParts) {
    // Trim optional whitespace (SP / HTAB) from both ends. RFC 7230
    // allows OWS around list elements.
    const trimmed = raw.replace(/^[ \t]+|[ \t]+$/g, '');
    if (trimmed === '') {
      throw new TypeError(
        `malformed Sec-WebSocket-Protocol header: empty element in ${JSON.stringify(headerValue)}`
      );
    }
    if (!isToken(trimmed)) {
      throw new TypeError(
        `malformed Sec-WebSocket-Protocol header: invalid token ${JSON.stringify(trimmed)}`
      );
    }
    protocols.push(trimmed);
  }

  return protocols;
}

/**
 * Selects the best protocol from the client's offered list against the
 * server's supported list.
 *
 * "Best" means the client's most-preferred protocol that the server
 * also supports. Client preference order is authoritative because the
 * client is the one that has to speak the protocol.
 *
 * The `clientOffered` argument is the parsed form produced by
 * `parseProtocolHeader`. It is not re-parsed here so that a caller can
 * inspect or log the parsed list before selection, and so that a caller
 * that already has a list (for example from a test fixture) does not
 * pay for parsing twice.
 *
 * Returns `null` when there is no overlap. Returning `null` rather than
 * `undefined` or `''` makes the "no protocol agreed" case explicit and
 * easy to branch on.
 *
 * @param {string[]} clientOffered protocols in client preference order
 * @param {string[]} serverSupported protocols the server can speak
 * @returns {string|null} the chosen protocol, or null if none match
 */
export function selectProtocol(clientOffered, serverSupported) {
  if (!Array.isArray(clientOffered) || !Array.isArray(serverSupported)) {
    throw new TypeError('selectProtocol expects two arrays of protocol names');
  }

  // Build a set once so selection is O(n + m) rather than O(n * m).
  // Server lists are usually small, but the client list is attacker
  // controlled and can be long.
  const supported = new Set(serverSupported);

  for (const protocol of clientOffered) {
    if (supported.has(protocol)) {
      return protocol;
    }
  }

  return null;
}
