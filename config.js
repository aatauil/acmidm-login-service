export const USER_ID_CLAIM = process.env.MU_APPLICATION_AUTH_USERID_CLAIM || 'rrn';
export const ACCOUNT_ID_CLAIM = process.env.MU_APPLICATION_AUTH_ACCOUNTID_CLAIM || 'vo_id';
export const GROUP_ID_CLAIM = process.env.MU_APPLICATION_AUTH_GROUPID_CLAIM || 'vo_orgcode';
export const ROLE_CLAIM = process.env.MU_APPLICATION_AUTH_ROLE_CLAIM || 'abb_loketLB_rol_3d';
export const RESOURCE_BASE_URI = process.env.MU_APPLICATION_RESOURCE_BASE_URI || 'http://data.lblod.info/';
export const USER_GRAPH_TEMPLATE = process.env.USER_GRAPH_TEMPLATE || "http://mu.semte.ch/graphs/organizations/{{groupId}}";
export const ACCOUNT_GRAPH_TEMPLATE = process.env.ACCOUNT_GRAPH_TEMPLATE || "http://mu.semte.ch/graphs/organizations/{{groupId}}";
export const SESSION_GRAPH = process.env.SESSION_GRAPH || "http://mu.semte.ch/graphs/sessions";
export const ORGANIZATION_TYPE = "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid";