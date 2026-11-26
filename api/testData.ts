import { randomBytes } from 'node:crypto';

export interface NewCustomer {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  email: string;
  password: string;
  address: {
    street: string;
    house_number: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
}

const uniqueSuffix = (): string => `${Date.now()}-${randomBytes(3).toString('hex')}`;

/**
 * Builds a brand-new customer with a unique email address. Tests register their own
 * accounts rather than sharing the site's public demo logins, which anyone on the
 * internet can change, so runs never interfere with each other or with other users.
 */
export const newCustomer = (overrides: Partial<NewCustomer> = {}): NewCustomer => ({
  first_name: 'Ada',
  last_name: 'Lovelace',
  dob: '1990-12-10',
  phone: '07700900123',
  email: `pw-test-${uniqueSuffix()}@example.com`,
  password: `Pw!${randomBytes(6).toString('hex')}A9`,
  // A US address, because the site's postcode lookup returns a blank state for UK
  // addresses, which then blocks checkout (see e2e/pages/checkoutPage.ts).
  address: {
    street: '5th Avenue',
    house_number: '350',
    city: 'New York',
    state: 'New York',
    country: 'US',
    postal_code: '10118'
  },
  ...overrides
});
