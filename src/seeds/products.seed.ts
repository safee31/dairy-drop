import { AppDataSource } from "@/config/database";
import { ProductRepo, CategoryLevel2Repo, InventoryRepo } from "@/models/repositories";

interface ProductItem {
    name: string;
    description: string;
    sku: string;
    categoryLevel2Slug: string;
    price: number;
    brand: string;
    fatContent: string;
    weight: {
        value: number;
        unit: "g" | "kg" | "ml" | "L" | "piece";
    };
    shelfLife: string;
    discount?: {
        type: "percentage" | "fixed";
        value: number;
    } | null;
}

// Generate batch number in format: BRAND-YYMM-XXXXX
const generateBatchNumber = (brand: string): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const randomNum = Math.floor(Math.random() * 99999)
        .toString()
        .padStart(5, "0");
    return `${brand.toUpperCase().replace(/\s+/g, "-")}-${year}${month}-${randomNum}`;
};

// Generate random stock quantity between 10 and 200
const generateRandomStock = (): number => {
    return Math.floor(Math.random() * 191) + 10; // Random between 10-200
};

// Generate random price between 200 and 2000
const generateRandomPrice = (): number => {
    return Math.floor(Math.random() * 1801) + 200; // Random between 200-2000
};

// Generate random discount for ~50% of products
const generateRandomDiscount = (): { type: "percentage" | "fixed"; value: number } | null => {
    const shouldHaveDiscount = Math.random() > 0.5; // 50% chance
    if (!shouldHaveDiscount) return null;

    const isPercentage = Math.random() > 0.5; // 50/50 between percentage and fixed
    if (isPercentage) {
        return {
            type: "percentage",
            value: Math.floor(Math.random() * 21) + 5, // 5-25%
        };
    } else {
        return {
            type: "fixed",
            value: parseFloat((Math.random() * 90 + 10).toFixed(2)), // ₹10-100
        };
    }
};

// Calculate sale price based on discount type
const calculateSalePrice = (price: number, discount: { type: "percentage" | "fixed"; value: number } | null): number => {
    if (!discount) return price;

    let salePrice = price;
    if (discount.type === "percentage") {
        salePrice = price - price * (discount.value / 100);
    } else if (discount.type === "fixed") {
        salePrice = price - discount.value;
    }

    return parseFloat(Math.max(salePrice, 0).toFixed(2)); // Ensure price doesn't go negative
};

