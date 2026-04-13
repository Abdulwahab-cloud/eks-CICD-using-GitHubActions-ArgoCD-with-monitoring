# Arket — Terraform Infrastructure

## File structure

```
terraform/
├── bootstrap/        # Run once — creates S3 + DynamoDB for remote state
├── modules/
│   ├── vpc/          # VPC, 2 public subnets, 2 private subnets, NAT, routes
│   └── eks/          # EKS cluster, node group, OIDC provider, add-ons
└── main.tf           # Root — wires modules together
```

---

## Step 1 — backend remote state (once only)

```bash
cd terraform/backend
terraform init
terraform apply
```

---

## Step 2 — Deploy VPC + EKS

```bash
cd terraform
terraform init
terraform plan
terraform apply
# Takes ~15 min. kubeconfig is updated automatically.
```

Verify:

```bash
kubectl get nodes
# NAME                          STATUS   ROLES    AGE
# ip-10-0-3-x.ec2.internal      Ready    <none>   2m
# ip-10-0-4-x.ec2.internal      Ready    <none>   2m
```

---

## Step 3 — Install Gateway API CRDs manually

```bash
# Standard Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml

# AWS LBC Gateway-specific CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/refs/heads/main/config/crd/gateway/gateway-crds.yaml

# Verify
kubectl get crd | grep gateway
```

---

## Step 4 — Create IAM policy + IRSA role for LBC

```bash
# Download the policy
curl -o lbc-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

# Create the policy
aws iam create-policy \
  --policy-name arket-aws-lbc-policy \
  --policy-document file://lbc-policy.json

# Get your account ID and OIDC URL from terraform outputs
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_URL=$(terraform output -raw oidc_provider_url)

# Create the IAM role with a trust policy scoped to the LBC service account
cat > lbc-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_URL}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_URL}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller",
          "${OIDC_URL}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name arket-aws-lbc-role \
  --assume-role-policy-document file://lbc-trust.json

aws iam attach-role-policy \
  --role-name arket-aws-lbc-role \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/arket-aws-lbc-policy
```

---

## Step 5 — Install AWS Load Balancer Controller via Helm

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

CLUSTER_NAME=$(terraform output -raw cluster_name)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
VPC_ID=$(terraform output -raw vpc_id)

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=${CLUSTER_NAME} \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=arn:aws:iam::${ACCOUNT_ID}:role/arket-aws-lbc-role" \
  --set region=us-east-1 \
  --set vpcId=${VPC_ID} \
  --set enableGatewayAPI=true

# Enable the ALB Gateway feature gate
kubectl patch deployment aws-load-balancer-controller -n kube-system \
  --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--feature-gates=ALBGatewayAPI=true"}]'

# Verify
kubectl get pods -n kube-system | grep aws-load-balancer
```

---

## Step 6 — Apply GatewayClass, Gateway, HTTPRoutes

```bash
# Apply the Gateway API K8s manifests from the k8s/ folder
kubectl apply -f k8s/06-gatewayclass.yaml
kubectl apply -f k8s/07-gateway.yaml
kubectl apply -f k8s/08-httproutes.yaml

# Check Gateway is Programmed (ALB is being provisioned)
kubectl get gateway arket-gateway -n arket
# PROGRAMMED: True — means ALB is live

# Get the ALB DNS name
kubectl get gateway arket-gateway -n arket \
  -o jsonpath='{.status.addresses[0].value}'
```

---

## Step 7 — Deploy app

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml
kubectl apply -f k8s/03-worker-deployment.yaml
kubectl apply -f k8s/04-api-deployment.yaml
kubectl apply -f k8s/05-frontend-deployment.yaml
kubectl apply -f k8s/09-prometheus.yaml
kubectl apply -f k8s/10-grafana.yaml
```

---

## Tear down

```bash
# Delete app first so LBC can clean up the ALB
kubectl delete -f k8s/

# Then destroy infra
terraform destroy
```
