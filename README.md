# Fancy File Server Project

![Project Icon](images/project_icon.jpg)

The *FancyFileServer* is a **training** project designed exclusively for learning DevOps techniques and best practices. This application is **intentionally weak by design** and should never be used in production environments.

The project provides a full-stack web application built with BunJS and FastifyJS, featuring:

- **File Upload & Management**: Users can upload and manage files through a comprehensive web interface
- **Data Storage**: MongoDB with GridFS for scalable file storage
- **Caching Layer**: Redis for improved performance and session management
- **User Interface**: HandlebarsJS-based UI with dedicated pages for:
  - File management
  - User administration (Admin only)
  - JWT token generation and management
- **Authentication & Authorization**: Role-based access control with JWT tokens
- **Test Data Generation**: FakerJS for seeding fake data to the server and database in development mode
- **Comprehensive Testing**:
  - End-to-end API tests (BATS)
  - UI automation tests (Playwright)
  - Load testing (Artillery)

This project serves as a practical example for implementing CI/CD pipelines, containerization, testing strategies, and DevOps workflows.

## System Requirements

### macOS

- Visual Studio Code 1.106.1
- VSCode Remote Development Extension
- Docker Desktop 4.54.0

### Windows

- Windows 11 + WSL2 2.5.10
- Visual Studio Code 1.106.1
- VSCode Remote Development Extension
- Docker Desktop 4.54.0

## User Guide

Please read the docs.

## Development

### Setup Locally

#### Use DevContainer

- Rename the file `sample.env-dev` to `.env-dev`
- Open `.env-dev` and provide values as instructed in the file
- Open Visual Studio Code at the project root directory
- When prompted, click **Reopen in Container** (or use Command Palette: `Dev Containers: Reopen in Container`)
  <img src="./images/reopen_in_container.png" alt="Logo" width="400"/>

- Wait for the containers to build and start (this may take several minutes on first run due to Playwright browser binaries installation)
- Once ready, you'll have a fully configured development environment with all dependencies installed
- Open any Web browser and navigate to `http://127.0.0.1:3000/home`

#### Use Docker Compose

Coming soon..

### Run Tests

coming soon...

## Build With GitHub

### Pre-Release

- Navigate to **Actions** → **Manual Dispatch** in the GitHub repository
- Click **Run workflow**
- Enter a custom tag (e.g., `dev`, `beta`, `rc1`)
- Optionally enable **Upload Docker image to registry** if you want to push to Docker Hub
- Click **Run workflow** to start the build and test pipeline

### Release

- Create a new release in the GitHub repository
- Tag the release with semantic versioning (e.g., `v1.0.0`, `v2.1.3`)
- Publish the release
- The **On Release** workflow automatically triggers, runs all tests, and pushes the Docker image to Docker Hub with the release tag
