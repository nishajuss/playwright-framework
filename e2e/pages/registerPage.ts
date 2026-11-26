import { Locator, Page } from '@playwright/test';
import { NewCustomer } from '../../api/testData';

export class RegisterPage {
  readonly submitButton: Locator;

  constructor (private readonly page: Page) {
    this.submitButton = page.getByTestId('register-submit');
  }

  async goto (): Promise<void> {
    await this.page.goto('/auth/register');
  }

  async register (customer: NewCustomer): Promise<void> {
    const field = (testId: string): Locator => this.page.getByTestId(testId);
    const { address } = customer;

    await field('first-name').fill(customer.first_name);
    await field('last-name').fill(customer.last_name);
    await field('dob').fill(customer.dob);
    await field('country').selectOption(address.country);
    await field('postal_code').fill(address.postal_code);
    await field('house_number').fill(address.house_number);
    await field('street').fill(address.street);
    await field('city').fill(address.city);
    await field('state').fill(address.state);
    await field('phone').fill(customer.phone);
    await field('email').fill(customer.email);
    await field('password').fill(customer.password);
    await this.submitButton.click();
  }
}
