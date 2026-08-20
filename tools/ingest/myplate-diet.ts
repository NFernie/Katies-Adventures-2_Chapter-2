const MEAT = /\b(chicken|beef|pork|turkey|lamb|bacon|ham|sausage|pepperoni|meat|fish|salmon|tuna|cod|tilapia|trout|anchovy)\b/i;
const SHELLFISH = /\b(shrimp|crab|lobster|clam|mussel|oyster|scallop|shellfish)\b/i;
const DAIRY = /\b(milk|cheese|yogurt|yoghurt|cream|butter|whey|mozzarella|cheddar|parmesan)\b/i;
const EGG = /\b(egg|eggs)\b/i;
const NUTS = /\b(almond|walnut|peanut|pecan|cashew|hazelnut|pistachio|macadamia|\bnuts?\b)\b/i;
const GLUTEN = /\b(wheat|flour|bread|tortilla|pasta|noodle|barley|rye|malt|couscous)\b/i;
const SOY = /\b(soy|soya|tofu|tempeh|edamame|miso)\b/i;
const HONEY = /\b(honey)\b/i;

export function inferAllergens(ingredientNames: string[]): string[] {
  const blob = ingredientNames.join(" ");
  const allergens: string[] = [];
  if (NUTS.test(blob)) allergens.push("nuts");
  if (DAIRY.test(blob)) allergens.push("dairy");
  if (GLUTEN.test(blob)) allergens.push("gluten");
  if (SHELLFISH.test(blob)) allergens.push("shellfish");
  if (EGG.test(blob)) allergens.push("egg");
  if (SOY.test(blob)) allergens.push("soy");
  return allergens;
}

export function inferDietTags(ingredientNames: string[]): string[] {
  const blob = ingredientNames.join(" ");
  if (MEAT.test(blob) || SHELLFISH.test(blob)) return [];
  const tags = ["vegetarian"];
  if (!DAIRY.test(blob) && !EGG.test(blob) && !HONEY.test(blob)) tags.unshift("vegan");
  return tags;
}

export function isVegetarianCapable(dietTags: string[]): boolean {
  return dietTags.includes("vegetarian") || dietTags.includes("vegan");
}

export function isSnackLikeBreakfast(title: string): boolean {
  return /\b(yogurt|yoghurt|fruit|toast|cereal|smoothie|parfait|oat|muffin|berries)\b/i.test(
    title,
  );
}
