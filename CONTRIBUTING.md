# Collaboration & Commit Guidelines

To ensure a readable project history, automated semantic versioning, and seamless collaboration, this project strictly follows the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) specification.

## Commit Message Structure

Every commit message must be structured as follows:

<type>: <description>


### 1. Type
The type communicates the intent of the change. You **must** use one of the following:

* **`feat`**: Introduces a new feature to the codebase (correlates with `MINOR` in SemVer).
* **`fix`**: Patches a bug in your codebase (correlates with `PATCH` in SemVer).
* **`docs`**: Documentation only changes (e.g., updating the `README.md`).
* **`style`**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, Tailwind class reordering).
* **`refactor`**: A code change that neither fixes a bug nor adds a feature (e.g., extracting a UI component).
* **`perf`**: A code change that improves performance.
* **`test`**: Adding missing tests or correcting existing tests.
* **`build`**: Changes that affect the build system or external dependencies (e.g., npm, webpack, Next.js config).
* **`ci`**: Changes to our CI configuration files and scripts (e.g., GitHub Actions, GitLab CI).
* **`chore`**: Other changes that don't modify `src` or test files.
* **`revert`**: Reverts a previous commit.

### 2. Description
The description contains a succinct description of the change:
* Use the imperative, present tense: "change" not "changed" nor "changes".
* Do not capitalize the first letter.
* No dot (`.`) at the end.

---

## Examples

**Adding a new feature with a scope:**
feat(components): add responsive navigation sidebar

**Fixing a bug:**
fix(api): handle 404 errors on user profile fetch

**Introducing a breaking change:**
feat(auth)!: migrate authentication from JWT to OAuth2

**A multi-line commit with a body and footer:**
refactor(hooks): optimize useDebounce render cycles

Update the internal dependency array to prevent unnecessary re-renders 
when typing in the search input. 

Resolves: #45
BREAKING CHANGE: useDebounce now requires a delay parameter

---

## Collaborative Best Practices

To keep our pull requests clean and our team aligned, please adhere to the following:

1. **Keep Commits Atomic:** Each commit should represent a single, logical change. Do not mix unrelated formatting changes with a feature implementation. 
2. **Branching Strategy:** 
   * Create feature branches from `main` using the format: `type/short-description` (e.g., `feat/user-dashboard`).
   * Never push directly to `main`.
4. **Pull Requests:** Reference any active ticket or issue numbers in your PR description. Ensure your PR title also follows the Conventional Commits format, as this is often what gets squashed into the main branch.
