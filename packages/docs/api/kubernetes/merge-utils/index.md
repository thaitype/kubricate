[Documentation](../index.md) / merge-utils

# merge-utils

## Functions

| Function | Description |
| ------ | ------ |
| [createKubernetesMergeHandler](functions/createKubernetesMergeHandler.md) | Creates a reusable handler to merge multiple Kubernetes Secret effects. Will group by Secret `metadata.name` + `namespace` and merge `.data`. Throws error if duplicate keys are found within the same Secret. |
