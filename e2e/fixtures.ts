import AxeBuilder from '@axe-core/playwright';
import { test as apiTest, expect } from '../api/fixtures';
import { Product, ProductPageSchema } from '../api/schemas';
import { HomePage } from './pages/homePage';
import { ProductPage } from './pages/productPage';
import { LoginPage } from './pages/loginPage';
import { RegisterPage } from './pages/registerPage';
import { CheckoutPage } from './pages/checkoutPage';

/** Rules checked by the accessibility scans: WCAG 2.0–2.2 levels A and AA, plus axe best practices. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

export interface CartItem {
  product: Product;
  quantity: number;
}

interface UiFixtures {
  homePage: HomePage;
  productPage: ProductPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  checkoutPage: CheckoutPage;
  makeAxeBuilder: () => AxeBuilder;
  seedCart: (items: CartItem[]) => Promise<string>;
  inStockProducts: Product[];
}

/**
 * UI fixtures build on the API fixtures, so every UI test can also call the API:
 * to set up state quickly (accounts, baskets) and to check results on the server.
 */
export const test = apiTest.extend<UiFixtures>({
  // Tests start signed in: the customer logs in through the API and the token is put
  // into the browser's local storage, which is where the site keeps it. This skips the
  // login form, which has its own dedicated tests. Opt out with `test.use(signedOut)`.
  storageState: async ({ customerToken, baseURL }, use) => {
    await use({
      cookies: [],
      origins: [{ origin: new URL(baseURL!).origin, localStorage: [{ name: 'auth-token', value: customerToken }] }]
    });
  },

  // Creates a cart through the API and points the browser at it, the same way the site
  // does when you add to cart, so tests can start from a full basket in one step.
  seedCart: async ({ page, cartsApi }, use) => {
    await use(async items => {
      const cartId = (await (await cartsApi.create()).json()).id;
      for (const { product, quantity } of items) {
        expect((await cartsApi.addItem(cartId, product.id, quantity)).status()).toBe(200);
      }
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      await page.addInitScript(([id, quantity]) => {
        sessionStorage.setItem('cart_id', id);
        sessionStorage.setItem('cart_quantity', quantity);
      }, [cartId, String(totalQuantity)]);
      return cartId;
    });
  },

  // Real, in-stock products from the API, so tests don't hard-code a catalogue that can change.
  inStockProducts: async ({ productsApi }, use) => {
    const { data } = ProductPageSchema.parse(await (await productsApi.list()).json());
    await use(data.filter(product => product.in_stock));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(AXE_TAGS));
  }
});

/** Use with `test.use(signedOut)` for tests that must start without a session. */
export const signedOut = { storageState: { cookies: [], origins: [] } };

export { expect };
