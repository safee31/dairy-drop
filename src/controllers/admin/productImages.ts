import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { ProductRepo } from "@/models/repositories";
import {
    bulkInsertImages,
    addImage,
    replaceImage,
    deleteImageById,
    getProductImages,
    setPrimaryImage,
} from "@/services/productImage";

/**
 * GET /products/:id/images - List all images for a product
 */
export const listProductImages = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify product exists
    const product = await ProductRepo.findOne({ where: { id } });
    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    const images = await getProductImages(id);

    return responseHandler.success(res, images, "Product images retrieved successfully");
});

/**
 * POST /products/:id/images - Bulk upload multiple images (up to 5 per product)
 * Called from FE after product creation
 */
export const uploadProductImages = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
        return responseHandler.error(res, "No images provided", 400);
    }

    // Verify product exists
    const product = await ProductRepo.findOne({ where: { id } });
    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    const images = await bulkInsertImages(id, req.files as Express.Multer.File[]);

    auditLogger.info("Product images bulk uploaded", {
        productId: id,
        imageCount: images.length,
    });

    return responseHandler.success(res, images, "Images uploaded successfully", 201);
});

/**
 * POST /products/:id/images/add - Add single image to product
 */
export const addProductImage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
        return responseHandler.error(res, "No image provided", 400);
    }

    // Verify product exists
    const product = await ProductRepo.findOne({ where: { id } });
    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    const image = await addImage(id, req.file);

    auditLogger.info("Product image added", {
        productId: id,
        imageId: image.id,
    });

    return responseHandler.success(res, image, "Image added successfully", 201);
});

/**
 * PATCH /products/:id/images/:imageId - Replace/update single image
 * User can replace one image at a time
 */
export const updateProductImage = asyncHandler(async (req, res) => {
    const { id, imageId } = req.params;

    if (!req.file) {
        return responseHandler.error(res, "No image provided", 400);
    }

    // Verify product exists
    const product = await ProductRepo.findOne({ where: { id } });
    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    const image = await replaceImage(imageId, req.file);

    auditLogger.info("Product image updated", {
        productId: id,
        imageId,
    });

    return responseHandler.success(res, image, "Image updated successfully");
});

/**
 * DELETE /products/:id/images/:imageId - Delete single image
 */
export const deleteProductImage = asyncHandler(async (req, res) => {
    const { id, imageId } = req.params;

    // Verify product exists
    const product = await ProductRepo.findOne({ where: { id } });
    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    await deleteImageById(imageId);

    auditLogger.info("Product image deleted", {
        productId: id,
        imageId,
    });

    return responseHandler.success(res, null, "Image deleted successfully");
});

/**
 * PATCH /products/:id/images/:imageId/set-primary - Set image as primary
 */
export const setProductPrimaryImage = asyncHandler(async (req, res) => {
    const { id, imageId } = req.params;

    // Verify product exists
    const product = await ProductRepo.findOne({ where: { id } });
    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    const image = await setPrimaryImage(imageId);

    auditLogger.info("Primary product image set", {
        productId: id,
        imageId,
    });

    return responseHandler.success(res, image, "Primary image set successfully");
});

export default {
  listProductImages,
  uploadProductImages,
  addProductImage,
  updateProductImage,
  deleteProductImage,
  setProductPrimaryImage,
};
