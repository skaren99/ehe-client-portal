export function summary(tasks) {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "Valmis").length,
    open: tasks.filter((t) => t.status !== "Valmis").length,
  };
}
export function mayComplete(task, planner) {
  return planner || task.group === "couple";
}
export function money(value) {
  return new Intl.NumberFormat("et-EE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
