terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "Kontor"
    storage_account_name = "kontortfstate3m"
    container_name       = "tfstate"
    key                  = "azure-vm.tfstate"
  }
}

provider "azurerm" {
  features {}
}
