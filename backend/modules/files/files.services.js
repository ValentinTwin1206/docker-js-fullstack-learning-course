import mongoose from "mongoose"
import File     from "./files.model.js";


/**
 * Create a new file entry in the database.
 * @param {Object} fileData - { originalName, filename, mimetype, size, path, uploadedBy }
 * @returns {Promise<File>}
 */
export const createFile = async fileData => {
  const { 
    originalName,
    filename,
    mimetype,
    size,
    filecontent,
    uploadedBy,
    fileStorageId,
    isBinary } = fileData;
  
  const newFile = new File({
    originalName,
    filename,
    filecontent,
    mimetype,
    size,
    uploadedBy,
    fileStorageId,
    isBinary,
  });

  return await newFile.save();
};

/**
 * Delete one file by its ID.
 * @param {string} id
 * @returns {Promise<File|null>}
 */
export const deleteFile = async id => {
  const file = await File.findById(id);
  if (!file) return null;

  await file.deleteOne();
  return file;
};

/**
 * Get one file by its ID.
 * @param {string} id
 * @returns {Promise<File|null>}
 */
export const getFile = async id => {
  return await File.findById(id);
};

/**
 * Get all files from the database.
 * @returns {Promise<File[]>}
 */
export const getFiles = async username => {
  return await File.find({ uploadedBy: username })
    .sort({ createdAt: -1 })
    .select('-filecontent');
};

/**
 * Get paginated files from the database without filecontent.
 * @param {Object} options
 * @param {number} options.page - 1-based page number
 * @param {number} options.limit - number of items per page
 * @param {string} options.username - name of the user that uploaded the file
 * @returns {Promise<{ files: File[], total: number, page: number, totalPages: number }>}
 */
export const getFilesPaginated = async ({ page = 1, limit = 10, username, search } = {}) => {
  const query = username ? { uploadedBy: username } : {};

  if (search && search.trim().length >= 2)
    query.originalName = { $regex: search.trim(), $options: 'i' };

  const total = await File.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const files = await File.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-filecontent');

  return { files, total, page, totalPages };
};

/**
 * Get the GridFS metadata document for a file.
 * Looks up the record in the uploads.files collection by its _id.
 *
 * @param {mongoose.Types.ObjectId} fileStorageId - The GridFS ObjectId to look up
 * @returns {Promise<Object|null>} - The metadata document or null if not found
 */
export const getGridFsMetadata = async fileStorageId => {
  if (!fileStorageId)
    throw new Error('fileStorageId is required to fetch GridFS metadata');

  // GridFS metadata is stored in uploads.files collection
  const filesColl = mongoose.connection.db.collection('uploads.files');
  const fileDoc = await filesColl.findOne({ _id: fileStorageId });

  return fileDoc;
};