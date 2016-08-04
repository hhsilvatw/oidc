'use strict';
let AuthorizationToken = require('../models').AuthorizationToken;
function AuthorizationTokenHandler() {
  let self = {};
  self.name = 'AuthorizationTokenHandler';
  self.handles = (result) => {
    return (result.access_token !== undefined);
  };
  self.handle = (data, result, next) => {
    result.token = new AuthorizationToken(data);
    next(); 
  };
  return Object.freeze(self);
}

module.exports = AuthorizationTokenHandler;
