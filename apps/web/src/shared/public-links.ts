export function resolveAppointmentPublicIdentifier(params: {
  appointmentId?: string | null;
  attendanceCode?: string | null;
}) {
  const attendanceCode =
    typeof params.attendanceCode === "string" ? params.attendanceCode.trim() : "";
  if (attendanceCode) return attendanceCode;

  const appointmentId =
    typeof params.appointmentId === "string" ? params.appointmentId.trim() : "";
  return appointmentId || null;
}

export function buildAppointmentVoucherPath(params: {
  appointmentId?: string | null;
  attendanceCode?: string | null;
}) {
  const identifier = resolveAppointmentPublicIdentifier(params);
  return identifier ? `/voucher/${identifier}` : "";
}

export function buildAppointmentReceiptPath(params: {
  appointmentId?: string | null;
  attendanceCode?: string | null;
}) {
  const identifier = resolveAppointmentPublicIdentifier(params);
  return identifier ? `/comprovante/${identifier}` : "";
}
