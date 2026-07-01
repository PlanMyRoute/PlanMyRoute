const requirePermission = jest.fn(() => (req, res, next) => next());
const requireOwner = jest.fn(() => (req, res, next) => next());
const requireEditor = jest.fn(() => (req, res, next) => next());

module.exports = { requirePermission, requireOwner, requireEditor };
