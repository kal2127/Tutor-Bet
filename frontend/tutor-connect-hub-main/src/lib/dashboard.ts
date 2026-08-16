export function formatStatus(status?: string) {
  return (status || "unknown").replace(/_/g, " ").toLowerCase();
}

export function statusClass(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (["approved", "paid", "confirmed", "completed", "fulfilled"].includes(normalized)) {
    return "bg-secondary/15 text-secondary border-0";
  }
  if (["rejected", "failed", "cancelled", "payment_rejected", "closed"].includes(normalized)) {
    return "bg-destructive/15 text-destructive border-0";
  }
  return "bg-primary/15 text-primary border-0";
}

export function money(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  return `${value} ETB`;
}
