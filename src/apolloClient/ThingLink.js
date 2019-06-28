"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _global = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {});
const nativeDatPeers = _global.experimental && _global.experimental.datPeers;
const CONNECTION_TIMEOUT = 7000;
const apollo_link_1 = require("apollo-link");
const client_1 = require("./client");
const createWebSocket_1 = require("../connection/dat/createWebSocket");
const createDatPeerNetwork_1 = require("../connection/dat/createDatPeerNetwork");
const ConnectionPath_1 = require("../connection/ConnectionPath");
const connect_1 = require("../connection/connect");
const protocol_1 = require("subscriptions-transport-ws/dist/protocol");
const randomBytes_1 = require("../p2pCrypto/randomBytes");
class ThingLink extends apollo_link_1.ApolloLink {
    constructor(paramsOrClient) {
        super();
        if (paramsOrClient instanceof client_1.Client) {
            this.client = paramsOrClient;
        }
        else {
            const { identityKeys, peerIdentityPublicKey, protocol = protocol_1.GRAPHQL_WS, initiator = true, timeout = CONNECTION_TIMEOUT, datPeers = nativeDatPeers, webSocketImpl, websocketURL, wrtc, } = paramsOrClient;
            const datPeerNetwork = createDatPeerNetwork_1.default({
                datPeers,
                createWebSocket: createWebSocket_1.default({
                    identityKeys,
                    webSocketImpl,
                    websocketURL,
                }),
            });
            const connectionPath = ConnectionPath_1.default({
                identityKeys,
                peerIdentityPublicKey,
                datPeerNetwork,
                wrtc,
                initiator,
            });
            const createConnection = async () => {
                const sessionID = (await randomBytes_1.default(32)).toString('hex');
                return await connect_1.default({
                    connectionPath,
                    sessionID,
                    protocol,
                    shouldAbortConnection: () => false,
                    timeout,
                });
            };
            this.client = new client_1.Client(createConnection, paramsOrClient.options);
        }
    }
    request(operation) {
        return this.client.request(operation);
    }
}
exports.ThingLink = ThingLink;
//# sourceMappingURL=ThingLink.js.map