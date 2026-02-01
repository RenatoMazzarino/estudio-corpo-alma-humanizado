-- G28: backfill appointment_attendances for existing appointments

INSERT INTO appointment_attendances (
  appointment_id,
  tenant_id,
  current_stage,
  pre_status,
  session_status,
  checkout_status,
  post_status,
  confirmed_at,
  confirmed_channel,
  timer_status,
  timer_started_at,
  timer_paused_at,
  paused_total_seconds,
  planned_seconds,
  actual_seconds,
  stage_lock_reason
)
SELECT
  a.id,
  a.tenant_id,
  CASE
    WHEN a.status = 'completed' THEN 'hub'
    WHEN a.status = 'in_progress' THEN 'session'
    ELSE 'hub'
  END AS current_stage,
  CASE
    WHEN a.status IN ('completed', 'in_progress', 'confirmed') THEN 'done'
    WHEN a.status IN ('canceled_by_client', 'canceled_by_studio', 'no_show') THEN 'locked'
    ELSE 'available'
  END AS pre_status,
  CASE
    WHEN a.status = 'completed' THEN 'done'
    WHEN a.status = 'in_progress' THEN 'in_progress'
    WHEN a.status = 'confirmed' THEN 'available'
    ELSE 'locked'
  END AS session_status,
  CASE
    WHEN a.status = 'completed' THEN 'done'
    ELSE 'locked'
  END AS checkout_status,
  CASE
    WHEN a.status = 'completed' THEN 'done'
    ELSE 'locked'
  END AS post_status,
  CASE WHEN a.status = 'confirmed' THEN a.start_time ELSE NULL END AS confirmed_at,
  CASE WHEN a.status = 'confirmed' THEN 'auto' ELSE NULL END AS confirmed_channel,
  CASE
    WHEN a.status = 'completed' THEN 'finished'
    WHEN a.status = 'in_progress' THEN 'running'
    ELSE 'idle'
  END AS timer_status,
  CASE WHEN a.status = 'in_progress' THEN a.started_at ELSE NULL END AS timer_started_at,
  NULL AS timer_paused_at,
  0 AS paused_total_seconds,
  COALESCE(a.total_duration_minutes, 30) * 60 AS planned_seconds,
  COALESCE(a.actual_duration_minutes, 0) * 60 AS actual_seconds,
  CASE
    WHEN a.status IN ('canceled_by_client', 'canceled_by_studio', 'no_show') THEN 'cancelled'
    ELSE NULL
  END AS stage_lock_reason
FROM appointments a
LEFT JOIN appointment_attendances aa ON aa.appointment_id = a.id
WHERE aa.appointment_id IS NULL;
