import { Locator, Page } from '@playwright/test';
import { Header } from './components/header';

export class ProductPage {
  readonly header: Header;
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly description: Locator;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;

  constructor (private readonly page: Page) {
    this.header = new Header(page);
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.description = page.getByTestId('product-description');
    this.quantityInput = page.getByTestId('quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
  }

  async goto (productId: string): Promise<void> {
    await this.page.goto(`/product/${productId}`);
  }

  async addToCart (quantity = 1): Promise<void> {
    await this.quantityInput.fill(String(quantity));
    await this.addToCartButton.click();
  }
}
