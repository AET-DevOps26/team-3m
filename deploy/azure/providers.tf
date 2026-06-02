terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    container_name = "tfstate"
    key            = "azure-vm.tfstate"
    # resource_group_name and storage_account_name are passed at init time
  }
}

provider "azurerm" {
  features {}
}
