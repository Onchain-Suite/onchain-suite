import * as migration_20260801_151753_initial from './20260801_151753_initial';

export const migrations = [
  {
    up: migration_20260801_151753_initial.up,
    down: migration_20260801_151753_initial.down,
    name: '20260801_151753_initial'
  },
];
