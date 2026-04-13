variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "k8s_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.31"
}

variable "instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "desired_nodes" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "min_nodes" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "max_nodes" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 3
}

variable "public_subnet_a_id" {
  description = "Public subnet ID in AZ-a"
  type        = string
}

variable "public_subnet_b_id" {
  description = "Public subnet ID in AZ-b"
  type        = string
}

variable "private_subnet_a_id" {
  description = "Private subnet ID in AZ-a"
  type        = string
}

variable "private_subnet_b_id" {
  description = "Private subnet ID in AZ-b"
  type        = string
}
