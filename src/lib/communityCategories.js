export const CATEGORIES = [
  { value: "technology", label: "Technology", icon: "💻" },
  { value: "education", label: "Education", icon: "📘" },
  { value: "social", label: "Social", icon: "👥" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "business", label: "Business", icon: "💼" },
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
  { value: "other", label: "Other", icon: "✨" },
];

export function categoryMeta(value) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}
