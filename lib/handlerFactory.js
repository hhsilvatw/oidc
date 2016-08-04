'use strict';
let async = require('async');
let debug = require('debug')('oidc:handlerFactory');

function HandlerFactory() {
  let self = {};
  let handlers = [];
  self.addHandler = (handler) => {
    handlers.push(handler);
  };
  self.handlerFor = (data, result, done) => {
    async.each(handlers, (handler, next) => {
      if(handler.handles(data)) {
        debug('Using handler: ' + handler.name);
        handler.handle(data, result, next);
      } else {
        next();
      }
    }, done);
  };
  return Object.freeze(self);
}
module.exports = HandlerFactory;
