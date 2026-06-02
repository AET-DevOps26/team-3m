# Azure Deployment

Provisions an Ubuntu 22.04 VM on Azure with Docker pre-installed, then runs the full stack behind Traefik with automatic TLS.

| Subdomain | Service |
| --------- | ------- |
| `yourdomain.com` | Client |
| `api.yourdomain.com` | Core |
| `auth.yourdomain.com` | Keycloak |

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

Note the `traefik_ip` output — you need it for DNS.

---

## DNS

Point three A records at `traefik_ip`:

| Hostname | Type | Value |
| -------- | ---- | ----- |
| `yourdomain.com` | A | `<traefik_ip>` |
| `api.yourdomain.com` | A | `<traefik_ip>` |
| `auth.yourdomain.com` | A | `<traefik_ip>` |

---

## Deploy

SSH into the VM (cloud-init installs Docker on first boot — wait ~2 min if Docker is not yet available):

```sh
ssh -i ~/.ssh/team-3m-azure-rsa azureuser@<traefik_ip>
```

Clone the repo, create `.env`, and start the stack:

```sh
git clone https://github.com/AET-DevOps26/team-3m.git && cd team-3m

cat > .env << 'EOF'
DOMAIN=yourdomain.com
ACME_EMAIL=you@example.com
POSTGRES_PASSWORD=change-me
KEYCLOAK_POSTGRES_PASSWORD=change-me
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=change-me
EOF

docker compose -f docker-compose.azure.yml up -d --build
```

The app is available at `https://yourdomain.com` once Traefik has issued the TLS certificate.

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
