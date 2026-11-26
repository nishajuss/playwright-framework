import { test, expect } from '../fixtures';
import { InvoicePageSchema } from '../../api/schemas';

test.describe('Checkout', { tag: '@checkout' }, () => {
  test('signed-in customer places an order, and the invoice is created on the server', { tag: '@smoke' }, async ({ checkoutPage, seedCart, invoicesApi, customerToken, inStockProducts: [first, second] }) => {
    await seedCart([{ product: first, quantity: 2 }, { product: second, quantity: 1 }]);
    const expectedTotal = first.price * 2 + second.price;
    await checkoutPage.goto();

    await test.step('complete the checkout steps', async () => {
      await checkoutPage.proceedToPayment();
      await checkoutPage.pay('cash-on-delivery');
    });

    const invoiceNumber = await test.step('website confirms the order', async () => {
      // Placing the order is a server round trip, so allow longer than the default timeout.
      await expect(checkoutPage.orderConfirmation).toBeVisible({ timeout: 15_000 });
      return checkoutPage.invoiceNumber();
    });

    await test.step('API has a matching invoice', async () => {
      const { data } = InvoicePageSchema.parse(await (await invoicesApi.list(customerToken)).json());
      const invoice = data.find(i => i.invoice_number === invoiceNumber);

      expect(invoice, `invoice ${invoiceNumber} exists`).toBeDefined();
      expect(invoice!.payment.payment_method).toBe('cash-on-delivery');
      expect(invoice!.total).toBeCloseTo(expectedTotal, 2);
      expect(invoice!.invoicelines.map(({ product_id, quantity }) => ({ product_id, quantity }))).toEqual(expect.arrayContaining([
        { product_id: first.id, quantity: 2 },
        { product_id: second.id, quantity: 1 }
      ]));
    });
  });

  test.describe('billing address step', () => {
    test.beforeEach(async ({ checkoutPage, seedCart, inStockProducts: [product] }) => {
      await seedCart([{ product, quantity: 1 }]);
      await checkoutPage.goto();
      await checkoutPage.proceedFromCart.click();
    });

    test('a state is required to continue', { tag: '@regression' }, async ({ checkoutPage }) => {
      await checkoutPage.openAddressStep();

      await checkoutPage.stateInput.clear();
      await expect(checkoutPage.proceedFromAddress).toBeDisabled();

      await checkoutPage.stateInput.fill('New York');
      await expect(checkoutPage.proceedFromAddress).toBeEnabled();
    });

    // KNOWN BUG: if the server rejects an order (here simulated by intercepting the
    // request and returning a validation error), the page silently stays on "Confirm"
    // with no message, so the customer doesn't know their order failed.
    test('a rejected order shows the customer an error', { tag: ['@regression', '@known-bug'] }, async ({ page, checkoutPage }) => {
      test.fail(true, 'Site bug: a rejected order shows no error message');
      await checkoutPage.openAddressStep();
      await page.route('**/invoices', route => route.request().method() === 'POST'
        ? route.fulfill({ status: 422, json: { billing_state: ['The billing state field must be a string.'] } })
        : route.continue());

      await checkoutPage.proceedFromAddress.click();
      await checkoutPage.pay('cash-on-delivery');

      await expect(page.getByRole('alert').filter({ hasText: /order|error|failed|could not/i })).toBeVisible();
    });
  });
});
