# git-xor

`git-xor` is a git extension that compares two branches maintained via cherry-picks. It finds
commits unique to each side by matching on subject line + file overlap, then reports
the results as ticket URLs.

When installed, it's available as `git xor` because git automatically discovers
executables named `git-<name>` on `$PATH`.

> [!NOTE]
> This project was built with the help of LLMs. All code is reviewed and vouched for by
> a human maintainer before merging. See [Contributing](#contributing) for details.

## Usage

```bash
git xor <our-branch> <their-branch> [--ticket-pattern 'PROJ-\d+'] \
    [--ticket-url 'https://jira.example.com/browse/{ticket}']
```

- `our-branch` and `their-branch` are branch names (matching git domain language)
- `--ticket-pattern` and `--ticket-url` are optional; they can also be set in gitconfig
- If neither flag nor gitconfig is set, the ticket report section is skipped

### gitconfig

For simpler interactions, you can add the ticket pattern or ticket URL to the `.git/config` file
in the project repo:

```bash
git config xor.ticket-pattern 'PROJ-\d+'
git config xor.ticket-url 'https://jira.example.com/browse/{ticket}'
```

This produces an `[xor]` section in your `.git/config`:

```ini
[xor]
    ticket-pattern = PROJ-\\d+
    ticket-url = https://jira.example.com/browse/{ticket}
```

## Contributing

This project uses [Vouch](https://github.com/mitchellh/vouch) to manage contributor trust.
New contributors must be vouched for by a maintainer before their issues or PRs are accepted.
The vouched contributors list lives in [`.github/VOUCHED.td`](https://github.com/andreimaxim/git-xor/.github/VOUCHED.td).

### Development

```bash
npm install
npm test
npm run check   # lint + format
```
