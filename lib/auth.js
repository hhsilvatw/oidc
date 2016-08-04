'use strict';
/* jshint camelcase: false */
let querystring = require('querystring');
let uid = require('uid2');
let debug = require('debug')('oidc:auth');
let rest = require('restler');

let Handlers = require('./handlers');
let HandlerFactory = require('./handlerFactory');

function Auth(options, done) {
  let self = {};

  options.odicConfig = options.oidcServer + '/.well-known/openid-configuration';
  options.bearer = new Buffer(`${options.clientId}:${options.clientSecret}`).toString('base64');

  let handlerFactory = new HandlerFactory();
  handlerFactory.addHandler(new Handlers.Code(options, handlerFactory));
  handlerFactory.addHandler(new Handlers.AuthorizationToken(options, handlerFactory));
  handlerFactory.addHandler(new Handlers.IDToken(options, handlerFactory));

  debug('Loading openid-configuration from ' + options.oidcServer);
  // Dynamically load the configuration
  rest
  .get(options.odicConfig)
  .on('complete', result => {
    // parse the hostname out
    options.odicConfig = result;
    debug('Config loaded dynamically');

    // Dynamically load the jwt signature
    rest
    .get(result.jwks_uri)
    .on('complete', result => {
      options.odicConfig.jwks = result.keys;
      debug('JWKS loaded dynamically');
      if(done) { done(); }
    });

  });

  let handleFailure = (result, middleware, handlerOptions) => {
    if(result.valid === false && handlerOptions.redirectToOidc) {
      let params = {
        response_type: 'code',
        scope: 'openid profile email groups offline_access', 
        client_id: options.clientId,
        state: uid(24),
        redirect_uri: options.callbackURL
      };
      var location = options.odicConfig.authorization_endpoint + '?' + querystring.stringify(params);
      debug('redirecting to the open id connect server');
      return middleware.redirect(location);
    }
    middleware.fail();
  };

  self.handle = (req, middleware, handlerOptions) => {
    handlerOptions = handlerOptions || {};
    let result = {
      valid: false
    };
    handlerFactory.handlerFor(req.query, result, (err) => {
      if(err) { middleware.fail(err); }
      return result.valid ? middleware.success(result) : 
        handleFailure(result, middleware, handlerOptions); 
    });
  };

  return Object.freeze(self);
}
module.exports = Auth;
