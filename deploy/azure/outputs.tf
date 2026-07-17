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

output "app_key_vault_name" {
  description = "Key Vault used to deliver the application runtime environment to the VM."
  value       = azurerm_key_vault.app.name
}

output "vm_principal_id" {
  description = "Object ID of the VM's system-assigned managed identity."
  value       = azurerm_linux_virtual_machine.main.identity[0].principal_id
}
