if (typeof jsonpatch == 'undefined') {
  var jsonpatch = require('../../lib/duplex')
}

function getPatchesUsingCompare(objFactory, objChanger, arrayReplacePredicate) {
  var obj = objFactory();
  var mirror = JSON.parse(JSON.stringify(obj));
  objChanger(obj);
  return jsonpatch.compare(mirror, JSON.parse(JSON.stringify(obj)), arrayReplacePredicate);
}

describe('Array Replace Predicate Tests', () => {
  it('modifies arrays with no predicate', () => {
    const patches = getPatchesUsingCompare(
      () => ({
        a: ['a', 'b'],
      }),
      obj => obj.a = ['b', 'a'],
    );
    const expected = [
      { op: 'replace', path: '/a/1', value: 'a' },
      { op: 'replace', path: '/a/0', value: 'b' },
    ];
    expect(patches).toEqual(expected);
  });

  it('modifies arrays with false predicate', () => {
    const patches = getPatchesUsingCompare(
      () => ({
        a: ['a', 'b'],
      }),
      obj => obj.a = ['b', 'a'],
      false,
    );
    const expected = [
      { op: 'replace', path: '/a/1', value: 'a' },
      { op: 'replace', path: '/a/0', value: 'b' },
    ];
    expect(patches).toEqual(expected);
  });

  it('replaces changed arrays with true predicate', () => {
    const patches = getPatchesUsingCompare(
      () => ({
        a: ['a', 'b']
      }),
      obj => obj.a = ['b', 'a'],
      true,
    );
    const expected = [
      { op: 'replace', path: '/a', value: ['b', 'a'] },
    ];
    expect(patches).toEqual(expected);
  });

  it('ignores unchanged arrays with true predicate', () => {
    const patches = getPatchesUsingCompare(
      () => ({
        a: ['a', 'b']
      }),
      obj => obj,
      true,
    );
    const expected = [];
    expect(patches).toEqual(expected);
  });

  it('replaces all arrays', () => {
    const patches = getPatchesUsingCompare(
      () => ({
        a: ['a', 'b'],
        b: ['c', 'd'],
      }),
      obj => {
        obj.a = ['b', 'a'],
        obj.b = ['d', 'c'];
      },
      true
    );
    const expected = [
      { op: 'replace', path: '/b', value: ['d', 'c']  },
      { op: 'replace', path: '/a', value: ['b', 'a'] },
    ];
    expect(patches).toEqual(expected);
  });

  it('replaces based on path predicate', () => {
    const patches = getPatchesUsingCompare(
      () => ({
        a: ['a', 'b'],
        b: ['c', 'd'],
      }),
      obj => {
        obj.a = ['b', 'a'],
        obj.b = ['d', 'c'];
      },
      (_, __, path) => path.indexOf('/b') === 0,
    );
    const expected = [
      { op: 'replace', path: '/b', value: ['d', 'c'] },
      { op: 'replace', path: '/a/1', value: 'a' },
      { op: 'replace', path: '/a/0', value: 'b' },
    ];
    expect(patches).toEqual(expected);
  });
});