# Docker + Kubernetes + GitHub Actions CI/CD

A practical DevOps project demonstrating how to containerize a Node.js application with **Docker**, deploy it to **Kubernetes**, publish images to **Docker Hub**, and automate the complete CI/CD pipeline using **GitHub Actions** and a **macOS ARM64 self-hosted runner**.

## 🚀 Project Overview

This project implements the following automated workflow:

```text
Developer
    │
    │ git push origin main
    ▼
GitHub Repository
    │
    ▼
GitHub Actions
    │
    ▼
Self-Hosted Runner (macOS ARM64)
    │
    ├── npm ci
    ├── Docker build
    └── Docker push
            │
            ▼
       Docker Hub
            │
            ▼
       Kubernetes
       Deployment
            │
            ▼
      Rolling Update
            │
            ▼
          Pods
```

The objective is to demonstrate a complete development-to-deployment workflow where a code push automatically builds a new Docker image, pushes it to Docker Hub, and updates the Kubernetes deployment.

---

## 🛠️ Technologies Used

* **Node.js** – Application runtime
* **Docker** – Application containerization
* **Docker Hub** – Container image registry
* **Kubernetes** – Container orchestration
* **Docker Desktop Kubernetes** – Local Kubernetes cluster
* **kubectl** – Kubernetes CLI
* **GitHub Actions** – CI/CD automation
* **GitHub Self-Hosted Runner** – Executes workflows locally
* **npm** – Dependency management
* **macOS ARM64** – Self-hosted runner environment

The project uses Docker Desktop for the local Kubernetes cluster and a Mac-based self-hosted GitHub Actions runner to allow the workflow to access that local cluster.

---

## 📁 Project Structure

```text
my-nodeapp/
│
├── server.js
├── package.json
├── package-lock.json
├── Dockerfile
│
├── k8s/
│   └── ...
│
└── .github/
    └── workflows/
        └── ci-cd.yaml
```

The application is packaged as:

```text
Docker Image:
harsh4244rao/my-node-app
```

Kubernetes resources:

```text
Deployment: my-nodeapp
Container:  node-app
```

---

# 🐳 Docker

## Build the Docker Image

```bash
docker build -t my-node-app:v1 .
```

## Run the Container

```bash
docker run my-node-app:v1
```

## Check Docker Images

```bash
docker images
```

## Check Running Containers

```bash
docker ps
```

---

## 📦 Docker Bind Mounts

A bind mount allows a host directory or file to be mapped into a running container.

Example:

```bash
docker run -v /host/path:/container/path my-node-app:v1
```

Changes made to the host can appear immediately inside the mounted path.

However, a bind mount **does not modify the underlying Docker image**.

To permanently package application changes into the image:

```bash
docker build -t my-node-app:v2 .
```

This distinction is important when working with Docker during development.

---

# ☸️ Kubernetes

The application is deployed to the Kubernetes cluster provided by Docker Desktop.

## Verify Kubernetes

```bash
kubectl get nodes
```

Check the current context:

```bash
kubectl config current-context
```

The expected context is:

```text
docker-desktop
```

The Kubernetes node should be in the `Ready` state.

---

## Kubernetes Resources

The deployment uses:

| Resource         | Name                              |
| ---------------- | --------------------------------- |
| Deployment       | `my-nodeapp`                      |
| Container        | `node-app`                        |
| Image            | `harsh4244rao/my-node-app:latest` |
| Replicas         | `2`                               |
| Application Port | `3000`                            |

### Verify the Deployment

```bash
kubectl get deployments
```

### Verify Pods

```bash
kubectl get pods
```

### Verify Services

```bash
kubectl get services
```

### Inspect the Deployment

```bash
kubectl get deployment my-nodeapp -o yaml
```

### Check the Container Name

```bash
kubectl get deployment my-nodeapp \
  -o jsonpath='{.spec.template.spec.containers[*].name}'
```

Expected output:

```text
node-app
```

---

# 🔄 CI/CD Pipeline

The GitHub Actions workflow runs whenever changes are pushed to the `main` branch.

The pipeline performs:

```text
Checkout Code
      ↓
Check Node.js
      ↓
npm ci
      ↓
Build Docker Image
      ↓
Login to Docker Hub
      ↓
Push Image
      ↓
Update Kubernetes Deployment
      ↓
Wait for Rollout
```

The Docker image is tagged using the Git commit SHA:

```bash
docker build -t $IMAGE_NAME:${{ github.sha }} .
```

