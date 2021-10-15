# Video Streaming Microservice

## Installation

To install all microservices (in root directory): `node install.js`

To install a particular microservice (in microservice directory): `npm install`

## Development

`docker-compose up --build`

## Production

### Create Service Principal

In order to give our cluster the ability to create resources in Azure on our behalf (like load balancers) we must create a service principal. At time of writing, Terraform's implementation of this is buggy, so we have to do this manually.

1. Get the ID of your Azure account: `az account show`
2. Create service principal: `az ad sp create-for-rbac --role="Contributor" --scopes="/subscriptions/<id>"`
3. Create a `sensitive.tfvars` file, with `appId` from step 2 as `client_id` and `password` as the `client_secret`.

### Create the AKS
1. Create the infrastructure: `terraform apply -var-file="sensitive.tfvars"`

### Save Credentials for Kubectl
1. Get credentials: `az aks get-credentials --resource-group <app_name> --name <app_name>`
2. View new credentials: `cat ~/.kube/config`

### Install Dashboard
1. Install the dashboard: `kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.4/aio/deploy/recommended.yaml`
2. Connect: `kubectl proxy`
