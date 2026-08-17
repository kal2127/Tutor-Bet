const HttpError = require("../../utils/httpError");
const bookingsService = require("./bookings.service");
const {
  createBookingSchema,
  attachReceiptSchema,
  updateBookingStatusSchema,
} = require("./bookings.validators");

async function createFamilyBooking(req, res, next) {
  try {
    const data = createBookingSchema.parse(req.body);
    const result = await bookingsService.createBooking(req.user.id, data);

    return res.created(
      {
        bookingId: result.bookingId,
        status: result.status,
      },
      "Booking created and submitted for admin review.",
    );
  } catch (e) {
    next(e);
  }
}

async function attachReceipt(req, res, next) {
  try {
    const bookingId = Number(req.params.id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      throw new HttpError(400, "Invalid booking id");
    }

    const data = attachReceiptSchema.parse(req.body);
    const result = await bookingsService.attachReceiptToBooking(
      bookingId,
      req.user.id,
      data,
      req.file,
    );

    return res.ok(
      result,
      "Receipt attached successfully. Waiting for admin verification.",
    );
  } catch (e) {
    next(e);
  }
}

async function listBookings(req, res, next) {
  try {
    let bookings;

    if (req.user.role === "FAMILY") {
      bookings = await bookingsService.listFamilyBookings(req.user.id);
    } else if (req.user.role === "TUTOR") {
      bookings = await bookingsService.listTutorBookings(req.user.id);
    } else if (req.user.role === "ADMIN") {
      bookings = await bookingsService.listAdminBookings();
    } else {
      throw new HttpError(403, "Unauthorized role");
    }

    return res.ok(
      { bookings, count: bookings.length },
      "Bookings fetched successfully.",
    );
  } catch (e) {
    next(e);
  }
}

async function getBookingById(req, res, next) {
  try {
    const bookingId = Number(req.params.id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      throw new HttpError(400, "Invalid booking id");
    }

    const booking = await bookingsService.getBookingById(
      bookingId,
      req.user.id,
      req.user.role,
    );

    return res.ok(booking, "Booking fetched successfully.");
  } catch (e) {
    next(e);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const bookingId = Number(req.params.id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      throw new HttpError(400, "Invalid booking id");
    }

    const data = updateBookingStatusSchema.parse(req.body);
    const result = await bookingsService.updateBookingStatus(
      bookingId,
      req.user.role,
      data.status,
    );

    return res.ok(result, "Booking status updated successfully.");
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createFamilyBooking,
  attachReceipt,
  listBookings,
  getBookingById,
  updateBookingStatus,
};
