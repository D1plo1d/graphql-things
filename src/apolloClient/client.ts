/*
 * Based on:
 * https://github.com/apollographql/subscriptions-transport-ws/blob/master/src/client.ts
 * Commit:
 * cf3f492
 *
 * March 11, 2019
 */
const TIMEOUT = 30000

import * as Backoff from 'backo2';
import { EventEmitter, ListenerFn } from 'eventemitter3';
import isString from 'subscriptions-transport-ws/dist/utils/is-string';
import isObject from 'subscriptions-transport-ws/dist/utils/is-object';
import { ExecutionResult } from 'graphql/execution/execute';
import { print } from 'graphql/language/printer';
import { DocumentNode } from 'graphql/language/ast';
import { getOperationAST } from 'graphql/utilities/getOperationAST';
import $$observable from 'symbol-observable';

import MessageTypes from 'subscriptions-transport-ws/dist/message-types';

import ConnectionTimeout, { CONNECTION_TIMEOUT } from '../connection/ConnectionTimeout'

export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

export interface Observable<T> {
  subscribe(observer: Observer<T>): {
    unsubscribe: () => void;
  };
}

export interface OperationOptions {
  query?: string | DocumentNode;
  variables?: Object;
  operationName?: string;
  [key: string]: any;
}

export type FormatedError = Error & {
  originalError?: any;
};

export interface Operation {
  options: OperationOptions;
  handler: (error: Error[], result?: any) => void;
}

export interface Operations {
  [id: string]: Operation;
}

export interface Middleware {
  applyMiddleware(options: OperationOptions, next: Function): void;
}

export type ConnectionParams = {
  [paramName: string]: any,
};

export type ConnectionParamsOptions = ConnectionParams | Function | Promise<ConnectionParams>;

export interface ClientOptions {
  connectionParams?: ConnectionParamsOptions;
  timeout?: number;
  reconnect?: boolean;
  reconnectionAttempts?: number;
  connectionCallback?: (error: Error[], result?: any) => void;
  lazy?: boolean;
  inactivityTimeout?: number;
}

export const SOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

export class Client {
  public connection: any;
  public operations: Operations;
  public isTimedOut: boolean;
  public nextReconnectAttempt: any;
  private connecting: boolean;
  private nextOperationId: number;
  private connectionParams: Function;
  private timeout: number;
  private unsentMessagesQueue: Array<any>; // queued messages while websocket is opening.
  private reconnect: boolean;
  private reconnecting: boolean;
  private reconnectionAttempts: number;
  private backoff: any;
  private connectionCallback: any;
  private eventEmitter: any;
  private lazy: boolean;
  private inactivityTimeout: number;
  private inactivityTimeoutId: any;
  private closedByUser: boolean;
  private wasKeepAliveReceived: boolean;
  private tryReconnectTimeoutId: any;
  private checkConnectionIntervalId: any;
  private middlewares: Middleware[];
  private createConnection: Function;

  constructor(
    createConnection: Function,
    options?: ClientOptions,
  ) {
    const {
      connectionCallback = undefined,
      connectionParams = {},
      timeout = TIMEOUT,
      reconnect = true,
      reconnectionAttempts = Infinity,
      lazy = false,
      inactivityTimeout = 0,
    } = (options || {});

    this.createConnection = createConnection
    this.connectionCallback = connectionCallback;
    this.operations = {};
    this.nextOperationId = 0;
    this.timeout = timeout;
    this.unsentMessagesQueue = [];
    this.reconnect = reconnect;
    this.reconnecting = false;
    this.reconnectionAttempts = reconnectionAttempts;
    this.lazy = !!lazy;
    this.inactivityTimeout = inactivityTimeout;
    this.closedByUser = false;
    this.backoff = new Backoff({ jitter: 0.5, initialDelay: 500 });
    this.eventEmitter = new EventEmitter();
    this.middlewares = [];
    this.connection = null;
    this.connecting = false;
    this.connectionParams = this.getConnectionParams(connectionParams);
    this.isTimedOut = false;
    this.nextReconnectAttempt = null;

    if (!this.lazy) {
      this.connect();
    }
  }

  public get status() {
    if (this.connecting) {
      return SOCKET_STATES.CONNECTING;
    }
    if (this.connection === null) {
      return SOCKET_STATES.CLOSED;
    }
    return SOCKET_STATES.OPEN
  }

