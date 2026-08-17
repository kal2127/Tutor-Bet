const adminService = require("./admin.service");

async function getTutors(req, res, next) {
  try {
    const tutors = await adminService.getTutors();

    return res.ok(tutors, "Tutors fetched successfully");
  } catch (err) {
    next(err);
  }
}

async function getFamilies(req, res, next) {
  try {
    const families = await adminService.getFamilies();

    return res.ok(families, "Families fetched successfully");
  } catch (err) {
    next(err);
  }
}

async function setUserActive(req, res, next) {
  try {
    const result = await adminService.setUserActive(
      req.params.id,
      req.body.is_active,
    );

    return res.ok(result, "User status updated");
  } catch (err) {
    next(err);
  }
}

async function getPendingTutors(req, res, next) {
  try {
    const tutors = await adminService.getPendingTutors();

    return res.ok(tutors, "Pending tutors fetched successfully");
  } catch (err) {
    next(err);
  }
}

async function approveTutor(req, res, next) {
  try {
    await adminService.approveTutor(req.params.id);

    return res.ok(null, "Tutor approved successfully");
  } catch (err) {
    next(err);
  }
}

async function rejectTutor(req, res, next) {
  try {
    await adminService.rejectTutor(req.params.id);

    return res.ok(null, "Tutor rejected successfully");
  } catch (err) {
    next(err);
  }
}
async function getDashboard(req, res, next) {
  try {
    const statistics = await adminService.getDashboardStatistics();

    return res.ok(statistics, "Dashboard statistics fetched successfully");
  } catch (err) {
    next(err);
  }
}
async function getRecentBookings(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 10;
    const rows = await adminService.getRecentBookings(limit);
    return res.ok(rows, "Recent bookings fetched successfully");
  } catch (err) {
    next(err);
  }
}

async function getRevenueSummary(req, res, next) {
  try {
    const days = Number(req.query.days) || 30;
    const summary = await adminService.getRevenueSummary(days);
    return res.ok(summary, "Revenue summary fetched successfully");
  } catch (err) {
    next(err);
  }
}
async function getPendingPayments(req, res, next) {
  try {
    const payments = await adminService.getPendingPayments();

    return res.ok(payments, "Pending booking approvals fetched successfully");
  } catch (err) {
    next(err);
  }
}
async function approvePayment(req, res, next) {
  try {
    await adminService.approvePayment(req.params.id);

    return res.ok(null, "Booking approved");
  } catch (err) {
    next(err);
  }
}
async function rejectPayment(req, res, next) {
  try {
    await adminService.rejectPayment(req.params.id, req.body.remarks);

    return res.ok(null, "Booking rejected");
  } catch (err) {
    next(err);
  }
}
async function getPendingRequests(req, res, next) {
  try {
    const requests = await adminService.getPendingRequests();

    return res.ok(requests, "Pending requests fetched successfully");
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const result = await adminService.approveRequest(req.user.id, req.params.id);

    return res.ok(result, "Request approved");
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const result = await adminService.rejectRequest(
      req.user.id,
      req.params.id,
      req.body?.reason,
    );

    return res.ok(result, "Request rejected");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTutors,
  getFamilies,
  setUserActive,
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getDashboard,
  getRecentBookings,
  getRevenueSummary,
  rejectPayment,
  approvePayment,
  getPendingPayments,
  getPendingRequests,
  approveRequest,
  rejectRequest,
};
