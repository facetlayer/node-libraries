// This spec file should also be excluded from deployment
const { helper } = require('./helper');

test('helper returns string', () => {
    expect(helper()).toBe('Helper function');
});
