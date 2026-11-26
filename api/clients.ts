import { APIRequestContext, APIResponse } from '@playwright/test';
import { NewCustomer } from './testData';

/**
 * Thin clients for each area of the Practice Software Testing API, the API-testing
 * equivalent of page objects. They return the raw APIResponse so tests can assert on
 * status codes as well as parse the body against a schema. The UI tests reuse them
 * to set up data (accounts, baskets) and to verify results (orders) on the server.
 */

const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

export class AuthClient {
  constructor (private readonly request: APIRequestContext) {}

  register (customer: Partial<NewCustomer>): Promise<APIResponse> {
    return this.request.post('/users/register', { data: customer });
  }

  login (email: string, password: string): Promise<APIResponse> {
    return this.request.post('/users/login', { data: { email, password } });
  }

  me (token?: string): Promise<APIResponse> {
    return this.request.get('/users/me', { headers: token ? bearer(token) : {} });
  }
}

export interface ProductQuery {
  page?: number;
  sort?: 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';
  by_brand?: string;
  by_category?: string;
  between?: string;
  is_rental?: boolean;
}

export class ProductsClient {
  constructor (private readonly request: APIRequestContext) {}

  list (query: ProductQuery = {}): Promise<APIResponse> {
    return this.request.get('/products', { params: { ...query } });
  }

  get (id: string): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  search (term: string): Promise<APIResponse> {
    return this.request.get('/products/search', { params: { q: term } });
  }

  brands (): Promise<APIResponse> {
    return this.request.get('/brands');
  }

  categories (): Promise<APIResponse> {
    return this.request.get('/categories/tree');
  }
}

export class CartsClient {
  constructor (private readonly request: APIRequestContext) {}

  create (): Promise<APIResponse> {
    return this.request.post('/carts');
  }

  get (cartId: string): Promise<APIResponse> {
    return this.request.get(`/carts/${cartId}`);
  }

  addItem (cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.request.post(`/carts/${cartId}`, { data: { product_id: productId, quantity } });
  }

  updateQuantity (cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.request.put(`/carts/${cartId}/product/quantity`, { data: { product_id: productId, quantity } });
  }

  removeItem (cartId: string, productId: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${cartId}/product/${productId}`);
  }

  delete (cartId: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${cartId}`);
  }
}

export class InvoicesClient {
  constructor (private readonly request: APIRequestContext) {}

  list (token: string): Promise<APIResponse> {
    return this.request.get('/invoices', { headers: bearer(token) });
  }
}
