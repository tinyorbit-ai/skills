refactor(catalog): share occurrence-aware catalog routing

The legacy and app-router catalog pages now resolve the same occurrence-aware event
shape. Existing events without an occurrence keep their current fallback page while
events with an occurrence redirect to the scoped catalog.
