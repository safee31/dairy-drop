import { ProductImageRepo } from "@/models/repositories";
import { saveImage, updateImage, deleteImage } from "@/utils/image";
import { CustomError } from "@/utils/customError";

const PRODUCT_IMAGE_FOLDER = "products";
const MAX_IMAGES_PER_PRODUCT = 5;

/**
 * Validate image count does not exceed limit
 */
export const validateImageCount = async (productId: string, allowedAdditional: number = 0): Promise<number> => {
    const currentCount = await ProductImageRepo.count({ where: { productId } });
    const totalAfter = currentCount + allowedAdditional;

    if (totalAfter > MAX_IMAGES_PER_PRODUCT) {
        return Promise.reject(new CustomError(
            `Product can have maximum ${MAX_IMAGES_PER_PRODUCT} images. Current: ${currentCount}`,
            409,
        ));
    }

    return currentCount;
};

/**
 * Bulk insert images for a product (e.g., during product creation via image upload)
 * Uses QueryBuilder for performance
 */
export const bulkInsertImages = async (
    productId: string,
    files: Express.Multer.File[],
): Promise<any[]> => {
    if (!files || files.length === 0) {
        return [];
    }

    // Validate count
    await validateImageCount(productId, files.length);

    // Save all files to disk
    const savedPaths = await Promise.all(
        files.map((file) => saveImage(file, PRODUCT_IMAGE_FOLDER)),
    );

    // Prepare bulk insert values
    const imagesValues = savedPaths.map((imagePath, index) => ({
        imageUrl: imagePath,
        productId,
        isPrimary: index === 0, // First image is primary
        displayOrder: index,
    }));

    // Bulk insert all at once
    const result = await ProductImageRepo.createQueryBuilder()
        .insert()
        .values(imagesValues)
        .returning("*")
        .execute();

    return result.generatedMaps || [];
};

/**
 * Add single image to product (separate API call)
 */
export const addImage = async (productId: string, file: Express.Multer.File): Promise<any> => {
    await validateImageCount(productId, 1);

    // Get next display order
    const maxOrder = await ProductImageRepo.createQueryBuilder("image")
        .select("MAX(image.displayOrder)", "maxOrder")
        .where("image.productId = :productId", { productId })
        .getRawOne();

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    // Save file
    const imagePath = await saveImage(file, PRODUCT_IMAGE_FOLDER);

    // Insert image
    const image = ProductImageRepo.create({
        imageUrl: imagePath,
        productId,
        isPrimary: false,
        displayOrder: nextOrder,
    });

    return await ProductImageRepo.save(image);
};

/**
 * Replace single image (re-upload one image at a time)
 */
export const replaceImage = async (imageId: string, file: Express.Multer.File): Promise<any> => {
    const image = await ProductImageRepo.findOne({ where: { id: imageId } });

    if (!image) {
        throw new CustomError("Image not found", 404);
    }

    // Delete old file and save new one
    const newPath = await updateImage(file, image.imageUrl, PRODUCT_IMAGE_FOLDER);

    image.imageUrl = newPath;
    return await ProductImageRepo.save(image);
};

/**
 * Delete single image by ID
 */
export const deleteImageById = async (imageId: string): Promise<void> => {
    const image = await ProductImageRepo.findOne({ where: { id: imageId } });

    if (!image) {
        throw new CustomError("Image not found", 404);
    }

    // Delete file from disk
    await deleteImage(image.imageUrl);

    // Delete database record
    await ProductImageRepo.remove(image);
};

/**
 * Get all images for a product
 */
export const getProductImages = async (productId: string): Promise<any[]> => {
    return await ProductImageRepo.find({
        where: { productId },
        order: { displayOrder: "ASC" },
    });
};

/**
 * Set primary image for a product
 */
export const setPrimaryImage = async (imageId: string): Promise<any> => {
    const image = await ProductImageRepo.findOne({ where: { id: imageId } });

    if (!image) {
        throw new CustomError("Image not found", 404);
    }

    // Reset all images for this product to non-primary
    await ProductImageRepo.createQueryBuilder()
        .update()
        .set({ isPrimary: false })
        .where("productId = :productId", { productId: image.productId })
        .execute();

    // Set this one as primary
    image.isPrimary = true;
    return await ProductImageRepo.save(image);
};
