---
description: Archive, upload, and submit to external TestFlight
allowed-tools: Bash(scripts/*), Bash(open *), Bash(git *), Bash(source *)
---

Archive HomeClaw, upload to App Store Connect, and submit to external TestFlight with release notes.

1. Generate release notes from commits since the last release tag:
   ```bash
   LAST_TAG=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null)
   git log --oneline "$LAST_TAG..HEAD"
   ```
2. Run the full pipeline:
   ```bash
   source ~/.secrets.env && scripts/archive.sh --testflight --notes "GENERATED_NOTES"
   ```
   Or with a notes file:
   ```bash
   source ~/.secrets.env && scripts/archive.sh --testflight --notes-file /path/to/notes.txt
   ```
3. Report: version, build number, TestFlight external status
4. Save the build number for the release tag (archive script writes `.build-number`)
