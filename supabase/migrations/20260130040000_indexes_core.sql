-- Core indexes for tenant/time lookups

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start_time
  ON appointments (tenant_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status
  ON appointments (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_name
  ON clients (tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_services_tenant_name
  ON services (tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_tenant_start_time
  ON availability_blocks (tenant_id, start_time);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_created_at
  ON transactions (tenant_id, created_at);
