import { test, expect, signedOut } from '../fixtures';
import { newCustomer } from '../../api/testData';

test.describe('Authentication', { tag: '@auth' }, () => {
  test.describe('signed out', () => {
    test.use(signedOut);

    test('customer can log in', { tag: '@smoke' }, async ({ page, loginPage, homePage, customer }) => {
      await loginPage.goto();

      await loginPage.login(customer.email, customer.password);

      await expect(page).toHaveURL(/\/account$/);
      await expect(homePage.header.accountMenu).toHaveText(`${customer.first_name} ${customer.last_name}`);
    });

    test('login is rejected with a wrong password', { tag: '@regression' }, async ({ page, loginPage, customer }) => {
      await loginPage.goto();

      await loginPage.login(customer.email, 'Wrong-Password-1!');

      await expect(loginPage.errorMessage).toHaveText('Invalid email or password');
      await expect(page).toHaveURL(/\/auth\/login$/);
    });

    test('new customer can register on the website, then log in through the API', { tag: '@regression' }, async ({ page, registerPage, authApi }) => {
      const customer = newCustomer();
      await registerPage.goto();

      await registerPage.register(customer);

      await expect(page).toHaveURL(/\/auth\/login$/);
      // Prove the account really exists on the server, not just that the form redirected.
      expect((await authApi.login(customer.email, customer.password)).status()).toBe(200);
    });
  });

  test('signed-in customer can sign out', { tag: '@regression' }, async ({ page, homePage }) => {
    await page.goto('/account');
    await expect(homePage.header.accountMenu).toBeVisible();

    await homePage.header.signOut();

    await expect(homePage.header.signInLink).toBeVisible();
  });
});
