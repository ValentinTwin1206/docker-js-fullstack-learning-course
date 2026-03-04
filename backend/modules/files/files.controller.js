import { 
  StatusCodes
} from "http-status-codes";
import { 
  isBinaryFile
} from "isbinaryfile";
import {
  PassThrough
} from "stream";

// own imports
import { 
  app 
} from "../../config/index.js";
import { 
  createFile, 
  deleteFile, 
  getFile, 
  getFiles,
  getFilesPaginated,
  getGridFsMetadata
} from './files.services.js';
import { 
  BadRequestError, 
  ForbiddenError, 
  NotFoundError 
} from '../../common/utils/custom.errors.js';


/**
 * Controller for handling high-performance file uploads to GridFS with 
 * parallel metadata storage in MongoDB.
 *
 * This controller utilizes a "Peek and Pipe" streaming pattern:
 * 1. Peeks the first 8KB of the incoming stream to detect binary vs text content.
 * 2. Reconstructs the stream using a PassThrough buffer.
 * 3. Pipes the stream directly to GridFS to ensure constant memory O(1) usage.
 * 4. Persists file metadata and the GridFS reference ID to the database.
 *
 * @param {import('fastify').FastifyRequest} req - Fastify request containing the multipart file stream.
 * @param {import('fastify').FastifyReply} reply - Fastify reply object.
 * @returns {Promise<object>} Sanitized file metadata and success status.
 * @throws {BadRequestError} If the multipart file is missing.
 * @throws {ForbiddenError} If the 'uploadedBy' field does not match the session user.
 * @throws {InternalServerError} If the GridFS write stream encounters an error.
 */
export const createFileController = async (req, reply) => {
  // Parse multipart file
  const mp = await req.file({ limits: { fileSize: 50 * 1024 * 1024 } });
  if (!mp) throw new BadRequestError('No file uploaded');

  const { filename, mimetype, file, fields } = mp;
  const uploadedBy = fields?.uploadedBy?.value;

  // 1. Authorization Check
  if (!uploadedBy || uploadedBy !== req.user.username) {
    app.log.warn(`Auth mismatch: session user '${req.user.username}' vs field '${uploadedBy}'`);
    throw new ForbiddenError();
  }

  // 2. The "Peeking" Logic (Non-blocking)
  // We siphon a small portion to detect file type without buffering the whole file
  const PEEK_SIZE = 8192;
  let isBinary = false;

  const firstChunk = await new Promise((resolve) => {
    file.once('readable', () => {
      const chunk = file.read(PEEK_SIZE) || file.read();
      resolve(chunk);
    });
  });

  if (firstChunk) isBinary = await isBinaryFile(firstChunk, firstChunk.length);

  app.log.debug(`Detected ${isBinary ? 'binary' : 'text'} for ${filename}`);

  // 3. Reconstruct the Stream
  // We use PassThrough to combine the 'peeked' chunk with the remaining stream
  const combinedStream = new PassThrough();
  
  if (firstChunk) combinedStream.write(firstChunk);

  file.pipe(combinedStream);

  // 4. Open GridFS Upload Stream
  const uploadStream = app.gfs.openUploadStream(filename, {
    contentType: mimetype,
    metadata: { uploadedBy },
  });

  // 5. Execute Pipe to GridFS
  try {
    await new Promise((resolve, reject) => {
      combinedStream.pipe(uploadStream)
        .on('error', (err) => {
          app.log.error(`GridFS Pipe Error: ${err.message}`);
          reject(err);
        })
        .on('finish', resolve);
    });
  } catch (err) {
    throw new InternalServerError('GridFS Upload Failed');
  }

  // 6. Save Metadata in MongoDB
  const fileDoc = await createFile({
    originalName: filename,
    filename,
    mimetype,
    size: uploadStream.length,
    uploadedBy,
    fileStorageId: uploadStream.id,
    isBinary,
  });

  app.log.debug(`Upload successful. ID: ${fileDoc._id}, Size: ${uploadStream.length} bytes`);

  // Prepare response
  const fileData = fileDoc.toObject();
  delete fileData.filecontent; // Ensure internal fields are stripped

  return reply.code(StatusCodes.CREATED).send({
    success: true,
    message: 'File uploaded successfully',
    data: fileData,
    statusCode: StatusCodes.CREATED
  });
};


/**
 * Controller for handling deletion of a file by ID.
 *
 * @param {object} req - Fastify request object with params.id.
 * @param {object} reply - Fastify reply object.
 * @throws {NotFoundError} If the file does not exist.
 * @throws {ForbiddenError} If the file does not belong to the user.
 */
