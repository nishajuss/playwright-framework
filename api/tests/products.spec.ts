import { test, expect } from '../fixtures';
import { BrandSchema, CategorySchema, MessageSchema, ProductPageSchema, ProductSchema, SearchPageSchema } from '../schemas';

test.describe('Products API', { tag: ['@api', '@products'] }, () => {
  test('list products with pagination', { tag: '@smoke' }, async ({ productsApi }) => {
    const firstPage = ProductPageSchema.parse(await (await productsApi.list()).json());
    const secondPage = ProductPageSchema.parse(await (await productsApi.list({ page: 2 })).json());

    expect(firstPage.data).toHaveLength(firstPage.per_page);
    expect(firstPage.last_page).toBe(Math.ceil(firstPage.total / firstPage.per_page));
    expect(secondPage).toMatchObject({ current_page: 2, total: firstPage.total });
    // No product should appear on both pages.
    const firstIds = new Set(firstPage.data.map(p => p.id));
    expect(secondPage.data.filter(p => firstIds.has(p.id))).toEqual([]);
  });

  test('get a single product', { tag: '@smoke' }, async ({ productsApi }) => {
    const [listed] = ProductPageSchema.parse(await (await productsApi.list()).json()).data;

    const response = await productsApi.get(listed.id);

    expect(response.status()).toBe(200);
    expect(ProductSchema.parse(await response.json())).toMatchObject({ id: listed.id, name: listed.name, price: listed.price });
  });

  test('an unknown product returns 404', { tag: '@regression' }, async ({ productsApi }) => {
    const response = await productsApi.get('01AAAAAAAAAAAAAAAAAAAAAAAA');

    expect(response.status()).toBe(404);
    expect(MessageSchema.parse(await response.json()).message).toBe('Requested item not found');
  });

  test('search only returns matching products', { tag: '@regression' }, async ({ productsApi }) => {
    const { data, total } = SearchPageSchema.parse(await (await productsApi.search('hammer')).json());

    expect(total).toBeGreaterThan(0);
    for (const { name } of data) {
      expect(name.toLowerCase()).toContain('hammer');
    }
  });

  const sorts = [
    { sort: 'price,asc', direction: 1 },
    { sort: 'price,desc', direction: -1 }
  ] as const;

  for (const { sort, direction } of sorts) {
    test(`sort products by ${sort}`, { tag: '@regression' }, async ({ productsApi }) => {
      const prices = ProductPageSchema.parse(await (await productsApi.list({ sort })).json()).data.map(p => p.price);

      expect(prices).toEqual([...prices].sort((a, b) => direction * (a - b)));
    });
  }

  test('filter products by price range', { tag: '@regression' }, async ({ productsApi }) => {
    const { data } = ProductPageSchema.parse(await (await productsApi.list({ between: 'price,10,20' })).json());

    expect(data.length).toBeGreaterThan(0);
    for (const { name, price } of data) {
      expect(price, name).toBeGreaterThanOrEqual(10);
      expect(price, name).toBeLessThanOrEqual(20);
    }
  });

  test('filter products by brand', { tag: '@regression' }, async ({ productsApi }) => {
    const [brand] = BrandSchema.array().parse(await (await productsApi.brands()).json());

    const { data } = ProductPageSchema.parse(await (await productsApi.list({ by_brand: brand.id })).json());

    expect(data.length).toBeGreaterThan(0);
    expect(new Set(data.map(p => p.brand.name))).toEqual(new Set([brand.name]));
  });

  test('filter products by category', { tag: '@regression' }, async ({ productsApi }) => {
    const tree = CategorySchema.array().parse(await (await productsApi.categories()).json());
    const hammers = tree.flatMap(c => c.sub_categories ?? []).find(c => c.slug === 'hammer');
    expect(hammers, 'the "hammer" category exists').toBeDefined();

    const { data } = ProductPageSchema.parse(await (await productsApi.list({ by_category: hammers!.id })).json());

    expect(data.length).toBeGreaterThan(0);
    expect(new Set(data.map(p => p.category.slug))).toEqual(new Set(['hammer']));
  });
});
