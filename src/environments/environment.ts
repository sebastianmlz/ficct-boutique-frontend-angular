// Browser-side URLs. The browser runs on the host and hits the published
// host ports of the meta-compose stack:
//   Go core:       8093 -> 8080 (graphql)
//   Express docs:  8091 -> 8081
//   Django AI:     8092 -> 8000
export const environment = {
  production: false,
  graphqlUrl: 'http://localhost:8093/graphql',
  documentsApiUrl: 'http://localhost:8091/api/v1',
  aiApiUrl: 'http://localhost:8092/api/v1',
};
