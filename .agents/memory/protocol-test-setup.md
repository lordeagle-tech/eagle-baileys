---
name: Protocol test setup
description: The imported package requires generated WAProto artifacts before local tests can run.
---

Run the project's protocol generation step before local test commands when the generated artifact is missing. The source `.proto` file is present, but the runtime imports the generated JSON artifact.

**Why:** A fresh import does not necessarily contain the generated protocol JSON, so tests fail at module load time rather than reporting application behavior.

**How to apply:** Use the existing `prepare` script before `npm test` or `npm run smoke`; do not hand-edit generated protocol output.