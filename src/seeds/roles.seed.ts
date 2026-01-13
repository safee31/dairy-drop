import { AppDataSource } from "@/config/database";
import { RoleRepo } from "@/models/repositories";
import { generateId } from "@/utils/helpers";

const seedRoles = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const roles = [
      {
        type: 1,
        name: "Admin",
        description: "Administrator role with full access",
        permissions: {},
      },
      {
        type: 2,
        name: "Customer",
        description: "Customer role for regular users",
        permissions: {},
      },
      {
        type: 3,
        name: "Vendor",
        description: "Vendor role for sellers",
        permissions: {},
      },
    ];

    for (const roleData of roles) {
      const existingRole = await RoleRepo.findOneBy({ type: roleData.type });

      if (!existingRole) {
        const role = RoleRepo.create({
          id: generateId(),
          type: roleData.type,
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          isActive: true,
        });
        await RoleRepo.save(role);
        console.log(`✓ ${roleData.name} role created`);
      } else {
        console.log(`✓ ${roleData.name} role already exists`);
      }
    }
  } catch (error) {
    console.error("Error seeding roles:", error);
    throw error;
  }
};

if (require.main === module) {
  seedRoles()
    .then(() => {
      console.log("✓ Roles seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("✗ Roles seeding failed:", error);
      process.exit(1);
    });
}

export default seedRoles;
