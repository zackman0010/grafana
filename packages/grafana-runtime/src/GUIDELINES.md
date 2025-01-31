# Grafana Runtime development guidelines

We use `@grafana/runtime` to expose components and other functionality directly from the Grafana instance to plugins.

Functionality generally lives in

1. Avoid Direct @grafana/ui Consumption in @grafana/runtime:

   Components in `@grafana/runtime` should not directly depend on `@grafana/ui`. This separation helps maintain a clear distinction between runtime logic and UI elements.

2. Prioritize React.lazy() for Bundle Optimization:

   To manage bundle size and improve tree shaking, wrap exposed components in `React.lazy()` for lazy loading. This ensures that components are only loaded when needed, reducing the initial bundle size.
   Use discretion; not all components need to be lazy-loaded (e.g., core components like `Page`).

3. Re-declare Interfaces for Explicit Contracts:

   Instead of moving types from core Grafana and importing them into `@grafana/runtime`, re-declare interfaces and props within `@grafana/runtime`. This creates explicit contracts and generates compile-time errors if the core component changes, highlighting the need to maintain external interfaces.

4. Additional Considerations (TBD):

   This section is open for further discussion and input. Potential topics include:
   Specific patterns for handling state management within exposed components.
   Recommendations for testing exposed components in both core Grafana and plugins.
   Strategies for managing component lifecycles and updates.
   Documentation requirements for exposed components.
