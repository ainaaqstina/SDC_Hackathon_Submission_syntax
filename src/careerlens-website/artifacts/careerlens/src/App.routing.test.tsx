import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const apiHooks = vi.hoisted(() => ({
  useAnalyzeCv: vi.fn(),
  useClearProfile: vi.fn(),
  useCreateRoadmap: vi.fn(),
  useGetDashboard: vi.fn(),
  useGetProfile: vi.fn(),
  useGetWorkforceContext: vi.fn(),
  useImportTrendSnapshot: vi.fn(),
  useListCareerMatches: vi.fn(),
  useListDataSources: vi.fn(),
  useListDemoProfiles: vi.fn(),
  useSimulateScenario: vi.fn(),
  useUpdateProfile: vi.fn(),
  useUpdateRoadmapStep: vi.fn(),
}));

vi.mock('@workspace/api-client-react', () => ({
  // Mock the generated client boundary so routing tests never contact a server or provider.
  ...apiHooks,
  getGetDashboardQueryKey: (profileId: string) => ['/api/career/dashboard', { profileId }],
  getGetProfileQueryKey: (profileId: string) => ['/api/career/profile', { profileId }],
  getListCareerMatchesQueryKey: (params: unknown) => ['/api/career/careers', params],
  getListDataSourcesQueryKey: () => ['/api/career/data-sources'],
}));

vi.mock('@/components/career-dashboard', () => ({
  CareerDashboard: ({ profile }: { profile: { name: string } }) => (
    <div data-testid="workspace-dashboard">Dashboard for {profile.name}</div>
  ),
  FirstStepsChecklist: () => null,
}));

const savedProfile = {
  id: 'cv-saved-1',
  name: 'Saved CV profile',
  domain: 'Product design',
  label: 'Saved CV profile',
};

const demoProfile = {
  id: 'demo-analyst',
  name: 'Sample Data Analyst',
  domain: 'Data and Analytics',
  label: 'Demonstration profile',
};

const savedProfileDetails = {
  id: savedProfile.id,
  name: savedProfile.name,
  primaryDomain: savedProfile.domain,
  confirmed: true,
  skills: [],
  experience: [],
  interests: [],
};

const demoProfileDetails = {
  ...savedProfileDetails,
  id: demoProfile.id,
  name: demoProfile.name,
  primaryDomain: demoProfile.domain,
};

const savedProfilesKey = 'careerlens-saved-profiles';
const activeProfileKey = 'careerlens-profile';

function queryResult(data: unknown = undefined) {
  return { data, isLoading: false, error: null, refetch: vi.fn() };
}

function mutationResult() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  };
}

function setRoute(path: string) {
  window.history.replaceState({}, '', path);
}

function seedSavedProfile() {
  localStorage.setItem(savedProfilesKey, JSON.stringify([savedProfile]));
  localStorage.setItem(activeProfileKey, savedProfile.id);
}

function configureWorkspaceHooks(demoProfiles: unknown[] = [demoProfile]) {
  apiHooks.useListDemoProfiles.mockReturnValue(queryResult(demoProfiles));
  apiHooks.useGetProfile.mockImplementation((profileId: string) =>
    queryResult(profileId === demoProfile.id ? demoProfileDetails : savedProfileDetails),
  );
  apiHooks.useGetDashboard.mockReturnValue(queryResult(undefined));
  apiHooks.useGetWorkforceContext.mockReturnValue(queryResult({ skills: [], occupations: [], sources: [] }));
  apiHooks.useListCareerMatches.mockReturnValue(queryResult([]));
  apiHooks.useListDataSources.mockReturnValue(queryResult([]));
  for (const hook of [
    apiHooks.useAnalyzeCv,
    apiHooks.useClearProfile,
    apiHooks.useCreateRoadmap,
    apiHooks.useImportTrendSnapshot,
    apiHooks.useSimulateScenario,
    apiHooks.useUpdateProfile,
    apiHooks.useUpdateRoadmapStep,
  ]) {
    hook.mockReturnValue(mutationResult());
  }
}

const workspaceQueryHooks = [
  apiHooks.useGetDashboard,
  apiHooks.useGetProfile,
  apiHooks.useGetWorkforceContext,
  apiHooks.useListCareerMatches,
  apiHooks.useListDataSources,
  apiHooks.useListDemoProfiles,
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.classList.remove('dark');
  setRoute('/');
  configureWorkspaceHooks();
});

afterEach(() => {
  cleanup();
});

