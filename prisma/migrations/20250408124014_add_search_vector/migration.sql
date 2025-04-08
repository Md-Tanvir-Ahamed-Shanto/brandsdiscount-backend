ALTER TABLE "Product" ADD COLUMN "search_vector" tsvector;

UPDATE "Product" SET search_vector = 
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce("brandName", '') || ' ' || coalesce(sku, ''));

CREATE INDEX "product_search_vector_idx" ON "Product" USING GIN(search_vector);

CREATE OR REPLACE FUNCTION product_search_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    to_tsvector('simple', coalesce(new.title, '') || ' ' || coalesce(new."brandName", '') || ' ' || coalesce(new.sku, ''));
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
  ON "Product" FOR EACH ROW EXECUTE FUNCTION product_search_trigger();
