import { v2 as cloudinary } from "cloudinary";

export const deleteImage = async (publicId) => {
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
};
