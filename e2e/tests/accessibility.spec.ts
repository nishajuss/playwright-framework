import { Page } from '@playwright/test';
import { test, expect, signedOut } from '../fixtures';
import { ProductPage } from '../pages/productPage';

/**
 * Accessibility baseline.
 *
 * The site under test is third party and already has accessibility issues we can't fix.
 * Rather than switching rules off for the whole site, each page lists the issues it is
 * known to have. A scan fails if a page gains any NEW type of issue; known issues are
 * attached to the report on every run so they stay visible.
 */

/** Issues present on every page, from the shared header and layout. */
const SITE_WIDE = [
  'label-content-name-mismatch', // WCAG 2.5.3: cart link's aria-label "cart" doesn't include its visible text
  'landmark-one-main', // No <main> landmark
  'region' // Content outside landmark regions
];

interface PageUnderTest {
  name: string;
  open: (page: Page, productPage: ProductPage, productId: string) => Promise<unknown>;
  ready: string;
  knownIssues: string[];
}

const pages: PageUnderTest[] = [
  {
    name: 'home',
    open: page => page.goto('/'),
    ready: 'product-name',
    knownIssues: [
      'heading-order', // Product names are <h5> after an <h4>
      'landmark-unique', // Two <nav> landmarks with no distinguishing labels
      'list', // WCAG 1.3.1: <ul> with non-<li> children in the filters
      'page-has-heading-one' // Only in the v2.5 Docker image used in CI; the live site has an <h1>
    ]
  },
  {
    name: 'product',
    open: (_, productPage, productId) => productPage.goto(productId),
    ready: 'add-to-cart',
    knownIssues: [
      'heading-order', // "Specifications" is an <h3> after the <h1>
      'target-size' // WCAG 2.5.8: small "More information" links
    ]
  },
  {
    name: 'login',
    open: page => page.goto('/auth/login'),
    ready: 'login-submit',
    knownIssues: [
      'button-name', // WCAG 4.1.2: "show password" button has no accessible name
      'page-has-heading-one'
    ]
  },
  {
    name: 'register',
    open: page => page.goto('/auth/register'),
    ready: 'register-submit',
    knownIssues: [
      'button-name', // WCAG 4.1.2: "show password" button has no accessible name
      'list', // WCAG 1.3.1: password rules list contains non-<li> children
      'page-has-heading-one'
    ]
  },
  {
    name: 'contact',
    open: page => page.goto('/contact'),
    ready: 'contact-submit',
    knownIssues: ['page-has-heading-one']
  },
  {
    name: 'checkout basket',
    open: page => page.goto('/checkout'),
    ready: 'product-title',
    knownIssues: [
      'empty-table-header', // The remove-button column has an empty <th>
      'page-has-heading-one'
    ]
  }
];

test.describe('Accessibility', { tag: ['@a11y', '@regression'] }, () => {
  test.use(signedOut);

  for (const { name, open, ready, knownIssues } of pages) {
    test(`${name} page has no new accessibility issues`, async ({ page, productPage, makeAxeBuilder, seedCart, inStockProducts: [product] }, testInfo) => {
      await seedCart([{ product, quantity: 1 }]);
      await open(page, productPage, product.id);
      await expect(page.getByTestId(ready).first()).toBeVisible();

      const { violations } = await makeAxeBuilder().analyze();
      await testInfo.attach('accessibility-scan-results', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });

      const allowed = new Set([...SITE_WIDE, ...knownIssues]);
      const known = violations.filter(v => allowed.has(v.id));
      for (const v of known) {
        testInfo.annotations.push({ type: 'known accessibility issue', description: `${v.id} (${v.impact}): ${v.help}` });
      }

      const newIssues = violations
        .filter(v => !allowed.has(v.id))
        .map(v => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} element(s), e.g. ${v.nodes[0].target.join(' ')}]`);
      expect(newIssues, 'accessibility issues not in this page\'s known-issue list').toEqual([]);
    });
  }

  test('customer can log in with the keyboard only', async ({ page, loginPage, homePage, customer }) => {
    await loginPage.goto();

    await loginPage.emailInput.focus();
    await page.keyboard.type(customer.email);
    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();
    await page.keyboard.type(customer.password);
    await page.keyboard.press('Enter');

    await expect(homePage.header.accountMenu).toHaveText(`${customer.first_name} ${customer.last_name}`);
  });
});
