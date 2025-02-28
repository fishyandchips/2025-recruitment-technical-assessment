import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: { [name: string] : cookbookEntry } = {};

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  if (recipeName.length <= 0) {
    return null;
  }

  // Replaces all hyphens and underscores with a whitespace
  recipeName = recipeName.replace(/[-_]/g, ' ');

  // Removes all characters besides letters and whitespaces
  recipeName = recipeName.replace(/[^A-Za-z ]/g, "");

  // Converts the string to title case
  recipeName = recipeName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  // Squashes multiple spaces into a single space and 
  // trims leading/trailing spaces
  recipeName = recipeName.replace(/\s+/g, " ").trim();

  return recipeName;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req:Request, res:Response) => {
  const entry = req.body;

  // Type can only be recipe or ingredient
  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    return res.status(400).json({ error: "Invalid type" });
  }

  // Cook time can only be greater than or equal to 0
  if (entry.type === "ingredient" && entry.cookTime < 0) {
    return res.status(400).json({ error: "Ingredient cook time must be greater than or equal to 0" });
  }

  // Entry names must be unique
  if (cookbook[entry.name]) {
    return res.status(400).json({ error: "Entry name is not unique" });
  }

  // Required items for a recipe can only have one element per name
  if (entry.type === "recipe") {
    const requiredItemNames = entry.requiredItems.map((item: { name: string }) => item.name);
    const uniqueRequiredItems = new Set(requiredItemNames);
    if (requiredItemNames.length !== uniqueRequiredItems.size) {
      return res.status(400).json({ error: "Recipe requiredItems must have unique names" });
    }
  }

  cookbook[entry.name] = entry;

  res.status(200).send();
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name

// Helper function to determine the required ingredients and the total
// cooking time
const ingredientsAndCookTime = (entry: cookbookEntry): { ingredients: requiredItem[]; cookTime: number } => {
  // Base case
  if (entry.type === "ingredient") {
    return {
      ingredients: [{name: entry.name, quantity: 1}],
      cookTime: (entry as ingredient).cookTime
    };
  }

  const allIngredients: requiredItem[] = [];
  let totalCookTime = 0;
  
  for (const requiredItem of (entry as recipe).requiredItems) {
    // Check if the recipe contains recipes/ingredients not in the cookbook
    const item = cookbook[requiredItem.name];
    if (!item) {
      throw new Error(`Required item ${requiredItem.name} not found in the cookbook.`);
    }

    // Recursive call to get the base ingredients of the required item and
    // its total cook time
    const { ingredients, cookTime } = ingredientsAndCookTime(item);

    // Adjusts the quantity of the ingredient 
    for (const ingredient of ingredients) {
      const existingIngredient = allIngredients.find(i => i.name === ingredient.name);
      if (!existingIngredient) {
        allIngredients.push({
          ...ingredient,
          quantity: ingredient.quantity * requiredItem.quantity
        });
      } else {
        existingIngredient.quantity += ingredient.quantity * requiredItem.quantity;
      }
    }

    // Multiply the cook time of the sub item by its quantity and add
    // it to the total cook time
    totalCookTime += cookTime * requiredItem.quantity;
  }

  return { ingredients: allIngredients, cookTime: totalCookTime };
};

app.get("/summary", (req:Request, res:Request) => {
  const name = req.query.name;
  const recipe = cookbook[name];

  // Recipe not found
  if (!recipe) {
    return res.status(400).json({ error: `Recipe '${name}' not found in cookbook` });
  }

  // Name does not refer to a recipe
  if (recipe.type !== "recipe") {
    return res.status(400).json({ error: `'${name}' is not a recipe` });
  }

  try {
    const { ingredients, cookTime } = ingredientsAndCookTime(recipe);
    return res.json({
      name: recipe.name,
      cookTime,
      ingredients,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
