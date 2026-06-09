export const environment = {
  production: true,
  // Go core (Railway) GraphQL
  graphqlUrl: 'https://ficct-boutique-backend-go-production.up.railway.app/graphql',
  // MS3 documents (AWS API Gateway custom domain)
  documentsApiUrl: 'https://docs-api-boutique.ficct.com/api/v1',
  // MS2 AI (GCP Cloud Run). Currently private (org policy blocks public allUsers);
  // browser calls need the org-policy exception or an authenticated gateway.
  aiApiUrl: 'https://ficct-ai-1093089304525.us-central1.run.app/api/v1',
};
