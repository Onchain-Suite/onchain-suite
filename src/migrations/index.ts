import * as migration_20260801_143458_initial from './20260801_143458_initial';

export const migrations = [
  {
    up: migration_20260801_143458_initial.up,
    down: migration_20260801_143458_initial.down,
    name: '20260801_143458_initial'
  },
];
