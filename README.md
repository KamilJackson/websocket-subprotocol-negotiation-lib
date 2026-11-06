# websocket-subprotocol-negotiation-lib

Parses the `Sec-WebSocket-Protocol` header and selects the best protocol from a client-offered list against a server-supported list.

## Usage

```js
import { parseProtocolHeader, selectProtocol } from './src/index.js';

const header = '  superchat , chat , mqtt ';
const offered = parseProtocolHeader(header);
// offered === ['superchat', 'chat', 'mqtt']

const chosen = selectProtocol(offered, ['mqtt', 'chat']);
// chosen === 'superchat'
```

## Why this exists

The `Sec-WebSocket-Protocol` header is a comma-separated list, but real clients send inconsistent whitespace, and the list is attacker-controlled. A server that does a naive `header.includes(protocol)` check can be tricked into echoing a protocol it does not actually support, or into accepting a protocol name containing characters that are not valid in an HTTP token.

This library parses the header strictly (RFC 7230 token grammar) and selects the client's most-preferred protocol that the server also supports. Client preference wins because the client is the side that has to speak the protocol.

The trade-off is strictness: a malformed header throws a `TypeError` rather than being silently normalized. That means a buggy client gets a clear error instead of a surprising negotiation result. If you would rather skip malformed elements, filter them before calling `selectProtocol`.

## API

### `parseProtocolHeader(headerValue)`

Accepts the raw header string (or `null`/`undefined`/`''` for an absent header) and returns an array of protocol names in client preference order. Throws `TypeError` on malformed input.

### `selectProtocol(clientOffered, serverSupported)`

Accepts two arrays of protocol names and returns the client's most-preferred protocol that the server supports, or `null` if there is no overlap. Throws `TypeError` if either argument is not an array.

## Edge cases

- An absent header (`null`, `undefined`, or `''`) parses to `[]` and selects to `null`.
- Empty list elements (`'a,,b'`) throw rather than being skipped.
- Protocol names are case-sensitive, as required by the WebSocket subprotocol grammar.
