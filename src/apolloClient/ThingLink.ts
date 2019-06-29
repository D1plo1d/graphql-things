import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { Client, ClientOptions } from './client';

import connect from '../connection/connect'

export class ThingLink extends ApolloLink {
  private client: Client;

  constructor({
    createConnection,
    options,
  }: {
    createConnection: Function,
    options?: ClientOptions,
  }) {
    super();

    this.client = new Client(
      createConnection,
      options,
    )
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.client.request(operation) as Observable<
      FetchResult
    >;
  }
}
