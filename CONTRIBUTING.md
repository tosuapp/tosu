# Contributing to tosu

Thank you for your interest in contributing to tosu! We welcome contributions of all kinds, including bug reports, feature requests, documentation improvements, and code submissions.

All contributions happen through GitHub Pull Requests.

## Development Workflow

1. **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
2. **Branching**: Create a new feature branch from the `master` branch.
3. **Commit**: Make your changes and commit them following our commit standards.
4. **Linting**: Ensure your code meets style and format rules.
5. **Submit**: Open a Pull Request against the `master` branch of the main repository.

## Coding & Style Standards

Before submitting, please make sure your code compiles and passes our linter checks:
* To run code formatting automatically:
  ```bash
  pnpm run prettier:fix
  ```
* To run the ESLint rules checker:
  ```bash
  pnpm run lint:fix
  ```

All custom code, variable names, documentation, and comments must be written in English. Ensure your logic remains readable, descriptive, and clean.

## Git & Commit Standards

### Conventional Commits
We use Conventional Commits to automate versioning and changelogs. All commit titles must begin with an appropriate prefix:
* `feat:` for new features.
* `fix:` for bug fixes.
* `refactor:` for code cleanups or restructurings.
* `chore:` for build system updates, dependencies, or configuration changes.

Do not include co-authoring footers in your commits. Keep commit descriptions short and to the point.

### Pull Requests
When submitting a Pull Request, please fill out the PR description with the following sections:
1. **Problem**: Clear description of the issue or feature you are addressing.
2. **Solution**: Explain how your code resolves the problem.
3. **Affected Files**: List of modified files.
4. **Verification**: Outline how you tested the changes (what game version, config, etc.).
5. **AI Declaration**: Declare if you used generative AI tools to assist in writing the code (specify the company, model, and version).

## Generative AI Policy

We welcome the use of AI tools to assist in your workflow (such as refactoring or generating helper functions), provided that you remain in control of your code.

> [!WARNING]
> Any submission that appears to be mostly AI-generated boilerplate will be rejected.
> We do not condone "vibe-coding" (generating code without understanding it) just for the sake of submitting.

You must fully understand how your code works and be prepared to explain specific segments of your submission if asked by maintainers during the PR review.

## Bug Reports

Report bugs by opening an issue on GitHub. A great bug report includes:
* A quick summary of the behavior.
* Detailed steps to reproduce.
* What you expected to happen versus what actually happened.
* Relevant environment details (OS version, game client version, log outputs).

## Licensing

By submitting a Pull Request to this repository, you agree that your contributions will be licensed under the project's [GNU Lesser General Public License v3.0](https://choosealicense.com/licenses/lgpl-3.0/).