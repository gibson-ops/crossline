import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('files', 'routes/files.tsx'),
  route('workspaces/new', 'routes/workspaces.new.tsx'),
  route('login', 'routes/login.tsx'),
  route('verify-signin', 'routes/verify-signin.tsx'),
  route('api/auth/*', 'routes/api.auth.$.tsx'),
  route('api/instant-token', 'routes/api.instant-token.tsx'),
] satisfies RouteConfig;
