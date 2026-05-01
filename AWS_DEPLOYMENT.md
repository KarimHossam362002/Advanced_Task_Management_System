# AWS Deployment Guide

This project is set up to build with Docker and deploy to **Amazon ECS Fargate** through **GitHub Actions**.

## Files Added

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `docker/apache/000-default.conf`
- `aws/ecs-task-definition.json`
- `.github/workflows/deploy-aws-ecs.yml`

## Why ECS Fargate

This app is a Laravel + Vite web application, so a single Docker container is a good fit for AWS container deployment.

## Local Docker Run

```bash
docker compose up --build
```

App:

- `http://localhost:8000`

Postgres:

- host: `localhost`
- database: `task_management`
- user: `task_management`
- password: `task_management`

## AWS Prerequisites

Create these AWS resources first:

1. **Amazon ECR repository**
2. **Amazon ECS cluster**
3. **Amazon ECS service** using Fargate
4. **RDS PostgreSQL** database
5. **SSM Parameter Store** entry for `APP_KEY`
6. **IAM role** for GitHub Actions OIDC

## GitHub Secrets and Variables

### Repository Secret

- `AWS_ROLE_TO_ASSUME`

### Repository Variables

- `AWS_REGION`
- `ECR_REPOSITORY`
- `ECS_CLUSTER`
- `ECS_SERVICE`
- `ECS_CONTAINER_NAME`

## Task Definition

Edit `aws/ecs-task-definition.json` before first deploy:

- replace AWS account ID placeholders
- replace region placeholders
- replace RDS endpoint
- replace database credentials or move them to AWS Secrets Manager / SSM
- confirm the container name matches `ECS_CONTAINER_NAME`

## Deployment Flow

When you push to `main` or `master`:

1. GitHub Actions builds the Docker image
2. pushes it to Amazon ECR
3. updates the ECS task definition image
4. deploys the new revision to the ECS service

## Notes

- The container startup command currently runs `php artisan migrate --force` automatically
- For stricter production control, you may want to move migrations to a separate release step later
- This setup assumes the app serves traffic on container port `80`
