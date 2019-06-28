declare let window: any;
declare let global: any;
const _global = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {});
// const nativeWebSocket = _global.WebSocket || _global.MozWebSocket;
const nativeDatPeers = _global.experimental && _global.experimental.datPeers;

const CONNECTION_TIMEOUT = 7000

import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { Client, ClientOptions } from './client';

import createWebSocket from '../connection/dat/createWebSocket'
import createDatPeerNetwork from '../connection/dat/createDatPeerNetwork'
import ConnectionPath from '../connection/ConnectionPath'
import connect from '../connection/connect'
import { GRAPHQL_WS } from 'subscriptions-transport-ws/dist/protocol'

import randomBytes from '../p2pCrypto/randomBytes'

export namespace ThingLink {
  /**
   * Configuration to use when constructing the client
   */
  export interface Configuration {
    /**
     * Options to pass when constructing the subscription client.
     */
    options?: ClientOptions;

    identityKeys,
    peerIdentityPublicKey,
    timeout,
    datPeers,
    protocol,
    initiator,
    /**
     * The websocket signalling server to connect to.
     */
    websocketURL,
    wrtc,
    /**
     * A custom WebSocket implementation to use.
     */
    webSocketImpl?: any;
  }
}

// For backwards compatibility.
export import WebSocketParams = ThingLink.Configuration;

export class ThingLink extends ApolloLink {
  private client: Client;

  constructor(
    paramsOrClient: ThingLink.Configuration | Client,
  ) {
    super();

    if (paramsOrClient instanceof Client) {
      this.client = paramsOrClient;
    } else {
      const {
        identityKeys,
        peerIdentityPublicKey,
        protocol = GRAPHQL_WS,
        initiator = true,
        timeout = CONNECTION_TIMEOUT,
        datPeers = nativeDatPeers,
        webSocketImpl,
        websocketURL,
        wrtc,
      } = paramsOrClient

      const datPeerNetwork = createDatPeerNetwork({
        datPeers,
        createWebSocket: createWebSocket({
          identityKeys,
          webSocketImpl,
          websocketURL,
        }),
      })

      const connectionPath = ConnectionPath({
        identityKeys,
        peerIdentityPublicKey,
        datPeerNetwork,
        wrtc,
        initiator,
      })

      const createConnection = async () => {
        const sessionID = (await randomBytes(32)).toString('hex')

        return await connect({
          connectionPath,
          sessionID,
          protocol,
          shouldAbortConnection: () => false,
          timeout,
        })
      }

      this.client = new Client(
        createConnection,
        paramsOrClient.options,
      );
    }
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.client.request(operation) as Observable<
      FetchResult
    >;
  }
}
