---
title: CSIMigrationRBD
content_type: feature_gate
_build:
  list: never
  render: false

stages:
  - stage: alpha
    defaultValue: false
    fromVersion: "1.23"
    toVersion: "1.27"
  - stage: deprecated
    defaultValue: false
    fromVersion: "1.28"
    toVersion: "1.30"

removed: true
---
Enables shims and translation logic to route volume
operations from the RBD in-tree plugin to Ceph RBD CSI plugin. Requires
CSIMigration and csiMigrationRBD feature flags enabled and Ceph CSI plugin
installed and configured in the cluster.

This feature gate was deprecated in favor of the `InTreePluginRBDUnregister` feature gate,
which prevents the registration of in-tree RBD plugin.
