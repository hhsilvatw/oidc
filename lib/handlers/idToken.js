'use strict';
let Jwt = require('../models').Jwt;
function IDTokenHandler(options) {
  let self = {};
  self.name = 'IDTokenHandler';
  self.handles = (result) => {
    return (result.id_token !== undefined);
  };
  self.handle = (data, result, next) => {
    result.jwt = new Jwt(options, data);
    result.valid = true;
    next(); 
  };
  return Object.freeze(self);

}
module.exports = IDTokenHandler;

