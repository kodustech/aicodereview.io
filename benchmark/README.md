# The planted-defect benchmark

A real test, run on a real repository, so the site can say "tested" and mean it.

## How it works

`src/` is a small but non-trivial Node service — orders, payments, auth — with
**defects deliberately planted** in known places. Each defect is recorded in
`manifest/defects.json` with its file, line range, category and severity.

The protocol:

1. Install the tools under test on this repository (this is the step that needs
   your accounts — see `RUNBOOK.md`).
2. For each defect, open a pull request that introduces it, one defect per PR,
   from a branch named `defect/<id>`.
3. Let every installed reviewer comment.
4. Record, per tool per PR: did it flag the planted defect (`caught`), did it
   flag something that is not a defect (`false_positive`), how long until the
   first comment, and the comment text.
5. Results go into `results/<tool-slug>.json` and are published at `/benchmark/`.

## Rules that keep it honest

- **One defect per pull request.** Mixing them makes attribution impossible.
- **The manifest is written before any tool sees the repository**, and is not
  edited afterwards.
- **Every tool gets identical PRs**, in the same order, from the same base.
- **Default configuration only.** No per-tool tuning, because a buyer's first
  week is the default configuration. Note it if a tool needs setup to function.
- **Record misses and false positives with equal care.** A tool that catches 11
  of 12 while producing 40 false positives is not the winner.
- **Publish the repository.** The whole point is that anyone can re-run it.
- **Date every run.** Vendors ship; a result is a snapshot, not a verdict.

## What this benchmark does NOT prove

It measures detection of *planted, known* defects in *one* codebase, in one
language, at one point in time. It says nothing about review quality on a
2M-line monorepo, about false-positive rates over months of real use, or about
whether the findings are worth reading. Those limits get published alongside
the numbers.