const productsData: ProductItem[] = [
    // Whole Milk
    {
        name: "Fresh Whole Milk 1L",
        description: "Rich and creamy fresh whole milk with natural fat content, perfect for daily consumption and cooking",
        sku: "FWM-001-1L",
        categoryLevel2Slug: "whole-milk",
        price: 3.99,
        brand: "DairyGold",
        fatContent: "3.5%",
        weight: { value: 1, unit: "L" },
        shelfLife: "7 days",
        discount: { type: "percentage", value: 5 },
    },
    {
        name: "Organic Whole Milk 1L",
        description: "Certified organic whole milk from grass-fed cows, no hormones or antibiotics",
        sku: "OWM-002-1L",
        categoryLevel2Slug: "whole-milk",
        price: 5.99,
        brand: "OrganicDairy",
        fatContent: "3.8%",
        weight: { value: 1, unit: "L" },
        shelfLife: "5 days",
    },
    {
        name: "Premium Jersey Milk 500ml",
        description: "Rich golden milk from Jersey cows with higher fat and protein content",
        sku: "PJM-003-500",
        categoryLevel2Slug: "whole-milk",
        price: 3.49,
        brand: "Jersey Dreams",
        fatContent: "5.0%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "6 days",
    },

    // Skimmed Milk
    {
        name: "Fat-Free Skimmed Milk 1L",
        description: "Pure skimmed milk with virtually no fat, ideal for health-conscious consumers",
        sku: "FSM-004-1L",
        categoryLevel2Slug: "skimmed-milk",
        price: 2.99,
        brand: "LightLife",
        fatContent: "0.1%",
        weight: { value: 1, unit: "L" },
        shelfLife: "8 days",
        discount: { type: "fixed", value: 0.5 },
    },
    {
        name: "Organic Skimmed Milk 1L",
        description: "Organic fat-free milk perfect for diet plans and fitness routines",
        sku: "OSM-005-1L",
        categoryLevel2Slug: "skimmed-milk",
        price: 4.49,
        brand: "OrganicDairy",
        fatContent: "0.2%",
        weight: { value: 1, unit: "L" },
        shelfLife: "7 days",
    },

    // Low-Fat Milk
    {
        name: "Low-Fat Milk 1L",
        description: "Balanced nutrition with reduced fat content, great for families",
        sku: "LFM-006-1L",
        categoryLevel2Slug: "low-fat-milk",
        price: 3.49,
        brand: "DairyGold",
        fatContent: "1.5%",
        weight: { value: 1, unit: "L" },
        shelfLife: "7 days",
    },
    {
        name: "Premium Low-Fat Milk 1L",
        description: "High-quality low-fat milk with added vitamins and minerals",
        sku: "PLF-007-1L",
        categoryLevel2Slug: "low-fat-milk",
        price: 4.29,
        brand: "VitaDairy",
        fatContent: "1.7%",
        weight: { value: 1, unit: "L" },
        shelfLife: "6 days",
    },

    // Flavored Milk
    {
        name: "Chocolate Flavored Milk 500ml",
        description: "Delicious chocolate-flavored milk, perfect treat for kids",
        sku: "CFM-008-500",
        categoryLevel2Slug: "flavored-milk",
        price: 2.49,
        brand: "ChocoDairy",
        fatContent: "2.0%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "10 days",
        discount: { type: "percentage", value: 10 },
    },
    {
        name: "Strawberry Milk 500ml",
        description: "Fresh strawberry flavored milk with natural ingredients",
        sku: "SFM-009-500",
        categoryLevel2Slug: "flavored-milk",
        price: 2.49,
        brand: "FruitMilk",
        fatContent: "2.0%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "10 days",
    },
    {
        name: "Vanilla Milk 1L",
        description: "Smooth vanilla-flavored milk, favorite among all ages",
        sku: "VFM-010-1L",
        categoryLevel2Slug: "flavored-milk",
        price: 3.29,
        brand: "DairyGold",
        fatContent: "2.5%",
        weight: { value: 1, unit: "L" },
        shelfLife: "8 days",
    },

    // Whipping Cream
    {
        name: "Premium Whipping Cream 500ml",
        description: "High-fat cream perfect for whipping and dessert toppings",
        sku: "PWC-011-500",
        categoryLevel2Slug: "whipping-cream",
        price: 4.99,
        brand: "CreamDeluxe",
        fatContent: "35%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "10 days",
    },
    {
        name: "Extra Rich Whipping Cream 250ml",
        description: "Ultra-thick whipping cream for professional baking",
        sku: "EWC-012-250",
        categoryLevel2Slug: "whipping-cream",
        price: 3.49,
        brand: "BakersPride",
        fatContent: "40%",
        weight: { value: 250, unit: "ml" },
        shelfLife: "12 days",
    },

    // Cooking Cream
    {
        name: "Cooking Cream 500ml",
        description: "Perfect cooking cream for sauces, soups, and curries",
        sku: "CC-013-500",
        categoryLevel2Slug: "cooking-cream",
        price: 3.99,
        brand: "CookMaster",
        fatContent: "25%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "15 days",
        discount: { type: "percentage", value: 8 },
    },
    {
        name: "Light Cooking Cream 500ml",
        description: "Lighter cooking cream with balanced fat content",
        sku: "LCC-014-500",
        categoryLevel2Slug: "cooking-cream",
        price: 3.49,
        brand: "DairyGold",
        fatContent: "18%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "14 days",
    },

    // Sour Cream
    {
        name: "Traditional Sour Cream 200g",
        description: "Tangy cultured cream with authentic sour taste",
        sku: "TSC-015-200",
        categoryLevel2Slug: "sour-cream",
        price: 2.99,
        brand: "CultureCream",
        fatContent: "20%",
        weight: { value: 200, unit: "g" },
        shelfLife: "21 days",
    },
    {
        name: "Premium Sour Cream 300g",
        description: "Rich and creamy sour cream perfect for toppings and baking",
        sku: "PSC-016-300",
        categoryLevel2Slug: "sour-cream",
        price: 3.49,
        brand: "DairyDeluxe",
        fatContent: "24%",
        weight: { value: 300, unit: "g" },
        shelfLife: "20 days",
    },

    // Salted Butter
    {
        name: "Salted Butter 200g",
        description: "Classic salted butter with natural salt, perfect for spreading",
        sku: "SB-017-200",
        categoryLevel2Slug: "salted-butter",
        price: 4.49,
        brand: "ButterGold",
        fatContent: "80%",
        weight: { value: 200, unit: "g" },
        shelfLife: "90 days",
        discount: { type: "percentage", value: 5 },
    },
    {
        name: "Premium Salted Butter 500g",
        description: "High-quality salted butter from grass-fed cows",
        sku: "PSB-018-500",
        categoryLevel2Slug: "salted-butter",
        price: 9.99,
        brand: "FarmFresh",
        fatContent: "82%",
        weight: { value: 500, unit: "g" },
        shelfLife: "95 days",
    },

    // Unsalted Butter
    {
        name: "Unsalted Butter 200g",
        description: "Pure unsalted butter, ideal for baking and cooking",
        sku: "UB-019-200",
        categoryLevel2Slug: "unsalted-butter",
        price: 4.29,
        brand: "BakersChoice",
        fatContent: "80%",
        weight: { value: 200, unit: "g" },
        shelfLife: "85 days",
    },
    {
        name: "Organic Unsalted Butter 250g",
        description: "Certified organic unsalted butter from organic dairy farms",
        sku: "OUB-020-250",
        categoryLevel2Slug: "unsalted-butter",
        price: 6.99,
        brand: "OrganicDairy",
        fatContent: "81%",
        weight: { value: 250, unit: "g" },
        shelfLife: "80 days",
    },

    // Ghee
    {
        name: "Pure Clarified Butter (Ghee) 500ml",
        description: "Pure golden ghee made from clarified butter, perfect for Indian cooking",
        sku: "GH-021-500",
        categoryLevel2Slug: "ghee",
        price: 12.99,
        brand: "GheePure",
        fatContent: "99%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "365 days",
        discount: { type: "percentage", value: 10 },
    },
    {
        name: "Organic Ghee 250ml",
        description: "Pure organic ghee from organic farm milk",
        sku: "OGH-022-250",
        categoryLevel2Slug: "ghee",
        price: 8.99,
        brand: "OrganicGhee",
        fatContent: "99%",
        weight: { value: 250, unit: "ml" },
        shelfLife: "360 days",
    },

    // Cottage Cheese
    {
        name: "Fresh Cottage Cheese 200g",
        description: "Soft, creamy cottage cheese with delicate curds",
        sku: "CC-023-200",
        categoryLevel2Slug: "cottage-cheese",
        price: 3.49,
        brand: "FreshCurd",
        fatContent: "4%",
        weight: { value: 200, unit: "g" },
        shelfLife: "10 days",
    },
    {
        name: "Premium Cottage Cheese 300g",
        description: "High-protein cottage cheese for healthy lifestyle",
        sku: "PCC-024-300",
        categoryLevel2Slug: "cottage-cheese",
        price: 4.49,
        brand: "ProteinDairy",
        fatContent: "5%",
        weight: { value: 300, unit: "g" },
        shelfLife: "12 days",
    },

    // Mozzarella
    {
        name: "Fresh Mozzarella 250g",
        description: "Soft fresh mozzarella cheese, perfect for salads and pizzas",
        sku: "FM-025-250",
        categoryLevel2Slug: "mozzarella",
        price: 5.99,
        brand: "ItalianCheese",
        fatContent: "22%",
        weight: { value: 250, unit: "g" },
        shelfLife: "7 days",
    },
    {
        name: "Shredded Mozzarella 200g",
        description: "Pre-shredded mozzarella for convenient cooking",
        sku: "SM-026-200",
        categoryLevel2Slug: "mozzarella",
        price: 4.99,
        brand: "EasyMelt",
        fatContent: "20%",
        weight: { value: 200, unit: "g" },
        shelfLife: "14 days",
    },

    // Cheddar
    {
        name: "Aged Cheddar Cheese 200g",
        description: "Sharp aged cheddar with rich flavor",
        sku: "AC-027-200",
        categoryLevel2Slug: "cheddar",
        price: 6.49,
        brand: "CheeseVillage",
        fatContent: "32%",
        weight: { value: 200, unit: "g" },
        shelfLife: "60 days",
        discount: { type: "percentage", value: 7 },
    },
    {
        name: "Mild Cheddar 250g",
        description: "Smooth and mild cheddar cheese for all ages",
        sku: "MC-028-250",
        categoryLevel2Slug: "cheddar",
        price: 5.99,
        brand: "DairyFresh",
        fatContent: "30%",
        weight: { value: 250, unit: "g" },
        shelfLife: "55 days",
    },

    // Greek Yogurt
    {
        name: "Greek Yogurt Plain 400g",
        description: "Thick and creamy plain Greek yogurt, high in protein",
        sku: "GY-029-400",
        categoryLevel2Slug: "greek-yogurt",
        price: 4.99,
        brand: "GreekGold",
        fatContent: "10%",
        weight: { value: 400, unit: "g" },
        shelfLife: "21 days",
        discount: { type: "percentage", value: 10 },
    },
    {
        name: "0% Fat Greek Yogurt 500g",
        description: "Fat-free Greek yogurt with exceptional protein content",
        sku: "FGY-030-500",
        categoryLevel2Slug: "greek-yogurt",
        price: 5.49,
        brand: "HealthyGreek",
        fatContent: "0%",
        weight: { value: 500, unit: "g" },
        shelfLife: "20 days",
    },

    // Regular Yogurt
    {
        name: "Plain Regular Yogurt 500g",
        description: "Smooth regular yogurt with natural cultures",
        sku: "RY-031-500",
        categoryLevel2Slug: "regular-yogurt",
        price: 3.29,
        brand: "YogurtBliss",
        fatContent: "3%",
        weight: { value: 500, unit: "g" },
        shelfLife: "25 days",
    },
    {
        name: "Organic Plain Yogurt 400g",
        description: "Certified organic plain yogurt with live cultures",
        sku: "OPY-032-400",
        categoryLevel2Slug: "regular-yogurt",
        price: 4.79,
        brand: "OrganicDairy",
        fatContent: "3.5%",
        weight: { value: 400, unit: "g" },
        shelfLife: "22 days",
    },

    // Fruit Yogurt
    {
        name: "Strawberry Yogurt 500g",
        description: "Creamy yogurt with fresh strawberry flavor",
        sku: "SY-033-500",
        categoryLevel2Slug: "fruit-yogurt",
        price: 3.49,
        brand: "FruitFlavors",
        fatContent: "2%",
        weight: { value: 500, unit: "g" },
        shelfLife: "20 days",
    },
    {
        name: "Mango Yogurt 450g",
        description: "Delicious mango-flavored yogurt with fruit pieces",
        sku: "MY-034-450",
        categoryLevel2Slug: "fruit-yogurt",
        price: 3.49,
        brand: "TropicalDairy",
        fatContent: "2%",
        weight: { value: 450, unit: "g" },
        shelfLife: "18 days",
        discount: { type: "percentage", value: 5 },
    },
    {
        name: "Blueberry Yogurt 500g",
        description: "Antioxidant-rich blueberry yogurt",
        sku: "BY-035-500",
        categoryLevel2Slug: "fruit-yogurt",
        price: 3.79,
        brand: "BerryDairy",
        fatContent: "2%",
        weight: { value: 500, unit: "g" },
        shelfLife: "19 days",
    },

    // Honey Yogurt
    {
        name: "Honey Yogurt 500g",
        description: "Naturally sweetened yogurt with pure honey",
        sku: "HY-036-500",
        categoryLevel2Slug: "honey-yogurt",
        price: 4.29,
        brand: "HoneyDairy",
        fatContent: "3%",
        weight: { value: 500, unit: "g" },
        shelfLife: "21 days",
    },
    {
        name: "Premium Honey Yogurt 400g",
        description: "Creamy yogurt with organic honey drizzle",
        sku: "PHY-037-400",
        categoryLevel2Slug: "honey-yogurt",
        price: 4.99,
        brand: "OrganicHoney",
        fatContent: "3.5%",
        weight: { value: 400, unit: "g" },
        shelfLife: "20 days",
    },

    // Kefir
    {
        name: "Plain Kefir 500ml",
        description: "Probiotic-rich kefir drink with beneficial cultures",
        sku: "KF-038-500",
        categoryLevel2Slug: "kefir",
        price: 4.49,
        brand: "KefirLife",
        fatContent: "1%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "14 days",
    },
    {
        name: "Strawberry Kefir 500ml",
        description: "Fruity kefir drink with probiotic benefits",
        sku: "SKF-039-500",
        categoryLevel2Slug: "kefir",
        price: 4.69,
        brand: "FruitKefir",
        fatContent: "1%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "12 days",
    },

    // Dahi (Indian Curd)
    {
        name: "Traditional Dahi 500g",
        description: "Classic Indian dahi with natural cultures and rich taste",
        sku: "DH-040-500",
        categoryLevel2Slug: "dahi",
        price: 3.99,
        brand: "TraditionalDairy",
        fatContent: "4%",
        weight: { value: 500, unit: "g" },
        shelfLife: "8 days",
        discount: { type: "percentage", value: 5 },
    },
    {
        name: "Sweet Lassi 400ml",
        description: "Refreshing sweet yogurt drink with cardamom",
        sku: "SL-041-400",
        categoryLevel2Slug: "sweet-lassi",
        price: 2.49,
        brand: "LassiExpress",
        fatContent: "2%",
        weight: { value: 400, unit: "ml" },
        shelfLife: "7 days",
    },

    // Salted Lassi
    {
        name: "Salted Lassi 500ml",
        description: "Traditional salted yogurt drink with cumin and spices",
        sku: "SAL-042-500",
        categoryLevel2Slug: "salted-lassi",
        price: 2.99,
        brand: "SpicedLassi",
        fatContent: "1.5%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "6 days",
    },
    {
        name: "Buttermilk 500ml",
        description: "Traditional cultured buttermilk for cooking and beverages",
        sku: "BM-043-500",
        categoryLevel2Slug: "traditional-buttermilk",
        price: 2.29,
        brand: "ClassicButter",
        fatContent: "0.5%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "10 days",
    },

    // Ice Cream
    {
        name: "Vanilla Ice Cream 500ml",
        description: "Classic vanilla ice cream with real vanilla extract",
        sku: "VI-044-500",
        categoryLevel2Slug: "vanilla-ice-cream",
        price: 4.99,
        brand: "FrozenBliss",
        fatContent: "12%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "180 days",
        discount: { type: "percentage", value: 10 },
    },
    {
        name: "Chocolate Ice Cream 500ml",
        description: "Rich chocolate ice cream made with premium cocoa",
        sku: "CI-045-500",
        categoryLevel2Slug: "chocolate-ice-cream",
        price: 5.49,
        brand: "ChocoDream",
        fatContent: "13%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "180 days",
    },
    {
        name: "Strawberry Ice Cream 500ml",
        description: "Creamy strawberry ice cream with fruit pieces",
        sku: "SI-046-500",
        categoryLevel2Slug: "fruit-ice-cream",
        price: 5.29,
        brand: "BerryFreeze",
        fatContent: "11%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "180 days",
    },
    {
        name: "Pistachio Ice Cream 400ml",
        description: "Delicate pistachio ice cream with authentic flavor",
        sku: "PI-047-400",
        categoryLevel2Slug: "fruit-ice-cream",
        price: 6.99,
        brand: "NuttyFreeze",
        fatContent: "14%",
        weight: { value: 400, unit: "ml" },
        shelfLife: "180 days",
    },

    // Frozen Yogurt
    {
        name: "Plain Frozen Yogurt 500ml",
        description: "Tangy frozen yogurt with live cultures",
        sku: "FY-048-500",
        categoryLevel2Slug: "plain-frozen-yogurt",
        price: 3.99,
        brand: "FrozenYo",
        fatContent: "2%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "150 days",
    },
    {
        name: "Mango Frozen Yogurt 500ml",
        description: "Tropical mango frozen yogurt with probiotic cultures",
        sku: "MFY-049-500",
        categoryLevel2Slug: "flavored-frozen-yogurt",
        price: 4.49,
        brand: "TropicalYo",
        fatContent: "2%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "150 days",
    },
    {
        name: "Honey Frozen Yogurt 500ml",
        description: "Sweet honey frozen yogurt with natural ingredients",
        sku: "HFY-050-500",
        categoryLevel2Slug: "flavored-frozen-yogurt",
        price: 4.79,
        brand: "HoneyYo",
        fatContent: "2.5%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "150 days",
        discount: { type: "percentage", value: 8 },
    },

    // Additional Organic Milk
    {
        name: "Organic Whole Milk 500ml",
        description: "Certified organic whole milk in convenient smaller size",
        sku: "OWM-051-500",
        categoryLevel2Slug: "organic-milk",
        price: 3.49,
        brand: "OrganicDairy",
        fatContent: "3.8%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "5 days",
    },
    {
        name: "Ultra-fresh Organic Milk 1L",
        description: "Ultra-pasteurized organic milk for extended shelf life",
        sku: "UOM-052-1L",
        categoryLevel2Slug: "organic-milk",
        price: 6.49,
        brand: "FarmFresh",
        fatContent: "3.5%",
        weight: { value: 1, unit: "L" },
        shelfLife: "21 days",
        discount: { type: "percentage", value: 5 },
    },

    // Clotted Cream
    {
        name: "Premium Clotted Cream 200g",
        description: "Thick, luxurious clotted cream for desserts and tea time",
        sku: "PCL-053-200",
        categoryLevel2Slug: "clotted-cream",
        price: 6.99,
        brand: "DevonDairy",
        fatContent: "55%",
        weight: { value: 200, unit: "g" },
        shelfLife: "14 days",
    },
    {
        name: "Traditional Clotted Cream 150g",
        description: "Authentic clotted cream for scones and jam",
        sku: "TCL-054-150",
        categoryLevel2Slug: "clotted-cream",
        price: 5.99,
        brand: "CornishCream",
        fatContent: "58%",
        weight: { value: 150, unit: "g" },
        shelfLife: "15 days",
    },

    // Spreadable Butter
    {
        name: "Spreadable Butter 250g",
        description: "Soft spreadable butter perfect for toast and baking",
        sku: "SPB-055-250",
        categoryLevel2Slug: "spreadable-butter",
        price: 3.99,
        brand: "EasySpread",
        fatContent: "65%",
        weight: { value: 250, unit: "g" },
        shelfLife: "60 days",
    },
    {
        name: "Organic Spreadable Butter 300g",
        description: "Organic spreadable butter with natural softness",
        sku: "OSB-056-300",
        categoryLevel2Slug: "spreadable-butter",
        price: 5.49,
        brand: "OrganicDairy",
        fatContent: "62%",
        weight: { value: 300, unit: "g" },
        shelfLife: "55 days",
    },

    // Ricotta
    {
        name: "Fresh Ricotta 250g",
        description: "Creamy Italian ricotta cheese perfect for desserts",
        sku: "FR-057-250",
        categoryLevel2Slug: "ricotta",
        price: 4.49,
        brand: "ItalianDairy",
        fatContent: "10%",
        weight: { value: 250, unit: "g" },
        shelfLife: "8 days",
    },
    {
        name: "Ricotta for Cooking 500g",
        description: "Large pack ricotta ideal for pasta and baking",
        sku: "RC-058-500",
        categoryLevel2Slug: "ricotta",
        price: 7.99,
        brand: "CookingDairy",
        fatContent: "9%",
        weight: { value: 500, unit: "g" },
        shelfLife: "7 days",
        discount: { type: "percentage", value: 10 },
    },

    // Feta
    {
        name: "Greek Feta Cheese 200g",
        description: "Authentic brined feta cheese from Greece",
        sku: "GFC-059-200",
        categoryLevel2Slug: "feta",
        price: 5.99,
        brand: "GreekDairy",
        fatContent: "21%",
        weight: { value: 200, unit: "g" },
        shelfLife: "30 days",
    },
    {
        name: "Crumbly Feta 250g",
        description: "Pre-crumbled feta perfect for salads",
        sku: "CFE-060-250",
        categoryLevel2Slug: "feta",
        price: 5.49,
        brand: "SaladMate",
        fatContent: "20%",
        weight: { value: 250, unit: "g" },
        shelfLife: "28 days",
    },

    // Cream Cheese
    {
        name: "Cream Cheese 200g",
        description: "Smooth, spreadable cream cheese for bagels and desserts",
        sku: "CCH-061-200",
        categoryLevel2Slug: "cream-cheese",
        price: 3.49,
        brand: "SpreadDream",
        fatContent: "33%",
        weight: { value: 200, unit: "g" },
        shelfLife: "21 days",
    },
    {
        name: "Premium Cream Cheese 300g",
        description: "Rich cream cheese perfect for cheesecake and baking",
        sku: "PCC-062-300",
        categoryLevel2Slug: "cream-cheese",
        price: 4.99,
        brand: "BakersDelight",
        fatContent: "35%",
        weight: { value: 300, unit: "g" },
        shelfLife: "22 days",
    },

    // Parmesan
    {
        name: "Parmesan Cheese 100g",
        description: "Authentic Italian hard grating cheese",
        sku: "PC-063-100",
        categoryLevel2Slug: "parmesan",
        price: 7.99,
        brand: "ItalianMaster",
        fatContent: "28%",
        weight: { value: 100, unit: "g" },
        shelfLife: "90 days",
        discount: { type: "percentage", value: 5 },
    },
    {
        name: "Parmesan Block 250g",
        description: "Whole parmesan block for freshly grated cheese",
        sku: "PB-064-250",
        categoryLevel2Slug: "parmesan",
        price: 16.99,
        brand: "ParmaMaster",
        fatContent: "29%",
        weight: { value: 250, unit: "g" },
        shelfLife: "95 days",
    },

    // Gouda
    {
        name: "Young Gouda Cheese 200g",
        description: "Semi-hard Gouda with creamy texture",
        sku: "YGO-065-200",
        categoryLevel2Slug: "gouda",
        price: 5.49,
        brand: "DutchCheese",
        fatContent: "27%",
        weight: { value: 200, unit: "g" },
        shelfLife: "50 days",
    },
    {
        name: "Aged Gouda 250g",
        description: "Rich and complex aged Gouda cheese",
        sku: "AGO-066-250",
        categoryLevel2Slug: "gouda",
        price: 6.99,
        brand: "AgedMaster",
        fatContent: "28%",
        weight: { value: 250, unit: "g" },
        shelfLife: "80 days",
    },

    // Swiss Cheese
    {
        name: "Emmental Cheese 200g",
        description: "Swiss cheese with characteristic holes",
        sku: "EMT-067-200",
        categoryLevel2Slug: "swiss-cheese",
        price: 6.49,
        brand: "SwissAlps",
        fatContent: "29%",
        weight: { value: 200, unit: "g" },
        shelfLife: "60 days",
    },
    {
        name: "Sliced Swiss Cheese 150g",
        description: "Pre-sliced Swiss cheese for sandwiches",
        sku: "SSC-068-150",
        categoryLevel2Slug: "swiss-cheese",
        price: 5.49,
        brand: "EasySlice",
        fatContent: "27%",
        weight: { value: 150, unit: "g" },
        shelfLife: "35 days",
    },

    // Manchego
    {
        name: "Manchego Cheese 200g",
        description: "Spanish sheep's milk cheese with nutty flavor",
        sku: "MCH-069-200",
        categoryLevel2Slug: "manchego",
        price: 7.99,
        brand: "SpanishDairy",
        fatContent: "30%",
        weight: { value: 200, unit: "g" },
        shelfLife: "120 days",
    },

    // Roquefort
    {
        name: "Roquefort Blue Cheese 100g",
        description: "French sheep's milk blue cheese with distinct veins",
        sku: "RQF-070-100",
        categoryLevel2Slug: "roquefort",
        price: 8.99,
        brand: "FrenchBlue",
        fatContent: "30%",
        weight: { value: 100, unit: "g" },
        shelfLife: "60 days",
    },

    // Gorgonzola
    {
        name: "Gorgonzola Blue Cheese 150g",
        description: "Italian blue cheese with creamy interior",
        sku: "GRZ-071-150",
        categoryLevel2Slug: "gorgonzola",
        price: 7.49,
        brand: "ItalianBlue",
        fatContent: "29%",
        weight: { value: 150, unit: "g" },
        shelfLife: "50 days",
    },

    // Stilton
    {
        name: "Stilton Blue Cheese 120g",
        description: "English blue cheese with rich, creamy texture",
        sku: "STL-072-120",
        categoryLevel2Slug: "stilton",
        price: 7.99,
        brand: "EnglishBlue",
        fatContent: "31%",
        weight: { value: 120, unit: "g" },
        shelfLife: "45 days",
    },

    // Danish Blue
    {
        name: "Danish Blue Cheese 100g",
        description: "Smooth Danish blue cheese with mild flavor",
        sku: "DDB-073-100",
        categoryLevel2Slug: "danish-blue",
        price: 6.99,
        brand: "DanishDairy",
        fatContent: "27%",
        weight: { value: 100, unit: "g" },
        shelfLife: "50 days",
    },

    // Cheese Slices
    {
        name: "Processed Cheese Slices 200g",
        description: "Individual wrapped cheese slices for convenience",
        sku: "PCS-074-200",
        categoryLevel2Slug: "cheese-slices",
        price: 3.99,
        brand: "EasySlice",
        fatContent: "20%",
        weight: { value: 200, unit: "g" },
        shelfLife: "180 days",
    },
    {
        name: "Premium Cheese Slices 250g",
        description: "High-quality sliced cheese for sandwiches",
        sku: "PCS-075-250",
        categoryLevel2Slug: "cheese-slices",
        price: 4.99,
        brand: "SlicePerf",
        fatContent: "22%",
        weight: { value: 250, unit: "g" },
        shelfLife: "120 days",
        discount: { type: "percentage", value: 7 },
    },

    // Cheese Spreads
    {
        name: "Cheese Spread 200g",
        description: "Smooth spreadable cheese for bread and crackers",
        sku: "CSP-076-200",
        categoryLevel2Slug: "cheese-spreads",
        price: 2.99,
        brand: "SpreadEase",
        fatContent: "18%",
        weight: { value: 200, unit: "g" },
        shelfLife: "180 days",
    },
    {
        name: "Herb Cheese Spread 180g",
        description: "Cheese spread with herbs for enhanced flavor",
        sku: "HCS-077-180",
        categoryLevel2Slug: "cheese-spreads",
        price: 3.49,
        brand: "HerbDairy",
        fatContent: "17%",
        weight: { value: 180, unit: "g" },
        shelfLife: "150 days",
    },

    // Cheese Cubes
    {
        name: "Cheese Cubes Mix 150g",
        description: "Pre-cut mixed cheese cubes for easy snacking",
        sku: "CCB-078-150",
        categoryLevel2Slug: "cheese-cubes",
        price: 3.99,
        brand: "CubeCheese",
        fatContent: "22%",
        weight: { value: 150, unit: "g" },
        shelfLife: "14 days",
    },
    {
        name: "Cheddar Cheese Cubes 200g",
        description: "Cheddar cheese cut into convenient cubes",
        sku: "CHC-079-200",
        categoryLevel2Slug: "cheese-cubes",
        price: 4.49,
        brand: "CubeDelight",
        fatContent: "30%",
        weight: { value: 200, unit: "g" },
        shelfLife: "21 days",
    },

    // String Cheese
    {
        name: "Mozzarella String Cheese 200g",
        description: "Fun string cheese that pulls into strings",
        sku: "MSC-080-200",
        categoryLevel2Slug: "string-cheese",
        price: 4.29,
        brand: "StringFun",
        fatContent: "24%",
        weight: { value: 200, unit: "g" },
        shelfLife: "30 days",
        discount: { type: "percentage", value: 10 },
    },
    {
        name: "Smoked String Cheese 250g",
        description: "Smoked flavored string cheese for snacking",
        sku: "SSC-081-250",
        categoryLevel2Slug: "string-cheese",
        price: 4.99,
        brand: "SmokeString",
        fatContent: "25%",
        weight: { value: 250, unit: "g" },
        shelfLife: "35 days",
    },

    // Low-fat Yogurt
    {
        name: "Low-fat Plain Yogurt 500g",
        description: "Smooth low-fat yogurt with active cultures",
        sku: "LPY-082-500",
        categoryLevel2Slug: "low-fat-yogurt",
        price: 3.49,
        brand: "LightYogurt",
        fatContent: "1.5%",
        weight: { value: 500, unit: "g" },
        shelfLife: "24 days",
    },
    {
        name: "Organic Low-fat Yogurt 400g",
        description: "Certified organic low-fat yogurt",
        sku: "OLY-083-400",
        categoryLevel2Slug: "low-fat-yogurt",
        price: 4.29,
        brand: "OrganicYoga",
        fatContent: "1.7%",
        weight: { value: 400, unit: "g" },
        shelfLife: "22 days",
    },

    // Full-fat Yogurt
    {
        name: "Full-fat Plain Yogurt 500g",
        description: "Rich and creamy full-fat yogurt",
        sku: "FFY-084-500",
        categoryLevel2Slug: "full-fat-yogurt",
        price: 4.29,
        brand: "CreamYogurt",
        fatContent: "5%",
        weight: { value: 500, unit: "g" },
        shelfLife: "22 days",
    },
    {
        name: "Premium Full-fat Yogurt 450g",
        description: "Premium quality full-fat yogurt from grass-fed cows",
        sku: "PFY-085-450",
        categoryLevel2Slug: "full-fat-yogurt",
        price: 5.49,
        brand: "GrassFed",
        fatContent: "5.5%",
        weight: { value: 450, unit: "g" },
        shelfLife: "21 days",
    },

    // Vanilla Yogurt
    {
        name: "Vanilla Yogurt 500g",
        description: "Smooth yogurt with real vanilla flavor",
        sku: "VY-086-500",
        categoryLevel2Slug: "vanilla-yogurt",
        price: 3.79,
        brand: "VanillaBliss",
        fatContent: "3.5%",
        weight: { value: 500, unit: "g" },
        shelfLife: "21 days",
    },
    {
        name: "Premium Vanilla Yogurt 450g",
        description: "Rich vanilla yogurt with Madagascar vanilla extract",
        sku: "PVY-087-450",
        categoryLevel2Slug: "vanilla-yogurt",
        price: 4.49,
        brand: "VanillaPure",
        fatContent: "4%",
        weight: { value: 450, unit: "g" },
        shelfLife: "20 days",
        discount: { type: "percentage", value: 8 },
    },

    // Dessert Yogurt
    {
        name: "Chocolate Dessert Yogurt 400g",
        description: "Creamy chocolate dessert-style yogurt",
        sku: "CDY-088-400",
        categoryLevel2Slug: "dessert-yogurt",
        price: 3.99,
        brand: "DessertDream",
        fatContent: "4%",
        weight: { value: 400, unit: "g" },
        shelfLife: "18 days",
    },
    {
        name: "Caramel Dessert Yogurt 400g",
        description: "Sweet caramel-flavored dessert yogurt",
        sku: "CAD-089-400",
        categoryLevel2Slug: "dessert-yogurt",
        price: 4.29,
        brand: "CaramelDream",
        fatContent: "4%",
        weight: { value: 400, unit: "g" },
        shelfLife: "17 days",
    },

    // Probiotic Yogurt Drinks
    {
        name: "Probiotic Yogurt Drink 200ml",
        description: "Rich probiotic culture yogurt drink for digestive health",
        sku: "PYD-090-200",
        categoryLevel2Slug: "probiotic-yogurt-drinks",
        price: 2.49,
        brand: "ProBio",
        fatContent: "1.5%",
        weight: { value: 200, unit: "ml" },
        shelfLife: "14 days",
    },
    {
        name: "Multi-strain Probiotic Drink 250ml",
        description: "Yogurt drink with multiple probiotic strains",
        sku: "MPD-091-250",
        categoryLevel2Slug: "probiotic-yogurt-drinks",
        price: 3.29,
        brand: "ProHealth",
        fatContent: "1.5%",
        weight: { value: 250, unit: "ml" },
        shelfLife: "15 days",
    },

    // Sweetened Drinkable Yogurt
    {
        name: "Sweetened Yogurt Drink 500ml",
        description: "Sweet and refreshing yogurt beverage",
        sku: "SYD-092-500",
        categoryLevel2Slug: "sweetened-drinking-yogurt",
        price: 2.99,
        brand: "SweetYog",
        fatContent: "2%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "8 days",
    },
    {
        name: "Mango Yogurt Drink 500ml",
        description: "Tropical mango yogurt drink",
        sku: "MYD-093-500",
        categoryLevel2Slug: "sweetened-drinking-yogurt",
        price: 3.29,
        brand: "TropicalYog",
        fatContent: "2%",
        weight: { value: 500, unit: "ml" },
        shelfLife: "7 days",
        discount: { type: "percentage", value: 5 },
    },

    // Skyr
    {
        name: "Icelandic Skyr Plain 400g",
        description: "Thick Icelandic cultured dairy product with high protein",
        sku: "SKY-094-400",
        categoryLevel2Slug: "skyr",
        price: 5.99,
        brand: "IcelandicSkyr",
        fatContent: "0%",
        weight: { value: 400, unit: "g" },
        shelfLife: "20 days",
    },
    {
        name: "Skyr with Berries 400g",
        description: "Icelandic Skyr with mixed berry topping",
        sku: "SKB-095-400",
        categoryLevel2Slug: "skyr",
        price: 6.49,
        brand: "BerrySkyr",
        fatContent: "0.1%",
        weight: { value: 400, unit: "g" },
        shelfLife: "18 days",
    },

    // Labneh
    {
        name: "Labneh Plain 200g",
        description: "Middle Eastern strained yogurt with creamy texture",
        sku: "LAB-096-200",
        categoryLevel2Slug: "labneh",
        price: 4.49,
        brand: "MiddleEast",
        fatContent: "8%",
        weight: { value: 200, unit: "g" },
        shelfLife: "14 days",
    },
    {
        name: "Herb Labneh 180g",
        description: "Labneh with herbs and spices for dipping",
        sku: "HLB-097-180",
        categoryLevel2Slug: "labneh",
        price: 4.99,
        brand: "HerbedME",
        fatContent: "7.5%",
        weight: { value: 180, unit: "g" },
        shelfLife: "12 days",
    },

    // Gelato
    {
        name: "Gelato Pistachio 400ml",
        description: "Authentic Italian gelato with pistachio flavor",
        sku: "GP-098-400",
        categoryLevel2Slug: "gelato",
        price: 5.99,
        brand: "ItalianGelato",
        fatContent: "12%",
        weight: { value: 400, unit: "ml" },
        shelfLife: "180 days",
    },
    {
        name: "Gelato Hazelnut 400ml",
        description: "Rich hazelnut gelato Italian style",
        sku: "GH-099-400",
        categoryLevel2Slug: "gelato",
        price: 5.99,
        brand: "NutGelato",
        fatContent: "11%",
        weight: { value: 400, unit: "ml" },
        shelfLife: "180 days",
    },

    // Sorbet
    {
        name: "Raspberry Sorbet 400ml",
        description: "Dairy-free fruit ice with natural raspberry flavor",
        sku: "RS-100-400",
        categoryLevel2Slug: "sorbet",
        price: 4.49,
        brand: "FruitSorbet",
        fatContent: "0%",
        weight: { value: 400, unit: "ml" },
        shelfLife: "180 days",
        discount: { type: "percentage", value: 10 },
    },
];

