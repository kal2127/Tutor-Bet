const multer = require("multer");

// Use memory storage for serverless environments (like Vercel)
const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only PDF, JPG, PNG, or WEBP receipt files are allowed"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});