output "resource_group_name" {
  description = "Azure resource group used by this deployment."
  value       = data.azurerm_resource_group.existing.name
}

output "location" {
  description = "Azure region used by this deployment."
  value       = var.location
}

output "public_ip_address" {
  description = "Public IP address of the VM."
  value       = azurerm_public_ip.main.ip_address
}

output "ssh_command" {
  description = "SSH command for connecting to the VM."
  value       = "ssh -i ${trimsuffix(var.admin_ssh_public_key_path, ".pub")} ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "traefik_ip" {
  description = "Public IP for Traefik. Create a DNS A record pointing your domain to this address, then access the app at https://<DOMAIN>."
  value       = azurerm_public_ip.main.ip_address
}
