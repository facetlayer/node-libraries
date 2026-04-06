import { describe, it, expect } from 'vitest';
import { validateFileList } from '../client/securityScan.ts';

describe('securityScan validateFileList', () => {

    // --- Exact file matches ---

    it('should block .env files', () => {
        expect(() => validateFileList(['.env'])).toThrow('Security Error');
        expect(() => validateFileList(['.env.production'])).toThrow('Security Error');
        expect(() => validateFileList(['.env.local'])).toThrow('Security Error');
    });

    it('should block SSH key files', () => {
        expect(() => validateFileList(['id_rsa'])).toThrow('Security Error');
        expect(() => validateFileList(['id_ed25519'])).toThrow('Security Error');
    });

    it('should block credentials.json and secrets.json', () => {
        expect(() => validateFileList(['credentials.json'])).toThrow('Security Error');
        expect(() => validateFileList(['secrets.json'])).toThrow('Security Error');
    });

    it('should block key and pem files', () => {
        expect(() => validateFileList(['private.key'])).toThrow('Security Error');
        expect(() => validateFileList(['server.pem'])).toThrow('Security Error');
        expect(() => validateFileList(['cert.pfx'])).toThrow('Security Error');
    });

    it('should block .git directory contents', () => {
        expect(() => validateFileList(['.git/config'])).toThrow('Security Error');
        expect(() => validateFileList(['.git/HEAD'])).toThrow('Security Error');
    });

    it('should block cloud config directories', () => {
        expect(() => validateFileList(['.aws/credentials'])).toThrow('Security Error');
        expect(() => validateFileList(['.gcp/service-account.json'])).toThrow('Security Error');
        expect(() => validateFileList(['.azure/config'])).toThrow('Security Error');
    });

    // --- config.json is no longer blocked ---

    it('should allow config.json (no longer blocked)', () => {
        expect(() => validateFileList(['config.json'])).not.toThrow();
        expect(() => validateFileList(['src/config.json'])).not.toThrow();
    });

    // --- Keyword patterns: basename-only matching ---

    it('should block files with "password" in the basename', () => {
        expect(() => validateFileList(['passwords.txt'])).toThrow('Security Error');
        expect(() => validateFileList(['my-password-file.json'])).toThrow('Security Error');
    });

    it('should NOT block files in directories named with password-related route names', () => {
        // These are common web app routes, not sensitive files
        expect(() => validateFileList(['forgot-password/page.js'])).not.toThrow();
        expect(() => validateFileList(['reset-password/page.tsx'])).not.toThrow();
        expect(() => validateFileList(['change-password/index.html'])).not.toThrow();
        expect(() => validateFileList(['.next/server/app/forgot-password/page.js'])).not.toThrow();
    });

    it('should block files with "secret" in the basename', () => {
        expect(() => validateFileList(['my-secret.json'])).toThrow('Security Error');
        expect(() => validateFileList(['SECRET_KEY.txt'])).toThrow('Security Error');
    });

    it('should NOT block files in directories named with "secret" when basename is clean', () => {
        expect(() => validateFileList(['secret-page/index.js'])).not.toThrow();
    });

    it('should block files with "credential" in the basename', () => {
        expect(() => validateFileList(['credential-store.yaml'])).toThrow('Security Error');
    });

    it('should NOT block files in directories named with "credential" when basename is clean', () => {
        expect(() => validateFileList(['credential-setup/page.js'])).not.toThrow();
    });

    // --- Normal files ---

    it('should allow normal application files', () => {
        expect(() => validateFileList([
            'index.js',
            'package.json',
            'src/app.ts',
            'public/styles.css',
            'dist/bundle.js',
        ])).not.toThrow();
    });

    // --- ignore-security-scan option ---

    it('should allow ignored paths to bypass security checks', () => {
        expect(() => validateFileList(['.env'], { ignorePaths: ['.env'] })).not.toThrow();
    });

    it('should allow ignored directory prefixes', () => {
        expect(() => validateFileList(
            ['secrets/api-key.json', 'secrets/db-password.txt'],
            { ignorePaths: ['secrets'] }
        )).not.toThrow();
    });

    it('should still block non-ignored files when some paths are ignored', () => {
        expect(() => validateFileList(
            ['.env', 'credentials.json'],
            { ignorePaths: ['.env'] }
        )).toThrow('Security Error');
    });

    it('should support multiple ignore paths', () => {
        expect(() => validateFileList(
            ['.env', 'credentials.json', 'data/secret-config.yaml'],
            { ignorePaths: ['.env', 'credentials.json', 'data'] }
        )).not.toThrow();
    });

    // --- Error message ---

    it('should list all dangerous files in the error message', () => {
        try {
            validateFileList(['.env', 'id_rsa', 'index.js']);
            expect.unreachable('should have thrown');
        } catch (e: any) {
            expect(e.message).toContain('.env');
            expect(e.message).toContain('id_rsa');
            expect(e.message).not.toContain('index.js');
        }
    });
});
