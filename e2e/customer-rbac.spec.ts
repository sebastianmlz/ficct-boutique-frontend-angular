import { test, expect, request } from '@playwright/test';

const ADMIN_API = 'http://localhost:8093/graphql';

async function loginGetToken(role: 'admin' | 'customer' | 'staff'): Promise<string> {
  const creds = {
    admin: {
      email: process.env['E2E_ADMIN_EMAIL'] ?? '',
      password: process.env['E2E_ADMIN_PASSWORD'] ?? '',
    },
    staff: {
      email: process.env['E2E_STAFF_EMAIL'] ?? '',
      password: process.env['E2E_STAFF_PASSWORD'] ?? '',
    },
    customer: {
      email: process.env['E2E_CUSTOMER_EMAIL'] ?? '',
      password: process.env['E2E_CUSTOMER_PASSWORD'] ?? '',
    },
  }[role];
  const ctx = await request.newContext();
  const res = await ctx.post(ADMIN_API, {
    headers: { 'content-type': 'application/json' },
    data: {
      query: `mutation($e:String!,$p:String!){ login(input:{email:$e,password:$p}){ accessToken } }`,
      variables: { e: creds.email, p: creds.password },
    },
  });
  const body = await res.json();
  return body.data.login.accessToken;
}

test.describe('RBAC enforcement', () => {
  test('customer cannot call deactivateProduct', async () => {
    const token = await loginGetToken('customer');
    const ctx = await request.newContext({ extraHTTPHeaders: { authorization: `Bearer ${token}` } });
    const list = await ctx.post(ADMIN_API, {
      headers: { 'content-type': 'application/json' },
      data: { query: '{ products(limit:1) { id } }' },
    });
    const productId = (await list.json()).data.products[0].id;
    const res = await ctx.post(ADMIN_API, {
      headers: { 'content-type': 'application/json' },
      data: {
        query: 'mutation($id:UUID!){ deactivateProduct(id:$id){ id } }',
        variables: { id: productId },
      },
    });
    const body = await res.json();
    expect(body.errors[0].message).toBe('forbidden');
  });

  test('staff cannot call deactivateProduct', async () => {
    const token = await loginGetToken('staff');
    const ctx = await request.newContext({ extraHTTPHeaders: { authorization: `Bearer ${token}` } });
    const list = await ctx.post(ADMIN_API, {
      headers: { 'content-type': 'application/json' },
      data: { query: '{ products(limit:1) { id } }' },
    });
    const productId = (await list.json()).data.products[0].id;
    const res = await ctx.post(ADMIN_API, {
      headers: { 'content-type': 'application/json' },
      data: {
        query: 'mutation($id:UUID!){ deactivateProduct(id:$id){ id } }',
        variables: { id: productId },
      },
    });
    const body = await res.json();
    expect(body.errors[0].message).toBe('forbidden');
  });

  test('customer products query is active-only even with includeInactive=true', async () => {
    const token = await loginGetToken('customer');
    const ctx = await request.newContext({ extraHTTPHeaders: { authorization: `Bearer ${token}` } });
    const res = await ctx.post(ADMIN_API, {
      headers: { 'content-type': 'application/json' },
      data: { query: '{ products(includeInactive: true, limit: 100) { sku isActive } }' },
    });
    const body = await res.json();
    for (const p of body.data.products) {
      expect(p.isActive).toBe(true);
    }
  });
});
