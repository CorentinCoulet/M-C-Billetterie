import multer from 'multer';
import { NextApiRequest } from 'next';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

/**
 * File upload configuration
 */

// Upload configuration
export const UPLOAD_CONFIG = {
  // Storage paths
  PATHS: {
    // Base upload directory
    BASE: process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), 'public/uploads'),

    // Specific directories
    EVENTS: 'events',
    USERS: 'users',
    VENUES: 'venues',
    TICKETS: 'tickets',
    TEMP: 'temp',
  },

  // File size limits (in bytes)
  LIMITS: {
    IMAGE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // Default: 5MB
    DOCUMENT: 10 * 1024 * 1024, // 10MB
  },

  // Allowed file types
  ALLOWED_TYPES: {
    IMAGE: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    DOCUMENT: ['application/pdf'],
  },

  // Image processing options
  IMAGE: {
    // Resize options for different use cases
    RESIZE: {
      THUMBNAIL: { width: 200, height: 200, fit: 'cover' as const },
      MEDIUM: { width: 800, height: 600, fit: 'inside' as const },
      LARGE: { width: 1920, height: 1080, fit: 'inside' as const },
    },

    // Quality options
    QUALITY: {
      JPEG: 80,
      WEBP: 75,
      PNG: 80,
    },
  },
};

// Ensure upload directories exist
export function ensureDirectoriesExist() {
  const { BASE, EVENTS, USERS, VENUES, TICKETS, TEMP } = UPLOAD_CONFIG.PATHS;

  // Create base directory if it doesn't exist
  if (!fs.existsSync(BASE)) {
    fs.mkdirSync(BASE, { recursive: true });
  }

  // Create specific directories if they don't exist
  [EVENTS, USERS, VENUES, TICKETS, TEMP].forEach(dir => {
    const dirPath = path.join(BASE, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Call this function when the server starts
ensureDirectoriesExist();

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on file type or request
    let uploadDir = UPLOAD_CONFIG.PATHS.TEMP;

    // Check if request specifies a directory
    if (req.query.directory && typeof req.query.directory === 'string') {
      const requestedDir = req.query.directory;

      // Validate requested directory
      if (Object.values(UPLOAD_CONFIG.PATHS).includes(requestedDir)) {
        uploadDir = requestedDir;
      }
    }

    const destinationPath = path.join(UPLOAD_CONFIG.PATHS.BASE, uploadDir);
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uniqueId}${fileExtension}`;
    cb(null, fileName);
  },
});

/**
 * File filter function
 */
const fileFilter = (req: NextApiRequest, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is allowed
  const isImage = UPLOAD_CONFIG.ALLOWED_TYPES.IMAGE.includes(file.mimetype);
  const isDocument = UPLOAD_CONFIG.ALLOWED_TYPES.DOCUMENT.includes(file.mimetype);

  if (isImage || isDocument) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${[...UPLOAD_CONFIG.ALLOWED_TYPES.IMAGE, ...UPLOAD_CONFIG.ALLOWED_TYPES.DOCUMENT].join(', ')}`));
  }
};

/**
 * Configure multer upload
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(UPLOAD_CONFIG.LIMITS.IMAGE, UPLOAD_CONFIG.LIMITS.DOCUMENT),
  },
});

/**
 * Process an uploaded image
 */
export async function processImage(filePath: string, options: {
  outputDir?: string;
  sizes?: ('THUMBNAIL' | 'MEDIUM' | 'LARGE')[];
  format?: 'jpeg' | 'webp' | 'png';
  quality?: number;
}) {
  const {
    outputDir = path.dirname(filePath),
    sizes = ['MEDIUM'],
    format = 'webp',
    quality = UPLOAD_CONFIG.IMAGE.QUALITY.WEBP,
  } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get file info
  const fileName = path.basename(filePath, path.extname(filePath));

  // Process each size
  const processedFiles = await Promise.all(sizes.map(async (size) => {
    const resizeOptions = UPLOAD_CONFIG.IMAGE.RESIZE[size];
    const outputFileName = `${fileName}_${size.toLowerCase()}.${format}`;
    const outputPath = path.join(outputDir, outputFileName);

    // Process image with sharp
    let sharpInstance = sharp(filePath).resize(resizeOptions);

    // Set output format and quality
    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
    }

    // Save processed image
    await sharpInstance.toFile(outputPath);

    return {
      size,
      path: outputPath,
      url: outputPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\/public/, ''),
    };
  }));

  return processedFiles;
}

/**
 * Delete a file
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(filePath: string): string {
  // Convert file path to public URL
  return filePath
    .replace(process.cwd(), '')
    .replace(/\\/g, '/')
    .replace(/^\/public/, '');
}

export default {
  UPLOAD_CONFIG,
  ensureDirectoriesExist,
  upload,
  processImage,
  deleteFile,
  getPublicUrl,
};
