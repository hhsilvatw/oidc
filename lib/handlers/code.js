'use strict';
let debug = require('debug')('oidc:handler:code');
let rest = require('restler');
function Code(options, handlerFactory) { 
  let self = {};
  self.name = 'Code';
  self.handles = (result) => {
    return (result.code !== undefined);
  };
  self.handle = (data, result, next) => {
    let code = data.code;
    let params = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: options.callbackURL
    };

    let postOptions = {
      headers: { 
        Authorization: 'Basic ' + options.bearer 
      },
      data: params
    };

    debug('requesting access_token from token endpoint');
    rest
    .post(options.odicConfig.token_endpoint, postOptions)
    .on('complete', (accessTokenResult) => {
      handlerFactory.handlerFor(accessTokenResult, result, next);
    }); 
  };
  return Object.freeze(self);
}
module.exports = Code;
