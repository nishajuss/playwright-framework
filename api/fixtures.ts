import { test as base, expect, APIRequestContext } from '@playwright/test';
import { AuthClient, CartsClient, InvoicesClient, ProductsClient } from './clients';
import { LoginResponseSchema } from './schemas';
import { newCustomer, NewCustomer } from './testData';

export const API_BASE_URL = process.env.API_BASE_URL || 'https://api.practicesoftwaretesting.com';

interface ApiFixtures {
  apiRequest: APIRequestContext;
  authApi: AuthClient;
  productsApi: ProductsClient;
  cartsApi: CartsClient;
  invoicesApi: InvoicesClient;
  customerToken: string;
}

interface WorkerFixtures {
  customer: NewCustomer;
}

/**
 * Shared fixtures for API and UI tests.
 * - `customer` registers one fresh account per worker, so parallel workers never share data.
 * - `customerToken` logs that customer in for each test. Tokens only last five minutes,
 *   and an API login takes milliseconds, so a fresh token per test avoids expiry mid-run.
 */
export const test = base.extend<ApiFixtures, WorkerFixtures>({
  customer: [async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: API_BASE_URL });
    const customer = newCustomer();
    const response = await new AuthClient(request).register(customer);
    expect(response.status(), `register test customer: ${await response.text()}`).toBe(201);
    await request.dispose();
    await use(customer);
  }, { scope: 'worker' }],

  // A dedicated API context, so UI tests (whose baseURL is the website) can call the API too.
  apiRequest: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Accept: 'application/json' }
    });
    await use(request);
    await request.dispose();
  },

  authApi: async ({ apiRequest }, use) => {
    await use(new AuthClient(apiRequest));
  },
  productsApi: async ({ apiRequest }, use) => {
    await use(new ProductsClient(apiRequest));
  },
  cartsApi: async ({ apiRequest }, use) => {
    await use(new CartsClient(apiRequest));
  },
  invoicesApi: async ({ apiRequest }, use) => {
    await use(new InvoicesClient(apiRequest));
  },

  customerToken: async ({ authApi, customer }, use) => {
    const response = await authApi.login(customer.email, customer.password);
    expect(response.status(), 'log in test customer').toBe(200);
    await use(LoginResponseSchema.parse(await response.json()).access_token);
  }
});

export { expect };
