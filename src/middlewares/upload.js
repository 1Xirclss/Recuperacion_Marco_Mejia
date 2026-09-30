import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "recuperacion-backend/usuarios",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
  },
});

const fileFilter = (_req, file, callback) => {
  if (file.mimetype.startsWith("image/")) return callback(null, true);
  return callback(new Error("Solo se permiten archivos de imagen"));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
