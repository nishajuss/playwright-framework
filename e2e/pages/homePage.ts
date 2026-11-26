import { Locator, Page } from '@playwright/test';
import { Header } from './components/header';

/**
 * The catalogue page doesn't show the whole catalogue: it hides rentals and only shows
 * products priced $1–$100 until the price slider is moved. API queries that should match
 * what the page displays need the same filters.
 */
export const CATALOGUE_DEFAULT_FILTERS = { between: 'price,1,100', is_rental: false };

export type SortOption = 'Name (A - Z)' | 'Name (Z - A)' | 'Price (High - Low)' | 'Price (Low - High)';

/** The product catalogue: search, sorting, category filters and the product grid. */
export class HomePage {
  readonly header: Header;
  readonly productNames: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchCaption: Locator;
  readonly sortSelect: Locator;

  constructor (private readonly page: Page) {
    this.header = new Header(page);
    this.productNames = page.getByTestId('product-name');
    this.searchInput = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchCaption = page.getByTestId('search-caption');
    this.sortSelect = page.getByTestId('sort');
  }

  async goto (): Promise<void> {
    await this.page.goto('/');
  }

  async search (term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  async sortBy (option: SortOption): Promise<void> {
    await this.sortSelect.selectOption({ label: option });
  }

  async filterByCategory (category: string): Promise<void> {
    await this.page.getByRole('checkbox', { name: category, exact: true }).check();
  }

  async openProduct (name: string): Promise<void> {
    await this.productNames.getByText(name, { exact: true }).click();
  }
}
