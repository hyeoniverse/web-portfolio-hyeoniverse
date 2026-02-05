export const formatDate = (date: Date = new Date()): string => {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}. ${month}. ${day}`;
};

export const getYear = (start?: string, end?: string | null) => {
  const targetDate = end || start;
  if (!targetDate) return "Unknown";
  return new Date(targetDate).getFullYear().toString();
};

export const thisYear = new Date().getFullYear();

export const lastUpdated = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
