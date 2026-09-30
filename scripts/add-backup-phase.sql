-- 1 = Monofásico | 2 = Trifásico
alter table public.backup
  add column if not exists id_tipo_luz integer;

alter table public.backup
  add constraint backup_id_tipo_luz_check
  check (id_tipo_luz in (1, 2));

comment on column public.backup.id_tipo_luz is
  'Tipo de contador: 1 monofásico, 2 trifásico';

-- Depois de confirmar os preços, classifique os registos existentes.
-- Exemplo:
-- update public.backup set id_tipo_luz = 1 where id = 1;
-- update public.backup set id_tipo_luz = 2 where id = 2;