  public close(isForced = true, closedByUser = true) {
    this.clearInactivityTimeout();
    if (this.connection !== null) {
      this.closedByUser = closedByUser;

      if (isForced) {
        this.clearCheckConnectionInterval();
        this.clearTryReconnectTimeout();
        this.unsubscribeAll();
        this.sendMessage(undefined, MessageTypes.GQL_CONNECTION_TERMINATE, null);
      }

      this.connection.close();
      this.connection = null;
      this.eventEmitter.emit('disconnected');

      if (!isForced) {
        this.tryReconnect();
      }
    }
  }

  public request(request: OperationOptions): Observable<ExecutionResult> {
    const getObserver = this.getObserver.bind(this);
    const executeOperation = this.executeOperation.bind(this);
    const unsubscribe = this.unsubscribe.bind(this);

    let opId: string;

    this.clearInactivityTimeout();

    return {
      [$$observable]() {
        return this;
      },
      subscribe(
        observerOrNext: ((Observer<ExecutionResult>) | ((v: ExecutionResult) => void)),
        onError?: (error: Error) => void,
        onComplete?: () => void,
      ) {
        const observer = getObserver(observerOrNext, onError, onComplete);

        opId = executeOperation(request, (error: Error[], result: any) => {
          if ( error === null && result === null ) {
            if ( observer.complete ) {
              observer.complete();
            }
          } else if (error) {
            if ( observer.error ) {
              observer.error(error[0]);
            }
          } else {
            if ( observer.next ) {
              observer.next(result);
            }
          }
        });

        return {
          unsubscribe: () => {
            if ( opId ) {
              unsubscribe(opId);
              opId = null;
            }
          },
        };
      },
    };
  }

  public tryReconnectNow() {
    if (this.status !== SOCKET_STATES.CLOSED) return

    if (this.tryReconnectTimeoutId != null) {
      clearTimeout(this.tryReconnectTimeoutId)
    }
    this.nextReconnectAttempt = Date.now()

    this.connect()
  }

  public on(eventName: string, callback: ListenerFn, context?: any): Function {
    const handler = this.eventEmitter.on(eventName, callback, context);

    return () => {
      handler.off(eventName, callback, context);
    };
  }

  public onConnected(callback: ListenerFn, context?: any): Function {
    return this.on('connected', callback, context);
  }

  public onConnecting(callback: ListenerFn, context?: any): Function {
    return this.on('connecting', callback, context);
  }

  public onDisconnected(callback: ListenerFn, context?: any): Function {
    return this.on('disconnected', callback, context);
  }

  public onReconnected(callback: ListenerFn, context?: any): Function {
    return this.on('reconnected', callback, context);
  }

  public onReconnecting(callback: ListenerFn, context?: any): Function {
    return this.on('reconnecting', callback, context);
  }

  public onError(callback: ListenerFn, context?: any): Function {
    return this.on('error', callback, context);
  }

  public unsubscribeAll() {
    Object.keys(this.operations).forEach( subId => {
      this.unsubscribe(subId);
    });
  }

  public applyMiddlewares(options: OperationOptions): Promise<OperationOptions> {
    return new Promise((resolve, reject) => {
      const queue = (funcs: Middleware[], scope: any) => {
        const next = (error?: any) => {
          if (error) {
            reject(error);
          } else {
            if (funcs.length > 0) {
              const f = funcs.shift();
              if (f) {
                f.applyMiddleware.apply(scope, [options, next]);
              }
            } else {
              resolve(options);
            }
          }
        };
        next();
      };

      queue([...this.middlewares], this);
    });
  }

  public use(middlewares: Middleware[]): Client {
    middlewares.map((middleware) => {
      if (typeof middleware.applyMiddleware === 'function') {
        this.middlewares.push(middleware);
      } else {
        throw new Error('Middleware must implement the applyMiddleware function.');
      }
    });

    return this;
  }

  private getConnectionParams(connectionParams: ConnectionParamsOptions): Function {
    return (): Promise<ConnectionParams> => new Promise((resolve, reject) => {
      if (typeof connectionParams === 'function') {
        try {
          return resolve(connectionParams.call(null));
        } catch (error) {
          return reject(error);
        }
      }

      resolve(connectionParams);
    });
  }

