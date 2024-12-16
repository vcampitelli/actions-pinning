# Version Pinning for GitHub Actions

This script will pin package versions in all your GitHub Actions workflows.

```diff
- uses: some/package@v2
+ uses: some/package@2d8c1b73325cd96dd66c508388b82bddd1679dbc
```

For details on the motivation, [see this presentation](https://viniciuscampitelli.com/slides-pipelines-ci-cd/#/5/2/0).

## Usage

```shell
$ git clone git@github.com:vcampitelli/actions-version-pinner.git
$ cd actions-version-pinner
$ npm install
$ npm run dev path/to/your/repo
```

## To Do

- [ ] `Docs` Improve docs with motivation, flags, usage...
- [ ] `Code` Build
- [ ] `Code` Linting action
- [ ] `Code` Add parameter with custom authors to ignore
- [ ] `Code` Support branches in version names
- [ ] `Code` Read version comments to update to a newer commit
