/** Food order lifecycle: one action button per step. */
export const FOOD_FLOW = [
  { id: "placed", label: "New", next: "accepted", action: "Accept order" },
  { id: "accepted", label: "Accepted", next: "preparing", action: "Start preparing" },
  { id: "preparing", label: "Preparing", next: "ready", action: "Mark ready" },
  { id: "ready", label: "Ready", next: "out_for_delivery", action: "Out for delivery" },
  { id: "out_for_delivery", label: "On the way", next: "delivered", action: "Mark delivered" },
  { id: "delivered", label: "Delivered", next: null, action: "" },
] as const;

export const TASK_FLOW = [
  { id: "pending", label: "New", next: "accepted", action: "Accept" },
  { id: "accepted", label: "Accepted", next: "in_progress", action: "Start" },
  { id: "in_progress", label: "In progress", next: "done", action: "Done" },
  { id: "done", label: "Done", next: null, action: "" },
] as const;

export const foodStep = (s: string) => FOOD_FLOW.find((f) => f.id === s) ?? FOOD_FLOW[0];
export const GUEST_FOOD_LABEL: Record<string, string> = {
  placed: "Order placed", accepted: "Accepted by kitchen", preparing: "Being prepared", ready: "Ready",
  out_for_delivery: "On the way", delivered: "Delivered", cancelled: "Cancelled",
};