const seedProducts = async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        let createdProducts = 0;
        let updatedProducts = 0;
        let createdInventories = 0;
        let updatedInventories = 0;

        for (const productData of productsData) {
            // Find category level 2 by slug
            const categoryLevel2 = await CategoryLevel2Repo.findOne({
                where: { slug: productData.categoryLevel2Slug },
                relations: ["categoryLevel1", "categoryLevel1.category"],
            });

            if (!categoryLevel2) {
                console.warn(`⚠ Category Level 2 not found for: ${productData.categoryLevel2Slug}`);
                continue;
            }

            // Calculate sale price based on discount
            let salePrice = productData.price;
            if (productData.discount) {
                salePrice = calculateSalePrice(productData.price, productData.discount);
            }

            // Check if product exists
            const existingProduct = await ProductRepo.findOneBy({ sku: productData.sku });
            let finalPrice = productData.price;
            let finalDiscount = productData.discount || null;
            let finalSalePrice = salePrice;

            // If product exists, randomize prices and discounts
            if (existingProduct) {
                finalPrice = generateRandomPrice();
                finalDiscount = generateRandomDiscount();
                finalSalePrice = calculateSalePrice(finalPrice, finalDiscount);
            }

            // Use TypeORM's upsert for optimized product creation/update
            const productPayload = {
                sku: productData.sku,
                name: productData.name,
                description: productData.description,
                categoryLevel2Id: categoryLevel2.id,
                categoryLevel1Id: categoryLevel2.categoryLevel1Id,
                categoryId: categoryLevel2.categoryLevel1.categoryId,
                price: finalPrice,
                salePrice: finalSalePrice,
                brand: productData.brand,
                fatContent: productData.fatContent,
                weight: productData.weight,
                shelfLife: productData.shelfLife,
                discount: finalDiscount,
                isActive: true,
            };

            // Upsert product (create if not exists, update if exists)
            const upsertResult = await ProductRepo.upsert([productPayload], {
                conflictPaths: ["sku"],
                skipUpdateIfNoValuesChanged: true,
            });

            // Check if it was an insert or update
            if (upsertResult.identifiers && upsertResult.identifiers.length > 0) {
                // Get the product (either newly created or existing)
                const product = await ProductRepo.findOneBy({ sku: productData.sku });

                if (product) {
                    // Create or update inventory using save (handles relationships better)
                    let inventory = await InventoryRepo.findOneBy({ productId: product.id });

                    if (!inventory) {
                        inventory = InventoryRepo.create({
                            productId: product.id,
                            product,
                            stockQuantity: generateRandomStock(),
                            reorderLevel: 10,
                            reservedQuantity: 0,
                            batchNumber: generateBatchNumber(productData.brand),
                            inStock: true,
                        });
                        await InventoryRepo.save(inventory);
                        createdInventories++;
                        console.log(`  ✓ Inventory created (stock: ${inventory.stockQuantity})`);
                    } else {
                        inventory.stockQuantity = generateRandomStock();
                        inventory.batchNumber = generateBatchNumber(productData.brand);
                        inventory.inStock = true;
                        await InventoryRepo.save(inventory);
                        updatedInventories++;
                        console.log(`  ↻ Inventory updated (stock: ${inventory.stockQuantity})`);
                    }

                    // Track product statistics
                    if (upsertResult.generatedMaps && upsertResult.generatedMaps.length > 0 && upsertResult.generatedMaps[0]?.id) {
                        createdProducts++;
                        console.log(`✓ Created: ${productData.name}`);
                        console.log(`  Price: ₹${finalPrice}, Sale: ₹${finalSalePrice}${finalDiscount ? `, ${finalDiscount.type === "percentage" ? finalDiscount.value + "%" : "₹" + finalDiscount.value}` : ""}`);
                    } else {
                        updatedProducts++;
                        console.log(`↻ Updated: ${productData.name}`);
                        console.log(`  Price: ₹${finalPrice}, Sale: ₹${finalSalePrice}${finalDiscount ? `, ${finalDiscount.type === "percentage" ? finalDiscount.value + "%" : "₹" + finalDiscount.value}` : ""}`);
                    }
                }
            }
        }

        const productsCount = await ProductRepo.count();
        const inventoriesCount = await InventoryRepo.count();

        console.log("\n========== SEEDING SUMMARY ==========");
        console.log(`✓ Total Products in DB: ${productsCount}`);
        console.log(`✓ Total Inventories in DB: ${inventoriesCount}`);
        console.log(`\nSeeding Statistics:`);
        console.log(`  • Products created: ${createdProducts}`);
        console.log(`  • Products updated: ${updatedProducts}`);
        console.log(`  • Inventories created: ${createdInventories}`);
        console.log(`  • Inventories updated: ${updatedInventories}`);
        console.log("====================================\n");
    } catch (error) {
        console.error("Error seeding products:", error);
        throw error;
    }
};

if (require.main === module) {
    seedProducts()
        .then(() => {
            console.log("\n✓ Products seeding completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n✗ Products seeding failed:", error);
            process.exit(1);
        });
}

export default seedProducts;
