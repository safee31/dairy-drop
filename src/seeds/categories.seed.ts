import { AppDataSource } from "@/config/database";
import { CategoryRepo, CategoryLevel1Repo, CategoryLevel2Repo } from "@/models/repositories";
import { generateId } from "@/utils/helpers";
import categoriesData from "./categories.json";

interface CategoryLevel2Item {
    name: string;
    description: string;
    slug: string;
    displayOrder: number;
}

interface CategoryLevel1Item {
    name: string;
    description: string;
    slug: string;
    displayOrder: number;
    level2: CategoryLevel2Item[];
}

interface CategoryItem {
    name: string;
    description: string;
    slug: string;
    displayOrder: number;
    level1: CategoryLevel1Item[];
}

const seedCategories = async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const categories = categoriesData.categories as CategoryItem[];

        for (const categoryData of categories) {
            let category = await CategoryRepo.findOneBy({ slug: categoryData.slug });

            if (!category) {
                category = CategoryRepo.create({
                    id: generateId(),
                    name: categoryData.name,
                    slug: categoryData.slug,
                    description: categoryData.description,
                    displayOrder: categoryData.displayOrder,
                    isActive: true,
                });
                await CategoryRepo.save(category);
            }

            for (const level1Data of categoryData.level1) {
                let level1 = await CategoryLevel1Repo.findOneBy({
                    slug: level1Data.slug,
                    categoryId: category.id,
                });

                if (!level1) {
                    level1 = CategoryLevel1Repo.create({
                        id: generateId(),
                        name: level1Data.name,
                        slug: level1Data.slug,
                        description: level1Data.description,
                        displayOrder: level1Data.displayOrder,
                        category: category,
                        categoryId: category.id,
                        isActive: true,
                    });
                    await CategoryLevel1Repo.save(level1);
                }

                for (const level2Data of level1Data.level2) {
                    const existingLevel2 = await CategoryLevel2Repo.findOneBy({
                        slug: level2Data.slug,
                        categoryLevel1Id: level1.id,
                    });

                    if (!existingLevel2) {
                        const level2 = CategoryLevel2Repo.create({
                            id: generateId(),
                            name: level2Data.name,
                            slug: level2Data.slug,
                            description: level2Data.description,
                            displayOrder: level2Data.displayOrder,
                            categoryLevel1Id: level1.id,
                            categoryLevel1: level1,
                            categoryId: category.id,
                            isActive: true,
                        });
                        await CategoryLevel2Repo.save(level2);
                    }
                }
            }
        }

        // Get counts from all 3 tables
        const categoriesCount = await CategoryRepo.count();
        const level1Count = await CategoryLevel1Repo.count();
        const level2Count = await CategoryLevel2Repo.count();

        console.log("\n========== SEEDING SUMMARY ==========");
        console.log(`✓ Categories: ${categoriesCount}`);
        console.log(`✓ Level 1 Categories: ${level1Count}`);
        console.log(`✓ Level 2 Categories: ${level2Count}`);
        console.log("====================================\n");
    } catch (error) {
        console.error("Error seeding categories:", error);
        throw error;
    }
};

if (require.main === module) {
    seedCategories()
        .then(() => {
            console.log("\n✓ Categories seeding completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n✗ Categories seeding failed:", error);
            process.exit(1);
        });
}

export default seedCategories;
