-- Draft orders a customer is still editing. The id is allocated by the client
-- that starts the draft, so the row appears on the first save, not before it.
create table drafts (
    id          text primary key,
    customer_id text not null,
    items       jsonb not null
);

-- Drafts are listed per customer; index the lookup key.
create index drafts_customer_id_idx on drafts (customer_id);