This creates an immutable image reference for each commit instead of relying only on the `latest` tag.

---

# ⚙️ GitHub Actions

The workflow is located at:

```text
.github/workflows/ci-cd.yaml
```

Example workflow structure:

```yaml
name: Node.js CI/CD

on:
  push:
    branches:
      - main

permissions:
  contents: read

env:
  IMAGE_NAME: harsh4244rao/my-node-app

jobs:
  build-test-push:
    runs-on: self-hosted

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check Node.js
        run: node --version

      - name: Install dependencies
        run: npm ci

      - name: Build Docker image
        run: |
          docker build -t $IMAGE_NAME:${{ github.sha }} .

      - name: Login to Docker Hub
        run: |
          echo "${{ secrets.DOCKERHUB_TOKEN }}" | \
          docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" \
          --password-stdin

      - name: Push Docker image
        run: |
          docker push $IMAGE_NAME:${{ github.sha }}

  deploy:
    needs: build-test-push
    runs-on: self-hosted

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/my-nodeapp \
            node-app=$IMAGE_NAME:${{ github.sha }}

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/my-nodeapp \
            --timeout=180s
```

---

# 🔐 Docker Hub Authentication

Docker Hub credentials should **never be hard-coded** in the workflow.

Create the following GitHub repository secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

The workflow accesses them through GitHub Secrets:

```yaml
${{ secrets.DOCKERHUB_USERNAME }}
${{ secrets.DOCKERHUB_TOKEN }}
```

A Docker Hub Access Token is used instead of the account password.

---

# 🖥️ Self-Hosted GitHub Actions Runner

Because Kubernetes is running locally inside Docker Desktop, the GitHub-hosted runner does not normally have access to the local Kubernetes cluster.

Therefore, this project uses a **self-hosted runner running on a macOS ARM64 machine**.

## Runner Setup

Create a dedicated directory:

```bash
cd ~
mkdir github-actions-runner
cd github-actions-runner
```

Register the runner through:

```text
GitHub Repository
→ Settings
→ Actions
→ Runners
→ New self-hosted runner
```

The runner uses the labels:

```text
self-hosted
macOS
ARM64
```

Start the runner:

```bash
cd ~/github-actions-runner
./run.sh
```

A successful runner displays:

```text
Connected to GitHub
Listening for Jobs
```

The runner terminal must remain active while workflows need to execute.

---

# 🧪 Testing the Self-Hosted Runner

Before running the complete CI/CD pipeline, a simple workflow can verify that the runner is working.

```yaml
name: Test Self Hosted Runner

on:
  push:
    branches:
      - main

jobs:
  test-runner:
    runs-on: self-hosted

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Test runner
        run: |
          echo "Hello from my Mac self-hosted runner!"
          echo "Runner is working!"
          node --version
          docker --version
          kubectl version --client
```

This verifies that GitHub Actions can successfully execute commands on the self-hosted machine.

---

# 🐛 Problems Encountered & Solutions

## 1. `npm ci` Failed

### Error

```text
npm error code EUSAGE

The `npm ci` command can only install with an existing
package-lock.json or npm-shrinkwrap.json
```

### Cause

`npm ci` requires an existing `package-lock.json` or supported shrinkwrap file.

### Solution

Generate the lock file:

```bash
npm install
```

Then commit it:

```bash
git add package-lock.json
git commit -m "Add package lock file"
git push origin main
```

After that, `npm ci` can be used for reproducible CI installations.

---

## 2. Kubernetes Container Name Error

### Error

```text
error: unable to find container named "my-nodeapp"
```

### Cause

The Kubernetes **Deployment name** and **container name** are different.

```text
Deployment:
my-nodeapp

Container:
node-app
```

### Incorrect

```bash
kubectl set image deployment/my-nodeapp \
  my-nodeapp=...
```

### Correct

```bash
kubectl set image deployment/my-nodeapp \
  node-app=...
```

The actual container name can be checked with:

```bash
kubectl get deployment my-nodeapp \
  -o jsonpath='{.spec.template.spec.containers[*].name}'
```

---

# 🔍 Useful Commands

## Docker

```bash
docker images
docker ps
docker ps -a
```

## Kubernetes

```bash
kubectl config current-context
kubectl get nodes
kubectl get deployments
kubectl get pods
kubectl get services
```

## Inspect Deployment

```bash
kubectl get deployment my-nodeapp -o yaml
```

## Check Container Name

