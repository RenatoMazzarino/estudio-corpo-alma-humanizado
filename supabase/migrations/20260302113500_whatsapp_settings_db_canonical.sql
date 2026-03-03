-- Ensure WhatsApp automation template settings are fully database-driven.

update public.settings
set
  whatsapp_template_created_name = coalesce(nullif(trim(whatsapp_template_created_name), ''), 'aviso_agendamento_interno_sem_comprovante'),
  whatsapp_template_created_language = coalesce(nullif(trim(whatsapp_template_created_language), ''), 'pt_BR'),
  whatsapp_template_reminder_name = coalesce(nullif(trim(whatsapp_template_reminder_name), ''), 'confirmacao_de_agendamento_24h'),
  whatsapp_template_reminder_language = coalesce(nullif(trim(whatsapp_template_reminder_language), ''), 'pt_BR')
where true;

alter table if exists public.settings
  alter column whatsapp_template_created_name set default 'aviso_agendamento_interno_sem_comprovante',
  alter column whatsapp_template_created_name set not null,
  alter column whatsapp_template_created_language set default 'pt_BR',
  alter column whatsapp_template_created_language set not null,
  alter column whatsapp_template_reminder_name set default 'confirmacao_de_agendamento_24h',
  alter column whatsapp_template_reminder_name set not null,
  alter column whatsapp_template_reminder_language set default 'pt_BR',
  alter column whatsapp_template_reminder_language set not null;
