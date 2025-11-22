import { parseFile } from '../src/parser/parseFile'
import { Query } from '../src/query/Query'
import { it, expect, describe } from 'vitest'

describe('Complex nested syntax parsing', () => {
    it('parses pm2-start with nested command syntax', () => {
        const content = `
after-deploy
  pm2-start name=TestPM2App
    command(npm start)
`;
        
        const parsed = parseFile(content);
        expect(parsed.length).toBe(1);
        
        const config = parsed[0] as Query;
        expect(config.command).toBe('after-deploy');
        expect(config.hasAttr('pm2-start')).toBe(true);
        expect(config.hasAttr('name')).toBe(true);
        expect(config.hasAttr('command')).toBe(true);
        
        // pm2-start is just a marker
        expect(config.getAttr('pm2-start').hasValue()).toBe(false);
        
        // name and command are the actual data
        expect(config.getStringValue('name')).toBe('TestPM2App');
        expect(config.getAttr('command').toOriginalString()).toBe('npm start');
    });
    
    it('parses multiple after-deploy sections correctly', () => {
        const content = `
after-deploy
  shell(echo "Building...")

after-deploy
  pm2-start name=TestApp
    command(yarn start)

after-deploy
  shell(echo "Deploy complete")
`;
        
        const parsed = parseFile(content);
        expect(parsed.length).toBe(3);
        
        // First section: shell command
        const first = parsed[0] as Query;
        expect(first.command).toBe('after-deploy');
        expect(first.hasAttr('shell')).toBe(true);
        expect(first.getAttr('shell').toOriginalString()).toBe('echo Building...');
        
        // Second section: pm2-start
        const second = parsed[1] as Query;
        expect(second.command).toBe('after-deploy');
        expect(second.hasAttr('pm2-start')).toBe(true);
        expect(second.getStringValue('name')).toBe('TestApp');
        expect(second.getAttr('command').toOriginalString()).toBe('yarn start');
        
        // Third section: another shell command
        const third = parsed[2] as Query;
        expect(third.command).toBe('after-deploy');
        expect(third.hasAttr('shell')).toBe(true);
        expect(third.getAttr('shell').toOriginalString()).toBe('echo Deploy complete');
    });
    
    it('parses complex deployment configuration', () => {
        const content = `
deploy-settings
  project-name=test-app
  dest-url=http://localhost:4715
  timeout=30

after-deploy
  shell(echo "Starting deployment...")

after-deploy
  pm2-start name=WebServer
    command(node server.js)

after-deploy
  pm2-start name=Worker
    command(node worker.js)

include package.json
include src
`;
        
        const parsed = parseFile(content);
        expect(parsed.length).toBe(6);
        
        // Deploy settings
        const deploySettings = parsed[0] as Query;
        expect(deploySettings.command).toBe('deploy-settings');
        expect(deploySettings.getStringValue('project-name')).toBe('test-app');
        expect(deploySettings.getStringValue('dest-url')).toBe('http://localhost:4715');
        expect(deploySettings.getNumberValue('timeout')).toBe(30);
        
        // Shell command
        const shellCmd = parsed[1] as Query;
        expect(shellCmd.getAttr('shell').toOriginalString()).toBe('echo Starting deployment...');
        
        // PM2 services
        const webServer = parsed[2] as Query;
        expect(webServer.getStringValue('name')).toBe('WebServer');
        expect(webServer.getAttr('command').toOriginalString()).toBe('node server.js');
        
        const worker = parsed[3] as Query;
        expect(worker.getStringValue('name')).toBe('Worker');
        expect(worker.getAttr('command').toOriginalString()).toBe('node worker.js');
        
        // Include statements
        const includePackage = parsed[4] as Query;
        expect(includePackage.command).toBe('include');
        expect(includePackage.getPositionalAttr(0)).toBe('package.json');
        
        const includeSrc = parsed[5] as Query;
        expect(includeSrc.command).toBe('include');
        expect(includeSrc.getPositionalAttr(0)).toBe('src');
    });
    
    it('handles nested parentheses syntax correctly', () => {
        const content = `
build-config
  test(
    unit-tests(framework=jest timeout=30)
    integration-tests(browser=chrome)
  )
  compile(typescript=true minify=false)
`;
        
        const parsed = parseFile(content);
        expect(parsed.length).toBe(1);
        
        const buildConfig = parsed[0] as Query;
        expect(buildConfig.command).toBe('build-config');
        expect(buildConfig.hasAttr('test')).toBe(true);
        expect(buildConfig.hasAttr('compile')).toBe(true);
        
        // Test nested structure - should be TagList, not Query
        const testTag = buildConfig.getAttr('test');
        expect(testTag.isTagList()).toBe(true);
        
        const testTagList = testTag.getTagList();
        expect(testTagList.hasAttr('unit-tests')).toBe(true);
        expect(testTagList.hasAttr('integration-tests')).toBe(true);
        
        // Compile structure - should also be TagList
        const compileTag = buildConfig.getAttr('compile');
        expect(compileTag.isTagList()).toBe(true);
        
        const compileTagList = compileTag.getTagList();
        expect(compileTagList.hasAttr('typescript')).toBe(true);
        expect(compileTagList.hasAttr('minify')).toBe(true);
        expect(compileTagList.getStringValue('minify')).toBe('false');
    });
});