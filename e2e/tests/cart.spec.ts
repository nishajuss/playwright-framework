import { test, expect, signedOut } from '../fixtures';
import { CartSchema } from '../../api/schemas';

const money = (amount: number): string => `$${amount.toFixed(2)}`;

// A basket doesn't need an account, so these tests run as a guest.
test.use(signedOut);

test.describe('Shopping cart', { tag: '@cart' }, () => {
  test('add a product with a quantity from its product page', { tag: '@smoke' }, async ({ productPage, checkoutPage, inStockProducts: [product] }) => {
    await productPage.goto(product.id);

    await productPage.addToCart(3);

    await expect(productPage.header.cartQuantity).toHaveText('3');
    await checkoutPage.goto();
    await expect(checkoutPage.itemNames).toHaveText([product.name]);
    await expect(checkoutPage.itemQuantities).toHaveValue('3');
    await expect(checkoutPage.linePrices).toHaveText([money(product.price * 3)]);
  });

  test('a basket created through the API appears on the website', { tag: '@regression' }, async ({ checkoutPage, seedCart, inStockProducts: [first, second] }) => {
    await seedCart([{ product: first, quantity: 2 }, { product: second, quantity: 1 }]);

    await checkoutPage.goto();

    await expect(checkoutPage.itemNames).toHaveText([first.name, second.name]);
    await expect(checkoutPage.cartTotal).toHaveText(money(first.price * 2 + second.price));
    await expect(checkoutPage.header.cartQuantity).toHaveText('3');
  });

  test('changing a quantity updates the totals and is saved on the server', { tag: '@regression' }, async ({ checkoutPage, cartsApi, seedCart, inStockProducts: [first, second] }) => {
    const cartId = await seedCart([{ product: first, quantity: 1 }, { product: second, quantity: 1 }]);
    await checkoutPage.goto();

    await checkoutPage.setQuantity(first.name, 4);

    await expect(checkoutPage.cartRow(first.name).getByTestId('line-price')).toHaveText(money(first.price * 4));
    await expect(checkoutPage.cartTotal).toHaveText(money(first.price * 4 + second.price));
    await expect.poll(async () => {
      const cart = CartSchema.parse(await (await cartsApi.get(cartId)).json());
      return cart.cart_items.find(item => item.product_id === first.id)?.quantity;
    }, { message: 'quantity saved on the server' }).toBe(4);
  });

  test('remove a product from the basket', { tag: '@regression' }, async ({ checkoutPage, seedCart, inStockProducts: [first, second] }) => {
    await seedCart([{ product: first, quantity: 1 }, { product: second, quantity: 1 }]);
    await checkoutPage.goto();

    await checkoutPage.removeItem(first.name);

    await expect(checkoutPage.itemNames).toHaveText([second.name]);
    await expect(checkoutPage.cartTotal).toHaveText(money(second.price));
  });
});
