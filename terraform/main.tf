terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
   
  }

  backend "s3" {
    bucket         = "abdlwahab-terraform-state"
    key            = "abdlwahab/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "abdlwahab-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
}




module "vpc" {
  source       = "./modules/vpc"
  region       = var.region
  cluster_name = var.cluster_name
}


module "eks" {
  source       = "./modules/eks"
  cluster_name = var.cluster_name

  public_subnet_a_id  = module.vpc.public_subnet_a_id
  public_subnet_b_id  = module.vpc.public_subnet_b_id
  private_subnet_a_id = module.vpc.private_subnet_a_id
  private_subnet_b_id = module.vpc.private_subnet_b_id
}

# ── Update kubeconfig after cluster is ready ─────────────────
resource "terraform_data" "kubeconfig" {
  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
  }
  depends_on = [module.eks]
}


