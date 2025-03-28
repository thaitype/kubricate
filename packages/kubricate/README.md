# Kubricate CLI

Kubricate is a CLI tool that helps you manage Kubernetes configurations.

> This package is in progress, and it is not ready for use.

> This package preserve for kubricate CLI, replacement for kosko CLI.

## Planned Features
- command `generate` -- for generate into k8s yaml files, currenctly, we still use `kosko generate` for this feature
- command `apply` -- for apply into k8s cluster
- command `delete` -- for delete from k8s cluster
- command `diff` -- for diff between local and k8s cluster
- command `init` -- for init kubricate project
- command `plan` -- for plan kubricate project, like terraform plan
- command `secrets` -- for manage secrets into k8s cluster
  - `secrets load` -- for load secrets from configuration in SecretManger 
