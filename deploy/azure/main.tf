data "azurerm_resource_group" "existing" {
  name = var.resource_group_name
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.name_prefix}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = var.location
  resource_group_name = data.azurerm_resource_group.existing.name
}

resource "azurerm_subnet" "main" {
  name                 = "${var.name_prefix}-subnet"
  resource_group_name  = data.azurerm_resource_group.existing.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_public_ip" "main" {
  name                = "${var.name_prefix}-public-ip"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.existing.name

  # Standard SKU forces Static allocation (Basic SKU was retired on
  # 2025-09-30). The IP itself can still change across destroy/recreate cycles;
  # what stays stable is the `domain_name_label` FQDN below — Azure repoints
  # `<label>.<region>.cloudapp.azure.com` to whatever IP this resource holds.
  # GoDaddy then carries a single CNAME `azure -> <label>.…cloudapp.azure.com`
  # that never needs to be touched again.
  allocation_method = "Static"
  sku               = "Standard"
  domain_name_label = var.dns_label
}

resource "azurerm_network_security_group" "main" {
  name                = "${var.name_prefix}-nsg"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.existing.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.allowed_ssh_source_address_prefix
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTP"
    priority                   = 1010
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTPS"
    priority                   = 1020
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface" "main" {
  name                = "${var.name_prefix}-nic"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.existing.name

  ip_configuration {
    name                          = "${var.name_prefix}-ip-configuration"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }
}

resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.main.id
}

resource "azurerm_linux_virtual_machine" "main" {
  name                            = "${var.name_prefix}-vm"
  location                        = var.location
  resource_group_name             = data.azurerm_resource_group.existing.name
  network_interface_ids           = [azurerm_network_interface.main.id]
  size                            = var.vm_size
  computer_name                   = var.computer_name
  admin_username                  = var.admin_username
  custom_data                     = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", { admin_username = var.admin_username }))
  disable_password_authentication = true

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(pathexpand(var.admin_ssh_public_key_path))
  }

  os_disk {
    name                 = "${var.name_prefix}-os-disk"
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  boot_diagnostics {}
}
