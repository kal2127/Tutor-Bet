const router = require("express").Router();
const { registerFamily, registerTutor, login, googleAuth } = require("./auth.controller");
const { uploadTutorApplication } = require("../../middleware/uploadTutorApplication");

router.post("/register-family", registerFamily);
router.post(
  "/register-tutor",
  uploadTutorApplication.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "certifications", maxCount: 8 },
    { name: "fayda_id", maxCount: 1 },
    { name: "highschool_transcript", maxCount: 1 },
    { name: "tempo", maxCount: 1 },
  ]),
  registerTutor,
);
router.post("/login", login);
router.post("/google", googleAuth);

module.exports = router;
