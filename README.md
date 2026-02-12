# git-xor

`git-xor` is a git extension that compares two branches maintained via cherry-picks. It finds
commits unique to each side by matching on subject line + file overlap, then reports
the results as ticket URLs.

When installed, it's available as `git xor` because git automatically discovers
executables named `git-<name>` on `$PATH`.

## Usage

```
git xor <ours> <theirs> [--ticket-pattern 'PROJ-\d+'] [--ticket-url 'https://jira.example.com/browse/{ticket}']
```

- `ours` and `theirs` are branch names (matching git domain language)
- `--ticket-pattern` and `--ticket-url` are optional; they can also be set in gitconfig
- If neither flag nor gitconfig is set, the ticket report section is skipped

### gitconfig

```ini
[xor]
    ticket-pattern = PROJ-\\d+
    ticket-url = https://jira.example.com/browse/{ticket}
```

Read by parsing the gitconfig files directly. Precedence: CLI flag > repo `.git/config` > global `~/.gitconfig`.
