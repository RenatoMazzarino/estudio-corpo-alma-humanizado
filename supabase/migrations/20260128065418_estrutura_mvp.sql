
  create table "public"."appointments" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid,
    "service_name" text not null,
    "start_time" timestamp with time zone not null,
    "status" text default 'pending'::text,
    "price" numeric(10,2),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone
      );



  create table "public"."clients" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "initials" text,
    "phone" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."clients" add constraint "clients_pkey" PRIMARY KEY using index "clients_pkey";

alter table "public"."appointments" add constraint "appointments_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE not valid;

alter table "public"."appointments" validate constraint "appointments_client_id_fkey";

grant delete on table "public"."appointments" to "anon";

grant insert on table "public"."appointments" to "anon";

grant references on table "public"."appointments" to "anon";

grant select on table "public"."appointments" to "anon";

grant trigger on table "public"."appointments" to "anon";

grant truncate on table "public"."appointments" to "anon";

grant update on table "public"."appointments" to "anon";

grant delete on table "public"."appointments" to "authenticated";

grant insert on table "public"."appointments" to "authenticated";

grant references on table "public"."appointments" to "authenticated";

grant select on table "public"."appointments" to "authenticated";

grant trigger on table "public"."appointments" to "authenticated";

grant truncate on table "public"."appointments" to "authenticated";

grant update on table "public"."appointments" to "authenticated";

grant delete on table "public"."appointments" to "service_role";

grant insert on table "public"."appointments" to "service_role";

grant references on table "public"."appointments" to "service_role";

grant select on table "public"."appointments" to "service_role";

grant trigger on table "public"."appointments" to "service_role";

grant truncate on table "public"."appointments" to "service_role";

grant update on table "public"."appointments" to "service_role";

grant delete on table "public"."clients" to "anon";

grant insert on table "public"."clients" to "anon";

grant references on table "public"."clients" to "anon";

grant select on table "public"."clients" to "anon";

grant trigger on table "public"."clients" to "anon";

grant truncate on table "public"."clients" to "anon";

grant update on table "public"."clients" to "anon";

grant delete on table "public"."clients" to "authenticated";

grant insert on table "public"."clients" to "authenticated";

grant references on table "public"."clients" to "authenticated";

grant select on table "public"."clients" to "authenticated";

grant trigger on table "public"."clients" to "authenticated";

grant truncate on table "public"."clients" to "authenticated";

grant update on table "public"."clients" to "authenticated";

grant delete on table "public"."clients" to "service_role";

grant insert on table "public"."clients" to "service_role";

grant references on table "public"."clients" to "service_role";

grant select on table "public"."clients" to "service_role";

grant trigger on table "public"."clients" to "service_role";

grant truncate on table "public"."clients" to "service_role";

grant update on table "public"."clients" to "service_role";


