const HttpError = require("../../utils/httpError");
const {
  createJobPostSchema,
  applyToJobSchema,
} = require("./jobPosts.validators");
const jobPostService = require("./jobPosts.service");

async function createJobPost(req, res, next) {
  try {
    const data = createJobPostSchema.parse(req.body || {});

    const result = await jobPostService.createJobPost(
      req.user.id,
      data,
      req.file,
    );

    return res.created(result, "Request submitted for admin approval.");
  } catch (e) {
    next(e);
  }
}

async function applyToJobPost(req, res, next) {
  try {
    const jobPostId = Number(req.params.id);

    if (!Number.isInteger(jobPostId) || jobPostId <= 0) {
      throw new HttpError(400, "Invalid job post id");
    }

    const data = applyToJobSchema.parse(req.body);

    const result = await jobPostService.applyToJobPost(
      req.user.id,
      jobPostId,
      data,
    );

    return res.created(
      result,
      "You successfully applied for this request. The family will reach you if they choose you.",
    );
  } catch (e) {
    next(e);
  }
}

async function closeJobPost(req, res, next) {
  try {
    const jobPostId = Number(req.params.id);

    if (!Number.isInteger(jobPostId) || jobPostId <= 0) {
      throw new HttpError(400, "Invalid job post id");
    }

    const result = await jobPostService.closeJobPost(req.user.id, jobPostId);

    return res.ok(
      result,
      "Request closed. Tutors will no longer see it as an open job.",
    );
  } catch (e) {
    next(e);
  }
}

async function listMyJobPosts(req, res, next) {
  try {
    const result = await jobPostService.listMyJobPosts(req.user.id);

    return res.ok(
      { job_posts: result, count: result.length },
      "Job posts fetched successfully.",
    );
  } catch (e) {
    next(e);
  }
}
async function listOpenJobPostsForTutors(req, res, next) {
  try {
    const result = await jobPostService.listOpenJobPostsForTutors(req.user.id);

    return res.ok(
      { job_posts: result, count: result.length },
      "Open job posts fetched successfully.",
    );
  } catch (e) {
    next(e);
  }
}

async function listApplicationsForMyJob(req, res, next) {
  try {
    const jobPostId = Number(req.params.id);

    if (!Number.isInteger(jobPostId) || jobPostId <= 0) {
      throw new HttpError(400, "Invalid job post id");
    }

    const result = await jobPostService.listApplicationsForMyJob(
      req.user.id,
      jobPostId,
    );

    return res.ok(
      { applications: result, count: result.length },
      "Applications fetched successfully.",
    );
  } catch (e) {
    next(e);
  }
}

async function selectTutorApplication(req, res, next) {
  try {
    const jobId = Number(req.params.jobId);
    const applicationId = Number(req.params.applicationId);

    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new HttpError(400, "Invalid job id");
    }

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      throw new HttpError(400, "Invalid application id");
    }

    const result = await jobPostService.selectTutorApplication(
      req.user.id,
      jobId,
      applicationId,
    );

    return res.ok(result, "Tutor selected successfully.");
  } catch (e) {
    next(e);
  }
}
module.exports = {
  createJobPost,
  listMyJobPosts,
  listOpenJobPostsForTutors,
  applyToJobPost,
  closeJobPost,
  listApplicationsForMyJob,
  selectTutorApplication,
};
