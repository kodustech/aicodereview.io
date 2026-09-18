# Runbook

## What needs a human (accounts and OAuth)

1. Create a public GitHub repository, e.g. `kodustech/aicodereview-benchmark`.
2. Push `benchmark/` to it as the repository root.
3. Install each tool's GitHub App on that repository. Free tiers are enough for
   the tools that have one; the tools without a free tier need a trial seat.
4. Tell me the repository URL.

## What I can do from there

- Generate the defect branches and open one pull request per defect.
- Collect every review comment via the GitHub API.
- Score each tool against `manifest/defects.json`.
- Write `results/<tool>.json` and publish `/benchmark/`.

## Candidate tools with a free tier or trial

Free tier documented: CodeRabbit, Kodus, cubic, Greptile, Sourcery, DeepSource,
Codacy, Qodana, Semgrep, Gemini Code Assist, What The Diff, PR-Agent (self-run).
Trial only: Bito, CodeAnt AI.
No free tier documented: Tabnine.

Start with the ones that install in one click; a partial benchmark with 6 tools
published honestly beats a complete one that never ships.
