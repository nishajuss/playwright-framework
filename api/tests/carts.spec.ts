import { test as base, expect } from '../fixtures';
import { CartSchema, MessageSchema, Product, ProductPageSchema } from '../schemas';

// Every cart test starts with a new, empty cart and two in-stock products to put in it.
const test = base.extend<{ cartId: string; products: [Product, Product] }>({
  cartId: async ({ cartsApi }, use) => {
    const response = await cartsApi.create();
    expect(response.status()).toBe(201);
    await use((await response.json()).id);
  },
  products: async ({ productsApi }, use) => {
    const { data } = ProductPageSchema.parse(await (await productsApi.list()).json());
    const inStock = data.filter(p => p.in_stock);
    await use([inStock[0], inStock[1]]);
  }
});

test.describe('Carts API', { tag: ['@api', '@carts'] }, () => {
  test('add products to a cart', { tag: '@smoke' }, async ({ cartsApi, cartId, products: [first, second] }) => {
    expect((await cartsApi.addItem(cartId, first.id, 2)).status()).toBe(200);
    expect((await cartsApi.addItem(cartId, second.id, 1)).status()).toBe(200);

    const cart = CartSchema.parse(await (await cartsApi.get(cartId)).json());

    expect(cart.cart_items.map(({ product_id, quantity }) => ({ product_id, quantity }))).toEqual([
      { product_id: first.id, quantity: 2 },
      { product_id: second.id, quantity: 1 }
    ]);
    expect(cart.cart_items[0].product).toMatchObject({ name: first.name, price: first.price });
  });

  test('change the quantity of a product', { tag: '@regression' }, async ({ cartsApi, cartId, products: [product] }) => {
    await cartsApi.addItem(cartId, product.id, 1);

    expect((await cartsApi.updateQuantity(cartId, product.id, 5)).status()).toBe(200);

    const cart = CartSchema.parse(await (await cartsApi.get(cartId)).json());
    expect(cart.cart_items).toEqual([expect.objectContaining({ product_id: product.id, quantity: 5 })]);
  });

  test('remove a product from a cart', { tag: '@regression' }, async ({ cartsApi, cartId, products: [first, second] }) => {
    await cartsApi.addItem(cartId, first.id, 1);
    await cartsApi.addItem(cartId, second.id, 1);

    expect((await cartsApi.removeItem(cartId, first.id)).status()).toBe(204);

    const cart = CartSchema.parse(await (await cartsApi.get(cartId)).json());
    expect(cart.cart_items.map(item => item.product_id)).toEqual([second.id]);
  });

  const invalidItems = [
    { reason: 'a quantity of zero', productId: (p: Product) => p.id, quantity: 0, field: 'quantity', error: 'The quantity field must be at least 1.' },
    { reason: 'an unknown product', productId: () => 'unknown-product', quantity: 1, field: 'product_id', error: 'The selected product id is invalid.' }
  ];

  for (const { reason, productId, quantity, field, error } of invalidItems) {
    test(`adding an item is rejected with ${reason}`, { tag: '@regression' }, async ({ cartsApi, cartId, products: [product] }) => {
      const response = await cartsApi.addItem(cartId, productId(product), quantity);

      expect(response.status()).toBe(422);
      expect((await response.json()).errors[field]).toEqual([error]);
    });
  }

  test('a deleted cart can no longer be found', { tag: '@regression' }, async ({ cartsApi, cartId }) => {
    expect((await cartsApi.delete(cartId)).status()).toBe(204);

    const response = await cartsApi.get(cartId);

    expect(response.status()).toBe(404);
    expect(MessageSchema.parse(await response.json()).message).toBe('Requested item not found');
  });
});
