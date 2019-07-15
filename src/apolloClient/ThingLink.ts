import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { Client, ClientOptions } from './client';

import connect from '../connection/connect'
import clientResolvers from '../clientResolvers'

export class ThingLink extends ApolloLink {
  private client: Client;
  public resolvers: any;

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

    this.resolvers = clientResolvers(this.client)
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.client.request(operation) as Observable<
      FetchResult
    >;
  }
}