export const deleteFileController = async (req, reply) => {
  const fileDoc = await getFile(req.params.id);
  if (!fileDoc) 
    throw new NotFoundError();
  
  if (fileDoc.uploadedBy !== req.user.username) {
    app.log.warn(`User from request '${req.user.username}' and from body '${fileDoc.uploadedBy}' are unequal`)
    throw new ForbiddenError();
  }

  // Delete from GridFS
  await app.gfs.delete(fileDoc.fileStorageId);

  // Delete metadata
  const { id } = await deleteFile(req.params.id);

  return reply.code(StatusCodes.OK).send({ 
    success: true, 
    message: 'File deleted successfully',
    data: { 
      id: id
    },
    statusCode: StatusCodes.OK
  });
};

/**
 * Controller for handling downloads of a file by ID and to
 * get the file content.
 *
 * @param {object} req - Fastify request object with params.id.
 * @param {object} reply - Fastify reply object.
 * @throws {NotFoundError} If the file does not exist.
 * @throws {ForbiddenError} If the file does not belong to the user.
 */
export const getFileController = async (req, reply) => {

  app.log.debug(`Fetching file '${req.params.id}' for user '${req.user.username}'`);

  const fileDoc = await getFile(req.params.id);
  if (!fileDoc)
    throw new NotFoundError();

  if (fileDoc.uploadedBy !== req.user.username) {
    app.log.warn(`User from request '${req.user.username}' and from body '${fileDoc.uploadedBy}' are unequal`)
    throw new ForbiddenError();
  }

  reply.header('Content-Type', fileDoc.mimetype);
  reply.header('Content-Disposition', `inline; filename="${fileDoc.originalName}"`);

  try {
    const gridFsFile = await getGridFsMetadata(fileDoc.fileStorageId);
    if (gridFsFile?.length)
      reply.header('Content-Length', gridFsFile.length);

  } catch (err) {
    app.log.warn(`Could not fetch metadata for ${fileDoc.fileStorageId}`)
    app.log.error(err.message);
  }

  // Open a download stream from GridFS
  const downloadStream = app.gfs.openDownloadStream(fileDoc.fileStorageId);

  // Handle stream errors and end
  downloadStream.on('error', (err) => {
    app.log.warn(`Could not stream file '${fileDoc.originalName}'`)
    app.log.error(err.message);

    // If an error happens before headers/body start, send an error response.
    // Otherwise destroy the socket to stop the stream.
    try {
      // If reply hasn't been sent, send an error
      if (!reply.sent)
        reply.code(500).send({ success: false, error: 'Failed to read file from storage' });

      else
        // response already streaming; close raw stream
        reply.raw.destroy(err);
    
    } catch (err) {
      app.log.error('Error while handling file stream');
      app.log.error(err.message)
      reply.raw.destroy();
    }
  });

  downloadStream.on('end', () => {
    app.log.debug(`Finished streaming file '${fileDoc.originalName}'`);
  });

  return reply.send(downloadStream);
};

/**
 * Controller for fetching all files metadata without the file 
 * content for a given user.
 *
 * @param {object} req - Fastify request object with query.username.
 * @param {object} reply - Fastify reply object.
 * @throws {ForbiddenError} If query.username does not match authenticated user.
 */
export const getFilesController = async (req, reply) => {
  
  if( req.user.username != req.query.username) {
    app.log.warn(`User from request '${req.user.username}' and from query '${req.query.username}' are unequal`)
    throw new ForbiddenError()
  }

  const files = await getFiles(req.user.username);

  if(files.length === 0)
    app.log.warn(`Could not find any file for '${req.user.username}'`)

  return reply.code(StatusCodes.OK).send({
    success: true,
    message: "Successfully retrieved files",
    data: files,
    statusCode: StatusCodes.OK
  });
};

/**
 * Controller for fetching paginated files metadata without their 
 * content for a given user.
 *
 * @param {object} req - Fastify request object with query params: page, limit, username.
 * @param {object} reply - Fastify reply object.
 * @throws {ForbiddenError} If query.username does not match authenticated user.
 */
export const getFilesPaginatedController = async (req, reply) => {
  const page     = parseInt(req.query.page) || 1;
  const limit    = parseInt(req.query.limit) || 10;
  const username = req.query.username;
  const search   = req.query.search || "";

  if (req.user.username !== username) {
    app.log.warn(`User from request '${req.user.username}' and from query '${username}' are unequal`);
    throw new ForbiddenError();
  }

  const result = await getFilesPaginated({ page, limit, username, search });

  if (result.total === 0)
    app.log.warn(`No files found for '${req.user.username}'`);

  return reply.code(200).send({
    success: true,
    message: "Successfully retrieved files",
    data: {
      files: result.files,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit
    },
    statusCode: StatusCodes.OK
  });
};
