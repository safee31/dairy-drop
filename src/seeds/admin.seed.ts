import { AppDataSource } from "@/config/database";
import { UserRepo, RoleRepo } from "@/models/repositories";
import { authUtils } from "@/models/user/utils";
import config from "@/config/env";
import { generateId } from "@/utils/helpers";

const seedAdmin = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    let adminRole = await RoleRepo.findOneBy({ type: 1 });

    if (!adminRole) {
      adminRole = RoleRepo.create({
        id: generateId(),
        name: "Admin",
        type: 1,
        description: "Administrator role",
        permissions: {},
        isActive: true,
      });
      await RoleRepo.save(adminRole);
      console.log("✓ Admin role created");
    }

    const adminEmail = "dairy.drop@admin.com";
    const existingAdmin = await UserRepo.findOneBy({ email: adminEmail });

    if (existingAdmin) {
      console.log("✓ Admin user already exists");
      return;
    }

    const hashedPassword = await authUtils.hashPassword(
      "Dairy*drop123",
      config.BCRYPT_SALT_ROUNDS,
    );

    const adminUser = UserRepo.create({
      id: generateId(),
      email: adminEmail,
      password: hashedPassword,
      fullName: "Admin User",
      roleId: adminRole.id,
      isVerified: true,
      isActive: true,
      phoneNumber: null,
      profileImage: null,
    });

    await UserRepo.save(adminUser);
    console.log("✓ Admin user created successfully");
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: Dairy*drop123`);
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  }
};

if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log("✓ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("✗ Seeding failed:", error);
      process.exit(1);
    });
}

export default seedAdmin;

