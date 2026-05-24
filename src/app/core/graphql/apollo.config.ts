import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { provideApollo as ngProvideApollo } from 'apollo-angular';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

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

export function provideApollo() {
  return ngProvideApollo(() => createApollo(inject(HttpLink), inject(AuthService)));
}
