import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { extractFolderAndFilename } from "./file";

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const QUALITY = 85;

export const validateImage = (file: Express.Multer.File): void => {
  if (!file) {
    throw new Error("No image file provided");
  }

  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    throw new Error("Invalid file type. Only JPG, PNG and WEBP are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image size exceeds 2MB limit");
  }
};

export const convertToWebp = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .webp({ quality: QUALITY })
    .toBuffer();
};

export const saveImage = async (
  file: Express.Multer.File,
  folder: string = "profiles",
): Promise<string> => {
  validateImage(file);

  const timestamp = Date.now();
  const fileName = `${folder}-${timestamp}.webp`;
  const folderPath = path.join(process.cwd(), "uploads", folder);
  const filePath = path.join(folderPath, fileName);

  await fs.mkdir(folderPath, { recursive: true });

  const webpBuffer = await convertToWebp(file.buffer);
  await fs.writeFile(filePath, webpBuffer);

  return `/uploads/${folder}/${fileName}`;
};

export const updateImage = async (
  file: Express.Multer.File,
  oldImagePath: string | null,
  folder: string = "profiles",
): Promise<string> => {
  validateImage(file);

  if (oldImagePath) {
    await deleteImage(oldImagePath);
  }

  return await saveImage(file, folder);
};

export const deleteImage = async (imagePath: string | null): Promise<void> => {
  if (!imagePath) return;

  try {
    const cleanPath = imagePath.replace("/uploads/", "");
    const { folder, fileName } = extractFolderAndFilename(cleanPath);
    const filePath = path.join(process.cwd(), "uploads", folder, fileName);

    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(`Failed to delete image: ${(error as Error).message}`);
    }
  }
};

export default {
  validateImage,
  convertToWebp,
  saveImage,
  updateImage,
  deleteImage,
};


