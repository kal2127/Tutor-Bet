module.exports = function responseFormatter(req, res, next) {
  // helper: success responses
  res.ok = function (data = null, message = "OK") {
    return res.json({ success: true, message, data });
  };

  res.created = function (data = null, message = "Created") {
    return res.status(201).json({ success: true, message, data });
  };

  res.fail = function (status = 400, message = "Bad Request", details = null) {
    return res.status(status).json({ success: false, message, details });
  };

  // wrap legacy res.json calls if they don't provide a "success" key
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (
      body &&
      typeof body === "object" &&
      Object.prototype.hasOwnProperty.call(body, "success")
    ) {
      return originalJson(body);
    }
    return originalJson({ success: true, message: null, data: body });
  };

  next();
};
