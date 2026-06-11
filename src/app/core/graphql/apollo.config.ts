import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { provideApollo as ngProvideApollo } from 'apollo-angular';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/**
 * Builds the Apollo client options: an auth link that injects the bearer token
 * from AuthService into every operation, concatenated with the GraphQL HTTP
 * link, an in-memory cache and network-first default fetch/error policies.
 */
function createApollo(httpLink: HttpLink, auth: AuthService): ApolloClientOptions<unknown> {
  const http = httpLink.create({ uri: environment.graphqlUrl });
  const authLink = setContext((_op, { headers }) => {
    const token = auth.token();
    return {
      headers: {
        ...(headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });
  return {
    link: authLink.concat(http),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network', errorPolicy: 'all' },
      query: { fetchPolicy: 'network-only', errorPolicy: 'all' },
      mutate: { errorPolicy: 'all' },
    },
  };
}

/**
 * DI provider that wires the configured Apollo client into the app, injecting
 * HttpLink and AuthService into {@link createApollo}.
 */
export function provideApollo() {
  return ngProvideApollo(() => createApollo(inject(HttpLink), inject(AuthService)));
}
