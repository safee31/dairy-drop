import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { HeroSectionRepo } from "@/models/repositories";
import { updateImage, deleteImage } from "@/utils/image";

const HERO_IMAGE_FOLDER = "hero-sections";

const getAllHeroSections = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "", sortBy = "displayOrder", order = "ASC" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const queryBuilder = HeroSectionRepo.createQueryBuilder("heroSection")
        .select([
            "heroSection.id",
            "heroSection.title",
            "heroSection.description",
            "heroSection.imageUrl",
            "heroSection.imageAlt",
            "heroSection.cta",
            "heroSection.displayOrder",
            "heroSection.isActive",
            "heroSection.createdAt",
            "heroSection.updatedAt",
        ]);

    if (search) {
        queryBuilder.andWhere(
            "(heroSection.title ILIKE :search OR heroSection.description ILIKE :search)",
            { search: `%${search}%` }
        );
    }

    const total = await queryBuilder.getCount();

    const sections = await queryBuilder
        .orderBy(
            `heroSection.${String(sortBy)}`,
            String(order).toUpperCase() as "ASC" | "DESC"
        )
        .skip(skip)
        .take(Number(limit))
        .getMany();

    return responseHandler.success(
        res,
        {
            sections,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
        "Hero sections retrieved successfully"
    );
});

const getHeroSectionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const section = await HeroSectionRepo.findOne({
        where: { id },
    });

    if (!section) {
        return responseHandler.error(res, "Hero section not found", 404);
    }

    return responseHandler.success(res, section, "Hero section retrieved successfully");
});

const createHeroSection = asyncHandler(async (req, res) => {
    const { title, description, imageAlt, cta, displayOrder } = req.body;

    if (!cta?.text || !cta?.link) {
        return responseHandler.error(res, "CTA must have text and link properties", 400);
    }

    const section = HeroSectionRepo.create({
        title,
        description,
        imageAlt: imageAlt || null,
        cta,
        displayOrder: Number(displayOrder),
        isActive: true,
        createdBy: req.user?.userId || "system",
    });

    await HeroSectionRepo.save(section);

    auditLogger.info("Hero section created", {
        sectionId: section.id,
        title: section.title,
        displayOrder: section.displayOrder,
    });

    return responseHandler.success(
        res,
        section,
        "Hero section created successfully",
        201
    );
});

const updateHeroSection = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, imageAlt, cta, displayOrder } = req.body;

    const section = await HeroSectionRepo.findOne({ where: { id } });
    if (!section) {
        return responseHandler.error(res, "Hero section not found", 404);
    }

    if (cta) {
        if (!cta?.text || !cta?.link) {
            return responseHandler.error(res, "CTA must have text and link properties", 400);
        }
        section.cta = cta;
    }

    if (title !== undefined) section.title = title;
    if (description !== undefined) section.description = description;
    if (imageAlt !== undefined) section.imageAlt = imageAlt || null;
    if (displayOrder !== undefined) section.displayOrder = Number(displayOrder);

    section.updatedBy = req.user?.userId || "system";
    await HeroSectionRepo.save(section);

    auditLogger.info("Hero section updated", {
        sectionId: section.id,
        title: section.title,
    });

    return responseHandler.success(
        res,
        section,
        "Hero section updated successfully"
    );
});

const uploadHeroImage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const section = await HeroSectionRepo.findOne({ where: { id } });
    if (!section) {
        return responseHandler.error(res, "Hero section not found", 404);
    }

    if (!req.file) {
        return responseHandler.error(res, "Image file is required", 400);
    }

    const newImageUrl = await updateImage(req.file, section.imageUrl || null, HERO_IMAGE_FOLDER);
    section.imageUrl = newImageUrl;
    section.updatedBy = req.user?.userId || "system";

    await HeroSectionRepo.save(section);

    return responseHandler.success(res, section, "Hero image uploaded successfully");
});

const deleteHeroSection = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const section = await HeroSectionRepo.findOne({ where: { id } });
    if (!section) {
        return responseHandler.error(res, "Hero section not found", 404);
    }

    if (section.imageUrl) {
        await deleteImage(section.imageUrl);
    }

    await HeroSectionRepo.remove(section);

    auditLogger.info("Hero section deleted", {
        sectionId: section.id,
        title: section.title,
    });

    return responseHandler.success(res, null, "Hero section deleted successfully");
});

const toggleHeroSectionStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const section = await HeroSectionRepo.findOne({ where: { id } });
    if (!section) {
        return responseHandler.error(res, "Hero section not found", 404);
    }

    section.isActive = !section.isActive;
    section.updatedBy = req.user?.userId || "system";

    await HeroSectionRepo.save(section);

    auditLogger.info("Hero section status toggled", {
        sectionId: section.id,
        isActive: section.isActive,
    });

    return responseHandler.success(
        res,
        section,
        `Hero section ${section.isActive ? "activated" : "deactivated"}`
    );
});

export default {
    getAllHeroSections,
    getHeroSectionById,
    createHeroSection,
    updateHeroSection,
    uploadHeroImage,
    deleteHeroSection,
    toggleHeroSectionStatus,
};
