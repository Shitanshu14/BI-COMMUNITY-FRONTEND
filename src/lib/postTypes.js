// Backend still stores one of 5 raw post_type values (question / knowledge /
// project / resource / poll — see posts/models.py). The UI groups these into
// 3 simple buckets: Question, Post (knowledge+project+resource), Poll.
// This is a display-layer simplification only — nothing here changes what
// gets sent to the API.

export const TOP_TYPES = [
  { value: "question", label: "Question", icon: "❓", hint: "Ask for help — Q&A" },
  { value: "post", label: "Post", icon: "📝", hint: "Share knowledge, projects, resources" },
  { value: "poll", label: "Poll", icon: "📊", hint: "Get community opinions" },
];

// Sub-tags shown only when the top-level type is "Post".
export const POST_SUBTYPES = [
  { value: "knowledge", label: "Knowledge", icon: "📘" },
  { value: "project", label: "Project", icon: "🚀" },
  { value: "resource", label: "Resource", icon: "🔖" },
];

export const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "question", label: "Questions" },
  { value: "post", label: "Posts" },
  { value: "poll", label: "Polls" },
];

// Which top-level bucket a raw backend post_type belongs to.
export function groupOf(rawType) {
  if (rawType === "question") return "question";
  if (rawType === "poll") return "poll";
  return "post"; // knowledge / project / resource
}

export function typeIcon(rawType) {
  if (rawType === "question") return "❓";
  if (rawType === "poll") return "📊";
  const sub = POST_SUBTYPES.find((s) => s.value === rawType);
  return sub ? sub.icon : "📝";
}

// Short label for the raw subtype (e.g. "Knowledge"), used as a secondary tag.
export function subtypeLabel(rawType) {
  const sub = POST_SUBTYPES.find((s) => s.value === rawType);
  return sub ? sub.label : null;
}

// Top-level label for a raw type ("Question" / "Post" / "Poll").
export function groupLabel(rawType) {
  const g = groupOf(rawType);
  return (TOP_TYPES.find((t) => t.value === g) || {}).label || "Post";
}
