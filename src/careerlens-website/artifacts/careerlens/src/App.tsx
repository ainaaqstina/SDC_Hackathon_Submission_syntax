import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Menu,
  CircleHelp, Compass, FileText, FileUp, Gauge, Leaf, ListChecks, LoaderCircle, LockKeyhole, Moon,
  PanelTop, Radar, RotateCcw, Settings, ShieldCheck, Sparkles, Sun, Trash2, TrendingUp, X,
} from 'lucide-react';
import { CareerDashboard, FirstStepsChecklist } from '@/components/career-dashboard';
import { RoadmapJourney } from '@/components/roadmap-journey';
import { estimateSkillLearning, skillFamilies, type StartingLevel, type LearningGoal, type SkillFamily } from '@/lib/learning-estimates';
import { filterRadarSignalsByIndustry, isSharedRadarSignal, RADAR_INDUSTRY_OPTIONS } from '@/lib/radar-industry-filter';
import {
  getGetDashboardQueryKey, getGetProfileQueryKey, getListCareerMatchesQueryKey,
  getListDataSourcesQueryKey, useAnalyzeCv, useClearProfile, useCreateRoadmap,
  useGetDashboard, useGetProfile, useListCareerMatches, useListDataSources,
  useGetWorkforceContext, useImportTrendSnapshot, useListDemoProfiles, useSimulateScenario, useUpdateProfile,
  useUpdateRoadmapStep,
} from '@workspace/api-client-react';
import type {
  CareerMatch, Dashboard, DataSource, Profile, ProfileSummary, Roadmap,
  ScenarioResult, Skill, TrendSignal, TrendSnapshotInput, WorkforceContext,
} from '@workspace/api-client-react';
import { Route, Switch, Link, useLocation, useSearch, Router as WouterRouter } from 'wouter';
import LandingPage from '@/pages/landing';

const queryClient = new QueryClient();

const formatEvidenceDate = (value?: string | Date | null): string => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: PanelTop, group: 'WORKSPACE' },
  { label: 'My Skills', path: '/skills', icon: Gauge, group: 'WORKSPACE' },
  { label: 'Future Skills Radar', path: '/radar', icon: Radar, group: 'WORKSPACE' },
  { label: 'Career Explorer', path: '/careers', icon: Compass, group: 'WORKSPACE' },
  { label: 'My Learning Roadmap', path: '/roadmap', icon: BookOpen, group: 'WORKSPACE' },
  { label: 'Future Scenarios', path: '/scenarios', icon: TrendingUp, group: 'WORKSPACE' },
  { label: 'SDG Impact', path: '/sdg', icon: Leaf, group: 'WORKSPACE' },
  { label: 'My Progress', path: '/progress', icon: ListChecks, group: 'WORKSPACE' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'SUPPORT' },
  { label: 'About CareerLens', path: '/about', icon: CircleHelp, group: 'SUPPORT' },
  { label: 'Data Sources & Methodology', path: '/sources', icon: FileText, group: 'SUPPORT' },
];

// Local copy of the official UN Sustainable Development Goal names.
// Reference: United Nations DESA, https://sdgs.un.org/goals
const UN_SDG_GOALS = [
  'No Poverty',
  'Zero Hunger',
  'Good Health and Well-Being',
  'Quality Education',
  'Gender Equality',
  'Clean Water and Sanitation',
  'Affordable and Clean Energy',
  'Decent Work and Economic Growth',
  'Industry, Innovation and Infrastructure',
  'Reduced Inequalities',
  'Sustainable Cities and Communities',
  'Responsible Consumption and Production',
  'Climate Action',
  'Life Below Water',
  'Life on Land',
  'Peace, Justice and Strong Institutions',
  'Partnerships for the Goals',
] as const;

const initials = (name = '') => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CL';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Not provided';
const humanize = (value?: string) => value ? value[0].toUpperCase() + value.slice(1) : '—';
const displaySourceName = (value: string) => value.replace(/\s+—\s+/g, ': ');
const SAVED_PROFILES_STORAGE_KEY = 'careerlens-saved-profiles';
const DISMISSED_FIRST_STEPS_STORAGE_KEY = 'careerlens-dismissed-first-steps';

function readSavedProfileSummaries(): ProfileSummary[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_PROFILES_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is ProfileSummary => {
      if (typeof entry !== 'object' || entry === null) return false;
      const summary = entry as Record<string, unknown>;
      return typeof summary.id === 'string'
        && typeof summary.name === 'string'
        && typeof summary.domain === 'string'
        && typeof summary.label === 'string';
    });
  } catch {
    return [];
  }
}

