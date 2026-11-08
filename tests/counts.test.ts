import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countLabel,pluralize} from '../src/lib/counts';
test('file, image and page labels use singular only for one',()=>{
 for(const noun of ['file','image','page','PDF']){assert.equal(countLabel(1,noun),`1 ${noun}`);assert.equal(countLabel(2,noun),`2 ${noun}s`);assert.equal(pluralize(0,noun),`${noun}s`);}
});
