import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { HeroSectionRepo } from "@/models/repositories";

const listActiveHeroSections = asyncHandler(async (_req, res) => {
    const sections = await HeroSectionRepo.find({
        where: { isActive: true },
        order: { displayOrder: "ASC" },
    });

    return responseHandler.success(
        res,
        sections,
        "Active hero sections retrieved successfully",
    );
});

const getHeroSectionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const section = await HeroSectionRepo.findOne({
        where: { id, isActive: true },
    });

    if (!section) {
        return responseHandler.error(res, "Hero section not found", 404);
    }

    return responseHandler.success(res, section, "Hero section retrieved successfully");
});

export default {
    listActiveHeroSections,
    getHeroSectionById,
};