function readDismissedFirstStepsProfiles(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DISMISSED_FIRST_STEPS_STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

type CvUploadProgress = {
  fileName: string;
  fileSize: number;
  phase: 'reading' | 'analyzing';
  readPercent: number;
};

function readFileAsBase64(file: File, onProgress: (percent: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.onabort = () => reject(new Error('Reading the file was cancelled.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The file could not be converted for analysis.'));
        return;
      }
      const separator = reader.result.indexOf(',');
      resolve(separator >= 0 ? reader.result.slice(separator + 1) : reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <CareerWorkspace />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function CareerWorkspace() {
  const [location] = useLocation();
  useEffect(() => {
    if (location === '/') return;
    const pageName = navItems.find((item) => item.path === location)?.label || 'Workspace';
    document.title = `${pageName} | CareerLens`;
  }, [location]);
  if (location === '/') return <LandingPage />;
  return (
    <RoutedErrorBoundary resetKey={location}>
      <WorkspaceShell />
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  return <ErrorBoundary resetKey={resetKey}>{children}</ErrorBoundary>;
}

function WorkspaceShell() {
  const [location, setLocation] = useLocation();
  const isRoadmapLocation = location === '/roadmap';
  const isExpandedShell = location === '/dashboard' || navItems.some((item) => item.path === location);
  const isPageSection = location !== '/dashboard' && !isRoadmapLocation;
  const [expandedMenuOpen, setExpandedMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const enabled = localStorage.getItem('careerlens-theme') === 'dark';
    if (enabled) document.documentElement.classList.add('dark');
    return enabled;
  });
  const queryClient = useQueryClient();
  const demos = useListDemoProfiles();
  const [profileId, setProfileId] = useState(() => localStorage.getItem('careerlens-profile') || '');
  const [savedProfiles, setSavedProfiles] = useState<ProfileSummary[]>(readSavedProfileSummaries);
  const [dismissedFirstStepsProfiles, setDismissedFirstStepsProfiles] = useState<string[]>(readDismissedFirstStepsProfiles);
  const [profileCleared, setProfileCleared] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CvUploadProgress | null>(null);
  const uploadRequestLock = useRef(false);
  const roadmapRequestLock = useRef(false);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const [reviewProfile, setReviewProfile] = useState<Profile | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [hypotheticalSkill, setHypotheticalSkill] = useState('');
  const [scenarioResults, setScenarioResults] = useState<Partial<Record<'moderate' | 'fast', ScenarioResult>>>();
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState(false);
  const scenarioInputVersion = useRef(0);
  const [selectedCareer, setSelectedCareer] = useState('');
  const [localRoadmap, setLocalRoadmap] = useState<Roadmap | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('careerlens-analysis-pending')) {
      sessionStorage.removeItem('careerlens-analysis-pending');
      setUploadOpen(true);
      setUploadError('CV analysis was interrupted by a page refresh or navigation. Upload your PDF again to restart. Your saved profiles have not changed.');
    }
  }, []);

  useEffect(() => {
    if (!isExpandedShell) setExpandedMenuOpen(false);
  }, [isExpandedShell]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('careerlens-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(SAVED_PROFILES_STORAGE_KEY, JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  useEffect(() => {
    localStorage.setItem(DISMISSED_FIRST_STEPS_STORAGE_KEY, JSON.stringify(dismissedFirstStepsProfiles));
  }, [dismissedFirstStepsProfiles]);

  const demoProfiles = demos.data ?? [];
  const savedById = new Map(savedProfiles.map((saved) => [saved.id, saved]));
  const profiles = [
    ...demoProfiles.map((demo) => savedById.get(demo.id) ?? demo),
    ...savedProfiles.filter((saved) => !demoProfiles.some((demo) => demo.id === saved.id)),
  ];
  const firstProfileId = profiles[0]?.id;

  useEffect(() => {
    if (!profileId && !profileCleared && firstProfileId) setProfileId(firstProfileId);
  }, [profileId, profileCleared, firstProfileId]);
  const search = useSearch();
  const entry = new URLSearchParams(search).get('entry');
  const entryHandled = useRef('');
  const openCvUploadRef = useRef<() => void>(() => {});
  const switchProfileRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    if (location !== '/dashboard' || !entry) { entryHandled.current = ''; return; }
    if (entryHandled.current === entry) return;
    if (entry === 'upload') {
      entryHandled.current = entry;
      openCvUploadRef.current();
      setLocation('/dashboard', { replace: true });
    } else if (entry === 'demo') {
      if (demos.isLoading) return;
      entryHandled.current = entry;
      const firstDemo = demos.data?.[0];
      if (firstDemo) switchProfileRef.current(firstDemo.id);
      else setNotice('The demo could not be loaded. Your current profile has not been changed. Please retry from the home page.');
      setLocation('/dashboard', { replace: true });
    } else {
      entryHandled.current = entry;
      setLocation('/dashboard', { replace: true });
    }
  }, [location, entry, demos.isLoading, demos.data, setLocation]);
  useEffect(() => {
    if (profileId) localStorage.setItem('careerlens-profile', profileId);
  }, [profileId]);

  useEffect(() => {
    if (uploadProgress?.phase !== 'analyzing') {
      setAnalysisElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setAnalysisElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [uploadProgress?.phase]);

  const profileQuery = useGetProfile(profileId, { query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId) } });
  const dashboardQuery = useGetDashboard(profileId, { query: { enabled: !!profileId, queryKey: getGetDashboardQueryKey(profileId) } });
  const matchesQuery = useListCareerMatches({ profileId }, {
    query: { enabled: !!profileId, queryKey: getListCareerMatchesQueryKey({ profileId }), retry: false, refetchOnWindowFocus: false },
  });
  const sourcesQuery = useListDataSources({ query: { enabled: location === '/sources', queryKey: getListDataSourcesQueryKey() } });
  const analyzeCv = useAnalyzeCv();
  const updateProfile = useUpdateProfile();
  const clearProfile = useClearProfile();
  const createRoadmap = useCreateRoadmap();
  const updateRoadmapStep = useUpdateRoadmapStep();
  const simulateScenario = useSimulateScenario();
  const profile = profileQuery.data as Profile | undefined;
  const dashboard = dashboardQuery.data as Dashboard | undefined;
  const matches = matchesQuery.data ?? dashboard?.matches ?? [];
  const roadmap = localRoadmap ?? dashboard?.roadmap ?? null;

  const rememberProfile = (saved: Profile) => {
    const summary: ProfileSummary = {
      id: saved.id,
      name: saved.name,
      domain: saved.primaryDomain,
      label: demoProfiles.find((demo) => demo.id === saved.id)?.label ?? 'Saved CV profile',
    };
    setSavedProfiles((current) => {
      const existing = current.find((item) => item.id === summary.id);
      if (existing?.name === summary.name && existing.domain === summary.domain && existing.label === summary.label) {
        return current;
      }
      return [summary, ...current.filter((item) => item.id !== summary.id)];
    });
  };

  useEffect(() => {
    if (!profile?.confirmed || !profile.id.startsWith('cv-')) return;
    const summary: ProfileSummary = {
      id: profile.id,
      name: profile.name,
      domain: profile.primaryDomain,
      label: 'Saved CV profile',
    };
    setSavedProfiles((current) => {
      const existing = current.find((item) => item.id === summary.id);
      if (existing?.name === summary.name && existing.domain === summary.domain && existing.label === summary.label) {
        return current;
      }
      return [summary, ...current.filter((item) => item.id !== summary.id)];
    });
  }, [profile?.id, profile?.name, profile?.primaryDomain, profile?.confirmed]);

  const switchProfile = (id: string) => {
    scenarioInputVersion.current += 1;
    simulateScenario.reset();
    setProfileCleared(false);
    setProfileId(id);
    setSelectedCareer('');
    setReviewProfile(null);
    setLocalRoadmap(null);
    setScenarioResults(undefined);
    setScenarioLoading(false);
    setScenarioError(false);
    setNotice('');
  };

  const openCvUpload = () => {
    setUploadOpen(true);
    setUploadError('');
    setUploadProgress(null);
    setExpandedMenuOpen(false);
  };

  openCvUploadRef.current = openCvUpload;
  switchProfileRef.current = switchProfile;

  const onChooseFile = async (file?: File) => {
    if (uploadRequestLock.current) return;
    setUploadError('');
    setUploadProgress(null);
    if (!file) {
      setUploadError('No file was selected. Choose a PDF CV to continue.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && !['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(file.type))) {
      setUploadError('Unsupported CV format. Please choose a PDF CV. Images and other document formats are not supported.');
      return;
    }
    if (file.size === 0) {
      setUploadError('This file is empty. Choose a PDF CV containing selectable text.');
      return;
    }
    const maxFileBytes = 6 * 1024 * 1024;
    if (file.size > maxFileBytes) {
      setUploadError('This PDF is larger than the 6 MB upload limit. Choose a smaller file and try again.');
      return;
    }
    uploadRequestLock.current = true;
    sessionStorage.setItem('careerlens-analysis-pending', '1');
    const finishUpload = () => {
      uploadRequestLock.current = false;
      sessionStorage.removeItem('careerlens-analysis-pending');
      setUploadProgress(null);
    };
    setUploadProgress({ fileName: file.name, fileSize: file.size, phase: 'reading', readPercent: 0 });
    try {
      const contentBase64 = await readFileAsBase64(file, (readPercent) => {
        setUploadProgress((current) => current?.phase === 'reading' ? { ...current, readPercent } : current);
      });
      setUploadProgress((current) => current ? { ...current, phase: 'analyzing', readPercent: 100 } : current);
      analyzeCv.mutate({ data: { fileName: file.name, mimeType: 'application/pdf', contentBase64 } }, {
        onSuccess: (result) => {
          finishUpload();
          setReviewProfile(result);
          setUploadOpen(false);
        },
        onError: (error) => {
          finishUpload();
          setUploadError(error instanceof Error ? error.message : 'We could not read that CV. Try again.');
        },
      });
    } catch {
      finishUpload();
      setUploadError('The file could not be read. Please select it again.');
    }
  };

  const confirmProfile = (next: Profile, mode: 'new' | 'replace') => {
    const { id, ...data } = next;
    const targetProfileId = mode === 'replace' ? profileId : id;
    if (!targetProfileId) {
      setUploadError('There is no active profile to replace. Choose save as a new profile.');
      return;
    }
    updateProfile.mutate({ profileId: targetProfileId, data: { ...data, confirmed: true } }, {
      onSuccess: (saved) => {
        rememberProfile(saved);
        switchProfile(saved.id);
        setReviewProfile(null);
        setLocation('/dashboard');
        setNotice(mode === 'replace' ? 'Your active profile has been replaced and confirmed.' : 'Your new CV profile is saved and available in the profile switcher.');
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(saved.id) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(saved.id) });
        queryClient.invalidateQueries({ queryKey: getListCareerMatchesQueryKey({ profileId: saved.id }) });
      },
      onError: (error) => setUploadError(error instanceof Error ? error.message : 'Profile confirmation failed.'),
    });
  };

  const buildRoadmap = (careerId: string) => {
    if (roadmapRequestLock.current) return;
    if (!profileId || !careerId.trim()) {
      setNotice('Choose a profile and a target career before building a learning path.');
      return;
    }
    roadmapRequestLock.current = true;
    setSelectedCareer(careerId);
    createRoadmap.mutate({ data: { profileId, careerId } }, {
      onSuccess: (created) => {
        roadmapRequestLock.current = false;
        setLocalRoadmap(created);
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(profileId) });
        setNotice(`A learning path for ${created.careerTitle} is ready.`);
        setLocation('/roadmap');
      },
      onError: (error) => {
        roadmapRequestLock.current = false;
        setNotice(error instanceof Error ? error.message : 'The learning path could not be created. Please try again.');
      },
    });
  };

  const toggleStep = (roadmapId: string, stepId: string, complete: boolean) => {
    updateRoadmapStep.mutate({ roadmapId, stepId, data: { complete } }, {
      onSuccess: (updated) => {
        setLocalRoadmap(updated);
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(profileId) });
      },
      onError: () => setNotice('That learning milestone could not be updated. Please try again.'),
    });
  };

  const saveExperienceYears = async (years: number) => {
    if (!profileId) throw new Error('Choose a profile before editing experience.');
    const saved = await updateProfile.mutateAsync({ profileId, data: { totalExperienceYears: years } });
    rememberProfile(saved);
    queryClient.setQueryData(getGetProfileQueryKey(saved.id), saved);
    setNotice('Your total experience has been updated.');
  };

  const updateHypotheticalSkill = (value: string) => {
    scenarioInputVersion.current += 1;
    if (simulateScenario.isPending || simulateScenario.isError || simulateScenario.isSuccess) simulateScenario.reset();
    setHypotheticalSkill(value);
    setScenarioResults(undefined);
    setScenarioLoading(false);
    setScenarioError(false);
  };

  const runScenario = async () => {
    if (!profileId) return;
    const requestVersion = ++scenarioInputVersion.current;
    const skill = hypotheticalSkill.trim() || null;
    setScenarioResults(undefined);
    setScenarioError(false);
    setScenarioLoading(true);

    try {
      const [moderateResult, fastResult] = await Promise.allSettled([
        simulateScenario.mutateAsync({ profileId, data: { scenario: 'moderate', hypotheticalSkill: skill } }),
        simulateScenario.mutateAsync({ profileId, data: { scenario: 'fast', hypotheticalSkill: skill } }),
      ]);
      if (requestVersion !== scenarioInputVersion.current) return;

      const comparisonResults: Partial<Record<'moderate' | 'fast', ScenarioResult>> = {};
      if (moderateResult.status === 'fulfilled') comparisonResults.moderate = moderateResult.value;
      if (fastResult.status === 'fulfilled') comparisonResults.fast = fastResult.value;
      if (Object.keys(comparisonResults).length) setScenarioResults(comparisonResults);
      setScenarioError(moderateResult.status === 'rejected' || fastResult.status === 'rejected');
    } catch {
      if (requestVersion === scenarioInputVersion.current) setScenarioError(true);
    } finally {
      if (requestVersion === scenarioInputVersion.current) setScenarioLoading(false);
    }
  };

  const handleClearData = () => {
    if (!profileId || !window.confirm('Clear this profile and its retained career data? This cannot be undone.')) return;
    clearProfile.mutate({ profileId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(profileId) });
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
        setSavedProfiles((current) => current.filter((saved) => saved.id !== profileId));
        setDismissedFirstStepsProfiles((current) => current.filter((id) => id !== profileId));
        switchProfile('');
        setProfileCleared(true);
        localStorage.removeItem('careerlens-profile');
        setNotice('Profile data cleared.');
        setLocation('/dashboard');
      },
      onError: () => setNotice('Profile data could not be cleared. Please try again.'),
    });
  };

  const isLoading = demos.isLoading || (!!profileId && (profileQuery.isLoading || dashboardQuery.isLoading));
  const dataError = demos.error || (profileId && profileQuery.error);
  const profileSwitcherName = profile?.name || profiles.find((item) => item.id === profileId)?.name;

  return (
    <div className={`app-shell ${isExpandedShell ? 'app-shell-expanded' : ''}`}>
      <aside className={`sidebar ${expandedMenuOpen && isExpandedShell ? 'app-sidebar-open' : ''}`} id="workspace-sidebar" aria-label="Primary navigation">
        <Link href="/" className="brand" aria-label="CareerLens home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" focusable="false">
              <path d="M9.5 25.5c3.1-4.1 5.7-10.3 10.4-10.1 4.2.1 5.3 6.5 10.6 4.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="9.5" cy="25.5" r="4.4" fill="#164b3b" stroke="currentColor" strokeWidth="1.9" />
              <circle cx="20" cy="15.5" r="4.2" fill="#164b3b" stroke="#f2f3e8" strokeWidth="1.9" />
              <circle cx="30.5" cy="19.5" r="4.4" fill="currentColor" stroke="currentColor" strokeWidth="1.9" />
              <circle cx="30.5" cy="19.5" r="1.25" fill="#164b3b" />
            </svg>
          </span>
          <span>careerlens</span>
        </Link>
        <label htmlFor="profile-switcher" className="workspace-switch">
          <span className="avatar">{initials(profileSwitcherName)}</span>
          <span className="workspace-profile-copy">{profileSwitcherName || 'Choose a profile'}<small>{profile?.primaryDomain || 'Personal plan'}</small></span>
          <ChevronDown size={12} />
          <select
            id="profile-switcher"
            data-testid="select-profile"
            aria-label="Switch profile or add a profile"
            value={profileId}
            onChange={(event) => {
              if (event.target.value === '__add_profile__') {
                openCvUpload();
                return;
              }
              switchProfile(event.target.value);
            }}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          >
            {!profileId && <option value="" disabled>Choose a profile</option>}
            {profiles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.label}</option>)}
            <option value="__add_profile__">Add new profile from CV…</option>
          </select>
        </label>
        {['WORKSPACE', 'SUPPORT'].map((group) => (
          <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            {navItems.filter((item) => item.group === group).map(({ label, path, icon: Icon }) => (
              <Link key={path} href={path} onClick={() => setExpandedMenuOpen(false)} className={`nav-link ${path === '/sources' ? 'nav-link-sources' : ''} ${location === path ? 'active' : ''}`} data-testid={`link-nav-${path.replace('/', '') || 'dashboard'}`}>
                <Icon /><span>{label}</span>
              </Link>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Your momentum</span><span>{roadmap?.progress ?? 0}%</span></div>
          <div style={{ height: 2, background: '#31594d', marginBottom: 10 }}><div style={{ height: '100%', width: `${roadmap?.progress ?? 0}%`, background: '#d9eb58' }} /></div>
          <p style={{ fontSize: 11, color: '#d2decf', margin: '0 0 12px' }}>Percentage of roadmap milestones you have marked complete, not skill mastery.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="avatar">{initials(profile?.name)}</span><span>{profile?.name || 'Choose a profile'}<small style={{ display: 'block', marginTop: 2 }}>{profile?.primaryDomain || 'Career workspace'}</small></span></div>
        </div>
      </aside>
      {isExpandedShell && expandedMenuOpen && (
        <button
          className="app-menu-scrim"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setExpandedMenuOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          {isExpandedShell && (
            <button
              className="app-menu-toggle"
              type="button"
              aria-label={expandedMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={expandedMenuOpen}
              aria-controls="workspace-sidebar"
              onClick={() => setExpandedMenuOpen((open) => !open)}
              data-testid="button-app-menu"
            >
              {expandedMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <div className="crumb"><Link href="/" className="crumb-home" aria-label="CareerLens welcome page" data-testid="link-crumb-home">CareerLens</Link>&nbsp; › &nbsp;<span className="crumb-current">{navItems.find((item) => item.path === location)?.label || 'A clearer route to your next role'}</span></div>
          <div className="top-actions">
            <span className="quiet-status" style={{ fontSize: 8, color: '#8b8e7a' }}><Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />AI signal layer</span>
            <button className="btn" aria-label="Notifications" data-testid="button-notifications" onClick={() => setNotice('You are all caught up.')} style={{ padding: 6 }}><Activity size={13} /></button>
            <button className="upload-top" onClick={openCvUpload} data-testid="button-upload-cv"><FileUp size={12} /> Upload CV</button>
          </div>
        </header>
        {notice && (
          <div className="system-notification" role="status" aria-live="polite">
            <span className="system-notification-icon"><Activity size={19} /></span>
            <div className="system-notification-copy">
              <strong>System notification</strong>
              <p>{notice}</p>
            </div>
            <button className="system-notification-close" aria-label="Dismiss message" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className={`content ${isExpandedShell ? 'content-expanded' : ''} ${isRoadmapLocation ? 'content-roadmap' : ''} ${isPageSection ? 'content-section' : ''}`}>
          {isLoading ? <LoadingState /> : dataError ? <ErrorState message="We couldn't load your career workspace." onRetry={() => { void demos.refetch(); if (profileId) { void profileQuery.refetch(); void dashboardQuery.refetch(); } }} /> : null}
          {!isLoading && !dataError && (
            <Switch>
              <Route path="/dashboard" component={() => <DashboardPage profile={profile} dashboard={dashboard} matches={matchesQuery.data ?? []} roadmap={roadmap} selectedCareer={selectedCareer} firstStepsDismissed={dismissedFirstStepsProfiles.includes(profileId)} onDismissFirstSteps={() => setDismissedFirstStepsProfiles((current) => current.includes(profileId) ? current : [...current, profileId])} onNavigate={setLocation} rankingLoading={matchesQuery.isLoading} rankingError={matchesQuery.error} onRetryRanking={() => void matchesQuery.refetch()} onSaveExperienceYears={saveExperienceYears} savingExperienceYears={updateProfile.isPending} />} />
              <Route path="/skills" component={() => <SkillsPage profile={profile} onSave={(data) => profileId && updateProfile.mutate({ profileId, data }, { onSuccess: (saved) => { rememberProfile(saved); queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(profileId) }); setNotice('Profile details saved.'); } })} saving={updateProfile.isPending} onUpload={openCvUpload} />} />
              <Route path="/radar"><RadarPage /></Route>
              <Route path="/careers" component={() => <CareersPage matches={matches} loading={matchesQuery.isLoading} error={matchesQuery.error} onRetry={() => void matchesQuery.refetch()} selectedCareer={selectedCareer} onSelect={setSelectedCareer} onBuild={buildRoadmap} building={createRoadmap.isPending} />} />
              <Route path="/roadmap" component={() => <RoadmapJourney roadmap={roadmap} onCreate={() => setLocation('/careers')} onToggle={toggleStep} saving={updateRoadmapStep.isPending} />} />
              <Route path="/scenarios">
                <ScenariosPage
                  hypotheticalSkill={hypotheticalSkill}
                  setHypotheticalSkill={updateHypotheticalSkill}
                  roadmap={roadmap}
                  onRun={runScenario}
                  results={scenarioResults}
                  loading={scenarioLoading}
                  error={scenarioError}
                />
              </Route>
              <Route path="/sdg"><SdgPage matches={matchesQuery.data ?? []} loading={matchesQuery.isLoading} error={matchesQuery.error} onRetry={() => void matchesQuery.refetch()} /></Route>
              <Route path="/progress" component={() => <><p className="small-copy" role="note">Progress percentage means milestones marked complete divided by total roadmap milestones. It is not a measure of skill mastery.</p><ProgressPage roadmap={roadmap} onToggle={toggleStep} /></>} />
              <Route path="/settings" component={() => <SettingsPage profile={profile} profiles={profiles} profileId={profileId} onSwitch={switchProfile} onClear={handleClearData} clearing={clearProfile.isPending} darkMode={darkMode} onThemeChange={setDarkMode} />} />
              <Route path="/about" component={AboutPage} />
              <Route path="/sources" component={() => <SourcesPage sources={(sourcesQuery.data ?? []) as DataSource[]} loading={sourcesQuery.isLoading} error={sourcesQuery.error} onRetry={() => void sourcesQuery.refetch()} profileId={profileId} />} />
              <Route component={NotFound} />
            </Switch>
          )}
        </div>
      </main>
      <nav className="mobile-nav">{navItems.map(({ label, path, icon: Icon }) => <Link href={path} key={path} className={location === path ? 'active' : ''}><Icon /><span>{label === 'Future Skills Radar' ? 'Radar' : label.replace('My ', '')}</span></Link>)}</nav>
      {uploadOpen && <UploadModal busy={analyzeCv.isPending || Boolean(uploadProgress)} error={uploadError} elapsedSeconds={analysisElapsedSeconds} progress={uploadProgress} fileInput={fileInput} onClose={() => setUploadOpen(false)} onFile={onChooseFile} />}
      {reviewProfile && <ProfileReview profile={reviewProfile} activeProfileName={profile?.name} canReplace={Boolean(profileId)} onChange={setReviewProfile} onCancel={() => setReviewProfile(null)} onConfirm={(mode) => confirmProfile(reviewProfile, mode)} saving={updateProfile.isPending} error={uploadError} />}
    </div>
  );
}

function PageHead({ eyebrow, title, subtitle, children }: { eyebrow: string; title: ReactNode; subtitle: string; children?: ReactNode }) {
  return <div className="page-head"><div className="eyebrow">{eyebrow}</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 20 }}><div><h1 className="page-title">{title}</h1><div className="page-subtitle">{subtitle}</div></div>{children}</div></div>;
}

function DashboardPage({ profile, dashboard, matches, roadmap, selectedCareer, firstStepsDismissed, onDismissFirstSteps, onNavigate, rankingLoading, rankingError, onRetryRanking, onSaveExperienceYears, savingExperienceYears }: { profile?: Profile; dashboard?: Dashboard; matches: CareerMatch[]; roadmap: Roadmap | null; selectedCareer: string; firstStepsDismissed: boolean; onDismissFirstSteps: () => void; onNavigate: (path: string) => void; rankingLoading: boolean; rankingError: unknown; onRetryRanking: () => void; onSaveExperienceYears: (years: number) => Promise<void>; savingExperienceYears: boolean }) {
  if (!profile) return <EmptyProfile />;
  const checklist = <FirstStepsChecklist profile={profile} matches={matches} roadmap={roadmap} selectedCareer={selectedCareer} dismissed={firstStepsDismissed} onDismiss={onDismissFirstSteps} onNavigate={onNavigate} />;
  if (rankingLoading) return <div className="animate-in" style={{ padding: 'clamp(24px, 4vw, 56px)' }}>{checklist}<div className="eyebrow">Your career recommendations</div><h1 className="page-title">Finding your next direction.</h1><p className="page-subtitle" role="status">RunPod is comparing your skills, qualifications, and experience with suitable careers. You can explore the other pages while it works.</p><LoadingState /></div>;
  if (rankingError) return <div style={{ padding: 'clamp(24px, 4vw, 56px)' }}>{checklist}<ErrorState message="RunPod couldn't finish your career recommendations. Your saved profile is unchanged. Please try again." onRetry={onRetryRanking} /></div>;
  return <CareerDashboard profile={profile} dashboard={dashboard} matches={matches} roadmap={roadmap} selectedCareer={selectedCareer} firstStepsDismissed={firstStepsDismissed} onDismissFirstSteps={onDismissFirstSteps} onNavigate={onNavigate} onSaveExperienceYears={onSaveExperienceYears} savingExperienceYears={savingExperienceYears} />;
}

function EmptyProfile() {
  return <div className="animate-in empty-profile-page"><div className="eyebrow">Start with what you know</div><h1 className="page-title">Your next direction<br />starts with your story.</h1><p className="page-subtitle">Choose a synthetic profile from the workspace menu, or upload a CV to review your experience and skills before anything is confirmed.</p><div className="panel" style={{ marginTop: 24 }}><div className="section-label">CareerLens workspace</div><h2 className="panel-title">No active profile yet</h2><p className="small-copy">Use the profile switcher in the green navigation, or use Upload CV in the top corner. Your match scores are explainable signals, not hiring predictions.</p></div></div>;
}

function SkillsPage({ profile, onSave, saving, onUpload }: { profile?: Profile; onSave: (data: Partial<Profile>) => void; saving: boolean; onUpload: () => void }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [education, setEducation] = useState(profile?.education ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(profile?.fieldOfStudy ?? '');
  const [primaryDomain, setPrimaryDomain] = useState(profile?.primaryDomain ?? '');
  const [skillText, setSkillText] = useState(profile?.skills.map((skill) => skill.name).join(', ') ?? '');
  useEffect(() => { setName(profile?.name ?? ''); setEducation(profile?.education ?? ''); setFieldOfStudy(profile?.fieldOfStudy ?? ''); setPrimaryDomain(profile?.primaryDomain ?? ''); setSkillText(profile?.skills.map((skill) => skill.name).join(', ') ?? ''); }, [profile?.id, profile?.updatedAt]);
  if (!profile) return <EmptyProfile />;
  const save = () => {
    const currentByName = new Map(profile.skills.map((skill) => [skill.name.toLowerCase(), skill]));
    const skills = skillText.split(',').map((name) => name.trim()).filter(Boolean).map((skillName) => currentByName.get(skillName.toLowerCase()) || { name: skillName, category: 'Profile', level: 'developing' as const, verified: false });
    onSave({ name, education, fieldOfStudy, primaryDomain, skills, ...(!profile.confirmed ? { confirmed: true } : {}) });
  };
  return <div className="animate-in"><PageHead eyebrow="Your profile" title="Your skills, in your words." subtitle="Edit the profile signals CareerLens uses to explain role matches. Changes stay yours to confirm." /><div className="content-grid">
    <section className="panel"><div className="section-label">Profile details</div><div className="two-col"><Field label="Name" value={name} onChange={setName} /><Field label="Education" value={education} onChange={setEducation} /></div><div className="two-col"><Field label="Field of study" value={fieldOfStudy} onChange={setFieldOfStudy} /><Field label="Primary domain" value={primaryDomain} onChange={setPrimaryDomain} /></div><div className="field"><label htmlFor="profile-skills">Skills (separate with commas)</label><textarea id="profile-skills" data-testid="input-profile-skills" rows={4} value={skillText} onChange={(event) => setSkillText(event.target.value)} /></div><div className="tags">{profile.skills.map((skill) => <span className="tag" key={skill.name}>{skill.name} · {humanize(skill.level)}</span>)}</div><div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="btn btn-primary" onClick={save} disabled={saving} data-testid="button-save-profile">{saving ? 'Saving…' : profile.confirmed ? 'Save profile' : 'Confirm profile'}</button><button className="btn" onClick={onUpload}><FileUp size={12} /> Replace CV</button></div></section>
    <aside className="panel"><div className="section-label">Experience & interests</div><h2 className="section-heading">The context behind the signal</h2>{profile.experience.map((item, index) => <div key={`${item.title}-${index}`} className="experience-detail-row"><strong style={{ fontSize: 10 }}>{item.title}</strong><div className="small-copy">{item.organization} · {item.years ?? '—'} years</div><p className="small-copy">{item.description}</p></div>)}<div className="label-mini" style={{ marginTop: 16 }}>Interests</div><div className="tags">{profile.interests.map((interest) => <span className="tag" key={interest}>{interest}</span>)}</div><div className="toast-inline" style={{ marginTop: 20 }}>A stronger profile gives clearer explanations. It does not predict an employer’s decision.</div></aside>
  </div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="field"><label>{label}</label><input data-testid={`input-${label.toLowerCase().replaceAll(' ', '-')}`} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function RadarPage() {
  const [industry, setIndustry] = useState("all");
  const contextQuery = useGetWorkforceContext();
  const context = contextQuery.data;
  const skills = context?.skills ?? [];
  const mappedIndustryTags = [
    ...skills.flatMap((signal) => signal.industryTags),
    ...(context?.occupations ?? []).flatMap((signal) => signal.industryTags),
  ];
  const industries = [...new Set(mappedIndustryTags)].sort((a, b) => a.localeCompare(b));
  const filteredSkills = industry === "all"
    ? skills
    : skills.filter((signal) => signal.industryTags.includes(industry));

  return (
    <div className="animate-in">
      <PageHead
        eyebrow="Signals"
        title="What’s moving in your field."
        subtitle="Ranked skill trends from the World Economic Forum’s 2025 report, with transparent industry context."
      />
      <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div className="section-label">World Economic Forum · Future of Jobs Report 2025</div>
            <h2 className="section-heading">Skills outlook · 2025–2030</h2>
          </div>
          <span className="badge">{skills.length} ranked skills</span>
        </div>
        <p className="small-copy">
          Ranks show the report’s ordering of skills expected to see net increase; they are not scores or percentages. CareerLens industry tags organize related skills and are not official WEF industry forecasts. This is report context, not live job-vacancy data.
        </p>
        <a href="https://www.weforum.org/publications/the-future-of-jobs-report-2025/3-skills-outlook" target="_blank" rel="noreferrer">View WEF skills outlook source</a>
      </div>
      <div className="panel radar-industry-filter">
        <div>
          <div className="section-label">Industry filter</div>
          <h2 className="section-heading">Explore skills by industry</h2>
          <p className="small-copy">Choose a CareerLens industry grouping to see the WEF-ranked skills mapped to it.</p>
        </div>
        <div className="field radar-industry-select">
          <label htmlFor="radar-industry">Industry</label>
          <select
            id="radar-industry"
            data-testid="select-radar-industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          >
            <option value="all">All industries</option>
            {industries.map((name) => <option value={name} key={name}>{name}</option>)}
          </select>
          {industry !== 'all' && (
            <button className="btn" style={{ marginTop: 10 }} onClick={() => setIndustry('all')}>
              <RotateCcw size={12} /> Show all industries
            </button>
          )}
        </div>
      </div>
      <p className="small-copy radar-result-count" role="status" aria-live="polite">
        Showing {filteredSkills.length} of {skills.length} ranked skills{industry === "all" ? " across all industries" : ` mapped to ${industry}`}
      </p>
      {contextQuery.isLoading ? (
        <div className="empty-state" role="status"><Activity size={16} /> Loading the imported WEF skills snapshot…</div>
      ) : contextQuery.error ? (
        <div className="error-state" role="alert">
          <p>We couldn’t load the WEF skills snapshot.</p>
          <button className="btn" onClick={() => void contextQuery.refetch()}>Retry</button>
        </div>
      ) : filteredSkills.length ? (
        <div className="content-grid">
          {filteredSkills.map((signal) => (
            <div className="panel workforce-skill-card" data-testid="radar-skill-card" key={signal.externalId}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div className="section-label">WEF report rank · 2025–2030</div>
                  <h2 className="panel-title">{signal.name}</h2>
                </div>
                <span className="badge">
                  {signal.trendGroup === "net_decline_reported" || signal.trendGroup === "small_net_decline_reported"
                    ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                  &nbsp;{signal.trendGroup === "fastest_growing_top_10" ? "Fastest-growing top 10" : humanize(signal.trendGroup ?? "ranked skill")}
                </span>
              </div>
              <div className="workforce-rank">
                <span className="career-score">#{signal.rank ?? "—"}</span>
                <span className="small-copy">of {skills.length} ranked skills</span>
              </div>
              <p className="small-copy workforce-skill-explanation">
                {signal.trendGroup === "fastest_growing_top_10"
                  ? "One of the ten skills the report ranks highest for net increase through 2030."
                  : signal.trendGroup === "small_net_decline_reported"
                    ? "The report notes a small net decline for this skill."
                    : signal.trendGroup === "net_decline_reported"
                      ? "The report notes a net decline for this skill."
                      : "Ranked in the report’s skills outlook for 2025–2030."}
              </p>
              <div className="label-mini">
                {signal.industryTagsOfficial ? "WEF industry tags" : "CareerLens industry mapping"}
              </div>
            </div>
          ))}
        </div>
      ) : context && skills.length === 0 ? (
        <div className="empty-state">The imported report snapshot has no skill records.</div>
      ) : (
        <div className="empty-state">
          No WEF skills in the supplied snapshot are mapped to {industry}. Choose another industry or view all industries.
        </div>
      )}
      {context?.sources.filter((source) => source.key === "wef-2025-skills").map((source) => (
        <details className="panel workforce-provenance" key={source.key}>
          <summary>Source and data labels</summary>
          <p className="small-copy">Imported {source.recordCount} records. Data type: <code>{source.dataType}</code>. Publication period: {source.publicationPeriod}.</p>
          <p className="small-copy">Industry forecast attribution from WEF: {source.officialWefIndustryForecast ? "Yes" : "No; tags are CareerLens mappings."}</p>
          <a href={source.sourceUrl} target="_blank" rel="noreferrer">Open the original report</a>
        </details>
      ))}
    </div>
  );
}

function SkillTagGroup({ label, skills, kind }: { label: string; skills: string[]; kind: 'present' | 'gap' }) {
  return (
    <div className={`skill-tag-group skill-tag-group-${kind}`}>
      <div className="label-mini">{label}</div>
      <div className="tags">
        {skills.length
          ? skills.map((skill) => <span className={`tag tag-skill-${kind}`} key={skill}>{skill}</span>)
          : <span className="tag tag-skill-none">None</span>}
      </div>
    </div>
  );
}

function CareersPage({ matches, loading, error, onRetry, selectedCareer, onSelect, onBuild, building }: { matches: CareerMatch[]; loading: boolean; error: unknown; onRetry: () => void; selectedCareer: string; onSelect: (id: string) => void; onBuild: (id: string) => void; building: boolean }) {
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const sourceBacked = matches.length > 0 && matches.every((match) => match.dataClassification === 'source_backed');
  const onetSource = sourceBacked && matches.every((match) => match.sourceName === 'O*NET 31.0 Database');
  const demonstration = matches.length > 0 && matches.every((match) => match.dataClassification === 'demonstration');
  const sourceName = matches.find((match) => match.sourceName)?.sourceName;
  const hasAdzunaEvidence = matches.some((match) => Number(match.observedListingCount ?? 0) > 0 && match.listingEvidenceSourceName?.includes('Adzuna'));
  const families = [...new Set(matches.map((match) => match.domain))].sort((left, right) => left.localeCompare(right));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredMatches = matches.filter((match) =>
    (family === 'all' || match.domain === family)
    && (!normalizedSearch
      || `${match.title} ${match.domain} ${match.occupationCode ?? ''} ${match.careerLensSpecializationBasedOn ?? ''}`
        .toLocaleLowerCase().includes(normalizedSearch)),
  );
  const visibleMatches = showAll ? filteredMatches : filteredMatches.slice(0, 12);
  const hasSpecializationLabels = matches.some((match) => match.careerLensSpecializationBasedOn);

  return (
    <div className="animate-in">
      <PageHead eyebrow="Career paths" title="Explore where your skills can travel." subtitle="Compare career directions across occupational families, see the skills behind each match, and choose a role to build a learning roadmap." />
      <div className="alert-strip" data-testid="status-career-source">
        <span>
          {loading ? (
            <>
              <strong>Checking career data</strong>
              Comparing your profile with the available occupation catalog.
            </>
          ) : error ? (
            <>
              <strong>Career data is temporarily unavailable</strong>
              Retry to load profile-based recommendations.
            </>
          ) : sourceBacked ? (
            <>
              <strong>Source-backed occupation data</strong>
              {onetSource
                ? <>Recommendations use the O*NET 31.0 Database from the U.S. Department of Labor, Employment and Training Administration. Family labels follow U.S. SOC major groups, not employer industries.</>
                : <>Recommendations use imported occupation data from {sourceName ?? 'a configured source'}; the category label is an occupation grouping, not a live hiring sector.</>}
              {onetSource && <> <a href="https://www.onetcenter.org/database.html" target="_blank" rel="noreferrer">O*NET source</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></>}
            </>
          ) : demonstration ? (
            <>
              <strong>Demonstration roles only</strong>
              These examples are illustrative and are not sourced job listings, labor-market statistics, or demand forecasts.
            </>
          ) : (
            <>
              <strong>No occupation matches available</strong>
              The active source returned no recommendations, so CareerLens will not fill the page with invented roles.
            </>
          )}
        </span>
        <span className="badge">
          {loading ? 'Checking data' : error ? 'Unavailable' : sourceBacked ? sourceName ?? 'Source-backed catalog' : demonstration ? 'Demonstration catalog' : 'No results'}
        </span>
      </div>
      <p className="small-copy" role="note">
        {loading || error || !matches.length
          ? 'Match scores are alignment signals, not hiring odds. No job-market counts, salaries, or demand are inferred.'
          : hasAdzunaEvidence
          ? 'Adzuna figures below are counts from a cached listing snapshot, not the full job market or live search results. Match scores are alignment signals, not hiring odds.'
          : onetSource
          ? 'The alignment index compares source-listed software examples and importance-rated occupational skill categories. Common office tools do not dominate the software component. Categories and software examples are exploration evidence, not mandatory qualifications or proof of proficiency. Each card explains its scoring scope. These are occupations, not job vacancies; no local demand is inferred.'
          : 'No live job listings are analyzed in this view. Match scores are alignment signals, not hiring odds. Listing-based skill frequency and live-demand priorities are unavailable without listing-level skill evidence.'}
      </p>
      {hasSpecializationLabels && (
        <p className="small-copy" role="note">
          Titles marked as CareerLens specializations are profile-relevant labels based on the O*NET occupation named on each card. The linked source skill evidence and occupation code are unchanged.
        </p>
      )}
      {loading ? <LoadingState /> : error ? <ErrorState message="Career matches could not be loaded." onRetry={onRetry} /> : matches.length ? (
        <>
          <section className="panel" aria-label="Filter career recommendations" style={{ marginBottom: 14 }}>
            <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', alignItems: 'end', gap: 14 }}>
              <div className="field">
                <label htmlFor="career-search">Search matched occupations</label>
                <input id="career-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. frontend developer, nurse, bakery" />
              </div>
              <div className="field">
                <label htmlFor="career-family-filter">Occupation family</label>
                <select id="career-family-filter" value={family} onChange={(event) => setFamily(event.target.value)}>
                  <option value="all">All families</option>
                  {families.map((option) => <option value={option} key={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <p className="small-copy" role="status" aria-live="polite" style={{ margin: '12px 0 0' }}>
              Showing {visibleMatches.length} of {filteredMatches.length} matching roles from {matches.length} profile-based recommendations.
            </p>
          </section>
          {filteredMatches.length ? <div className="content-grid">
          {visibleMatches.map((match) => (
            <article className={`career-card ${selectedCareer === match.id ? 'selected' : ''}`} key={match.id} onClick={() => onSelect(match.id)} data-testid={`card-career-${match.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div><span className="badge">{match.domain}</span>{match.occupationCode && <div className="label-mini" style={{ marginTop: 9 }}>O*NET {match.occupationCode}</div>}<h2 className="panel-title" style={{ marginTop: 9 }}>{match.title}</h2>
                  {match.careerLensSpecializationBasedOn && <p className="small-copy" style={{ fontSize: 11, marginTop: 5 }}>CareerLens specialization based on O*NET: {match.careerLensSpecializationBasedOn}</p>}
                </div>
                <span className="career-score" aria-label={`${match.score}% career alignment`}>{match.score}<small style={{ fontFamily: 'var(--app-font-sans)', fontSize: 12 }}>%</small></span>
              </div>
              <div className="small-copy">{match.explanation}</div>
              <div className="stat-grid">
                <div className="stat-box"><div className="label-mini">{match.occupationCode ? 'Software relevance' : 'Skills'}</div><strong>{match.occupationCode ? match.softwareScore == null ? 'Not assessed' : `${match.softwareScore}%` : `${match.skillsScore}%`}</strong><p className="small-copy" style={{ fontSize: 11, marginTop: 8 }}>{match.occupationCode ? 'How strongly your software skills relate to this occupation’s listed tools, weighted by source evidence. Not a software proficiency test.' : 'The share of reference skills supported by your profile.'}</p></div>
                <div className="stat-box"><div className="label-mini">{match.occupationCode ? 'Skill categories' : 'Interests'}</div><strong>{match.occupationCode ? match.transferableSkillsScore == null ? 'Not assessed' : `${match.transferableSkillsScore}%` : `${match.interestScore}%`}</strong><p className="small-copy" style={{ fontSize: 11, marginTop: 8 }}>{match.occupationCode ? 'The importance-weighted share of occupational skill categories supported by your profile. It does not prove specialist qualifications.' : 'How closely your stated interests align with this career.'}</p></div>
                <div className="stat-box"><div className="label-mini">{match.occupationCode ? 'Interests' : 'Trend'}</div><strong>{match.occupationCode ? `${match.interestScore}%` : match.trendScore == null ? 'Not assessed' : `${match.trendScore}%`}</strong><p className="small-copy" style={{ fontSize: 11, marginTop: 8 }}>{match.occupationCode ? 'How closely your stated interests align with the occupation. If you have not added interests, this does not affect your overall match.' : 'Relative alignment with dated directional signals, not a forecast of job growth.'}</p></div>
              </div>
              <p className="small-copy" role="note">The overall percentage is a career-alignment score based on the available profile evidence. It is not your chance of being hired or the percentage of job qualifications you meet.</p>
              {match.scoringNote && <details><summary className="small-copy">How this percentage is calculated</summary><p className="small-copy" data-testid={`score-method-${match.id}`}>{match.scoringNote}</p></details>}
              <SkillTagGroup label="Skills already in your corner" skills={match.matchedSkills} kind="present" />
              <SkillTagGroup label="Skills to explore" skills={match.missingSkills} kind="gap" />
              {Number(match.observedListingCount ?? 0) > 0 && match.listingEvidenceSourceName && (
                <div className="small-copy" data-testid={`status-listing-evidence-${match.id}`} style={{ marginTop: 12 }}>
                  <strong>{match.observedListingCount} cached job listings observed</strong>
                  <span> · Snapshot refreshed {formatEvidenceDate(match.listingEvidenceUpdatedAt)}</span>
                  {' · Source: '}
                  {match.listingEvidenceSourceUrl ? (
                    <a href={match.listingEvidenceSourceUrl} target="_blank" rel="noreferrer">
                      {match.listingEvidenceSourceName}
                    </a>
                  ) : match.listingEvidenceSourceName}
                </div>
              )}
              <button className="btn btn-primary" onClick={(event) => { event.stopPropagation(); onBuild(match.id); }} disabled={building} style={{ marginTop: 15 }} data-testid={`button-roadmap-${match.id}`}>
                {building && selectedCareer === match.id ? 'Building…' : 'Build this learning path'} <ArrowRight size={11} />
              </button>
            </article>
          ))}
          </div> : <div className="empty-state">No recommended occupations match these filters. Try a different title or occupation family.</div>}
          {filteredMatches.length > 12 && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" type="button" onClick={() => setShowAll((current) => !current)}>
              {showAll ? 'Show fewer roles' : `Show all ${filteredMatches.length} matching roles`}
            </button>
          </div>}
        </>
      ) : <div className="empty-state">No career directions are available right now. The system will not invent roles when the active source has no matching occupation data.</div>}
    </div>
  );
}

type ScenarioMatch = NonNullable<ReturnType<typeof useSimulateScenario>['data']>['matches'][number];

const aiDisruptionGuidance: Record<string, { moderate: string; fast: string; humanWork: string }> = {
  'User Experience Research': {
    moderate: 'interview transcription, feedback tagging, and first-pass synthesis',
    fast: 'large-scale feedback coding and initial usability-issue triage',
    humanWork: 'research design, participant trust, contextual interpretation, and product recommendations',
  },
  'Information Technology': {
    moderate: 'code drafts, documentation, and routine test generation',
    fast: 'more routine implementation, testing, and code documentation',
    humanWork: 'architecture, security, system integration, debugging, and production reliability',
  },
  'Data and Analytics': {
    moderate: 'routine data cleaning, query drafts, and chart summaries',
    fast: 'repeatable analysis and standard reporting',
    humanWork: 'data quality, problem framing, uncertainty, and decision advice',
  },
  'Business and Data Analytics': {
    moderate: 'query drafts, recurring dashboards, and first-pass analysis',
    fast: 'larger shares of routine analysis and standard reporting',
    humanWork: 'data validation, business context, interpretation, and recommendations',
  },
  'Business and Management': {
    moderate: 'meeting notes, routine reporting, and repeatable workflow steps',
    fast: 'more scheduling, status reporting, and predictable handoffs',
    humanWork: 'exceptions, prioritization, accountability, and cross-team coordination',
  },
  'Marketing and Communications': {
    moderate: 'first-draft copy, campaign summaries, and audience research',
    fast: 'more content generation, personalization, and routine performance analysis',
    humanWork: 'brand direction, audience context, experimentation, fact-checking, and trust',
  },
  'Finance and Accounting': {
    moderate: 'data entry, reconciliations, and first-pass reporting',
    fast: 'larger shares of transaction matching, forecast drafts, and recurring analysis',
    humanWork: 'controls, compliance, exceptions, auditability, and explaining variances',
  },
  Engineering: {
    moderate: 'design options, calculations, and technical documentation',
    fast: 'more candidate designs, routine analysis, and documentation',
    humanWork: 'physical validation, safety, system trade-offs, and certification',
  },
  'Sustainability and Environment': {
    moderate: 'data processing, research summaries, and recurring reports',
    fast: 'larger-scale monitoring, modeling, and draft compliance reporting',
    humanWork: 'measurement quality, local context, regulation, implementation, and stakeholder work',
  },
};

function getScenarioAiImpact(match: ScenarioMatch, scenario: 'moderate' | 'fast') {
  const guidance = aiDisruptionGuidance[match.domain] ?? {
    moderate: 'drafting, summarizing, and repeatable information-processing tasks',
    fast: 'a wider share of predictable, repeatable tasks',
    humanWork: 'judgment, exception handling, accountability, and work that depends on local context',
  };
  const responsibility = match.responsibilities[0]?.toLowerCase() ?? 'day-to-day work';

  if (scenario === 'fast') {
    return `AI could take on more ${guidance.fast} within work such as ${responsibility}. The role would put more weight on ${guidance.humanWork}. This suggests faster task changes and reskilling pressure, not a guaranteed change in total job numbers.`;
  }

  return `AI could gradually assist with ${guidance.moderate} within work such as ${responsibility}. People remain important for ${guidance.humanWork}. The likely change is a gradual shift in tasks and skills, not a prediction of job losses.`;
}

function getScenarioOverview(scenario: 'moderate' | 'fast') {
  return scenario === 'fast'
    ? 'Fast AI disruption assumes tools take on a broader share of repeatable work sooner, increasing the need for review, exception handling, and reskilling.'
    : 'Moderate AI disruption assumes gradual adoption: AI assists with repeatable tasks while context-heavy judgment and accountability remain central.';
}

function ScenariosPage({
  hypotheticalSkill,
  setHypotheticalSkill,
  onRun,
  results,
  loading,
  error,
}: {
  hypotheticalSkill: string;
  setHypotheticalSkill: (value: string) => void;
  roadmap: Roadmap | null;
  onRun: () => void;
  results?: Partial<Record<'moderate' | 'fast', ScenarioResult>>;
  loading: boolean;
  error: boolean;
}) {
  const workforceContextQuery = useGetWorkforceContext();
  const occupationSignals = workforceContextQuery.data?.occupations ?? [];
  const growingOccupations = occupationSignals.filter((item) => item.direction === "growing");
  const decliningOccupations = occupationSignals.filter((item) => item.direction === "declining");
  const occupationSource = workforceContextQuery.data?.sources.find((source) => source.key === "wef-2025-occupations");
  const [startingLevel, setStartingLevel] = useState<StartingLevel>('new');
  const [goal, setGoal] = useState<LearningGoal>('practical');
  const [family, setFamily] = useState<SkillFamily | 'auto'>('auto');
  const [moderateHours, setModerateHours] = useState('6');
  const [acceleratedHours, setAcceleratedHours] = useState('12');
  const enteredSkill = hypotheticalSkill.trim();
  const estimate = estimateSkillLearning(enteredSkill, {
    startingLevel, goal, family,
    moderateHours: Number(moderateHours), acceleratedHours: Number(acceleratedHours),
  });
  const hasResults = Boolean(results?.moderate || results?.fast);
  const scenarioCards = (['moderate', 'fast'] as const).flatMap((mode) =>
    (results?.[mode]?.matches.slice(0, 3) ?? []).map((match) => ({ mode, match })),
  );
  const prioritySkills = [...new Set([
    ...(results?.moderate?.prioritySkills ?? []),
    ...(results?.fast?.prioritySkills ?? []),
  ])].slice(0, 8);
  const estimatesLabel = results?.moderate?.estimatesLabel ?? results?.fast?.estimatesLabel;

  return (
    <div className="animate-in">
      <PageHead
        eyebrow="Future paths"
        title="Explore what could change next."
        subtitle="Explore CareerLens’s hypothetical moderate and fast AI paths. They are not official WEF predictions or job-loss probabilities."
      />
      <div className="content-grid scenario-layout">
        <section className="panel scenario-overview">
          <div className="section-label">AI disruption comparison</div>
          <h2 className="section-heading">Compare both AI adoption paths.</h2>
          <p className="small-copy scenario-result-disclaimer">These are hypothetical CareerLens assumptions for discussion, not official World Economic Forum forecasts, probabilities, or predictions of job loss.</p>
          <div className="scenario-overview-grid">
            {(['moderate', 'fast'] as const).map((mode) => (
              <article className={`scenario-overview-card ${mode}`} key={mode}>
                <div className="scenario-ai-impact-label">
                  {mode === 'moderate' ? 'Moderate AI disruption' : 'Fast AI disruption'}
                </div>
                <p>{getScenarioOverview(mode)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel scenario-controls">
          <div className="section-label">New skill and learning time</div>
          <h2 className="section-heading">What skill would you like to learn?</h2>
          <div className="field scenario-skill-field">
            <label htmlFor="what-if-skill">Skill to add to this scenario</label>
            <input
              id="what-if-skill"
              data-testid="input-hypothetical-skill"
              aria-describedby="scenario-skill-help"
              placeholder="For example, data storytelling"
              value={hypotheticalSkill}
              onChange={(event) => { setHypotheticalSkill(event.currentTarget.value); setFamily('auto'); }}
            />
            <small id="scenario-skill-help" className="small-copy">
              This skill is only included in the simulation; your confirmed profile stays unchanged.
            </small>
          </div>

          <div className="scenario-estimates" data-testid="scenario-learning-estimates">
            <div className="scenario-estimate-heading">
              <div>
                <div className="section-label">Estimated learning time</div>
                <h3>{enteredSkill || 'Compare both paces'}</h3>
              </div>
              {enteredSkill && <span className="badge">Planning estimate</span>}
            </div>
            {enteredSkill ? (
              <>
                <div className="scenario-estimate-grid">
                  <div className="field">
                    <label htmlFor="learning-starting-level">Your starting point</label>
                    <select id="learning-starting-level" value={startingLevel} onChange={(event) => setStartingLevel(event.target.value as StartingLevel)}>
                      <option value="new">Starting from scratch, including prerequisites</option>
                      <option value="related">I have the related foundations</option>
                      <option value="practicing">I already practise this skill</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="learning-goal">What do you want to achieve?</label>
                    <select id="learning-goal" value={goal} onChange={(event) => setGoal(event.target.value as LearningGoal)}>
                      <option value="intro">Introductory understanding</option>
                      <option value="practical">Practical foundations with applied practice</option>
                      <option value="advanced">Advanced practice, not professional expertise</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="learning-moderate-hours">Moderate study hours per week</label>
                    <input id="learning-moderate-hours" type="number" min="1" max="40" step="1" value={moderateHours} onChange={(event) => setModerateHours(event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="learning-accelerated-hours">Accelerated study hours per week</label>
                    <input id="learning-accelerated-hours" type="number" min="1" max="40" step="1" value={acceleratedHours} onChange={(event) => setAcceleratedHours(event.target.value)} />
                  </div>
                </div>
                {(estimate.status === 'needs-category' || family !== 'auto') && (
                  <div className="field">
                    <label htmlFor="learning-skill-family">Skill family for a broader estimate</label>
                    <select id="learning-skill-family" value={family} onChange={(event) => setFamily(event.target.value as SkillFamily | 'auto')}>
                      <option value="auto">Choose the closest skill family</option>
                      {skillFamilies.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                    </select>
                  </div>
                )}
                {estimate.status === 'estimated' && <p className="small-copy"><strong>{estimate.effort}</strong> for the selected goal. Planning for {estimate.matchedName}; this is not time to qualify for a whole career.</p>}
                <div className="scenario-estimate-grid">
                  <div className="scenario-estimate-card">
                    <span className="scenario-estimate-label">Moderate pace</span>
                    <strong data-testid="text-moderate-skill-duration">{estimate.moderate}</strong>
                    <small>{moderateHours || '0'} study hours per week</small>
                  </div>
                  <div className="scenario-estimate-card accelerated">
                    <span className="scenario-estimate-label">Accelerated pace</span>
                    <strong data-testid="text-accelerated-skill-duration">{estimate.accelerated}</strong>
                    <small>{acceleratedHours || '0'} study hours per week</small>
                  </div>
                </div>
                <p className="small-copy scenario-estimate-note">
                  {estimate.basis}
                </p>
                {estimate.source && <p className="small-copy scenario-estimate-note"><a href={estimate.source.url} target="_blank" rel="noreferrer">Training-workload reference</a>: {estimate.source.label} Published course workloads can change and are not the same as our full learning estimate.</p>}
              </>
            ) : (
              <div className="scenario-estimate-empty">Enter a skill above to compare its estimated time at both paces.</div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={onRun}
            disabled={loading}
            data-testid="button-run-scenario"
          >
            {loading ? 'Comparing scenarios…' : 'Compare both AI scenarios'} <ArrowRight size={16} />
          </button>
          {error && <div className="error-state scenario-error" role="alert">One or both scenarios could not be calculated. Retry to compare them.</div>}
        </section>

        <section className="panel scenario-results" data-testid="scenario-results">
          <div className="section-label">Your what-if view</div>
          <h2 className="section-heading">{hasResults ? 'Compare role impacts side by side.' : 'See both possible AI paths.'}</h2>
          {hasResults ? (
            <>
              <p className="small-copy">Each card pairs a career match with one AI scenario. The cards wrap into rows so both scenarios stay together.</p>
              <p className="scenario-result-disclaimer">
                Role-specific task examples are CareerLens assumptions for discussion, not job-loss predictions or live market forecasts. {estimatesLabel}
              </p>
              {(["moderate", "fast"] as const).map((mode) => {
                const comparison = results?.[mode]?.readinessComparison;
                if (!comparison) return null;
                return (
                  <div className={`scenario-alignment-comparison scenario-alignment-${mode}`} data-testid={`readiness-comparison-${mode}`} key={mode}>
                    <div>
                      <div className="section-label">{mode === "moderate" ? "Moderate" : "Fast"} AI scenario · hypothetical skill test</div>
                      <h3 className="panel-title">{comparison.careerTitle}</h3>
                      <p className="small-copy">Simulated profile-to-career alignment after learning “{comparison.skill}”. Your confirmed CV skills stay unchanged.</p>
                    </div>
                    <div className="scenario-alignment-values">
                      <div><span className="scenario-estimate-label">Current profile</span><strong>{comparison.beforeAlignment}%</strong></div>
                      <span aria-hidden="true">→</span>
                      <div><span className="scenario-estimate-label">With this skill</span><strong>{comparison.afterAlignment}%</strong></div>
                      <div className="small-copy">{comparison.changePoints > 0 ? "+" : ""}{comparison.changePoints} alignment points</div>
                    </div>
                    <p className="small-copy scenario-result-disclaimer">A CareerLens comparison indicator only; it is not proof of qualification, hiring odds, or a WEF skill score.</p>
                  </div>
                );
              })}
              {(results?.moderate?.hypotheticalImpact || results?.fast?.hypotheticalImpact) && (
                <div className="scenario-impact-summary-grid">
                  {results.moderate?.hypotheticalImpact && (
                    <div className="scenario-impact-summary">
                      <div className="scenario-ai-impact-label">Moderate AI change · skill impact</div>
                      <p>{results.moderate.hypotheticalImpact}</p>
                    </div>
                  )}
                  {results.fast?.hypotheticalImpact && (
                    <div className="scenario-impact-summary fast">
                      <div className="scenario-ai-impact-label">Fast AI change · skill impact</div>
                      <p>{results.fast.hypotheticalImpact}</p>
                    </div>
                  )}
                </div>
              )}
              {prioritySkills.length > 0 && (
                <>
                  <div className="label-mini scenario-priority-label">Priority skills across both scenarios</div>
                  <div className="tags">{prioritySkills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
                </>
              )}
              {scenarioCards.length ? (
                <div className="scenario-match-list" data-testid="scenario-match-list">
                  {scenarioCards.map(({ mode, match }) => (
                    <article className={`scenario-match-card ${mode}`} key={`${mode}-${match.id}`}>
                      <div className="scenario-match-heading">
                        <span className={`scenario-mode-chip ${mode}`}>
                          {mode === 'moderate' ? 'Moderate AI change' : 'Fast AI change'}
                        </span>
                        <span className="career-score">{match.score}%</span>
                        <small className="small-copy">Profile-to-career alignment, not hiring odds or the predicted percentage of jobs lost to AI.</small>
                      </div>
                      <h3 className="scenario-match-title">{match.title}</h3>
                      <span className="badge">{match.domain}</span>
                      <div className="scenario-ai-impact">
                        <div className="scenario-ai-impact-label">Potential task shift</div>
                        <p>{getScenarioAiImpact(match, mode)}</p>
                      </div>
                      <div className="scenario-match-fit">
                        <div className="label-mini">Profile match · not hiring odds</div>
                        <p>{match.explanation}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No matching roles were returned for these scenarios.</div>
              )}
            </>
          ) : (
            <div className="empty-state">
              {loading
                ? 'Comparing moderate and fast AI scenarios…'
                : 'Add an optional skill, then compare both AI scenarios to see role-by-role changes.'}
            </div>
          )}
          <details className="workforce-provenance scenario-occupation-context" data-testid="scenario-occupation-context">
            <summary>Report context: occupations with a growing or declining direction</summary>
            {workforceContextQuery.isLoading ? (
              <p className="small-copy">Loading the imported occupation snapshot…</p>
            ) : workforceContextQuery.error ? (
              <div className="error-state" role="alert">
                <p>We couldn’t load the WEF occupation snapshot.</p>
                <button className="btn" onClick={() => void workforceContextQuery.refetch()}>Retry</button>
              </div>
            ) : occupationSignals.length ? (
              <>
                <p className="small-copy">Qualitative directions reported by WEF for 2030. These are occupations in the report, not job openings or live vacancy counts. CareerLens industry tags are inferred mappings, not official WEF sector forecasts.</p>
                <div className="content-grid workforce-occupation-groups">
                  <section>
                    <h3 className="panel-title">Growing direction</h3>
                    <ul>{growingOccupations.map((item) => <li key={item.externalId}>{item.name}</li>)}</ul>
                  </section>
                  <section>
                    <h3 className="panel-title">Declining direction</h3>
                    <ul>{decliningOccupations.map((item) => <li key={item.externalId}>{item.name}</li>)}</ul>
                  </section>
                </div>
                {occupationSource && (
                  <p className="small-copy">
                    {occupationSource.recordCount} records · <code>{occupationSource.dataType}</code> · {occupationSource.publicationPeriod}.{" "}
                    <a href={occupationSource.sourceUrl} target="_blank" rel="noreferrer">Open WEF Jobs Outlook</a>
                  </p>
                )}
              </>
            ) : (
              <p className="small-copy">No occupation-direction records are available in the supplied snapshot.</p>
            )}
          </details>
        </section>
      </div>
    </div>
  );
}

function SdgPage({ matches, loading, error, onRetry }: { matches: CareerMatch[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const associations = new Map<number, { id: string; title: string }[]>();
  matches.forEach((career) => {
    career.sdgs.forEach((sdg) => {
      const current = associations.get(sdg.number) ?? [];
      current.push({ id: career.id, title: career.title });
      associations.set(sdg.number, current);
    });
  });
  return <div className="animate-in">
    <PageHead eyebrow="Work with purpose" title="Where your work can make a difference." subtitle="Explore how the same occupations recommended in Career Explorer can contribute to the UN Sustainable Development Goals." />
    {loading ? <LoadingState /> : error ? <ErrorState message="Career recommendations could not be loaded for SDG associations." onRetry={onRetry} /> : !matches.length ? <div className="empty-state">No recommended occupations are available yet. Add or review your profile in Career Explorer to explore applicable associations.</div> : <>
    <p className="small-copy" role="status">{matches.filter((career) => career.sdgs.length > 0).length} of {matches.length} recommended occupations have reviewed SDG mappings.</p>
    <div className="sdg-ribbon" aria-hidden="true" data-testid="sdg-icon-ribbon">
      <div className="sdg-ribbon-track">
        {[0, 1].map((copy) => (
          <div className="sdg-ribbon-set" key={copy}>
            {UN_SDG_GOALS.map((_, index) => (
              <img
                key={index}
                src={`${import.meta.env.BASE_URL}sdg-icons/goal-${index + 1}.png`}
                alt=""
                width="72"
                height="72"
                decoding="async"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
    <div className="content-grid sdg-masonry">{UN_SDG_GOALS.map((name, index) => {
      const number = index + 1;
      const links = associations.get(number) ?? [];
      return <section className="panel" key={number} data-testid={`sdg-goal-${number}`}>
        <div className="sdg-card-heading">
          <span className="badge">Goal {String(number).padStart(2, '0')}</span>
          <img
            className="sdg-goal-icon"
            src={`${import.meta.env.BASE_URL}sdg-icons/goal-${number}.png`}
            alt={`United Nations Sustainable Development Goal ${number}: ${name}`}
          />
        </div>
        <h2 className="panel-title">{name}</h2>
        {links.length ? links.map((link) => <div className="skill-row" key={link.id} data-testid={`sdg-association-${link.id}-${number}`}><span className="skill-name"><strong>{link.title}</strong></span></div>) : <p className="small-copy" style={{ marginTop: 10 }}>No recommended occupations are mapped to this goal.</p>}
      </section>;
    })}</div>
    {matches.some((career) => !career.sdgs.length) && <details className="panel" style={{ marginTop: 16 }} data-testid="sdg-unmapped-occupations">
      <summary>Occupations without a reviewed SDG mapping ({matches.filter((career) => !career.sdgs.length).length})</summary>
      {matches.filter((career) => !career.sdgs.length).map((career) => <div className="skill-row" key={career.id}>{career.title}</div>)}
    </details>}
    </>}
  </div>;
}

function ProgressPage({ roadmap, onToggle }: { roadmap: Roadmap | null; onToggle: (roadmapId: string, stepId: string, complete: boolean) => void }) {
  return <div className="animate-in"><PageHead eyebrow="Your practice" title="Small steps, visibly yours." subtitle="A record of the learning milestones you chose to complete. Your progress is private to this profile." />{roadmap ? <div className="content-grid"><section className="panel"><div className="section-label">Current path</div><h2 className="panel-title">{roadmap.careerTitle}</h2><div className="momentum-number">{roadmap.progress}%</div><div className="small-copy">{roadmap.steps.filter((step) => step.complete).length} of {roadmap.steps.length} steps complete</div><hr className="divider" />{roadmap.steps.map((step) => <label className="skill-row" key={step.id} style={{ cursor: 'pointer' }}><input type="checkbox" checked={step.complete} onChange={(event) => onToggle(roadmap.id, step.id, event.target.checked)} aria-label={`Mark ${step.skill} ${step.complete ? 'not complete' : 'complete'}`} /><span className="skill-name"><strong>{step.skill}</strong><small style={{ display: 'block', color: '#92937f' }}>{step.duration} · {step.difficulty}</small></span><span className="badge">{step.complete ? 'Complete' : 'In progress'}</span></label>)}</section><aside className="panel"><div className="section-label">Keep your rhythm</div><h2 className="section-heading">One milestone is enough for today.</h2><p className="small-copy">Mark completed steps as your learning journey changes. CareerLens keeps this view tied to your current roadmap.</p></aside></div> : <div className="empty-state">You haven’t started a roadmap yet. Find a role that interests you and build a learning path.</div>}</div>;
}

function SettingsPage({ profile, profiles, profileId, onSwitch, onClear, clearing, darkMode, onThemeChange }: {
  profile?: Profile;
  profiles: ProfileSummary[];
  profileId: string;
  onSwitch: (id: string) => void;
  onClear: () => void;
  clearing: boolean;
  darkMode: boolean;
  onThemeChange: (enabled: boolean) => void;
}) {
  return <div className="animate-in">
    <PageHead eyebrow="Workspace" title="Keep your workspace yours." subtitle="Choose your appearance, switch between demo or saved CV profiles, or manage stored profile data." />
    <section className="panel settings-appearance" aria-labelledby="settings-theme-title">
      <div className="section-label">Appearance</div>
      <div className="settings-appearance-row">
        <div>
          <h2 className="section-heading" id="settings-theme-title">Website theme</h2>
          <p className="small-copy">Choose the look that feels comfortable. Your preference is saved in this browser.</p>
        </div>
        <div className="switch-row" role="group" aria-label="Website theme">
          <button
            type="button"
            className={`switch-option settings-theme-option ${darkMode ? '' : 'active'}`}
            aria-pressed={!darkMode}
            onClick={() => onThemeChange(false)}
            data-testid="button-theme-light"
          >
            <Sun size={16} /> Light
          </button>
          <button
            type="button"
            className={`switch-option settings-theme-option ${darkMode ? 'active' : ''}`}
            aria-pressed={darkMode}
            onClick={() => onThemeChange(true)}
            data-testid="button-theme-dark"
          >
            <Moon size={16} /> Dark
          </button>
        </div>
      </div>
    </section>
    <div className="content-grid">
      <section className="panel">
        <div className="section-label">Profiles</div>
        <h2 className="section-heading">Switch active profile</h2>
        {profiles.length ? profiles.map((demo) => (
          <button key={demo.id} className="skill-row" onClick={() => onSwitch(demo.id)} data-testid={`button-switch-${demo.id}`} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0 }}>
            <span className="avatar">{initials(demo.name)}</span>
            <span className="skill-name"><strong>{demo.name}</strong><small style={{ display: 'block', color: '#92937f' }}>{demo.label} · {demo.domain}</small></span>
            {profileId === demo.id && <Check size={13} color="#708146" />}
          </button>
        )) : <div className="empty-state">No profiles are available yet.</div>}
      </section>
      <section className="panel">
        <div className="section-label">Data & privacy</div>
        <h2 className="section-heading">Profile stored in this workspace</h2>
        <p className="small-copy">{profile ? `${profile.name} · last updated ${formatDate(profile.updatedAt)}` : 'No active profile selected.'}</p>
        <div className="toast-inline"><LockKeyhole size={11} style={{ display: 'inline', marginRight: 5 }} />Your profile is used to organize explainable career matches and learning steps.</div>
        <hr className="divider" />
        <button className="btn btn-danger" disabled={!profileId || clearing} onClick={onClear} data-testid="button-clear-profile">
          <Trash2 size={12} />{clearing ? 'Clearing…' : 'Clear profile data'}
        </button>
      </section>
    </div>
  </div>;
}

function AboutPage() {
  return <div className="animate-in"><PageHead eyebrow="About CareerLens" title="Make the next move with more context." subtitle="CareerLens is an AI career-intelligence workspace for students, graduates, working adults, and career switchers." /><div className="content-grid"><section className="panel panel-dark"><div className="section-label">The idea</div><h2 className="panel-title">Your story is more than a job title.</h2><p className="small-copy">CareerLens turns the skills and experience you already have into explainable role directions, then gives you a practical way to explore what could come next.</p></section><section className="panel"><div className="section-label">A grounded workflow</div>{[['01', 'Start with your profile', 'Upload a CV or choose a synthetic profile. Review extracted details before you confirm.'], ['02', 'Understand the match', 'See the skills, interests, and market signals behind each role direction.'], ['03', 'Choose a next step', 'Build a learning path and mark milestones as you make progress.']].map(([number, title, description]) => <div className="skill-row" key={number}><span className="career-score" style={{ fontSize: 17 }}>{number}</span><span className="skill-name"><strong>{title}</strong><small style={{ display: 'block', marginTop: 3, color: '#858675' }}>{description}</small></span></div>)}</section></div><div className="alert-strip" style={{ marginTop: 14 }}>Career matches are alignment signals, not employment outcomes or hiring probabilities.</div></div>;
}

function SourcesPage({ sources, loading, error, onRetry, profileId }: { sources: DataSource[]; loading: boolean; error: unknown; onRetry: () => void; profileId: string }) {
  const queryClient = useQueryClient();
  const importSnapshot = useImportTrendSnapshot();
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [license, setLicense] = useState('');
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [signalsJson, setSignalsJson] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const submitSnapshot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccess('');

    const cleanSource = source.trim();
    const cleanUrl = sourceUrl.trim();
    const cleanLicense = license.trim();
    if (!cleanSource || cleanSource.length > 200) {
      setFormError('Enter a source name between 1 and 200 characters.');
      return;
    }
    try {
      const parsedUrl = new URL(cleanUrl);
      if (parsedUrl.protocol !== 'https:') throw new Error();
    } catch {
      setFormError('Enter a valid source URL beginning with https://.');
      return;
    }
    if (!cleanLicense || cleanLicense.length > 200) {
      setFormError('Enter the source license or usage terms (up to 200 characters).');
      return;
    }
    if (!observedAt || Number.isNaN(Date.parse(observedAt))) {
      setFormError('Choose a valid observation date for this snapshot.');
      return;
    }

    let parsedSignals: unknown;
    try {
      parsedSignals = JSON.parse(signalsJson);
    } catch {
      setFormError('Signals must be valid JSON. Check commas, quotes, and brackets.');
      return;
    }
    if (!Array.isArray(parsedSignals)) {
      setFormError('Signals JSON must be an array of signal objects.');
      return;
    }
    if (parsedSignals.length < 1 || parsedSignals.length > 100) {
      setFormError('Add between 1 and 100 skill signals.');
      return;
    }
    const directions = ['rising', 'stable', 'declining'];
    for (const [index, raw] of parsedSignals.entries()) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        setFormError(`Signal ${index + 1} must be an object with skill, direction, score, and evidence.`);
        return;
      }
      const signal = raw as Record<string, unknown>;
      if (typeof signal.skill !== 'string' || !signal.skill.trim() || signal.skill.trim().length > 100) {
        setFormError(`Signal ${index + 1}: skill must contain 1–100 characters.`);
        return;
      }
      if (typeof signal.direction !== 'string' || !directions.includes(signal.direction)) {
        setFormError(`Signal ${index + 1}: direction must be rising, stable, or declining.`);
        return;
      }
      if (typeof signal.score !== 'number' || !Number.isFinite(signal.score) || signal.score < 0 || signal.score > 100) {
        setFormError(`Signal ${index + 1}: score must be a number from 0 to 100.`);
        return;
      }
      if (typeof signal.evidence !== 'string' || !signal.evidence.trim() || signal.evidence.trim().length > 500) {
        setFormError(`Signal ${index + 1}: evidence must contain 1–500 characters.`);
        return;
      }
    }

    const payload: TrendSnapshotInput = {
      source: cleanSource,
      sourceUrl: cleanUrl,
      license: cleanLicense,
      observedAt: new Date(`${observedAt}T00:00:00.000Z`).toISOString(),
      signals: parsedSignals as TrendSnapshotInput['signals'],
    };
    importSnapshot.mutate({ data: payload }, {
      onSuccess: (imported) => {
        if (profileId) {
          void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(profileId) });
          void queryClient.invalidateQueries({
            predicate: (query) => {
              const params = query.queryKey[1] as { profileId?: string } | undefined;
              return query.queryKey[0] === '/api/career/careers' && params?.profileId === profileId;
            },
          });
        }
        void queryClient.invalidateQueries({ queryKey: getListDataSourcesQueryKey() });
        setSuccess(`Snapshot imported: ${imported.length} ${imported.length === 1 ? 'skill signal' : 'skill signals'} observed on ${formatDate(payload.observedAt)}.`);
      },
      onError: (mutationError) => setFormError(mutationError instanceof Error ? mutationError.message : 'Snapshot import failed. Review the details and try again.'),
    });
  };

  return <div className="animate-in">
    <PageHead eyebrow="Transparency" title="Know where the signal comes from." subtitle="CareerLens shows source context and dates so you can judge what each market signal can and cannot tell you." />
    <section className="panel" style={{ marginBottom: 14 }}>
      <div className="section-label">How CareerLens works</div>
      <div className="content-grid" style={{ marginTop: 7 }}>
        <div>
          <h2 className="section-heading">CV extraction</h2>
          <p className="small-copy">CV extraction, career recommendations, and personalized roadmaps use the connected RunPod Qwen3-8B model from the CareerLens API server. CareerLens does not retain raw CV bytes or extracted CV text after analysis.</p>
        </div>
        <div>
          <h2 className="section-heading">Career fit methodology</h2>
          <p className="small-copy">The CareerLens fit formula weights skills at 60%, interests at 25%, and trends at 15%. Match scores are alignment signals, not hiring probabilities.</p>
        </div>
      </div>
    </section>
    <section className="panel" style={{ marginBottom: 14 }}>
      <div className="section-label">Add a dated snapshot</div>
      <h2 className="section-heading">Import skill signals</h2>
      <p className="small-copy">Record the source, its license, and the date the signals were observed. Imported values remain dated market context.</p>
      <form onSubmit={submitSnapshot} noValidate>
        <div className="two-col">
          <div className="field"><label htmlFor="snapshot-source">Source name</label><input id="snapshot-source" data-testid="input-snapshot-source" value={source} onChange={(event) => setSource(event.target.value)} maxLength={200} required disabled={importSnapshot.isPending} placeholder="Name of the report or dataset" /></div>
          <div className="field"><label htmlFor="snapshot-date">Observation date</label><input id="snapshot-date" data-testid="input-snapshot-date" type="date" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required disabled={importSnapshot.isPending} /></div>
        </div>
        <div className="two-col">
          <div className="field"><label htmlFor="snapshot-url">Source URL</label><input id="snapshot-url" data-testid="input-snapshot-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required disabled={importSnapshot.isPending} placeholder="https://example.org/report" /></div>
          <div className="field"><label htmlFor="snapshot-license">License / usage terms</label><input id="snapshot-license" data-testid="input-snapshot-license" value={license} onChange={(event) => setLicense(event.target.value)} maxLength={200} required disabled={importSnapshot.isPending} placeholder="CC BY 4.0, public domain, or terms" /></div>
        </div>
        <div className="field"><label htmlFor="snapshot-signals">Signals JSON array</label><textarea id="snapshot-signals" data-testid="input-snapshot-signals" value={signalsJson} onChange={(event) => setSignalsJson(event.target.value)} rows={9} spellCheck={false} disabled={importSnapshot.isPending} aria-describedby="snapshot-json-hint" style={{ fontFamily: 'var(--app-font-mono)', fontSize: 9, lineHeight: 1.6 }} placeholder={'[{"skill":"...","direction":"rising","score":...,"evidence":"Source-backed finding"}]'} /></div>
        <div className="small-copy" id="snapshot-json-hint">Each item needs a skill, direction (rising / stable / declining), score (0–100), and evidence. Enter only values supported by the cited source in a JSON array with 1–100 items.</div>
        {formError && <div className="error-state" role="alert" data-testid="status-snapshot-error" style={{ marginTop: 12 }}>{formError}</div>}
        {success && <div className="toast-inline" role="status" data-testid="status-snapshot-success">{success}</div>}
        <button type="submit" className="btn btn-primary" disabled={importSnapshot.isPending} data-testid="button-import-snapshot" style={{ marginTop: 13 }}>{importSnapshot.isPending ? 'Importing snapshot…' : 'Import dated snapshot'} <ArrowRight size={11} /></button>
      </form>
    </section>
    {loading ? <LoadingState /> : error ? <ErrorState message="Data sources could not be loaded." onRetry={onRetry} /> : sources.length ? <div className="panel">{sources.map((item) => <div className="source-row" key={item.name}><div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><h2 className="panel-title" style={{ fontSize: 18, margin: 0 }}>{displaySourceName(item.name)}</h2><span className="badge">{humanize(item.status)}</span></div><p className="small-copy">{item.purpose}</p><div className="label-mini">Methodology</div><p className="small-copy source-methodology" style={{ borderRadius: 6, padding: 10, marginTop: 6 }}>{item.methodology}</p><div className="small-copy">Published {formatDate(item.publicationDate)} · Last updated {formatDate(item.lastUpdated)}</div></div><a href={item.url} target="_blank" rel="noreferrer" className="btn" style={{ alignSelf: 'start' }}>Visit source <ArrowRight size={10} /></a></div>)}</div> : <div className="empty-state">No sources are available at the moment.</div>}
    <div className="alert-strip" style={{ marginTop: 13 }}>Market values are dated snapshots and may not represent every geography, employer, or moment in time.</div>
  </div>;
}

function UploadModal({
  busy,
  error,
  elapsedSeconds,
  progress,
  fileInput,
  onClose,
  onFile,
}: {
  busy: boolean;
  error: string;
  elapsedSeconds: number;
  progress: CvUploadProgress | null;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFile: (file?: File) => void;
}) {
  const readingFile = progress?.phase === 'reading';
  const analyzing = progress?.phase === 'analyzing';
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div className="upload-modal-heading">
          <div>
            <div className="eyebrow">Your story, first</div>
            <h2 className="panel-title" id="upload-title" style={{ fontSize: 27 }}>Bring your experience into focus.</h2>
            <p className="small-copy">Upload a PDF CV. You’ll review and edit the extracted profile before confirming it.</p>
          </div>
          <button className="btn" aria-label="Close upload dialog" disabled={busy} onClick={onClose}><X size={13} /></button>
        </div>
        <input
          ref={fileInput}
          type="file"
          disabled={busy}
          accept="application/pdf,.pdf"
          hidden
          data-testid="input-cv-file"
          onChange={(event) => { onFile(event.target.files?.[0]); event.currentTarget.value = ''; }}
        />
        {progress ? (
          <div className="cv-upload-progress" aria-busy="true">
            <div className="cv-upload-file">
              <span className="cv-upload-file-icon"><FileUp size={17} /></span>
              <span className="cv-upload-file-copy">
                <strong title={progress.fileName}>{progress.fileName}</strong>
                <small>PDF · {formatFileSize(progress.fileSize)}</small>
              </span>
              <span className="badge cv-upload-phase">{readingFile ? 'Reading file' : 'Analyzing'}</span>
            </div>

            <div className="cv-progress-steps">
              <div className={`cv-progress-step ${readingFile ? 'active' : 'complete'}`}>
                <span className="cv-progress-marker">
                  {readingFile ? <LoaderCircle size={14} className="cv-progress-spinner" /> : <Check size={14} />}
                </span>
                <div className="cv-progress-step-copy">
                  <strong>Read your PDF</strong>
                  <small>{readingFile ? `${progress.readPercent}% of the selected file read. This is file-reading progress, not AI-analysis progress.` : 'PDF ready for analysis'}</small>
                  {readingFile && (
                    <div className="cv-progress-track" role="progressbar" aria-label="Reading PDF" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.readPercent}>
                      <span style={{ width: `${progress.readPercent}%` }} />
                    </div>
                  )}
                </div>
              </div>
              <div className={`cv-progress-step ${analyzing ? 'active' : 'waiting'}`}>
                <span className="cv-progress-marker">
                  {analyzing ? <LoaderCircle size={14} className="cv-progress-spinner" /> : '2'}
                </span>
                <div className="cv-progress-step-copy">
                  <strong>Analyze experience and skills</strong>
                  <small>{analyzing ? 'Extracting details and mapping your skills' : 'Starts when the PDF is ready'}</small>
                  {analyzing && (
                    <div className="cv-progress-track indeterminate" role="progressbar" aria-label="CV analysis in progress" aria-valuemin={0} aria-valuemax={100}>
                      <span />
                    </div>
                  )}
                </div>
              </div>
              <div className="cv-progress-step waiting">
                <span className="cv-progress-marker">3</span>
                <div className="cv-progress-step-copy">
                  <strong>Review your profile draft</strong>
                  <small>Next, you can edit the extracted details before saving.</small>
                </div>
              </div>
            </div>

            <div className="cv-upload-current" role="status" aria-live="polite">
              <LoaderCircle size={17} className="cv-progress-spinner" />
              <span>
                <strong>{readingFile ? 'Reading your CV' : 'Analyzing your CV'}</strong>
                <small aria-live="off">
                  {readingFile
                    ? `${progress.readPercent}% of the file read`
                    : elapsedSeconds === 0
                      ? 'This can take a few moments.'
                      : elapsedSeconds >= 90
                        ? `${elapsedSeconds} sec elapsed. The model is taking longer than usual; the request will time out if it cannot finish.`
                        : `${elapsedSeconds} sec elapsed · no action needed`}
                </small>
              </span>
            </div>
          </div>
        ) : (
          <button className="panel cv-upload-chooser" onClick={() => fileInput.current?.click()} disabled={busy} data-testid="button-choose-cv">
            <FileUp size={21} />
            <strong>Choose a PDF file</strong>
            <span className="small-copy">We’ll extract a draft for you to review. Nothing is confirmed until you say so.</span>
          </button>
        )}
        {error && <div className="error-state" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        <div className="toast-inline"><ShieldCheck size={11} style={{ display: 'inline', marginRight: 5 }} />Email addresses and phone numbers are removed before AI analysis. Avoid including other sensitive details you do not want in your profile draft.</div>
      </section>
    </div>
  );
}

function ProfileReview({ profile, activeProfileName, canReplace, onChange, onCancel, onConfirm, saving, error }: { profile: Profile; activeProfileName?: string; canReplace: boolean; onChange: (profile: Profile) => void; onCancel: () => void; onConfirm: (mode: 'new' | 'replace') => void; saving: boolean; error: string }) {
  const [saveMode, setSaveMode] = useState<'new' | 'replace'>('new');
  const update = (key: keyof Profile, value: string) => onChange({ ...profile, [key]: value });
  const updateSkills = (value: string) => {
    const old = new Map(profile.skills.map((skill) => [skill.name.toLowerCase(), skill]));
    const skills: Skill[] = value.split(',').map((item) => item.trim()).filter(Boolean).map((name) => old.get(name.toLowerCase()) || { name, category: 'Profile', level: 'developing', verified: false });
    onChange({ ...profile, skills });
  };
  const updateCertifications = (value: string) => {
    onChange({ ...profile, certifications: value.split(',').map((item) => item.trim()).filter(Boolean) });
  };
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">Review before confirming</div>
            <h2 id="review-title" className="panel-title" style={{ fontSize: 27 }}>Does this sound like you?</h2>
            <p className="small-copy">Edit any detail. These extracted details remain a draft until you confirm.</p>
          </div>
          <button className="btn" aria-label="Close profile review" disabled={saving} onClick={onCancel}><X size={13} /></button>
        </div>
        <div className="two-col">
          <Field label="Name" value={profile.name} onChange={(value) => update('name', value)} />
          <Field label="Education" value={profile.education} onChange={(value) => update('education', value)} />
        </div>
        <div className="two-col">
          <Field label="Field of study" value={profile.fieldOfStudy || ''} onChange={(value) => update('fieldOfStudy', value)} />
          <Field label="Primary domain" value={profile.primaryDomain} onChange={(value) => update('primaryDomain', value)} />
        </div>
        <div className="field">
          <label htmlFor="review-skills">Extracted skills (comma separated)</label>
          <textarea id="review-skills" rows={3} value={profile.skills.map((skill) => skill.name).join(', ')} onChange={(event) => updateSkills(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="review-certifications">Extracted certifications (comma separated)</label>
          <textarea id="review-certifications" data-testid="input-review-certifications" rows={2} value={(profile.certifications ?? []).join(', ')} onChange={(event) => updateCertifications(event.target.value)} placeholder="No certifications extracted" />
        </div>
        <div className="label-mini" style={{ marginTop: 14 }}>Save profile as</div>
        <div role="radiogroup" aria-label="Choose how to save this CV" style={{ display: 'grid', gridTemplateColumns: canReplace ? '1fr 1fr' : '1fr', gap: 8, marginTop: 7 }}>
          <label className="panel" style={{ display: 'flex', alignItems: 'start', gap: 8, padding: 11, cursor: 'pointer', borderColor: saveMode === 'new' ? '#879552' : undefined }}>
            <input type="radio" name="cv-save-mode" value="new" checked={saveMode === 'new'} onChange={() => setSaveMode('new')} disabled={saving} data-testid="radio-save-new-profile" />
            <span><strong style={{ display: 'block', fontSize: 10 }}>Save as a new profile</strong><small className="small-copy">Keep your active profile unchanged.</small></span>
          </label>
          {canReplace && <label className="panel" style={{ display: 'flex', alignItems: 'start', gap: 8, padding: 11, cursor: 'pointer', borderColor: saveMode === 'replace' ? '#879552' : undefined }}>
            <input type="radio" name="cv-save-mode" value="replace" checked={saveMode === 'replace'} onChange={() => setSaveMode('replace')} disabled={saving} data-testid="radio-replace-active-profile" />
            <span><strong style={{ display: 'block', fontSize: 10 }}>Replace active profile</strong><small className="small-copy">Overwrite {activeProfileName || 'the active profile'} with this reviewed CV.</small></span>
          </label>}
        </div>
        <div className="label-mini cv-experience-label" style={{ marginTop: 14 }}>Experience found</div>
        {profile.experience.length ? (
          <div className="cv-experience-list">
            {profile.experience.map((item, index) => (
              <div className="skill-row cv-experience-row" key={`${item.title}-${index}`}>
                <span className="skill-name">
                  <strong>{item.title}</strong>
                  <small className="cv-experience-description">{item.organization} · {item.description}</small>
                </span>
              </div>
            ))}
          </div>
        ) : <div className="small-copy">No experience details were extracted.</div>}
        {error && <div className="error-state" role="alert" style={{ marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
          <button className="btn" disabled={saving} onClick={onCancel}>Discard draft</button>
          <button className="btn btn-primary" onClick={() => onConfirm(saveMode)} disabled={saving} data-testid="button-confirm-profile">{saving ? 'Confirming…' : saveMode === 'replace' ? 'Replace and confirm profile' : 'Save new profile'} <Check size={12} /></button>
        </div>
      </section>
    </div>
  );
}

function LoadingState() {
  return <div className="loading-state" role="status" data-testid="status-loading"><div style={{ maxWidth: 500, margin: '0 auto' }}><div style={{ height: 9, width: '36%', borderRadius: 5, background: '#e8e9dc', marginBottom: 13 }} /><div style={{ height: 35, width: '70%', borderRadius: 6, background: '#e8e9dc', marginBottom: 18 }} /><div style={{ height: 94, borderRadius: 9, background: '#eeefe5' }} /><p>Gathering your career signals…</p></div></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="error-state" role="alert" data-testid="status-error">{message}<div style={{ marginTop: 10 }}><button className="btn" onClick={onRetry}><RotateCcw size={11} /> Try again</button></div></div>;
}

export default App;
