'use strict';
let jwt = require('jsonwebtoken');
let debug = require('debug')('restify-oidc:jwt');

function Jwt(options, result) {
  /* jshint maxcomplexity: 5 */
  let self = {};
  let data = result.id_token;

  // Decode it first
  let decoded = jwt.decode(data, { complete: true });
  if(decoded === null) {
    debug('Failed to decode JWT!');
    throw new Error('Failed to decode JWT');
  }
  self.header = decoded.header;
  self.payload = decoded.payload;
  self.signature = decoded.signature;
  self.raw = data;

  // At the moment; we only support the RSA algs
  // TODO: Support HMAC signing
  if(['RS256', 'RS384', 'RS512'].indexOf(self.header.alg) === -1) {
    throw new Error('Unsupported Alg: ' + self.header.alg + '!');
  }

  // Lookup the matching signing key
  let signingKey = options.odicConfig.jwks.find(k => {
    return (k.kid === self.header.kid && k.alg === self.header.alg);
  });

  // Get the PEM from the modulus and the exponent
  let getPem = require('rsa-pem-from-mod-exp');
  let pem = getPem(signingKey.n, signingKey.e);

  // Verify it (throws an exception if it fails);
  // TODO: Further validation; iss, aud, expiry 
  // TODO: Support the given algo described in the header
  try {
    jwt.verify(data, pem, { 
      algorithms: [self.header.alg]
    });
  } catch(ex) {
    debug(ex.message);
    throw ex;
  }
  debug('JWT for ' + self.payload.name + ' Validated');
  return Object.freeze(self);
}
module.exports = Jwt;
