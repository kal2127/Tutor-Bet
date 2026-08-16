const multer = require("multer");
const path = require("path");
const fs = require("fs");

const applicationDir = path.join(__dirname, "..", "uploads", "tutor-applications");

if (!fs.existsSync(applicationDir)) {
  fs.mkdirSync(applicationDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, applicationDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeField = file.fieldname.replace(/[^a-z0-9_-]/gi, "");
    cb(null, `${safeField}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed =
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf";

  if (!allowed) return cb(new Error("Only image or PDF files are allowed"));
  cb(null, true);
}

const uploadTutorApplication = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

module.exports = { uploadTutorApplication };
