'use strict';
function AuthorizationToken(data) {
  /* jshint camelcase: false */
  let self = {};

  self.access_token = data.access_token;
  self.refresh_token = data.refresh_token;
  self.expires_in = data.expires_in;

  return Object.freeze(self);
}
module.exports = AuthorizationToken;