  private executeOperation(options: OperationOptions, handler: (error: Error[], result?: any) => void): string {
    if (this.connection === null && !this.connecting) {
      this.connect();
    }

    const opId = this.generateOperationId();
    this.operations[opId] = { options: options, handler };

    this.applyMiddlewares(options)
      .then(processedOptions => {
        this.checkOperationOptions(processedOptions, handler);
        if (this.operations[opId]) {
          this.operations[opId] = { options: processedOptions, handler };
          this.sendMessage(opId, MessageTypes.GQL_START, processedOptions);
        }
      })
      .catch(error => {
        this.unsubscribe(opId);
        handler(this.formatErrors(error));
      });

    return opId;
  }

  private getObserver<T>(
    observerOrNext: ((Observer<T>) | ((v: T) => void)),
    error?: (e: Error) => void,
    complete?: () => void,
  ) {
    if ( typeof observerOrNext === 'function' ) {
      return {
        next: (v: T) => observerOrNext(v),
        error: (e: Error) => error && error(e),
        complete: () => complete && complete(),
      };
    }

    return observerOrNext;
  }

  private clearCheckConnectionInterval() {
    if (this.checkConnectionIntervalId) {
      clearInterval(this.checkConnectionIntervalId);
      this.checkConnectionIntervalId = null;
    }
  }

  private clearTryReconnectTimeout() {
    if (this.tryReconnectTimeoutId) {
      clearTimeout(this.tryReconnectTimeoutId);
    }

    this.tryReconnectTimeoutId = null;
    this.nextReconnectAttempt = null;
  }

  private clearInactivityTimeout() {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
  }

  private setInactivityTimeout() {
    if (this.inactivityTimeout > 0 && Object.keys(this.operations).length === 0) {
      this.inactivityTimeoutId = setTimeout(() => {
        if (Object.keys(this.operations).length === 0) {
          this.close();
        }
      }, this.inactivityTimeout);
    }
  }

  private checkOperationOptions(options: OperationOptions, handler: (error: Error[], result?: any) => void) {
    const { query, variables, operationName } = options;

    if (!query) {
      throw new Error('Must provide a query.');
    }

    if (!handler) {
      throw new Error('Must provide an handler.');
    }

    if (
      ( !isString(query) && !getOperationAST(query, operationName)) ||
      ( operationName && !isString(operationName)) ||
      ( variables && !isObject(variables))
    ) {
      throw new Error('Incorrect option types. query must be a string or a document,' +
        '`operationName` must be a string, and `variables` must be an object.');
    }
  }

  private buildMessage(id: string, type: string, payload: any) {
    const payloadToReturn = payload && payload.query ?
      {
        ...payload,
        query: typeof payload.query === 'string' ? payload.query : print(payload.query),
      } :
      payload;

    return {
      id,
      type,
      payload: payloadToReturn,
    };
  }

  // ensure we have an array of errors
  private formatErrors(errors: any): FormatedError[] {
    if (Array.isArray(errors)) {
      return errors;
    }

    // TODO  we should not pass ValidationError to callback in the future.
    // ValidationError
    if (errors && errors.errors) {
      return this.formatErrors(errors.errors);
    }

    if (errors && errors.message) {
      return [errors];
    }

    return [{
      name: 'FormatedError',
      message: 'Unknown error',
      originalError: errors,
    }];
  }

  private sendMessage(id: string, type: string, payload: any) {
    this.sendMessageRaw(this.buildMessage(id, type, payload));
  }

  // send message, or queue it if connection is not open
  private sendMessageRaw(message: Object) {
    switch (this.status) {
      case SOCKET_STATES.OPEN:
        this.connection.send(message);
        break;
      case SOCKET_STATES.CONNECTING:
        this.unsentMessagesQueue.push(message);

        break;
      default:
        if (!this.reconnecting) {
          this.eventEmitter.emit('error', new Error('A message was not sent because socket is not connected, is closing or ' +
            'is already closed. Message was: ' + JSON.stringify(message)));
        }
    }
  }

  private generateOperationId(): string {
    return String(++this.nextOperationId);
  }

  private errorAllOperations(error) {
    Object.entries(this.operations).forEach(([opId, op]) => {
      op.handler(this.formatErrors(error), null);
      delete this.operations[opId];
    })
  }

  private tryReconnect() {
    if (!this.reconnect || this.backoff.attempts >= this.reconnectionAttempts) {
      this.errorAllOperations({
        message: 'Connection timed out',
      })
      return;
    }

    if (!this.reconnecting) {
      Object.keys(this.operations).forEach((key) => {
        this.unsentMessagesQueue.push(
          this.buildMessage(key, MessageTypes.GQL_START, this.operations[key].options),
        );
      });
      this.reconnecting = true;
    }

    this.clearTryReconnectTimeout();

    const delay = this.backoff.duration();
    this.tryReconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
    this.nextReconnectAttempt = Date.now() + delay
  }

