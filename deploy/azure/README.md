# Azure Deployment

Provisions an Ubuntu 22.04 VM on Azure with Docker pre-installed, then runs the full stack behind Traefik with automatic TLS.

The app is served from the custom domain `azure.kontor.live` (configurable via the
`AZURE_DOMAIN` GitHub variable or the `domain` workflow input). A DNS A record for
that domain must point at the VM's public IP before Traefik can issue a TLS cert.

| Path | Service |
| ---- | ------- |
| `https://azure.kontor.live`      | Client (SPA) |
| `https://azure.kontor.live/api`  | Core (Spring Boot) |
| `https://azure.kontor.live/auth` | Keycloak |

The Azure-assigned `cloudapp.azure.com` hostname is still exposed as a Terraform
output (`domain`) so it can be used as a fallback for the DNS A record target.

---

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) ≥ 2.50
- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5
- An SSH key pair at `~/.ssh/team-3m-azure-rsa` — generate with:

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

Set `allowed_ssh_source_address_prefix` to your public IP as `x.x.x.x/32`:

```sh
curl -s ifconfig.me
```

---

## Provision

```sh
terraform init
terraform plan
terraform apply
```

Note the `public_ip_address` output and create an A record in your DNS provider:

```
azure.kontor.live  A  <public_ip_address>
```

Wait until the record resolves (`dig +short azure.kontor.live`) before
continuing — Traefik's ACME TLS challenge will fail otherwise.

---

## Deploy

SSH into the VM (cloud-init installs Docker on first boot — wait ~2 min if Docker is not yet available):

```sh
ssh -i ~/.ssh/team-3m-azure-rsa azureuser@<public_ip_address>
```

Clone the repo, create `.env`, and start the stack. **Replace all placeholder passwords with strong, unique values before running.**

```sh
git clone https://github.com/AET-DevOps26/team-3m.git && cd team-3m

cat > .env << 'EOF'
DOMAIN=azure.kontor.live
ACME_EMAIL=you@example.com
POSTGRES_PASSWORD=change-me
KEYCLOAK_POSTGRES_PASSWORD=change-me
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=change-me
EOF

docker compose -f docker-compose.azure.yml up -d
```

The app is available at `https://azure.kontor.live` once Traefik has issued the TLS certificate (first start can take ~30 s).

> Pinning to a different domain? Set `DOMAIN` in `.env` accordingly and update
> the DNS A record before bringing the stack up — Keycloak's realm import and
> the Traefik routers all read this single variable.

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
