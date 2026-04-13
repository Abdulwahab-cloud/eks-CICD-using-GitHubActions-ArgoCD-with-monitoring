variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name used in subnet tags so the ALB controller can discover subnets"
  type        = string
}
