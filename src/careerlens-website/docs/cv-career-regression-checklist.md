# CareerLens CV-to-career regression checklist

This checklist maps the supplied TC09–TC40 cases to safeguards and tests.
Unit tests use synthetic profiles and mocked provider responses. They test
application behavior, not a guarantee that a probabilistic model will extract
every possible CV correctly. Extracted profiles remain editable drafts.

## Extraction

| Cases | Application response and evidence |
|---|---|
| TC09–10 | Explicit Python, Java and SQL in project descriptions are retained even without a skills heading. The extraction prompt requests project-supported skills. Regression: `career-ai.test.ts`. |
| TC11 | Empty skills are supported. Recognized technical skills absent from professional CV text are not accepted simply because the model returns them. No invented technical fallback. |
| TC12–13 | JS normalizes to JavaScript, duplicates collapse, and explicitly beginner Python is capped at developing rather than advanced. |
| TC14 | Skills appearing only in a hobbies section are excluded. |

## Career directions and gaps

| Cases | Application response and evidence |
|---|---|
| TC15, TC19 | The selected career ID is sent to roadmap generation. Selecting another career recomputes gaps for that role. Regression: `career-ai.test.ts`. |
| TC16, TC18 | Career discovery compares extracted/confirmed skills with multiple eligible reference careers. Sector restrictions remain in force. Existing sector tests plus `skill-scenarios.test.ts`. |
| TC17 | No skill overlap produces zero skill alignment and explicit missing requirements, not a fabricated strong match. |
| TC20 | Career Explorer clearly identifies its illustrative career catalog as career paths, not job listings. Empty results show an empty state. It does not claim the examples are real vacancies. |
| TC21–23, TC25 | Python + SQL against Python + SQL + React yields React only. All requirements yields no gaps. Casing and common aliases are normalized; empty skills are safe. Java does not incorrectly match JavaScript. |
| TC24 | **Data-dependent:** no listing-level skill dataset is currently analyzed here. The UI explicitly says listing-frequency counts are unavailable. It does not generate a frequency from the illustrative role catalog. |
| TC26 | An empty requirement list is insufficient information, not proof that all skills are satisfied. Imports reject records without requirements; roadmap generation rejects roles without requirements. |

## Learning

| Cases | Application response and evidence |
|---|---|
| TC27 | A React gap has the official React learning page and a relevant Meta front-end certificate option. |
| TC28–29 | The roadmap provides All resources, Free learning, and Certificate courses filters. Free resources appear first; unknown-cost legacy resources are not labeled free. Missing options have a clear empty state. |
| TC30 | Links must use HTTPS without embedded credentials. Unsafe links are not clickable. “Link not working?” exposes a provider/search recovery path. Reachability is not guaranteed: external pages and provider prices can change. |
| TC31 | Every missing role skill is retained, rather than silently truncating after five. Ordering uses role requirements and learning prerequisites. **Live job-demand priority remains data-dependent** and is explicitly not claimed. |

## Reliability and untrusted input

| Cases | Application response and evidence |
|---|---|
| TC32 | Synchronous upload and roadmap request locks prevent rapid duplicate UI submissions. Controls remain disabled while busy. |
| TC33 | Provider failures return useful retryable errors. The current saved profile is not replaced. HTTP and UI regressions test this behavior. |
| TC34 | File-reading progress, indeterminate AI progress, elapsed time, a slow-request message, and a 120-second backend inference timeout are provided. No fictional AI completion percentage is displayed. |
| TC35 | A per-tab session marker detects interrupted analysis after refresh. The user is asked to re-upload. The marker contains no CV content, filename, or extracted profile. Saved profiles remain intact. |
| TC36 | Responsive layouts and mobile usability require browser verification in addition to component tests. |
| TC37 | React renders script-like filenames as text. Uploaded text is data, not executable code or HTML. PDF validation still applies. |
| TC38 | Invalid JSON and missing profile arrays produce safe errors; incomplete drafts are not saved automatically. |
| TC39 | The system prompt explicitly treats CV content as untrusted and ignores embedded instructions. CV content remains inside its JSON data field; local evidence checks constrain known technical skills and beginner proficiency. Prompt-injection resistance is defense-in-depth, not an absolute guarantee. |
| TC40 | Missing or blank profile/target-career values are rejected before database lookup or inference. The UI also refuses to build without a target. |

## Commands

```sh
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/careerlens run test
pnpm --filter @workspace/careerlens run typecheck
```

The regression suites cover application safeguards. Live provider behavior,
external course availability, and source-backed job-demand data must be reported
separately rather than represented as mocked test success.

## Live synthetic browser verification

A real PDF was analyzed through the connected RunPod service, not a mocked AI
response. The browser journey verified:

- Python, Java, SQL, and JavaScript extraction, with Developing proficiency.
- No photography/hiking skills and no compliance with the embedded instruction
  demanding expertise.
- Saving a new synthetic profile without replacing an existing profile.
- Selecting Web Developer and generating a roadmap containing the React gap.
- Free/certificate resource filtering and the broken-link recovery control.
- Readable roadmap and upload modal at 402 × 874 without horizontal overflow.
- The interrupted-analysis message after a reload marker, with saved profile
  data preserved.

The synthetic server-side profile was deleted after the test. An initial browser
attempt rejected the valid PDF before analysis; browser MIME compatibility was
broadened and the continued journey passed. The tester could not capture the
original File MIME metadata, so its exact original value was not established.

This live sample does not establish universal extraction or prompt-injection
resistance. TC24 and the live-demand portion of TC31 remain dependent on real,
dated, listing-level skill data.
