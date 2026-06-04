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

output "domain" {
  description = "Azure-assigned hostname. Use as DOMAIN in .env — no custom domain needed."
  value       = azurerm_public_ip.main.fqdn
}

output "app_url" {
  description = "URL of the deployed application."
  value       = "https://${azurerm_public_ip.main.fqdn}"
}
