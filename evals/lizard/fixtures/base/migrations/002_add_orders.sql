-- Orders placed by customers. Line items are stored as JSON on the order row.
create table orders (
    id               text primary key,
    customer_id      text not null,
    items            jsonb not null,
    discount_percent integer not null default 0
);

-- Orders are listed per customer; index the lookup key.
create index orders_customer_id_idx on orders (customer_id);
