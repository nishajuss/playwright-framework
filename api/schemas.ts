import { z } from 'zod';

/**
 * Response contracts for the Practice Software Testing API. Parsing a response with
 * these schemas fails the test if a field is missing, has the wrong type, or breaks a
 * rule, so contract changes are caught even when a test doesn't assert on that field.
 */

/** IDs are 26-character ULIDs. */
const Id = z.string().length(26);

export const ProductSchema = z.object({
  id: Id,
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  in_stock: z.boolean(),
  is_rental: z.boolean(),
  is_location_offer: z.boolean(),
  is_eco_friendly: z.boolean(),
  co2_rating: z.string().nullable(),
  brand: z.object({ id: Id, name: z.string() }),
  category: z.object({ id: Id, name: z.string(), slug: z.string() }),
  product_image: z.object({ file_name: z.string(), title: z.string() })
});

/** Paginated list responses share this envelope. */
const page = <T extends z.ZodType>(item: T) => z.object({
  current_page: z.number().int().positive(),
  data: z.array(item),
  per_page: z.number().int().positive(),
  last_page: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const ProductPageSchema = page(ProductSchema);

/** Search results omit the category slug that the main product list includes. */
export const SearchPageSchema = page(ProductSchema.extend({ category: z.object({ id: Id, name: z.string() }) }));

export const CategorySchema = z.object({
  id: Id,
  name: z.string(),
  slug: z.string(),
  get sub_categories () {
    return z.array(CategorySchema).optional();
  }
});

export const BrandSchema = z.object({ id: Id, name: z.string(), slug: z.string() });

const AddressSchema = z.object({
  street: z.string().nullable(),
  house_number: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable()
});

export const CustomerSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  address: AddressSchema
});

export const LoginResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive()
});

export const CartSchema = z.object({
  id: z.string(),
  cart_items: z.array(z.object({
    product_id: Id,
    quantity: z.number().int().positive(),
    product: ProductSchema.pick({ id: true, name: true, price: true })
  }))
});

export const InvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string().regex(/^INV-\d+$/),
  total: z.number().nonnegative(),
  payment: z.object({ payment_method: z.string() }),
  invoicelines: z.array(z.object({
    product_id: Id,
    quantity: z.number().int().positive(),
    unit_price: z.number().nonnegative()
  }))
});

export const InvoicePageSchema = page(InvoiceSchema);

/** Laravel-style validation error: field name → list of messages. */
export const FieldErrorsSchema = z.record(z.string(), z.array(z.string()));

export const MessageSchema = z.object({ message: z.string() });

export type Product = z.infer<typeof ProductSchema>;
