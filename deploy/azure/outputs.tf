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

output "client_url" {
  description = "Public URL for the frontend container after docker compose is running."
  value       = "http://${azurerm_public_ip.main.ip_address}:5173"
}

output "core_health_url" {
  description = "Public URL for the backend health check after docker compose is running."
  value       = "http://${azurerm_public_ip.main.ip_address}:8080/hello"
}
