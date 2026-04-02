import { useState, useCallback } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { SkillInfo, skillKey } from './types';
import './App.css';

export function App() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    try {
      const data = await webFetch('/api/skills');
      setSkills(data);
      setError(null);
    } catch {
      setError('Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  const selected = skills.find(s => skillKey(s) === selectedKey) ?? null;

  const handleSkillCreated = useCallback((skill: SkillInfo) => {
    setSkills(prev => [...prev, skill]);
    setSelectedKey(skillKey(skill));
  }, []);

  const handleSkillUpdated = useCallback((updated: SkillInfo) => {
    setSkills(prev => prev.map(s =>
      skillKey(s) === skillKey(updated) ? updated : s
    ));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <header className="bg-bg-secondary px-5 py-3 border-b border-border flex items-center gap-3">
        <h1 className="text-sm font-semibold text-accent">Claude Code Skills Editor</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          skills={skills}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          loading={loading}
          error={error}
          onLoad={loadSkills}
          onSkillCreated={handleSkillCreated}
          onSkillUpdated={handleSkillUpdated}
        />
        <Editor
          skill={selected}
          onSkillUpdated={handleSkillUpdated}
        />
      </div>
    </div>
  );
}
