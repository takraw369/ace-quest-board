-- Narrow exposed RPC grants after advisor review.
-- Catalog metadata remains intentionally public; asset URLs require ACE auth.
-- MASA publisher RPCs use the private owner-key capability from the MASA dashboard backend.

revoke execute on function public.ace_theme_assets_v1(text) from anon;

revoke execute on function public.masa_ace_asset_upsert_v1(text,text,text,text,text,text,text,text,text,text,text[],jsonb) from authenticated;
revoke execute on function public.masa_ace_asset_list_v1(text,integer) from authenticated;

-- Keep explicit grants so future default privilege changes do not alter the contract.
grant execute on function public.ace_basecamp_catalog_v1() to anon, authenticated, service_role;
grant execute on function public.ace_theme_assets_v1(text) to authenticated, service_role;
grant execute on function public.masa_ace_asset_upsert_v1(text,text,text,text,text,text,text,text,text,text,text[],jsonb) to anon, service_role;
grant execute on function public.masa_ace_asset_list_v1(text,integer) to anon, service_role;
