feat(catalog): add a static product picker

The catalog picker should use the UI's full static-option capacity so people can
choose from more products without a second request.

## What

- Add a schema-backed action for loading products.
- Add a picker adapter that requests up to 100 options.
- Cover a fully populated picker with a focused test.
