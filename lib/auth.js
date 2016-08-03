'use strict';
/* jshint camelcase: false */
let querystring = require('querystring');
let uid = require('uid2');
let debug = require('debug')('oidc:auth');
let Jwt = require('./models').Jwt;
//let AuthorizationToken = require('./models').AuthorizationToken;

let rest = require('restler');

function Auth(options, done) {
  let self = {};

  options.odicConfig = options.oidcServer + '/.well-known/openid-configuration';
  options.bearer = new Buffer(`${options.clientId}:${options.clientSecret}`).toString('base64');

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

  // Swap the code returnened from the Authorizatoin code flow
  // for an access_token, refresh_token and id_token
  let handleAuthorizationCode = (code, handler) => {
    debug('handling authorization flow code: ' + code);
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
    .on('complete', result => {
      // let token = new AuthorizationToken(result);
      let jwt = new Jwt(options, result.id_token);
      let user = {
        id: jwt.payload.sub,
        name: jwt.payload.name,
        email: jwt.payload.email,
        preferredUsername: jwt.payload.preferred_username,
        jwt: jwt.raw
      };
      debug('user ' + user.name + ' authenticated using JWT');
      handler.success(user);
    });
  };

  let handleJwt = (data, handler) => {
    let jwt = new Jwt(options, data);

    let user = {
      id: jwt.payload.sub,
      name: jwt.payload.name,
      email: jwt.payload.email,
      preferredUsername: jwt.payload.preferred_username,
      jwt: jwt.raw
    };
    debug('user ' + user.name + ' authenticated using JWT');
    handler.success(user);
  };

  let redirectToOkta = (handler) => {
    let params = {
      response_type: 'code',
      scope: 'openid profile email groups offline_access', 
      client_id: options.clientId,
      state: uid(24),
      redirect_uri: options.callbackURL
    };
    var location = options.odicConfig.authorization_endpoint + '?' + querystring.stringify(params);
    debug('redirecting to the open id connect server');
    handler.redirect(location);
  };

  self.handle = (req, handler, handlerOptions) => {
    handlerOptions = handlerOptions || {};
    /* jshint maxcomplexity: 7 */
    if (req.user) { return handleJwt(req.user, handler); }
    if (req.query && req.query.error) { throw new Error('needs to be unauthorized'); }
    if (req.query && req.query.code) { return handleAuthorizationCode(req.query.code, handler); }
    if (req.query && req.query.id_token) { return handleJwt(req.query.id_token, handler); }
    if(handlerOptions.redirectToOidc) {
      redirectToOkta(handler);
    } else {
      handler.fail();
    }
  };

  return Object.freeze(self);
}
module.exports = Auth;
