Currently, when user using the cli `kubricate secret apply --dry-run` it will show the result of secret being to applied when non dry-run mode, however, we should not show the secret value expliectly (even, it has encode as base64), 

## example log

```
Applying secret: deploy-ssh-credentials
✔ [DRY RUN] Would apply: deploy-ssh-credentials with kubectl using payload: 
{"apiVersion":"v1","kind":"Secret","metadata":{"name":"deploy-ssh-credentials","namespace":"default"},
"type":"kubernetes.io/ssh-auth",
"data":{"ssh-privatekey":
"LS0tLS1CRUdJTiBPUEVOU1NIIFBSSVZBVEUgS0VZLS0tLS0KYjNCbGJuTnphQzFyWlhrdGRqRUFBQUFBQkc1dmJtVUFBQUFFYm05dVpRQUFBQUFBQUFBQkFBQUFNd0FBQUF0emMyZ3RaVwouLi4oeW91ciBkZXBsb3ltZW50IFNTSCBwcml2YXRlIGtleSBoZXJlKS4uLgotLS0tLUVORCBPUEVOU1NIIFBSSVZBVEUgS0VZLS0tLS0=",
"known_hosts":"ZGVwbG95LXNlcnZlci5leGFtcGxlLmNvbSBzc2gtcnNhIEFBQUFCM056YUMxeWMyRUFBQUFCSXdBQUFRRUFxMkE3aFJHbWRubS4uLg=="}}
```

## Expected behavior

 ```
Applying secret: deploy-ssh-credentials
✔ [DRY RUN] Would apply: deploy-ssh-credentials with kubectl using payload: 
{"apiVersion":"v1","kind":"Secret","metadata":{"name":"deploy-ssh-credentials","namespace":"default"},
"type":"kubernetes.io/ssh-auth",
"data":{"ssh-privatekey": "***",
"known_hosts":"***"}}
```
