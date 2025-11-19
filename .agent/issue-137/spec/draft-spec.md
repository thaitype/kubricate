when kubricate inject metadata for the yaml resource something like this:

```yaml
metadata:
  labels:
    kubricate.thaitype.dev: "true"
    kubricate.thaitype.dev/stack-id: myApp
    kubricate.thaitype.dev/resource-id: deployment
  annotations:
    kubricate.thaitype.dev/stack-name: SimpleApp
    kubricate.thaitype.dev/version: 0.20.1
    kubricate.thaitype.dev/resource-hash: ...
    kubricate.thaitype.dev/managed-at: ...
```

As you can see `kubricate.thaitype.dev/stack-name: SimpleApp`, the `SimpleApp` is the Stack Name, it should add other metadata like, org name, doc url, or author name, or stack versioning.

After release https://github.com/thaitype/kubricate/pull/131, stack has been clarify the word "Stack Template" as blueprint of the Stack, so the key `kubricate.thaitype.dev/stack-name` should be changed like `stack template`