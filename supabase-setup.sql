-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  image_url text not null default '',
  image_path text not null default '',
  badge text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Admins can read their own admin record" on public.admin_users;
create policy "Admins can read their own admin record"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "Anyone can view active products; admins can view all" on public.products;
create policy "Anyone can view active products; admins can view all"
  on public.products for select to anon, authenticated
  using (active or (select public.is_admin()));

drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products"
  on public.products for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can edit products" on public.products;
create policy "Admins can edit products"
  on public.products for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete to authenticated
  using ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

insert into public.products (name, description, price, image_url, badge, sort_order)
values
  ('Ramo clásico', 'Rosas y follaje fresco en papel kraft.', 60.00, 'https://images.unsplash.com/photo-1523693916903-027d144a2b7d?auto=format&fit=crop&w=760&q=80', 'FAVORITO', 1),
  ('Caja de rosas', 'Doce rosas en una presentación especial.', 90.00, 'https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=760&q=80', 'PARA ENAMORAR', 2),
  ('Girasoles alegres', 'Girasoles con un delicado lazo decorativo.', 75.00, 'https://images.unsplash.com/photo-1543409777-30250849aa3e?auto=format&fit=crop&w=760&q=80', 'LLENO DE LUZ', 3),
  ('Canasta primavera', 'Flores mixtas en una canasta de mimbre.', 110.00, 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=760&q=80', '', 4),
  ('Flores y sorpresas', 'Flores, peluche y chocolates para compartir.', 130.00, 'https://images.unsplash.com/photo-1494625927555-6ec4433b1571?auto=format&fit=crop&w=760&q=80', 'UN DETALLE ÚNICO', 5),
  ('Arreglo de mesa', 'Un centro floral para vestir tus momentos.', 85.00, 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=760&q=80', '', 6)
on conflict (name) do nothing;
