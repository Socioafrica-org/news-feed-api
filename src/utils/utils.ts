import { UploadApiOptions, v2 as cloudinary } from "cloudinary";
import DataURIParser from "datauri/parser";
import path from "path";

/**
 * * Uploads a file to cloudinary object storage
 * @param file The file to be uploaded, typically a multer object
 * @param options The options configuration containing the folder, resource_type, etc...
 * @returns object
 */
export const upload_file_to_cloudinary = async (
  file: Express.Multer.File,
  options?: UploadApiOptions
) => {
  // * Connect to the cloudinary API
  cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  });

  const parser = new DataURIParser();
  const base_64_file = parser.format(
    path.extname(file.originalname).toString(),
    file.buffer
  );

  if (base_64_file && base_64_file.content) {
    return await cloudinary.uploader.upload(base_64_file.content, {
      resource_type: "auto",
      ...options,
    });
  } else {
    throw new Error("Couldn't upload file to object storage");
  }
};
