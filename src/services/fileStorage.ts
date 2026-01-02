import path from "path";
import { extractFolderAndFilename, validateKey } from "@/utils/file";
import { promises as fs } from "fs";

const deleteFileFromServer = async ({ fileName, folder }: { fileName: string; folder: string }) => {
  if (!fileName || !folder) {
    console.error({ fileName, folder });
    throw new Error(
      "Missing required parameters for deleting file from server."
    );
  }

  // Construct the full file path (uploads/folder/fileName)
  const filePath = path.join(process.cwd(), "uploads", folder, fileName);

  try {
    // Check if file exists first
    try {
      await fs.access(filePath);
    } catch (err) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Delete the file
    await fs.unlink(filePath);

    return {
      success: true,
      message: "File deleted successfully",
      path: `/${folder}/${fileName}`, // Returns path in same format as upload
    };
  } catch (error) {
    console.error("Error deleting file from server:", error);
    throw new Error(`Failed to delete file from server: ${(error as Error).message}`);
  }
};

const updateFileOnServer = async ({ file, originalKey }: { file: Express.Multer.File; originalKey: string }) => {
  // Validate the key format - EXACTLY like S3 version
  validateKey(originalKey);

  // Extract folder and filename - EXACTLY like S3 version
  const { folder, fileName } = extractFolderAndFilename(originalKey);

  // Prepare the file buffer - EXACTLY like S3 version
  const buffer = file.buffer || (await fs.readFile(file.path));
  //   const mimeType = file.mimetype;

  // Local file path construction
  const localFolderPath = path.join(process.cwd(), "uploads", folder);
  const localFilePath = path.join(localFolderPath, fileName);

  try {
    // Ensure directory exists
    await fs.mkdir(localFolderPath, { recursive: true });

    // Write the file - replacing if exists
    await fs.writeFile(localFilePath, buffer);

    // Return result in S3-like format
    return {
      fileName: originalKey, // Maintaining same return structure
      localPath: originalKey, // Using originalKey to match your S3 response
      originalName: file.originalname,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error("Error updating file:", error);
    throw new Error(`Failed to update file: ${(error as Error).message}`);
  } finally {
    // Clean up temp file if exists - EXACTLY like S3 version
    if (file.path) await fs.unlink(file.path).catch(() => {});
  }
};

export default { deleteFileFromServer, updateFileOnServer };
