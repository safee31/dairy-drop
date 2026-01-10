import multer from "multer";

// Use memory storage so we can handle files in memory and pass buffers
const storage = multer.memoryStorage();

// Allowed mime types for profile images
const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];

// Max file size: 2MB
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;

const fileFilter = (_req: any, file: any, cb: any) => {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only JPG, PNG and WEBP are allowed."), false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter,
});

// Helper to use single file field easily
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

export default upload;
