# Azure Deployment

Provisions an Ubuntu 22.04 VM on Azure with Docker pre-installed, then runs the full stack behind Traefik with automatic TLS.

The app is served from the custom domain `azure.kontor.live` (configurable via the
`AZURE_DOMAIN` GitHub variable or the `domain` workflow input).

| URL | Service |
| --- | ------- |
| `https://azure.kontor.live`      | Client (SPA) |
| `https://azure.kontor.live/api`  | Core (Spring Boot) |
| `https://auth.azure.kontor.live` | Keycloak |

### DNS model

Terraform attaches a `domain_name_label` to the VM's public IP, which gives
Azure a free, stable FQDN:

```
kontor.swedencentral.cloudapp.azure.com
```

That FQDN tracks whichever IP Azure assigns the VM, including across
`terraform destroy` / `apply` cycles, as long as the label (`kontor` by default)
is reused. We never reference the bare IP for DNS.

GoDaddy (or any other DNS provider for `kontor.live`) then carries **two
permanent CNAMEs** — one for the app, one for Keycloak. Set up once, never
touched again:

```
Type:  CNAME    Name:  azure        Value:  kontor.swedencentral.cloudapp.azure.com
Type:  CNAME    Name:  auth.azure   Value:  kontor.swedencentral.cloudapp.azure.com
```

Resolution chain:

```
azure.kontor.live       →  kontor.swedencentral.cloudapp.azure.com  →  <current Azure IP>
auth.azure.kontor.live  →  kontor.swedencentral.cloudapp.azure.com  →  <current Azure IP>
```

This means: no static-IP costs (the Standard-SKU public IP is the cheapest
option after the Basic SKU retirement on 2025-09-30), no GoDaddy API
integration, and no DNS update when the VM is recreated.

The Azure FQDN and the current public IP are both exposed as Terraform
outputs (`domain` and `public_ip_address`) and printed in the deploy workflow
log for reference.

---

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) ≥ 2.50
- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5
- A public SSH key at `~/.ssh/team-3m-azure-rsa.pub` for Azure Linux VM creation.
  The VM does not expose public SSH ingress; deployments use Azure Run Command.
  Generate a local key pair with:

```sh
ssh-keygen -t rsa -b 4096 -f ~/.ssh/team-3m-azure-rsa -C "team-3m-azure"
```

---

## One-time setup

Log in and create the resource group Terraform expects:

```sh
az login
az group create --name Kontor --location swedencentral
```

---

## Configure

```sh
cp terraform.tfvars.example terraform.tfvars
```

The defaults in `terraform.tfvars.example` are enough for a local apply once
the resource group and SSH public key exist.

---

## Provision

```sh
terraform init
terraform plan
terraform apply
```

Note the `domain` output (`kontor.swedencentral.cloudapp.azure.com` with the
defaults). If this is the first time bringing the stack up, set the two
CNAMEs at the DNS provider:

```
azure.kontor.live       CNAME  kontor.swedencentral.cloudapp.azure.com
auth.azure.kontor.live  CNAME  kontor.swedencentral.cloudapp.azure.com
```

Wait until they resolve before continuing — Traefik's ACME TLS challenge
fails otherwise:

```sh
dig +short azure.kontor.live auth.azure.kontor.live
```

On subsequent deploys you can skip this step entirely.

---

## Deploy

The GitHub `Deploy to Azure` workflow provisions the VM, waits for cloud-init,
then starts the stack through Azure Run Command.

For a local manual deploy, use Azure Run Command to create `.env` and start the
stack. **Replace all placeholder passwords with strong, unique values before running.**

```sh
az vm run-command invoke \
  --resource-group Kontor \
  --name kontor-vm \
  --command-id RunShellScript \
  --scripts '
    set -eu
    cloud-init status --wait
    git clone --depth 1 https://github.com/AET-DevOps26/team-3m.git /home/azureuser/team-3m 2>/dev/null \
      || git -C /home/azureuser/team-3m pull
    cat > /home/azureuser/team-3m/.env <<EOF
DOMAIN=azure.kontor.live
ACME_EMAIL=you@example.com
POSTGRES_PASSWORD=change-me
KEYCLOAK_POSTGRES_PASSWORD=change-me
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=change-me
EOF
    cd /home/azureuser/team-3m
    docker compose -f docker-compose.azure.yml up -d
  '
```

The app is available at `https://azure.kontor.live` once Traefik has issued the TLS certificate (first start can take ~30 s).

> Pinning to a different domain? Set `DOMAIN` in `.env` accordingly and add a
> CNAME for it pointing at the Azure FQDN before bringing the stack up —
> Keycloak's realm import and the Traefik routers all read this single variable.

---

## Load balancing & scaling

Traefik already acts as the load balancer for the stack: it discovers containers
via the Docker provider and round-robins across every container that shares a
service's `traefik.http.services.<name>.loadbalancer.*` labels. To put it to work,
the stateless services run **two replicas each** by default:

| Service | Replicas | Memory limit |
| ------- | -------- | ------------ |
| `core`  | `CORE_REPLICAS` (default `2`) | `CORE_MEMORY_LIMIT` (default `1536m`) |
| `ai`    | `AI_REPLICAS` (default `2`)   | `AI_MEMORY_LIMIT` (default `512m`)    |

Both are stateless — `core` authenticates with JWTs and keeps no server-side
session, and `ai` holds no per-request state — so replicas are interchangeable.
Each replica reuses the same Traefik labels, no host ports, and no
`container_name`; any of those would otherwise pin a service to one container and
block scaling. The `deploy.resources.limits.memory` cap stops a single replica
from OOM-ing the shared VM, and `core` sets `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=75`
so the JVM heap tracks `CORE_MEMORY_LIMIT` instead of a hard-coded `-Xmx`.

`docker compose up -d` honors `deploy.replicas`, so the existing deploy flow needs
no changes — Compose starts `core-1`/`core-2` (and `ai-1`/`ai-2`) and Traefik
load-balances across them automatically. Tune the counts/limits in `.env`:

```sh
CORE_REPLICAS=3
AI_REPLICAS=1
```

`db`, `keycloak-db`, `keycloak`, and `traefik` are intentionally left at one
replica (stateful stores, or Traefik binds the host ports).

> This is horizontal scaling of stateless services on a **single VM** — it adds
> throughput and crash redundancy (Traefik routes around a dead replica), not
> host-level HA. A re-pull recreates a service's replicas together, so plain
> Compose does not give true zero-downtime rolling deploys; that would need
> Swarm or a scripted drain.

---

## Teardown

On the VM:

```sh
docker compose -f docker-compose.azure.yml down -v
```

Locally:

```sh
terraform destroy
```
