# Deploying to AWS Elastic Beanstalk (GitHub Actions)

This document describes what to configure in **AWS**, what to configure in **GitHub**, and how the **Deploy to Elastic Beanstalk** workflow behaves.

The workflow file is [`.github/workflows/deploy-elastic-beanstalk.yml`](.github/workflows/deploy-elastic-beanstalk.yml).

---

## What the pipeline does (summary)

1. Checks out the repository and builds **`deploy.zip`** from the **entire project** (excluding `.git`, `node_modules`, local secrets, SQLite files, and other artifacts).
2. Ensures an **Elastic Beanstalk application** exists (creates it if missing).
3. **First run** (no environment with your chosen name yet): uploads the zip, registers an **application version**, runs **`create-environment`** (load-balanced **Web server** tier), then waits until the environment is **Ready** with **Green** or **Yellow** health.
4. **Later runs**: uses [einaregilsson/beanstalk-deploy](https://github.com/einaregilsson/beanstalk-deploy) to upload a new version, deploy it, and wait for the update to finish.

Autoscaling and health options from the bundle are defined in [`.ebextensions/01-autoscaling.config`](.ebextensions/01-autoscaling.config) (applied when the app version is deployed).

---

## Part 1 — AWS setup

### 1.1 Account and region

- Use an AWS account you control.
- Pick a **region** (for example `us-east-1`). The same region should be used consistently for Elastic Beanstalk, S3 (EB’s artifact bucket), and any services your app uses (for example SQS).

### 1.2 Elastic Beanstalk managed IAM roles (required for first environment creation)

The workflow’s first deploy calls `create-environment` with these **defaults**:

| Purpose | Default name |
|--------|----------------|
| EC2 instance profile (attached to instances in the environment) | `aws-elasticbeanstalk-ec2-role` |
| Elastic Beanstalk **service role** | `aws-elasticbeanstalk-service-role` |

**If you use a new account or never used Elastic Beanstalk before:**

1. Open the [Elastic Beanstalk console](https://console.aws.amazon.com/elasticbeanstalk/).
2. Create a sample application or use the wizard once; the console often **creates** these roles for you.
3. Alternatively, create the roles following AWS documentation: [Managing Elastic Beanstalk service roles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts-roles-service.html) and [Managing Elastic Beanstalk instance profiles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts-roles-instance.html).

If your roles use **different names**, set GitHub variables `EB_EC2_INSTANCE_PROFILE` and `EB_SERVICE_ROLE_NAME` (see [Part 2](#part-2--github-setup)).

The service role ARN used at create time is:

`arn:aws:iam::<ACCOUNT_ID>:role/<EB_SERVICE_ROLE_NAME>`

### 1.3 IAM user (or role) for GitHub Actions

The workflow authenticates with **long-lived access keys** stored in GitHub secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Create an IAM **user** (or a dedicated role if you later switch to OIDC) whose credentials GitHub will use **only** for deployments.

**Typical permission strategy (adjust to your security standards):**

- **Elastic Beanstalk**: allow creating/updating applications, environments, and application versions, and reading environment status and events. Many teams start from **`AdministratorAccess-AWSElasticBeanstalk`** and tighten later.
- **S3**: allow `PutObject`, `GetObject`, `ListBucket` (and related) on the account’s Elastic Beanstalk staging bucket. The bucket name usually matches **`elasticbeanstalk-<region>-<account-id>`** (the deploy action may call `CreateStorageLocation` or use that bucket).
- **STS** (optional): `sts:GetCallerIdentity` is used in the workflow scripts.

**Important:** Restrict this IAM user to the minimum resources and actions you are comfortable with. Do not reuse root account keys.

### 1.4 Application runtime: environment properties on the Elastic Beanstalk environment

The deployment zip **does not** include `.env` or local `*.db` files. You must set configuration in the environment.

In the Elastic Beanstalk console: **Configuration → Software → Environment properties** (or use the EB API / CLI).

The backend uses variables such as:

| Variable | Purpose |
|----------|---------|
| `PORT` | Optional. On Elastic Beanstalk, the proxy sets **`PORT`**; the app already uses `process.env.PORT`. You normally **do not** need to set this manually. |
| `NODE_ENV` | Set to `production` in production. |
| `JWT_SECRET` | Secret for JWT signing. **Set a strong value in production** (the code has a weak default if unset). |
| `SQS_QUEUE_URL` | URL of the SQS queue used by release/worker flows. |
| `POLL_INTERVAL` | Worker polling interval (milliseconds) for `worker.js`. |
| `AWS_REGION` | AWS SDK region for SQS (often matches your EB region). |

**Credentials inside the app:** [backend/src/utils/sqsClient.js](backend/src/utils/sqsClient.js) can read `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. On EC2, prefer **no static keys**: attach an **IAM instance profile** to the EB environment with permissions to call SQS (and any other AWS APIs you need), and rely on the default credential chain. If you use an instance profile, you can omit those two variables.

### 1.5 SQS and other AWS services

- Create the **SQS queue** in the same region (unless you intentionally do otherwise).
- Grant the **EC2 instance role** (instance profile) permission to **`sqs:ReceiveMessage`**, **`sqs:DeleteMessage`**, **`sqs:GetQueueUrl`**, and **`sqs:SendMessage`** (and any other actions your API uses) on that queue.
- Set `SQS_QUEUE_URL` in environment properties to the queue URL.

### 1.6 VPC and networking (defaults)

The workflow creates a **WebServer / Standard** tier environment via the API. If your account has a **default VPC**, Elastic Beanstalk can place instances there. If you need a **custom VPC**, subnets, or security groups, configure them in the EB environment after creation or extend automation (not covered in the current workflow).

### 1.7 Health check

The app exposes **`GET /api/health`**. After the first deploy, you can confirm in **Configuration → Load balancer** that the health check path is appropriate for your environment (many Node platforms default to `/` or a path you configure).

### 1.8 Solution stack (Node.js on Amazon Linux 2023)

On the **first** deploy, if you do **not** set `EB_SOLUTION_STACK` in GitHub, the workflow picks the **latest** name matching **Amazon Linux 2023** and **Node.js** from `list-available-solution-stacks`. If that fails or picks an unexpected version, set **`EB_SOLUTION_STACK`** to the **exact** string from:

```bash
aws elasticbeanstalk list-available-solution-stacks --query 'SolutionStacks[?contains(@, `Node.js`) && contains(@, `Amazon Linux 2023`)]' --output text
```

---

## Part 2 — GitHub setup

### 2.1 Where to enter values

In the GitHub repository:

1. **Settings → Secrets and variables → Actions**

### 2.2 Required secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key for the IAM user (or principal) used only for deployments. |
| `AWS_SECRET_ACCESS_KEY` | Secret key for the same IAM user. |

### 2.3 Required variables

| Variable | Description |
|----------|-------------|
| `EB_APPLICATION_NAME` | Elastic Beanstalk **application** name (logical container for versions). Example: `parkinglots`. |
| `EB_ENVIRONMENT_NAME` | Elastic Beanstalk **environment** name (the running environment). Example: `production`. |

These must match what you want in AWS. The workflow **creates** the application if it does not exist; it **creates** the environment on first successful run if no environment with that name exists under that application.

### 2.4 Optional variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | Region for EB, S3, and CLI steps. |
| `EB_SOLUTION_STACK` | *(auto)* | Full solution stack name for **first** environment creation. |
| `EB_EC2_INSTANCE_PROFILE` | `aws-elasticbeanstalk-ec2-role` | EC2 instance profile **name** passed to `create-environment`. |
| `EB_SERVICE_ROLE_NAME` | `aws-elasticbeanstalk-service-role` | IAM **role name** (not ARN) used to build the service role ARN for `create-environment`. |

### 2.5 When workflows run

- **Push** to branches **`main`** or **`master`**
- **Manual run**: Actions tab → **Deploy to Elastic Beanstalk** → **Run workflow**

### 2.6 Branch protection and environments

If you use GitHub **Environments** with required reviewers, attach the protection to this workflow’s job (optional). Store secrets in an **Environment** instead of repository secrets if you want deployment gates.

---

## Part 3 — First deploy vs later deploys

| | First deploy | Later deploys |
|---|----------------|----------------|
| Application | Created if missing | Already exists |
| Environment | Created with registered version | Updated to new version |
| Duration | Often **10–20+ minutes** (new infrastructure) | Usually shorter (rolling update) |
| Workflow | Registers version without updating an env, then `create-environment`, then wait loop | **beanstalk-deploy** uploads, deploys, waits |

---

## Part 4 — Autoscaling (from the source bundle)

[`.ebextensions/01-autoscaling.config`](.ebextensions/01-autoscaling.config) configures:

- **Auto Scaling group** size: **Min 1**, **Max 4**, cooldown **360** seconds.
- **CPU-based scaling** triggers (upper/lower thresholds and breach settings).
- **Enhanced** health reporting.

To change limits or triggers, edit that file and redeploy.

**Note:** This application uses **SQLite** on the instance filesystem. Running **more than one instance** means **separate databases** per instance unless you move to a shared database (for example RDS). Plan scaling accordingly.

---

## Part 5 — Verify after deploy

1. In **Elastic Beanstalk → Environments → your environment**, open the environment URL (CNAME).
2. Call **`GET /api/health`** on that host.
3. Check **Logs** if health is red or the deploy action fails.

The workflow prints the environment **CNAME** at the end when the environment check step ran successfully.

---

## Part 6 — Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Workflow fails: set `EB_APPLICATION_NAME` / `EB_ENVIRONMENT_NAME` | Add the required [variables](#23-required-variables). |
| First deploy fails on IAM | Ensure [managed roles](#12-elastic-beanstalk-managed-iam-roles-required-for-first-environment-creation) exist or set custom names via variables. |
| `EB_SOLUTION_STACK` / stack errors | Set `EB_SOLUTION_STACK` explicitly to a valid stack name in your region. |
| App unhealthy | Environment properties (`JWT_SECRET`, `SQS_QUEUE_URL`, etc.), security groups, load balancer health path, and **EB logs**. |
| SQS errors | Instance profile permissions and `SQS_QUEUE_URL` / region. |
| **beanstalk-deploy** fails on health | The action expects recovery to **Green** after deploy (with a **120** second recovery window). Check logs and increase `wait_for_environment_recovery` in the workflow if needed. |
| Version / S3 errors | Version labels are unique per run; rare conflicts can occur if AWS resources are left in a bad state—check EB events and S3 bucket contents for the application prefix. |

---

## Part 7 — Optional hardening (not in the current workflow)

- **OpenID Connect (OIDC)**: Replace static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` with [`aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials) **assume-role** via GitHub OIDC so no long-lived keys are stored in GitHub.
- **Least-privilege IAM**: Replace broad Elastic Beanstalk policies with scoped policies for specific applications and the EB S3 bucket.

---

## Quick checklist

**AWS**

- [ ] Region chosen and consistent with other services  
- [ ] `aws-elasticbeanstalk-ec2-role` and `aws-elasticbeanstalk-service-role` (or custom equivalents) exist  
- [ ] IAM user for GitHub with EB + S3 (and related) permissions  
- [ ] SQS queue created; instance profile can access it; `SQS_QUEUE_URL` set on the environment  
- [ ] `JWT_SECRET`, `NODE_ENV`, and any other required env vars set on the environment  

**GitHub**

- [ ] Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`  
- [ ] Variables: `EB_APPLICATION_NAME`, `EB_ENVIRONMENT_NAME`  
- [ ] Optional: `AWS_REGION`, `EB_SOLUTION_STACK`, `EB_EC2_INSTANCE_PROFILE`, `EB_SERVICE_ROLE_NAME`  

**Run**

- [ ] Push to `main` or `master`, or run the workflow manually from the Actions tab  
