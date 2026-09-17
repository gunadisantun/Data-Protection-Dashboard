# Privacy Data Map

Implemented locally at `/ropa/data-flow` (production release pending):
- Explicit directed links between scoped RoPA activities, sources, systems, storage and recipients.
- Asset inventory with owner, location, country, retention and missing-metadata indicators.
- Category filters, upstream/downstream navigation, interactive canvas and bilingual labels.
- Scope enforcement on both endpoints; asset edits reject stale versions; linked assets cannot be deleted.

Next increments, not included in this release:
- Owner confirmation and DPO review distinguish recorded from confirmed relationships.
- Later: incident impact tracing, data subject request checklists and change review.
- Relationship edit history and approval, persistent saved layouts, and dedicated large-graph pagination.

Preserve unit access boundaries. Missing metadata is a clarification, not an automatic legal violation. This is a declared inventory, not automatic infrastructure scanning.
