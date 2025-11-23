// This test file should be excluded from deployment
const { main } = require('./index');

describe('main', () => {
    it('should return string', () => {
        expect(main()).toBe('Main function');
    });
});
