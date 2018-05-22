import { app, sparql, uuid } from 'mu';
import { getSessionIdHeader, error } from './utils';
import { getAccessToken } from './lib/openid';
import { removeOldSessions, removeCurrentSession,
         ensureUserAndAccount, insertNewSessionForAccount,
         selectAccountBySession, selectCurrentSession,
         selectBestuurseenheidByOvoNumber } from './lib/session';

/**
 * Configuration validation on startup
 */
const requiredEnvironmentVariables = [
  'MU_APPLICATION_AUTH_DISCOVERY_URL',
  'MU_APPLICATION_AUTH_CLIENT_ID',
  'MU_APPLICATION_AUTH_CLIENT_SECRET',
  'MU_APPLICATION_AUTH_REDIRECT_URI'
];
requiredEnvironmentVariables.forEach(key => {
  if (!process.env[key]) {
    console.log(`Environment variable ${key} must be configured`);
    process.exit(1);
  }
});


/**
 * Log the user in by creating a new session, i.e. attaching the user's account to a session.
 *
 * Before creating a new session, the given authorization code gets exchanged for an access token
 * with an OpenID Provider (ACM/IDM) using the configured discovery URL. The returned JWT access token
 * is decoded to retrieve information to attach to the user, account and the session.
 * If the OpenID Provider returns a valid access token, a new user and account are created if they
 * don't exist yet and a the account is attached to the session.
 * 
 * Body: { authorizationCode: "secret" }
 *
 * @return [201] On successful login containing the newly created session
 * @return [400] If the session header or authorization code is missing
 * @return [401] On login failure (unable to retrieve a valid access token)
 * @return [403] If no bestuurseenheid can be linked to the session 
*/
app.post('/sessions', async function(req, res, next) {
  const sessionUri = getSessionIdHeader(req);
  if (!sessionUri)
    return error(res, 'Session header is missing');
  console.log(`Session URI ${sessionUri} tries to login`);

  const authorizationCode = req.body['authorizationCode'];
  if (!authorizationCode)
    return error(res, 'Authorization code is missing');

  try {
    let tokenSet;
    try {
      tokenSet = await getAccessToken(authorizationCode);
      console.log(`Retrieved tokenSet: ${tokenSet}\n${JSON.stringify(tokenSet)}`);
      console.log(`Claims: ${tokenSet.claims}\n${JSON.stringify(tokenSet.claims)}`);
    } catch(e) {
      return res.status(401).end();
    }

    await removeOldSessions(sessionUri);

    const claims = tokenSet.claims;
    const { accountUri, accountId } = await ensureUserAndAccount(claims);
    const { groupUri, groupId } = await selectBestuurseenheidByOvoNumber(claims.vo_orgcode);
    if (!groupUri || !groupId) {
      console.log(`No bestuurseenheid found for organization code ${claims.vo_orgcode}`);
      return res.status(403).end();
    }
    
    const { sessionId } = await insertNewSessionForAccount(accountUri, sessionUri, groupUri);
    
    return res.status(201).send({
      links: {
        self: '/sessions/current'
      },
      data: {
        type: 'sessions',
        id: sessionId
      },
      relationships: {
        account: {
          links: { related: `/accounts/${accountId}` },
          data: { type: 'accounts', id: accountId }
        },
        group: {
          links: { related: `/bestuurseenheden/${groupId}` },
          data: { type: 'bestuurseenheden', id: groupId }
        }        
      }
    });
  } catch(e) {
    return next(new Error(e.message));
  }
});


/**
 * Log out from the current session, i.e. detaching the session from the user's account.
 * 
 * @return [204] On successful logout
 * @return [400] If the session header is missing or invalid
*/
app.delete('/sessions/current', async function(req, res, next) {
  const sessionUri = getSessionIdHeader(req);  
  if (!sessionUri)
    return error(res, 'Session header is missing');    

  try {
    const { accountUri } = await selectAccountBySession(sessionUri);
    if (!accountUri)
      return error(res, 'Invalid session');

    await removeCurrentSession(sessionUri);

    return res.status(204).end();
  } catch(e) {
    return next(new Error(e.message));
  }    
});

/**
 * Get the current session
 * 
 * @return [200] The current session
 * @return [400] If the session header is missing or invalid
*/
app.get('/sessions/current', async function(req, res, next) {
  const sessionUri = getSessionIdHeader(req);
  if (!sessionUri)
    return next(new Error('Session header is missing'));

  const { accountUri, accountId } = await selectAccountBySession(sessionUri);
  if (!accountUri)
    return error(res, 'Invalid session');

  const { sessionId, groupId } = await selectCurrentSession(accountUri);

  try {
    return res.status(200).send({
      links: {
        self: '/sessions/current'
      },
      data: {
        type: 'sessions',
        id: sessionId
      },
      relationships: {
        account: {
          links: { related: `/accounts/${accountId}` },
          data: { type: 'accounts', id: accountId }
        },
        group: {
          links: { related: `/bestuurseenheden/${groupId}` },
          data: { type: 'bestuurseenheden', id: groupId }
        }        
      }
    });
  } catch(e) {
    return next(new Error(e.message));
  }  
});


/**
 * Error handler translating thrown Errors to 500 HTTP responses
*/ 
app.use(function(err, req, res, next) {
  res.status(500);
  res.json({
    errors: [ {title: err.message} ]
  });
});