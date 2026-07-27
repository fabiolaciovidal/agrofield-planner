import { View } from './types';

const ADMIN_ONLY_VIEWS = new Set<View>([
  View.ADMIN_HOME,
  View.ADMIN_COMMERCIAL,
  View.ADMIN_USERS,
  View.ADMIN_IMPORT,
]);

export const getAuthorizedView = (view: View, isAdmin: boolean): View =>
  !isAdmin && ADMIN_ONLY_VIEWS.has(view) ? View.DASHBOARD : view;