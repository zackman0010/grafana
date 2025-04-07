This implements a ResourceServer backed by the existing dashboard SQL tables.

There are a few oddities worth noting.  This is not a totally accurate implementation,
but it is good enough to drive the UI needs and let kubectl list work\!

1. The resourceVersion is based on internal ID and dashboard version

<!-- end list -->

- can get version from the least significant digits
- avoids duplicate resourceVersions... but not sequential
- the resourceVersion is never set on the list commands

<!-- end list -->

1. Results are always sorted by internal id ascending

<!-- end list -->

- this ensures everything is returned
