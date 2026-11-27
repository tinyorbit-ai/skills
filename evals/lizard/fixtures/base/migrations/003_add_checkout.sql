-- Buyer details and the charged total, captured by the checkout form.
alter table orders
    add column buyer_first_name text not null default '',
    add column buyer_last_name  text not null default '',
    add column buyer_email      text not null default '',
    add column total_cents      integer not null default 0;
