import { Locator, Page } from '@playwright/test';

/** Navigation bar shown on every page. */
export class Header {
  readonly signInLink: Locator;
  readonly accountMenu: Locator;
  readonly signOutLink: Locator;
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;

  constructor (page: Page) {
    this.signInLink = page.getByTestId('nav-sign-in');
    this.accountMenu = page.getByTestId('nav-menu');
    this.signOutLink = page.getByTestId('nav-sign-out');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
  }

  async signOut (): Promise<void> {
    await this.accountMenu.click();
    await this.signOutLink.click();
  }
}
