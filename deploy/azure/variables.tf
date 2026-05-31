variable "resource_group_name" {
  type        = string
  description = "Name of the existing Azure resource group."
  default     = "Kontor"
}

variable "name_prefix" {
  type        = string
  description = "Prefix used for Azure resource names."
  default     = "kontor"
}

variable "location" {
  type        = string
  description = "Azure region for the VM and network resources. The resource group can stay in a different region."
  default     = "swedencentral"
}

variable "computer_name" {
  type        = string
  description = "Host name for the Azure VM."
  default     = "kontor-vm"
}

variable "admin_username" {
  type        = string
  description = "Admin username for SSH access to the VM."
  default     = "azureuser"
}

variable "admin_ssh_public_key_path" {
  type        = string
  description = "Path to the SSH public key used for VM access."
  default     = "~/.ssh/team-3m-azure-rsa.pub"
}

variable "vm_size" {
  type        = string
  description = "Azure VM size."
  default     = "Standard_D2s_v3"
}

variable "allowed_ssh_source_address_prefix" {
  type        = string
  description = "Source address prefix allowed to SSH into the VM. Use your public IP with /32 for a safer setup."
  default     = "*"
}

variable "allowed_app_source_address_prefix" {
  type        = string
  description = "Source address prefix allowed to reach the app ports."
  default     = "*"
}