describe('Future Skills Radar filtering', () => {
  const sourceUrl = 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/3-skills-outlook';
  const skill = (externalId: string, name: string, rank: number, industryTags: string[], trendGroup = 'other_ranked_skill') => ({
    externalId, recordType: 'skill_rank', name, direction: null, rank, trendGroup, industryTags,
    industryTagsOfficial: false, numericSkillScore: null, observationYear: 2025, forecastEndYear: 2030,
    sourceFigure: 'Figure 3.4', sourceUrl,
    dataType: 'wef_report_rank_plus_careerlens_industry_mapping',
    projectedGrowthPercent: null, aiReplacementProbability: null, rawRecord: {},
  });
  const radarContext = {
    skills: [
      skill('1', 'AI literacy', 1, ['Information Technology'], 'fastest_growing_top_10'),
      skill('2', 'Technological literacy', 2, ['Healthcare and Nursing']),
      skill('3', 'Data entry', 25, ['Finance and Accounting'], 'small_net_decline_reported'),
    ],
    occupations: [{
      externalId: 'occupation-1', recordType: 'occupation_direction', name: 'Test construction occupation',
      direction: 'growing', rank: null, trendGroup: null, industryTags: ['Construction and Trades'],
      industryTagsOfficial: false, numericSkillScore: null, observationYear: null, forecastEndYear: 2030,
      sourceFigure: null, sourceUrl: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/2-jobs-outlook',
      dataType: 'wef_report_direction_plus_careerlens_industry_mapping',
      projectedGrowthPercent: null, aiReplacementProbability: null, rawRecord: {},
    }],
    sources: [{
      key: 'wef-2025-skills', name: 'WEF Future of Jobs Report 2025 · Skills Outlook', sourceUrl,
      publicationPeriod: 'Skill observation year 2025; reported rank window 2025–2030',
      dataType: 'wef_report_rank_plus_careerlens_industry_mapping', recordCount: 3,
      officialWefIndustryForecast: false,
    }],
  };

  function openRadar() {
    seedSavedProfile();
    setRoute('/radar');
    apiHooks.useGetWorkforceContext.mockReturnValue(queryResult(radarContext));
    return render(<App />);
  }

  it('updates cards and count, and retains the selection after a workspace rerender', () => {
    const view = openRadar();
    expect(screen.getAllByTestId('radar-skill-card')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Industry'), { target: { value: 'Information Technology' } });
    expect(screen.getAllByTestId('radar-skill-card')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Data entry' })).toBeNull();
    expect(screen.getByText('Showing 1 of 3 ranked skills mapped to Information Technology')).toBeTruthy();
    view.rerender(<App />);
    expect((screen.getByLabelText('Industry') as HTMLSelectElement).value).toBe('Information Technology');
    expect(screen.getAllByTestId('radar-skill-card')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Industry'), { target: { value: 'Finance and Accounting' } });
    expect(screen.getAllByTestId('radar-skill-card')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Data entry' })).toBeTruthy();
    expect(screen.queryByText('signal score')).toBeNull();
    expect(screen.getByText('WEF report rank · 2025–2030')).toBeTruthy();
  });

  it('shows an honest empty industry result and clears the filter', () => {
    openRadar();
    fireEvent.change(screen.getByLabelText('Industry'), { target: { value: 'Construction and Trades' } });
    expect(screen.queryAllByTestId('radar-skill-card')).toHaveLength(0);
    expect(screen.getByText(/No WEF skills in the supplied snapshot are mapped to Construction/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show all industries' }));
    expect((screen.getByLabelText('Industry') as HTMLSelectElement).value).toBe('all');
    expect(screen.getAllByTestId('radar-skill-card')).toHaveLength(3);
  });
});

describe('Future Scenarios learning-time controls', () => {
  beforeEach(() => {
    seedSavedProfile();
    configureWorkspaceHooks();
    setRoute('/scenarios');
  });
  it('labels moderate and fast paths as hypothetical and provides WEF occupation context', () => {
    render(<App />);
    expect(screen.getByText(/These are hypothetical CareerLens assumptions/)).toBeTruthy();
    expect(screen.getByTestId('scenario-occupation-context')).toBeTruthy();
  });

  it('keeps skill typing focused and updates estimates from the chosen weekly hours and goal', () => {
    render(<App />);
    const input = screen.getByTestId('input-hypothetical-skill');
    input.focus();
    for (const value of ['P', 'Py', 'Pyt', 'Pyth', 'Pytho', 'Python']) {
      fireEvent.change(input, { target: { value } });
      expect(document.activeElement).toBe(input);
    }
    expect(screen.getByTestId('text-accelerated-skill-duration').textContent).toBe('9–14 weeks');
    fireEvent.change(screen.getByLabelText('Accelerated study hours per week'), { target: { value: '18' } });
    expect(screen.getByTestId('text-accelerated-skill-duration').textContent).toBe('6–9 weeks');
    fireEvent.change(screen.getByLabelText('What do you want to achieve?'), { target: { value: 'intro' } });
    expect(screen.getByTestId('text-accelerated-skill-duration').textContent).toBe('3–4 weeks');
    expect(screen.getByRole('link', { name: 'Training-workload reference' })).toBeTruthy();
  });
  it('asks for context for an unfamiliar skill rather than silently using a universal range', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('input-hypothetical-skill'), { target: { value: 'Specialist flux calibration' } });
    expect(screen.getByTestId('text-moderate-skill-duration').textContent).toBe('Estimate unavailable');
    fireEvent.change(screen.getByLabelText('Skill family for a broader estimate'), { target: { value: 'engineering' } });
    expect(screen.getByText(/lower-confidence/)).toBeTruthy();
    expect(screen.getByTestId('text-moderate-skill-duration').textContent).not.toBe('Estimate unavailable');
  });
});

describe('O*NET career and SDG regression', () => {
  const webMatch = {
    id: 'occupation-101', occupationCode: '15-1254.00', title: 'Web Developers',
    domain: 'Computer and Mathematical Occupations', score: 79, skillsScore: 80, interestScore: 75,
    softwareScore: 100, transferableSkillsScore: 34,
    scoringNote: 'Skills index: 70% software relevance + 30% importance-weighted category coverage.',
    explanation: 'Source-listed software evidence supports exploration, not verified job readiness.',
    matchedSkills: ['Python', 'JavaScript', 'HTML', 'CSS', 'SQL'],
    missingSkills: ['Coordination'], responsibilities: ['Develop websites.'],
    dataClassification: 'source_backed', sourceName: 'O*NET 31.0 Database',
    sdgs: [
      { number: 8, name: 'Decent Work and Economic Growth', explanation: 'CareerLens association with target 8.2.' },
      { number: 9, name: 'Industry, Innovation and Infrastructure', explanation: 'CareerLens association with target 9.1.' },
    ],
  };

  it('shows the same specific occupation, stable code and associations on both pages', () => {
    seedSavedProfile();
    setRoute('/careers');
    apiHooks.useListCareerMatches.mockReturnValue(queryResult([webMatch]));
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Web Developers' })).toBeTruthy();
    expect(screen.getByText('O*NET 15-1254.00')).toBeTruthy();
    expect(screen.getByLabelText('79% career alignment')).toBeTruthy();
    expect(within(screen.getByText('Software relevance').parentElement!).getByText('100%')).toBeTruthy();
    expect(screen.getByText(/not your chance of being hired/)).toBeTruthy();
    expect(screen.getByTestId('score-method-occupation-101').textContent).toContain('70% software relevance');
    fireEvent.click(screen.getByTestId('link-nav-sdg'));
    expect(within(screen.getByTestId('sdg-goal-9')).getByText('Web Developers')).toBeTruthy();
    expect(within(screen.getByTestId('sdg-goal-9')).queryByText('O*NET 15-1254.00')).toBeNull();
    expect(screen.getByTestId('sdg-association-occupation-101-9').textContent).toBe('Web Developers');
    expect(screen.getByTestId('sdg-association-occupation-101-8')).toBeTruthy();
    expect(screen.queryByText('No current top-match association.')).toBeNull();
  });

  it('distinguishes unmapped occupations from goals with mapped recommendations', () => {
    seedSavedProfile();
    setRoute('/sdg');
    apiHooks.useListCareerMatches.mockReturnValue(queryResult([
      webMatch, { ...webMatch, id: 'occupation-102', occupationCode: '99-9999.00', title: 'Unmapped occupation', sdgs: [] },
    ]));
    render(<App />);
    expect(screen.getByText('1 of 2 recommended occupations have reviewed SDG mappings.')).toBeTruthy();
    expect(within(screen.getByTestId('sdg-unmapped-occupations')).getByText(/Unmapped occupation/)).toBeTruthy();
    expect(screen.getByTestId('sdg-association-occupation-101-9')).toBeTruthy();
  });

  it('shows loading rather than falsely claiming there are no associations', () => {
    seedSavedProfile();
    setRoute('/sdg');
    apiHooks.useListCareerMatches.mockReturnValue({ ...queryResult(), isLoading: true });
    render(<App />);
    expect(screen.queryByText('No recommended occupations are mapped to this goal.')).toBeNull();
    expect(screen.queryByTestId('sdg-goal-9')).toBeNull();
  });
});

describe('CareerLens welcome-page routing', () => {
  it('shows the welcome page at / without mounting workspace API queries', () => {
    render(<App />);

    expect(screen.getByTestId('page-landing')).toBeTruthy();
    for (const hook of workspaceQueryHooks) expect(hook).not.toHaveBeenCalled();
  });

  it('opens the existing upload dialog once and removes the entry query parameter', async () => {
    seedSavedProfile();
    setRoute('/dashboard?entry=upload');
    render(<App />);

    expect(await screen.findByRole('dialog', { name: 'Bring your experience into focus.' })).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('input-cv-file')).toBeTruthy();
    expect(apiHooks.useAnalyzeCv.mock.results.every(
      ({ value }) => value.mutate.mock.calls.length === 0,
    )).toBe(true);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
      expect(window.location.search).toBe('');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close upload dialog' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('selects a real demo sample without removing the saved CV profile', async () => {
    seedSavedProfile();
    setRoute('/dashboard?entry=demo');
    render(<App />);

    expect((await screen.findByTestId('workspace-dashboard')).textContent).toContain(demoProfile.name);
    await waitFor(() => expect(localStorage.getItem(activeProfileKey)).toBe(demoProfile.id));
    expect(JSON.parse(localStorage.getItem(savedProfilesKey) ?? '[]')).toEqual([savedProfile]);
    expect(apiHooks.useListDemoProfiles).toHaveBeenCalled();
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('keeps the current saved profile and explains a failed demo load', async () => {
    seedSavedProfile();
    configureWorkspaceHooks([]);
    setRoute('/dashboard?entry=demo');
    render(<App />);

    await waitFor(() => expect(screen.getByText(/The demo could not be loaded\./)).toBeTruthy());
    expect(screen.getByTestId('workspace-dashboard').textContent).toContain(savedProfile.name);
    expect(localStorage.getItem(activeProfileKey)).toBe(savedProfile.id);
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it.each([
    ['/dashboard', 'workspace-dashboard'],
    ['/careers', 'Explore where your skills can travel.'],
  ])('loads a direct visit or reload at %s', async (path, expectedContent) => {
    seedSavedProfile();
    setRoute(path);
    render(<App />);

    if (expectedContent === 'workspace-dashboard') {
      expect((await screen.findByTestId(expectedContent)).textContent).toContain(savedProfile.name);
    } else {
      expect(await screen.findByRole('heading', { name: expectedContent })).toBeTruthy();
    }
    expect(window.location.pathname).toBe(path);
  });

  it('returns to the welcome page through workspace navigation', async () => {
    seedSavedProfile();
    setRoute('/dashboard');
    render(<App />);

    expect(await screen.findByTestId('workspace-dashboard')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'CareerLens home' }));

    expect(await screen.findByTestId('page-landing')).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });
});

describe('CV upload validation and review', () => {
  async function openUpload() {
    seedSavedProfile();
    setRoute('/dashboard?entry=upload');
    render(<App />);
    await screen.findByRole('dialog', { name: 'Bring your experience into focus.' });
    return screen.getByTestId('input-cv-file') as HTMLInputElement;
  }

  it('explains that contact details are removed before AI analysis', async () => {
    await openUpload();
    expect(screen.getByText(/Email addresses and phone numbers are removed before AI analysis/)).toBeTruthy();
  });

  it.each([
    ['no selection', undefined, /No file was selected/],
    ['empty PDF', new File([], 'empty.pdf', { type: 'application/pdf' }), /file is empty/],
    ['image', new File(['image'], 'cv.png', { type: 'image/png' }), /Unsupported CV format/],
    ['renamed image', new File(['image'], 'cv.pdf', { type: 'image/png' }), /Unsupported CV format/],
    ['DOCX when only PDF is supported', new File(['docx'], 'cv.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), /Unsupported CV format/],
    ['unsupported extension', new File(['text'], 'cv.docx', { type: 'application/pdf' }), /Unsupported CV format/],
    ['oversized PDF', new File([new Uint8Array(6 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }), /6 MB upload limit/],
  ])('rejects %s before reading or uploading', async (_name, file, message) => {
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    const input = await openUpload();
    fireEvent.change(input, { target: { files: file ? [file] : [] } });
    expect(screen.getByText(message)).toBeTruthy();
    expect(read).not.toHaveBeenCalled();
    expect(apiHooks.useAnalyzeCv().mutate).not.toHaveBeenCalled();
    expect(input.value).toBe('');
    expect(localStorage.getItem(activeProfileKey)).toBe(savedProfile.id);
  });

  it.each([
    'This PDF is corrupted or unreadable. Open it in a PDF viewer, export a new PDF, and try again.',
    'No readable CV text was found. Export your CV as a PDF with selectable text.',
  ])('keeps the server error visible in the dialog and allows retry: %s', async (message) => {
    const mutation = apiHooks.useAnalyzeCv();
    mutation.mutate.mockImplementation((_variables: unknown, callbacks: { onError: (error: Error) => void }) => callbacks.onError(new Error(message)));
    const input = await openUpload();
    const file = new File(['%PDF-1.4 test'], 'synthetic.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mutation.mutate).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem(activeProfileKey)).toBe(savedProfile.id);
  });

  it('allows selecting the same file again after a read failure', async () => {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementationOnce(() => { throw new Error('read failed'); });
    const input = await openUpload();
    const file = new File(['%PDF-1.4 test'], 'synthetic.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(/The file could not be read/)).toBeTruthy();
    expect(apiHooks.useAnalyzeCv().mutate).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(apiHooks.useAnalyzeCv().mutate).toHaveBeenCalledTimes(1));
  });

  it('opens profile review after analysis without confirming or replacing the saved profile', async () => {
    const mutation = apiHooks.useAnalyzeCv();
    mutation.mutate.mockImplementation((_variables: unknown, callbacks: { onSuccess: (profile: unknown) => void }) =>
      callbacks.onSuccess({ ...savedProfileDetails, id: 'cv-new-synthetic', name: 'Synthetic Candidate', education: '', confirmed: false }),
    );
    const input = await openUpload();
    fireEvent.change(input, { target: { files: [new File(['%PDF synthetic'], 'synthetic.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Bring your experience into focus.' })).toBeNull());
    expect(screen.getByDisplayValue('Synthetic Candidate')).toBeTruthy();
    expect(apiHooks.useUpdateProfile().mutate).not.toHaveBeenCalled();
    expect(localStorage.getItem(activeProfileKey)).toBe(savedProfile.id);
  });

  it('TC32/34 prevents duplicate uploads and shows progress while waiting for AI', async () => {
    const input = await openUpload();
    const file = new File(['%PDF synthetic'], 'synthetic.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(apiHooks.useAnalyzeCv().mutate).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Analyzing your CV')).toBeTruthy();
    expect(input.disabled).toBe(true);
    expect(sessionStorage.getItem('careerlens-analysis-pending')).toBe('1');
  });

  it.each(['application/octet-stream', 'application/x-pdf', ''])('accepts a PDF filename with browser MIME %s for server content validation', async (type) => {
    const input = await openUpload();
    fireEvent.change(input, { target: { files: [new File(['%PDF synthetic'], 'synthetic.pdf', { type })] } });
    await waitFor(() => expect(apiHooks.useAnalyzeCv().mutate).toHaveBeenCalledTimes(1));
    expect(apiHooks.useAnalyzeCv().mutate.mock.calls[0][0].data.mimeType).toBe('application/pdf');
  });

  it('TC37 renders a script-like filename as text, never markup', async () => {
    const input = await openUpload();
    const name = '<img src=x onerror=alert(1)>.pdf';
    fireEvent.change(input, { target: { files: [new File(['%PDF synthetic'], name, { type: 'application/pdf' })] } });
    await waitFor(() => expect(screen.getByTitle(name)).toBeTruthy());
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(screen.getByTitle(name).textContent).toBe(name);
  });

  it('TC35 explains interrupted analysis after a refresh without persisting CV content', async () => {
    seedSavedProfile();
    sessionStorage.setItem('careerlens-analysis-pending', '1');
    setRoute('/dashboard');
    configureWorkspaceHooks();
    render(<App />);
    expect(await screen.findByText(/CV analysis was interrupted/)).toBeTruthy();
    expect(sessionStorage.getItem('careerlens-analysis-pending')).toBeNull();
    expect(localStorage.getItem(activeProfileKey)).toBe(savedProfile.id);
  });

  it.each(['Could not reach RunPod. Please try again shortly.', 'RunPod inference timed out. Please try again.', 'RunPod returned an incomplete CV profile. Please retry the analysis; your saved profiles have not changed.'])('TC33/34/38 preserves a useful retryable error: %s', async (message) => {
    apiHooks.useAnalyzeCv().mutate.mockImplementation((_variables: unknown, callbacks: { onError: (error: Error) => void }) => callbacks.onError(new Error(message)));
    const input = await openUpload();
    fireEvent.change(input, { target: { files: [new File(['%PDF synthetic'], 'synthetic.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Choose a PDF file/ })).toBeTruthy();
    expect(sessionStorage.getItem('careerlens-analysis-pending')).toBeNull();
  });
});
