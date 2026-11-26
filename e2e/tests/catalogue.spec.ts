import { test, expect, signedOut } from '../fixtures';
import { CategorySchema, ProductPageSchema, ProductSchema, SearchPageSchema } from '../../api/schemas';
import { CATALOGUE_DEFAULT_FILTERS, SortOption } from '../pages/homePage';

test.use(signedOut);

test.describe('Product catalogue', { tag: '@catalogue' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.productNames.first()).toBeVisible();
  });

  test('search shows the matching products', { tag: '@smoke' }, async ({ homePage, productsApi }) => {
    const { data } = SearchPageSchema.parse(await (await productsApi.search('hammer')).json());

    await homePage.search('hammer');

    await expect(homePage.searchCaption).toHaveText('Searched for: hammer');
    // A web-first assertion waits for the grid to re-render with the search results.
    await expect(homePage.productNames).toHaveText(data.map(p => p.name));
  });

  const sorts: { option: SortOption; sort: 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc' }[] = [
    { option: 'Name (A - Z)', sort: 'name,asc' },
    { option: 'Name (Z - A)', sort: 'name,desc' },
    { option: 'Price (Low - High)', sort: 'price,asc' },
    { option: 'Price (High - Low)', sort: 'price,desc' }
  ];

  for (const { option, sort } of sorts) {
    // The website should show the API's sorted results in the same order.
    // (The API tests separately check that the API sorts correctly.)
    test(`sort products by ${option}`, { tag: '@regression' }, async ({ homePage, productsApi }) => {
      const { data } = ProductPageSchema.parse(await (await productsApi.list({ ...CATALOGUE_DEFAULT_FILTERS, sort })).json());

      await homePage.sortBy(option);

      await expect(homePage.productNames).toHaveText(data.map(p => p.name));
    });
  }

  test('category filter shows the same products as the API', { tag: '@regression' }, async ({ homePage, productsApi }) => {
    const tree = CategorySchema.array().parse(await (await productsApi.categories()).json());
    const hammer = tree.flatMap(c => c.sub_categories ?? []).find(c => c.slug === 'hammer')!;
    const { data } = ProductPageSchema.parse(await (await productsApi.list({ ...CATALOGUE_DEFAULT_FILTERS, by_category: hammer.id })).json());

    await homePage.filterByCategory('Hammer');

    await expect(homePage.productNames).toHaveText(data.map(p => p.name));
  });

  test('product page shows the same details as the API', { tag: '@regression' }, async ({ homePage, productPage, productsApi }) => {
    // Pick a product the catalogue page is showing, using the same filters it applies,
    // rather than assuming the page and the API list products in the same order.
    const { data } = ProductPageSchema.parse(await (await productsApi.list(CATALOGUE_DEFAULT_FILTERS)).json());
    const product = ProductSchema.parse(await (await productsApi.get(data[data.length - 1].id)).json());

    await homePage.openProduct(product.name);

    await expect(productPage.name).toHaveText(product.name);
    await expect(productPage.unitPrice).toHaveText(product.price.toFixed(2));
    await expect(productPage.description).toHaveText(product.description);
  });
});
