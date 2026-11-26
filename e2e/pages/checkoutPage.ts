import { expect, Locator, Page, Request } from '@playwright/test';
import { Header } from './components/header';

export type PaymentMethod = 'bank-transfer' | 'cash-on-delivery' | 'credit-card' | 'buy-now-pay-later' | 'gift-card';

/**
 * The checkout wizard: 1. cart, 2. sign in, 3. billing address, 4. payment.
 */
export class CheckoutPage {
  readonly header: Header;
  // Step 1: cart
  readonly itemNames: Locator;
  readonly itemQuantities: Locator;
  readonly linePrices: Locator;
  readonly cartTotal: Locator;
  readonly proceedFromCart: Locator;
  // Step 2: sign in
  readonly proceedFromSignIn: Locator;
  // Step 3: billing address
  readonly postalCodeInput: Locator;
  readonly stateInput: Locator;
  readonly proceedFromAddress: Locator;
  // Step 4: payment
  readonly paymentMethod: Locator;
  readonly confirmButton: Locator;
  readonly paymentSuccess: Locator;
  readonly orderConfirmation: Locator;

  private readonly lookups = { inFlight: 0, lastActivity: Date.now(), tracking: false };

  constructor (private readonly page: Page) {
    this.header = new Header(page);
    this.itemNames = page.getByTestId('product-title');
    this.itemQuantities = page.getByTestId('product-quantity');
    this.linePrices = page.getByTestId('line-price');
    this.cartTotal = page.getByTestId('cart-total');
    this.proceedFromCart = page.getByTestId('proceed-1');
    this.proceedFromSignIn = page.getByTestId('proceed-2');
    this.postalCodeInput = page.getByTestId('postal_code');
    this.stateInput = page.getByTestId('state');
    this.proceedFromAddress = page.getByTestId('proceed-3');
    this.paymentMethod = page.getByTestId('payment-method');
    this.confirmButton = page.getByTestId('finish');
    this.paymentSuccess = page.getByTestId('payment-success-message');
    this.orderConfirmation = page.getByText(/Thanks for your order! Your invoice number is/);
  }

  async goto (): Promise<void> {
    this.trackPostcodeLookups();
    await this.page.goto('/checkout');
  }

  /** Counts postcode lookup requests from page load onwards; see openAddressStep. */
  private trackPostcodeLookups (): void {
    if (this.lookups.tracking) {
      return;
    }
    this.lookups.tracking = true;
    const isLookup = (request: Request): boolean => request.url().includes('/postcode-lookup');
    this.page.on('request', request => {
      if (isLookup(request)) {
        this.lookups.inFlight++;
        this.lookups.lastActivity = Date.now();
      }
    });
    const done = (request: Request): void => {
      if (isLookup(request)) {
        this.lookups.inFlight--;
        this.lookups.lastActivity = Date.now();
      }
    };
    this.page.on('requestfinished', done);
    this.page.on('requestfailed', done);
  }

  cartRow (productName: string): Locator {
    return this.page.getByRole('row').filter({ has: this.itemNames.getByText(productName, { exact: true }) });
  }

  async setQuantity (productName: string, quantity: number): Promise<void> {
    const input = this.cartRow(productName).getByTestId('product-quantity');
    await input.fill(String(quantity));
    await input.press('Tab');
  }

  async removeItem (productName: string): Promise<void> {
    // The remove button has no text, label or test id (an accessibility bug the scans
    // also report), so it can only be located by its styling class within the row.
    await this.cartRow(productName).locator('a.btn-danger').click();
  }

  /**
   * Moves from the sign-in step to the billing address step.
   *
   * When checkout opens, the site prefills the address from the customer's profile and
   * also runs a postcode lookup (often twice) that overwrites the address with made-up
   * values (a site bug, described in the README). This waits until the form is prefilled
   * and no lookup has been in progress for a short quiet period, so a late lookup can't
   * overwrite values the test enters.
   */
  async openAddressStep (): Promise<void> {
    await this.proceedFromSignIn.click();
    await expect(this.postalCodeInput).not.toHaveValue('');
    await expect.poll(() => this.lookups.inFlight === 0 && Date.now() - this.lookups.lastActivity > 1500, {
      message: 'postcode lookups have settled',
      intervals: [250],
      timeout: 15_000
    }).toBe(true);
  }

  /** Steps 1–3 for a signed-in customer, using the billing address from their profile. */
  async proceedToPayment (): Promise<void> {
    await this.proceedFromCart.click();
    await this.openAddressStep();
    await this.proceedFromAddress.click();
  }

  /** Checks the payment, then confirms the order once the button switches to "Confirm". */
  async pay (method: PaymentMethod): Promise<void> {
    await this.paymentMethod.selectOption(method);
    await this.confirmButton.click();
    await expect(this.paymentSuccess).toHaveText('Payment was successful');
    await expect(this.confirmButton).toHaveText('Confirm');
    await this.confirmButton.click();
  }

  async invoiceNumber (): Promise<string> {
    const text = await this.orderConfirmation.innerText();
    const match = text.match(/INV-\d+/);
    if (!match) {
      throw new Error(`No invoice number in confirmation: "${text}"`);
    }
    return match[0];
  }
}
