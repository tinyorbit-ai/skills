-- Catalog: products available for purchase.
create table products (
    id          text primary key,
    name        text not null,
    price_cents integer not null check (price_cents >= 0),
    active      boolean not null default true
);

-- Storefront listings filter to active products.
create index products_active_idx on products (active);
