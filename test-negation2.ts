import { feature } from 'bun:bundle';

function test() {
  if (!feature('BUDDY')) {
    console.log('BUDDY disabled, returning early');
    return 'disabled';
  }
  console.log('BUDDY enabled, continuing');
  return 'enabled';
}
test();
