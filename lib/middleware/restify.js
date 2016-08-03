'use strict';
function Restify(auth) {
  let self = {};

  self.auth = (options) => {
    return (req, res, next) => {
      let handler = {
        success: (user) => {
          req.user = user;
          next();
        },
        fail: () => {
          res.send(401);
        },
        redirect: location => {
          res.redirect(location, next);
        }
      };

      auth.handle(req, handler, options);
    };
  };

  return Object.freeze(self);
}
module.exports = Restify;
