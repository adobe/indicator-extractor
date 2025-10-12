---
name: all origin update 
description: update all git repositories to the latest version
---

```shell
git remote | grep -v '^origin$' | xargs -n1 git push --all 
```
