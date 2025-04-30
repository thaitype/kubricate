[Documentation](../../../index.md) / [generate/types](../index.md) / ProjectGenerateOptions

# Interface: ProjectGenerateOptions

## Properties

### cleanOutputDir?

```ts
optional cleanOutputDir: boolean;
```

If true, removes all previously generated files in the output directory before generating.

Prevents stale or orphaned files when renaming stacks or switching output modes.

#### Default

```ts
true
```

***

### outputDir?

```ts
optional outputDir: string;
```

The directory where all generated manifest files will be written.
Relative to the project root.

#### Default

```ts
'output'`
```

***

### outputMode?

```ts
optional outputMode: "flat" | "stack" | "resource";
```

Controls the structure of the generated output.

- 'flat': All resources from all stacks in a single file (e.g. `stacks.yaml`)
- 'stack': One file per stack (e.g. `AppStack.yaml`, `CronStack.yaml`)
- 'resource': One folder per stack, each resource in its own file (e.g. `AppStack/Deployment_web.yaml`)

#### Default

```ts
'stack'
```
