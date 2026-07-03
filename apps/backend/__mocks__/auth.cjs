const TEST_USER_ID = 'a3e966d8-e1c0-41e2-9fd6-0519575c76e7';

const verifyToken = jest.fn((req, res, next) => {
  req.userId = TEST_USER_ID;
  req.user = { id: TEST_USER_ID, email: 'test@planmyroute.es' };
  next();
});

const requireSameUser = jest.fn((req, res, next) => next());

const optionalAuth = jest.fn((req, res, next) => {
  req.userId = TEST_USER_ID;
  req.user = { id: TEST_USER_ID, email: 'test@planmyroute.es' };
  next();
});

module.exports = { verifyToken, requireSameUser, optionalAuth };
