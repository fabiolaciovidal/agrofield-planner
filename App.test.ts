import { describe, expect, it } from 'vitest';
import { getAuthorizedView } from './viewAuthorization';
import { View } from './types';

describe('getAuthorizedView', () => {
  it.each([
    View.ADMIN_HOME,
    View.ADMIN_COMMERCIAL,
    View.ADMIN_USERS,
    View.ADMIN_IMPORT,
  ])('redirects a non-admin away from %s', (view) => {
    expect(getAuthorizedView(view, false)).toBe(View.DASHBOARD);
  });

  it('preserves operational views for non-admin users', () => {
    expect(getAuthorizedView(View.CLIENTS, false)).toBe(View.CLIENTS);
  });

  it('preserves admin views for admin users', () => {
    expect(getAuthorizedView(View.ADMIN_USERS, true)).toBe(View.ADMIN_USERS);
  });
});