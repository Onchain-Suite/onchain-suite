import * as migration_20260729_195346_initial from './20260729_195346_initial';

export const migrations = [
  {
    up: migration_20260729_195346_initial.up,
    down: migration_20260729_195346_initial.down,
    name: '20260729_195346_initial'
  },
];
