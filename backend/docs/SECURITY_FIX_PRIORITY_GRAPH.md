# Security Fix Priority Graph

```mermaid
flowchart LR
    A[Critical Security Baseline] --> B[P0: Hash Stored Passwords]
    A --> C[P0: Require Teacher Secret]
    A --> D[P1: Throttle Login Attempts]
    B --> E[P1: Remove Sensitive Auth Responses]
    C --> E
    D --> E
    E --> F[P2: Add JWT Middleware Across APIs]

    classDef done fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20;
    classDef next fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#f57f17;

    class B,C,D,E done;
    class F next;
```

## Implemented In This Pass

- P0: Hash stored school admin passwords and migrate legacy plaintext on successful login.
- P0: Require teacher email plus password login, hash teacher password at creation, and migrate legacy plaintext if found.
- P1: Add login throttling for school and teacher login endpoints (in-memory, per IP plus identifier).
- P1: Sanitize auth responses to exclude password and excessive data.

## Next Suggested Fix

- P2: Introduce JWT-based authentication middleware and apply to all non-public backend routes.
