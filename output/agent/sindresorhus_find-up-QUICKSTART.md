# Quickstart

Find a file or directory by walking up parent directories

## Install

```bash
npm install find-up
```

## Example

```typescript
import { findUpMultiple } from 'find-up';

const result = await findUpMultiple("my-project", {});
console.log(result);
```

## What This Does

Find a file or directory by walking up parent directories

The example imports the `findUpMultiple` export and demonstrates basic usage. Check the source code and tests for more advanced examples.