```bash
kubectl get deployment my-nodeapp \
  -o jsonpath='{.spec.template.spec.containers[*].name}'
```

## Check Current Image

```bash
kubectl get deployment my-nodeapp \
  -o jsonpath='{.spec.template.spec.containers[*].image}'
```

## Monitor Rollout

```bash
kubectl rollout status deployment/my-nodeapp
```

## View Deployment History

```bash
kubectl rollout history deployment/my-nodeapp
```

---

# 🚦 End-to-End Runbook

Before pushing code:

### 1. Start Docker Desktop

Make sure Docker Desktop is running.

### 2. Enable Kubernetes

Verify Kubernetes is enabled in Docker Desktop.

### 3. Verify the cluster

```bash
kubectl get nodes
```

### 4. Start the self-hosted runner

```bash
cd ~/github-actions-runner
./run.sh
```

### 5. Modify the application

```bash
cd ~/my-nodeapp
```

Make your code changes.

### 6. Commit and push

```bash
git add .
git commit -m "Update application"
git push origin main
```

### 7. GitHub Actions runs automatically

The pipeline will:

```text
npm ci
   ↓
Docker build
   ↓
Docker Hub push
   ↓
Kubernetes deployment update
   ↓
Rolling update
```

### 8. Verify the deployment

```bash
kubectl get pods
kubectl get deployment my-nodeapp
```

---

# 🔧 Troubleshooting

| Problem                  | Solution                                                                         |
| ------------------------ | -------------------------------------------------------------------------------- |
| Workflow doesn't appear  | Verify `.github/workflows/ci-cd.yaml` exists, is committed, and pushed to `main` |
| Runner is Offline        | Start the runner with `./run.sh`                                                 |
| Runner is Idle           | Idle means the runner is online and waiting for a job                            |
| `npm ci` fails           | Ensure `package-lock.json` is committed                                          |
| Docker push fails        | Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`                                |
| Container not found      | Check the actual Kubernetes container name                                       |
| Deployment not found     | Run `kubectl get deployments` and verify the deployment name                     |
| Rollout doesn't complete | Check Pods, describe the failing Pod, and inspect rollout status                 |

---

# 📚 Key Learnings

This project demonstrates several important DevOps concepts:

* Difference between a **Docker image** and a **container**
* Docker **bind mounts**
* Containerizing a Node.js application
* Kubernetes **Deployments and Pods**
* Kubernetes rolling updates
* Docker Hub image publishing
* GitHub Actions CI/CD
* GitHub self-hosted runners
* GitHub repository secrets
* Reproducible dependency installation using `npm ci`
* Immutable Docker image tags using Git commit SHA
* Difference between Kubernetes Deployment and container names
* Debugging CI/CD and Kubernetes deployment failures

---

# 🏗️ Architecture

```text
┌──────────────────────┐
│   Developer / Mac    │
│    my-nodeapp        │
└──────────┬───────────┘
           │
           │ git push
           ▼
┌──────────────────────┐
│  GitHub Repository   │
└──────────┬───────────┘
           │
           │ trigger
           ▼
┌──────────────────────┐
│    GitHub Actions    │
│   Self-hosted Runner │
└──────────┬───────────┘
           │
      ┌────┴─────┐
      │          │
      ▼          ▼
┌──────────┐ ┌──────────┐
│ npm ci   │ │  Docker  │
└──────────┘ │  Build   │
             └────┬─────┘
                  │
                  ▼
          ┌──────────────┐
          │  Docker Hub  │
          │  Image: SHA  │
          └──────┬───────┘
                 │
                 ▼
       ┌────────────────────┐
       │     Kubernetes     │
       │    Deployment      │
       │     my-nodeapp     │
       │                    │
       │ container: node-app│
       └──────────┬─────────┘
                  │
                  │ rolling update
                  ▼
             ┌─────────┐
             │  Pods   │
             │ New Img │
             └─────────┘
```

The architecture reflects the end-to-end data flow implemented in the practical exercise.

---

## 🎯 Project Outcome

A push to the `main` branch automatically triggers the complete pipeline:

```text
Code Change
    ↓
Git Push
    ↓
GitHub Actions
    ↓
npm ci
    ↓
Docker Build
    ↓
Docker Hub
    ↓
kubectl set image
    ↓
Kubernetes Rolling Update
    ↓
Updated Pods
```

This provides a practical example of integrating **application development, containerization, orchestration, container registry management, and CI/CD automation** into a single workflow.