  private flushUnsentMessagesQueue() {
    this.unsentMessagesQueue.forEach((message) => {
      this.sendMessageRaw(message);
    });
    this.unsentMessagesQueue = [];
  }

  private checkConnection() {
    if (this.wasKeepAliveReceived) {
      this.wasKeepAliveReceived = false;
      return;
    }

    if (!this.reconnecting) {
      this.close(false, true);
    }
  }

  private async connect() {
    this.connecting = true

    try {
      this.connection = await this.createConnection()
    } catch(err) {
      this.connection = null
      this.connecting = false

      // setTimeout prevents a race condition preventing display of synchronous
      // errors
      setTimeout(() => {
        if (err instanceof ConnectionTimeout) {
          if (!this.closedByUser) {
            this.isTimedOut = true
            this.tryReconnect()
          }
        } else {
          this.eventEmitter.emit('error', err)
          this.errorAllOperations(err)
        }
      }, 0)
      return
    }

    this.isTimedOut = false
    this.connecting = false
    this.closedByUser = false;
    this.eventEmitter.emit(this.reconnecting ? 'reconnecting' : 'connecting');

    try {
      const connectionParams: ConnectionParams = await this.connectionParams();

      // Send CONNECTION_INIT message, no need to wait for connection to success (reduce roundtrips)
      this.sendMessage(undefined, MessageTypes.GQL_CONNECTION_INIT, connectionParams);
      this.flushUnsentMessagesQueue();
    } catch (error) {
      this.sendMessage(undefined, MessageTypes.GQL_CONNECTION_ERROR, error);
      this.flushUnsentMessagesQueue();
    }

    this.connection.on('close', () => {
      if (!this.closedByUser) {
        this.close(false, false);
      }
    });

    this.connection.on('error', (err: Error) => {
      // Capture and ignore errors to prevent unhandled exceptions, wait for
      // onclose to fire before attempting a reconnect.
      this.eventEmitter.emit('error', err);
    });

    this.connection.on('data', (data: any) => {
      this.processReceivedData(data);
    });
  }

  private processReceivedData(message: any) {
    let opId: string;
    opId = message.id

    if (
      [ MessageTypes.GQL_DATA,
        MessageTypes.GQL_COMPLETE,
        MessageTypes.GQL_ERROR,
      ].indexOf(message.type) !== -1 && !this.operations[opId]
    ) {
      this.unsubscribe(opId);

      return;
    }

    switch (message.type) {
      case MessageTypes.GQL_CONNECTION_ERROR:
        if (this.connectionCallback) {
          this.connectionCallback(message.payload);
        }
        break;

      case MessageTypes.GQL_CONNECTION_ACK:
        this.eventEmitter.emit(this.reconnecting ? 'reconnected' : 'connected');
        this.reconnecting = false;
        this.backoff.reset();

        if (this.connectionCallback) {
          this.connectionCallback();
        }
        break;

      case MessageTypes.GQL_COMPLETE:
        this.operations[opId].handler(null, null);
        delete this.operations[opId];
        break;

      case MessageTypes.GQL_ERROR:
        this.operations[opId].handler(this.formatErrors(message.payload), null);
        delete this.operations[opId];
        break;

      case MessageTypes.GQL_DATA:
        const parsedPayload = !message.payload.errors ?
          message.payload : {...message.payload, errors: this.formatErrors(message.payload.errors)};
        this.operations[opId].handler(null, parsedPayload);
        break;

      case MessageTypes.GQL_CONNECTION_KEEP_ALIVE:
        const firstKA = typeof this.wasKeepAliveReceived === 'undefined';
        this.wasKeepAliveReceived = true;

        if (firstKA) {
          this.checkConnection();
        }

        if (this.checkConnectionIntervalId) {
          clearInterval(this.checkConnectionIntervalId);
          this.checkConnection();
        }
        this.checkConnectionIntervalId = setInterval(this.checkConnection.bind(this), this.timeout);
        break;

      default:
        throw new Error('Invalid message type!');
    }
  }

  private unsubscribe(opId: string) {
    if (this.operations[opId]) {
      delete this.operations[opId];
      this.setInactivityTimeout();
      this.sendMessage(opId, MessageTypes.GQL_STOP, undefined);
    }
  }
}
