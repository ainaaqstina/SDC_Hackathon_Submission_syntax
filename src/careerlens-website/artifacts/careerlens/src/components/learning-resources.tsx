import { useState } from 'react';
import { BookOpen, ExternalLink, PlayCircle } from 'lucide-react';
import type { LearningResource } from '@workspace/api-client-react';

export type ResourcePreference = 'all' | 'free' | 'certificate';
export function safeLearningUrl(value?: string): string | undefined {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function LearningResources({ resources, preference, skill }: {
  resources: LearningResource[]; preference: ResourcePreference; skill: string;
}) {
  const [reported, setReported] = useState<string[]>([]);
  const filtered = resources.filter((resource) => resource.provider === 'YouTube' || preference === 'all' || (preference === 'free' ? resource.access === 'free' : resource.kind === 'certificate'));
  const ordered = [...filtered].sort((a, b) => Number(b.access === 'free') - Number(a.access === 'free'));
  return <div className="journey-resources" aria-label={`Resources for ${skill}`}>
    {ordered.length ? ordered.map((resource, index) => {
      const url = safeLearningUrl(resource.url);
      const fallback = safeLearningUrl(resource.providerUrl) ?? `https://www.google.com/search?q=${encodeURIComponent(`${resource.provider} ${resource.title}`)}`;
      return <div key={`${resource.url}-${index}`} style={{ minWidth: 0 }}>
        {url ? <a className="journey-resource" href={url} target="_blank" rel="noreferrer">
          {resource.provider === 'YouTube' ? <PlayCircle size={14} aria-hidden="true" /> : <BookOpen size={14} aria-hidden="true" />}
          <span>{resource.title}<small>{resource.provider} · {resource.access ?? 'cost not verified'}{resource.provider === 'YouTube' ? ' · watch video' : resource.title.startsWith('Find online courses') ? ' · course search, not a selected course' : resource.kind === 'certificate' ? ' · certificate option' : ' · learning resource'}</small></span>
          <ExternalLink size={13} aria-hidden="true" />
        </a> : <p role="status">This resource link is unavailable or unsafe.</p>}
        <button type="button" className="btn" style={{ fontSize: 12, marginTop: 6 }} onClick={() => setReported((current) => [...current, resource.url])}>Link not working?</button>
        {(!url || reported.includes(resource.url)) && <p className="small-copy" role="status">The page may have moved. <a href={fallback} target="_blank" rel="noreferrer">Find it through the provider or search</a>.</p>}
      </div>;
    }) : <p className="small-copy" role="status">No curated {preference === 'all' ? '' : preference === 'free' ? 'free ' : 'certificate '}resources are available for {skill}. No unrelated course is substituted. <a href={`https://www.coursera.org/search?query=${encodeURIComponent(`${skill} ${preference === 'free' ? 'free course' : preference === 'certificate' ? 'certificate' : 'course'}`)}`} target="_blank" rel="noreferrer">Browse relevant online courses</a> (provider search; availability and price are not verified).</p>}
  </div>;
}
