// Simple admin auth middleware using a static token
// Reads token from `Authorization: Bearer <token>` or `x-admin-token`

module.exports.authenticateAdmin = (req, res, next) => {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.headers["x-admin-token"];
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return res.status(500).json({ success: false, message: "Admin token not configured" });
  }

  if (token && token === expected) {
    return next();
  }

  return res.status(401).json({ success: false, message: "Unauthorized" });
};
