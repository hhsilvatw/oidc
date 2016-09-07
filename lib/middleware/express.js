'use strict';
function Express(auth) {
  let self = {};

  self.auth = (options) => {
    return (req, res, next) => {
      let handler = {
        success: (user) => {
          req.user = user;
          next();
        },
        fail: () => {
          res.sendStatus(401);
        },
        redirect: location => {
          res.redirect(location);
        }
      };

      auth.handle(req, handler, options);
    };
  };

  return Object.freeze(self);
}
module.exports = Express;
