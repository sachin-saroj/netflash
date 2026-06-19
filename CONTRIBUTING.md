# Contributing to NETflash

Thank you for your interest in contributing to NETflash! We welcome contributions from developers of all skill levels. Following these guidelines ensures a smooth, professional, and efficient development cycle.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: A local instance or a free MongoDB Atlas Cluster
- **Git**: Properly configured with your name and email address

---

## 🛠️ Setup Instructions

To set up a local development environment, follow these steps:

1. **Fork the Repository**
   Fork the repository on GitHub to your own account.

2. **Clone your Fork**
   ```bash
   git clone https://github.com/your-github-username/netflash.git
   cd netflash
   ```

3. **Configure the Environment**
   - Navigate to the `backend/` directory and copy the template:
     ```bash
     cd backend
     cp .env.example .env
     ```
   - Generate your `JWT_SECRET` key (see [README.md](file:///c:/Users/Asus/OneDrive/Desktop/netflash/README.md) for generation instructions) and configure your API keys.

4. **Install Dependencies**
   - Install backend modules:
     ```bash
     cd backend
     npm install
     ```
   - Install frontend modules:
     ```bash
     cd ../frontend
     npm install
     ```

5. **Run the Development Servers**
   - Start the backend server (runs on `http://localhost:5000`):
     ```bash
     cd ../backend
     npm run dev
     ```
   - In a separate terminal, start the Vite frontend server (runs on `http://localhost:5173`):
     ```bash
     cd ../frontend
     npm run dev
     ```

---

## 🌿 Branch Naming Conventions

Always create a new branch for your work. Keep branches scoped to a single fix or feature. Use the following prefixes:

- **Features**: `feature/your-feature-name` (e.g., `feature/redis-caching`)
- **Bug Fixes**: `bugfix/your-fix-name` (e.g., `bugfix/flipkart-scraper-error`)
- **Documentation**: `docs/update-readme`
- **Refactoring**: `refactor/clean-controllers`
- **Testing**: `test/add-watchlist-tests`

---

## 💬 Commit Message Guidelines

We enforce the **Conventional Commits** specification to ensure clean and readable git history. Write commits in the present tense, following this format:

```
<type>: <description>
```

### Approved Commit Types:
- `feat`: A new feature or client capability.
- `fix`: A bug fix.
- `docs`: Changes or updates to documentation only (no code logic changed).
- `style`: Formatting changes that do not affect logic (indentation, semicolons, linter fixes).
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `perf`: Code changes that optimize speed, memory, or rendering.
- `test`: Adding new tests or fixing existing test suites.
- `chore`: Maintenance tasks, package upgrades, or updates to build configurations.

*Example:* `feat: integrate redis cache layer for api responses`

---

## 🧪 Testing Requirements

To maintain code reliability, all contributions must pass the test suite. If you add new logic, write matching tests.

### Running Backend Tests (Jest)
Navigate to `backend/` and run:
```bash
npm run test
```
To run tests with coverage reporting:
```bash
npm run test:coverage
```

### Running Frontend Tests (Vitest & Playwright)
Navigate to `frontend/` and run unit/component tests:
```bash
npm run test
```
To run End-to-End browser tests (requires frontend and backend servers to be running):
```bash
npm run test:e2e
```

---

## 🎨 Code Style & Quality Rules

We use ESLint to enforce consistent code style. 
Before pushing your commits, run the linter in both project directories and fix any reported errors:

```bash
# In backend/
npm run lint

# In frontend/
npm run lint
```

- **Formatting**: Prefer standard spacing, double quotes for JSX attributes, single quotes for JavaScript strings, and semi-colons where appropriate.
- **Maintainability**: Document all models, complex service controllers, and utilities with descriptive **JSDoc** comments.

---

## 📤 Pull Request Protocol

1. Keep your pull requests focused on a single issue.
2. Ensure all unit and E2E tests pass before creating the PR.
3. Reference the relevant issue ID in your PR title or description (e.g. `fixes #42`).
4. Provide clear verification instructions showing how to manually test your code.
5. Wait for at least one maintainer approval before merging.

---

## 🐛 Reporting Issues

If you find a bug or want to request a feature:
1. Search the existing issues to ensure it hasn't been reported yet.
2. File a new issue, describing:
   - **Steps to Reproduce**: Detailed sequence of actions.
   - **Expected Behavior**: What should have happened.
   - **Actual Behavior**: Screenshots or terminal logs of the failure.
   - **Environment Info**: Node.js version, OS version, browser version.
