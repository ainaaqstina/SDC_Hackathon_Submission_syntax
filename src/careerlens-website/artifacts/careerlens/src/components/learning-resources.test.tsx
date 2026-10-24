import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LearningResources, safeLearningUrl } from './learning-resources';
import type { LearningResource } from '@workspace/api-client-react';

afterEach(cleanup);
const resources: LearningResource[] = [
  { title: 'Learn React', provider: 'React', url: 'https://react.dev/learn', access: 'free', kind: 'learning', providerUrl: 'https://react.dev/' },
  { title: 'React certificate', provider: 'Course provider', url: 'https://example.org/course', access: 'paid', kind: 'certificate' },
];
describe('TC27–30 learning resource responses', () => {
  it('shows relevant free resources without paid options when free is selected', () => {
    render(<LearningResources resources={resources} preference="free" skill="React" />);
    expect(screen.getByRole('link', { name: /Learn React/ }).getAttribute('href')).toBe('https://react.dev/learn');
    expect(screen.queryByRole('link', { name: /React certificate/ })).toBeNull();
  });
  it('shows only certificate options when certificates are selected', () => {
    render(<LearningResources resources={resources} preference="certificate" skill="React" />);
    expect(screen.getByRole('link', { name: /React certificate/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Learn React/ })).toBeNull();
  });
  it('provides a recovery path when a course page is unavailable', () => {
    render(<LearningResources resources={[resources[0]]} preference="all" skill="React" />);
    fireEvent.click(screen.getByRole('button', { name: 'Link not working?' }));
    expect(screen.getByRole('link', { name: /Find it through/ }).getAttribute('href')).toBe('https://react.dev/');
  });
  it('blocks script-like and malformed URLs', () => {
    expect(safeLearningUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeLearningUrl('https://user:password@example.org/')).toBeUndefined();
    render(<LearningResources resources={[{ ...resources[0], url: 'javascript:alert(1)' }]} preference="all" skill="React" />);
    expect(screen.queryByRole('link', { name: /Learn React/ })).toBeNull();
    expect(screen.getByText(/unavailable or unsafe/)).toBeTruthy();
  });
  it('explains absent resources instead of substituting an unrelated course', () => {
    render(<LearningResources resources={[]} preference="free" skill="Specialist skill" />);
    expect(screen.getByText(/No curated free resources are available/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse relevant online courses' }).getAttribute('href')).toContain('Specialist%20skill');
  });
  it('keeps soft-skill videos visible even with the certificate-course preference', () => {
    render(<LearningResources resources={[{
      title: 'Communication Techniques', provider: 'YouTube', access: 'free', kind: 'learning',
      url: 'https://www.youtube.com/watch?v=HAnw168huqA',
    }]} preference="certificate" skill="Communication" />);
    expect(screen.getByRole('link', { name: /Communication Techniques/ }).getAttribute('href')).toContain('youtube.com/watch');
    expect(screen.getByText(/watch video/)).toBeTruthy();
  });
});
