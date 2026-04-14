# 🚀 EKS CI/CD Project with GitHub Actions, ArgoCD & Monitoring

## 📌 Overview

This project demonstrates a complete **end-to-end DevOps pipeline** for deploying a microservices-based application on AWS EKS using modern cloud-native tools.

It includes:

* CI pipeline with GitHub Actions
* CD with ArgoCD (GitOps approach)
* Kubernetes Gateway API with AWS ALB
* Monitoring using Prometheus & Grafana

---

## 🏗️ Architecture

> <img width="3485" height="2880" alt="EKS_terraform" src="https://github.com/user-attachments/assets/830e8de1-b6f1-48f7-8020-084617978c79" />


This system follows a modern cloud-native architecture:

* **Frontend, API, Worker services** are containerized using Docker
* Images are built and pushed to Docker Hub via GitHub Actions
* Kubernetes (EKS) runs all workloads
* **AWS Load Balancer Controller + Gateway API** expose services using ALB
* **ArgoCD** manages deployments using GitOps
* **Prometheus & Grafana** provide monitoring and observability

---

## ⚙️ Tech Stack

* **Cloud**: AWS EKS
* **Containerization**: Docker
* **CI**: GitHub Actions
* **CD (GitOps)**: ArgoCD
* **Ingress / Traffic**: Gateway API + AWS ALB
* **Monitoring**: Prometheus, Grafana
* **Infrastructure as Code**: Terraform

---

## 🔄 CI/CD Pipeline

### Continuous Integration (CI)

* Triggered on push to `main`
* Builds 3 Docker images:

  * Frontend
  * API
  * Worker
* Tags images with:

  * `latest`
  * Git commit SHA
* Pushes images to Docker Hub

---

### Continuous Deployment (CD)

* ArgoCD watches Kubernetes manifests
* Automatically syncs changes to EKS cluster
* Ensures cluster state matches Git repository

---

## 🌐 Application Exposure

* Uses **Gateway API** with AWS ALB
* Internet-facing load balancer
* Routes traffic to services:

  * `/` → Frontend
  * `/api` → API
  * `/jobs` → Worker

---

## 📊 Monitoring

* **Prometheus** collects metrics from cluster and services
* **Grafana** visualizes metrics with dashboards
* Helps track:

  * Application health
  * Resource usage
  * System performance

---

## 📁 Project Structure

```bash
.
├── frontend/
├── api/
├── worker/
├── k8s/
├── terraform/
├── .github/workflows/
└── README.md
argocd
    
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd repo
```

### 2. Configure secrets (GitHub)

* `DOCKERHUB_USERNAME`
* `DOCKERHUB_TOKEN`

### 3. Deploy infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 4. Deploy applications via ArgoCD

* Connect repo to ArgoCD
* Sync application

---

## 🎯 Key Features

* Fully automated CI/CD pipeline
* GitOps-based deployment strategy
* Scalable microservices architecture
* Production-style AWS setup
* Observability with monitoring stack

---

## 📌 Future Improvements

* Add HTTPS (TLS with ACM)
* Implement autoscaling (HPA)
* Add logging stack (EFK / Loki)
* Enhance security (IAM roles, network policies)

---

## 👨‍💻 Author

**Abdulwahab**

---


