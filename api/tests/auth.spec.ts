import { test, expect } from '../fixtures';
import { CustomerSchema, FieldErrorsSchema, LoginResponseSchema, MessageSchema } from '../schemas';
import { newCustomer } from '../testData';

test.describe('Auth API', { tag: ['@api', '@auth'] }, () => {
  test('register a new customer', { tag: '@smoke' }, async ({ authApi }) => {
    const customer = newCustomer();

    const response = await authApi.register(customer);

    expect(response.status()).toBe(201);
    const body = CustomerSchema.parse(await response.json());
    expect(body).toMatchObject({ email: customer.email, first_name: customer.first_name, last_name: customer.last_name });
    expect(body).not.toHaveProperty('password');
  });

  test('registration reports every missing required field', { tag: '@regression' }, async ({ authApi }) => {
    const response = await authApi.register({ email: newCustomer().email });

    expect(response.status()).toBe(422);
    const errors = FieldErrorsSchema.parse(await response.json());
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['first_name', 'last_name', 'password']));
  });

  test('an email address can only be registered once', { tag: '@regression' }, async ({ authApi, customer }) => {
    const response = await authApi.register(newCustomer({ email: customer.email }));

    expect(response.status()).toBe(409);
    expect(FieldErrorsSchema.parse(await response.json()).email).toContain('A customer with this email address already exists.');
  });

  test('login returns a bearer token', { tag: '@smoke' }, async ({ authApi, customer }) => {
    const response = await authApi.login(customer.email, customer.password);

    expect(response.status()).toBe(200);
    expect(LoginResponseSchema.parse(await response.json()).expires_in).toBeGreaterThan(0);
  });

  test('login is rejected with a wrong password', { tag: '@regression' }, async ({ authApi, customer }) => {
    const response = await authApi.login(customer.email, 'Wrong-Password-1!');

    expect(response.status()).toBe(401);
  });

  test('a token identifies the logged-in customer', { tag: '@regression' }, async ({ authApi, customer, customerToken }) => {
    const response = await authApi.me(customerToken);

    expect(response.status()).toBe(200);
    expect(CustomerSchema.parse(await response.json()).email).toBe(customer.email);
  });

  test('profile request is rejected without a token', { tag: '@regression' }, async ({ authApi }) => {
    const response = await authApi.me();

    expect(response.status()).toBe(401);
    expect(MessageSchema.parse(await response.json()).message).toBe('Unauthorized');
  });
});
