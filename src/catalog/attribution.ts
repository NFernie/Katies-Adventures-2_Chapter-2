export function recipeSourceCredit(recipe: {
  sourceKind?: string;
  sourceAttribution?: string;
}): string | null {
  if (recipe.sourceKind !== "myplate-kitchen") return null;
  const line = recipe.sourceAttribution?.trim();
  return line || "USDA MyPlate Kitchen";
}
