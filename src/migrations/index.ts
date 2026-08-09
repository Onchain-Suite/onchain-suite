import * as migration_20260801_180909_initial from './20260801_180909_initial';

export const migrations = [
  {
    up: migration_20260801_180909_initial.up,
    down: migration_20260801_180909_initial.down,
    name: '20260801_180909_initial'
  },
];
