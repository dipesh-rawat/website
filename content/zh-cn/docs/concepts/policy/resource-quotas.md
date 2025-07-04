---
title: 资源配额
api_metadata:
- apiVersion: "v1"
  kind: "ResourceQuota"
content_type: concept
weight: 20
---
<!--
reviewers:
- derekwaynecarr
title: Resource Quotas
api_metadata:
- apiVersion: "v1"
  kind: "ResourceQuota"
content_type: concept
weight: 20
-->

<!-- overview -->

<!--
When several users or teams share a cluster with a fixed number of nodes,
there is a concern that one team could use more than its fair share of resources.

_Resource quotas_ are a tool for administrators to address this concern.
-->
当多个用户或团队共享具有固定节点数目的集群时，人们会担心有人使用超过其基于公平原则所分配到的资源量。

**资源配额**是帮助管理员解决这一问题的工具。

<!--
A resource quota, defined by a ResourceQuota object, provides constraints that limit
aggregate resource consumption per {{< glossary_tooltip text="namespace" term_id="namespace" >}}. A ResourceQuota can also
limit the [quantity of objects that can be created in a namespace](#quota-on-object-count) by API kind, as well as the total
amount of {{< glossary_tooltip text="infrastructure resources" term_id="infrastructure-resource" >}} that may be consumed by
API objects found in that namespace.
-->
资源配额，由 ResourceQuota 对象定义，
提供了限制每个{{< glossary_tooltip text="命名空间" term_id="namespace" >}}的资源总消耗的约束。
资源配额还可以限制在命名空间中可以创建的[对象数量](#object-count-quota)（按 API 类型计算），
以及该命名空间中存在的 API
对象可能消耗的{{< glossary_tooltip text="基础设施资源" term_id="infrastructure-resource" >}}的总量。

{{< caution >}}
<!--
Neither contention nor changes to quota will affect already created resources.
-->
不同的资源争用，或者资源配额的更改不会影响已经创建的资源。
{{< /caution >}}

<!-- body -->

<!--
## How Kubernetes ResourceQuotas work
-->
## Kubernetes ResourceQuota 的工作原理 {#how-kubernetes-resourcequotas-work}

<!--
ResourceQuotas work like this:
-->
ResourceQuota 的工作方式如下：

<!--
- Different teams work in different namespaces. This separation can be enforced with
  [RBAC](/docs/reference/access-authn-authz/rbac/) or any other [authorization](/docs/reference/access-authn-authz/authorization/)
  mechanism.

- A cluster administrator creates at least one ResourceQuota for each namespace.
  - To make sure the enforcement stays enforced, the cluster administrator should also restrict access to delete or update
    that ResourceQuota; for example, by defining a [ValidatingAdmissionPolicy](/docs/reference/access-authn-authz/validating-admission-policy/).
-->
- 不同团队在不同的命名空间中工作。
  这种分离可以通过 [RBAC](/zh-cn/docs/reference/access-authn-authz/rbac/)
  或任何其他[鉴权](/zh-cn/docs/reference/access-authn-authz/authorization/)机制来强制执行。

- 集群管理员为每个命名空间创建至少一个 ResourceQuota。
  - 为了确保强制执行不被解除，集群管理员还应限制对删除或更新此 ResourceQuota 的访问；
    例如，通过定义一个[验证准入策略](/zh-cn/docs/reference/access-authn-authz/validating-admission-policy/)来实现这点。

<!--
- Users create resources (pods, services, etc.) in the namespace, and the quota system
  tracks usage to ensure it does not exceed hard resource limits defined in a ResourceQuota.

  You can apply a [scope](#quota-scopes) to a ResourceQuota to limit where it applies.

- If creating or updating a resource violates a quota constraint, the control plane rejects that request with HTTP
  status code `403 Forbidden`. The error includes a message explaining the constraint that would have been violated.
-->
- 当用户在命名空间下创建资源（如 Pod、Service 等）时，Kubernetes 的配额系统会跟踪集群的资源使用情况，
  以确保使用的资源用量不超过 ResourceQuota 中定义的硬性资源限额。

  你可以对 ResourceQuota 应用一个[范围](#quota-scopes)，以限制其适用的地方。

- 如果创建或更新资源违反了配额约束，控制平面将使用 HTTP 状态码
  `403 Forbidden` 拒绝该请求。错误信息包括解释将要违反的约束的说明。

<!--
- If quotas are enabled in a namespace for {{< glossary_tooltip text="resource" term_id="infrastructure-resource" >}}
  such as `cpu` and `memory`, users must specify requests or limits for those values when they define a Pod; otherwise,
  the quota system may reject pod creation.

  The resource quota [walkthrough](/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)
  shows an example of how to avoid this problem.
-->
- 如果在命名空间中为诸如 `cpu` 和 `memory`
  的{{< glossary_tooltip text="资源" term_id="infrastructure-resource" >}}启用了配额，
  用户在定义 Pod 时必须指定这些值的请求或限制；否则，配额系统可能会拒绝 Pod 创建。

  资源配额[演练](/zh-cn/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)展示了一个如何避免此问题的示例。

{{< note >}}
<!--
* You can define a [LimitRange](/docs/concepts/policy/limit-range/)
  to force defaults on pods that make no compute resource requirements (so that users don't have to remember to do that).
->
* 可以定义 [LimitRange](/docs/concepts/policy/limit-range/) 强制
  Pod 在没有计算资源需求的情况下设置默认值（这样用户就不必记住要这样做）。
{{< /note >}}

<!--
You often do not create Pods directly; for example, you more usually create a [workload management](/docs/concepts/workloads/controllers/)
object such as a {{< glossary_tooltip term_id="deployment" >}}. If you create a Deployment that tries to use more
resources than are available, the creation of the Deployment (or other workload management object) **succeeds**, but
the Deployment may not be able to get all of the Pods it manages to exist. In that case you can check the status of
the Deployment, for example with `kubectl describe`, to see what has happened.
-->
你通常不会直接创建 Pod；例如，你更常创建一个[工作负载管理](/zh-cn/docs/concepts/workloads/controllers/)对象，
如 {{< glossary_tooltip term_id="deployment" >}}。
如果你创建了一个尝试使用超出可用资源的 Deployment（或其他工作负载管理对象），
其创建**会成功**，但 Deployment 可能无法使其管理的所有 Pod 都运行起来。
在这种情况下，你可以使用 `kubectl describe` 等命令检查 Deployment 的状态，
以查看发生了什么。

<!--
- For `cpu` and `memory` resources, ResourceQuotas enforce that **every**
  (new) pod in that namespace sets a limit for that resource.
  If you enforce a resource quota in a namespace for either `cpu` or `memory`,
  you, and other clients, **must** specify either `requests` or `limits` for that resource,
  for every new Pod you submit. If you don't, the control plane may reject admission
  for that Pod.
- For other resources: ResourceQuota works and will ignore pods in the namespace without
  setting a limit or request for that resource. It means that you can create a new pod
  without limit/request ephemeral storage if the resource quota limits the ephemeral
  storage of this namespace.

You can use a [LimitRange](/docs/concepts/policy/limit-range/) to automatically set
a default request for these resources.
-->
- 对于 `cpu` 和 `memory` 资源：ResourceQuota 强制该命名空间中的**每个**（新）Pod 为该资源设置限制。
  如果你在命名空间中为 `cpu` 和 `memory` 实施资源配额，
  你或其他客户端**必须**为你提交的每个新 Pod 指定该资源的 `requests` 或 `limits`。
  否则，控制平面可能会拒绝接纳该 Pod
- 对于其他资源：ResourceQuota 可以工作，并且会忽略命名空间中的 Pod，而无需为该资源设置限制或请求。
  这意味着，如果资源配额限制了此命名空间的临时存储，则可以创建没有限制/请求临时存储的新 Pod。

你可以使用 [LimitRange](/zh-cn/docs/concepts/policy/limit-range/) 自动设置对这些资源的默认请求。

<!--
The name of a ResourceQuota object must be a valid
[DNS subdomain name](/docs/concepts/overview/working-with-objects/names#dns-subdomain-names).
-->
ResourceQuota 对象的名称必须是合法的
[DNS 子域名](/zh-cn/docs/concepts/overview/working-with-objects/names#dns-subdomain-names)。

<!--
Examples of policies that could be created using namespaces and quotas are:
-->
下面是使用命名空间和配额构建策略的示例：

<!--
- In a cluster with a capacity of 32 GiB RAM, and 16 cores, let team A use 20 GiB and 10 cores,
  let B use 10GiB and 4 cores, and hold 2GiB and 2 cores in reserve for future allocation.
- Limit the "testing" namespace to using 1 core and 1GiB RAM. Let the "production" namespace
  use any amount.
-->
- 在具有 32 GiB 内存和 16 核 CPU 资源的集群中，允许 A 团队使用 20 GiB 内存 和 10 核的 CPU 资源，
  允许 B 团队使用 10 GiB 内存和 4 核的 CPU 资源，并且预留 2 GiB 内存和 2 核的 CPU 资源供将来分配。
- 限制 "testing" 命名空间使用 1 核 CPU 资源和 1GiB 内存。允许 "production" 命名空间使用任意数量。

<!--
In the case where the total capacity of the cluster is less than the sum of the quotas of the namespaces,
there may be contention for resources. This is handled on a first-come-first-served basis.
-->
在集群容量小于各命名空间配额总和的情况下，可能存在资源竞争。资源竞争时，Kubernetes 系统会遵循先到先得的原则。

<!--
## Enabling Resource Quota

ResourceQuota support is enabled by default for many Kubernetes distributions. It is
enabled when the {{< glossary_tooltip text="API server" term_id="kube-apiserver" >}}
`--enable-admission-plugins=` flag has `ResourceQuota` as
one of its arguments.
-->
## 启用资源配额  {#enabling-resource-quota}

ResourceQuota 的支持在很多 Kubernetes 版本中是默认启用的。
当 {{< glossary_tooltip text="API 服务器" term_id="kube-apiserver" >}}
的命令行标志 `--enable-admission-plugins=` 中包含 `ResourceQuota` 时，
资源配额会被启用。

<!--
A resource quota is enforced in a particular namespace when there is a
ResourceQuota in that namespace.
-->
当命名空间中存在一个 ResourceQuota 对象时，对于该命名空间而言，资源配额就是开启的。

<!--
## Compute Resource Quota

You can limit the total sum of
[compute resources](/docs/concepts/configuration/manage-resources-containers/)
that can be requested in a given namespace.
-->
## 计算资源配额  {#compute-resource-quota}

用户可以对给定命名空间下的可被请求的
[计算资源](/zh-cn/docs/concepts/configuration/manage-resources-containers/)
总量进行限制。

<!--
The following resource types are supported:
-->
配额机制所支持的资源类型：

<!--
| Resource Name | Description |
| ------------- | ----------- |
| `limits.cpu` | Across all pods in a non-terminal state, the sum of CPU limits cannot exceed this value. |
| `limits.memory` | Across all pods in a non-terminal state, the sum of memory limits cannot exceed this value. |
| `requests.cpu` | Across all pods in a non-terminal state, the sum of CPU requests cannot exceed this value. |
| `requests.memory` | Across all pods in a non-terminal state, the sum of memory requests cannot exceed this value. |
| `hugepages-<size>` | Across all pods in a non-terminal state, the number of huge page requests of the specified size cannot exceed this value. |
| `cpu` | Same as `requests.cpu` |
| `memory` | Same as `requests.memory` |
-->
| 资源名称 | 描述 |
| ------------- | ----------- |
| `limits.cpu` | 所有非终止状态的 Pod，其 CPU 限额总量不能超过该值。 |
| `limits.memory` | 所有非终止状态的 Pod，其内存限额总量不能超过该值。 |
| `requests.cpu` | 所有非终止状态的 Pod，其 CPU 需求总量不能超过该值。 |
| `requests.memory` | 所有非终止状态的 Pod，其内存需求总量不能超过该值。 |
| `hugepages-<size>` | 对于所有非终止状态的 Pod，针对指定尺寸的巨页请求总数不能超过此值。 |
| `cpu` | 与 `requests.cpu` 相同。 |
| `memory` | 与 `requests.memory` 相同。 |

<!--
### Resource Quota For Extended Resources

In addition to the resources mentioned above, in release 1.10, quota support for
[extended resources](/docs/concepts/configuration/manage-resources-containers/#extended-resources) is added.
-->
### 扩展资源的资源配额  {#resource-quota-for-extended-resources}

除上述资源外，在 Kubernetes 1.10 版本中，
还添加了对[扩展资源](/zh-cn/docs/concepts/configuration/manage-resources-containers/#extended-resources)
的支持。

<!--
As overcommit is not allowed for extended resources, it makes no sense to specify both `requests`
and `limits` for the same extended resource in a quota. So for extended resources, only quota items
with prefix `requests.` are allowed.
-->
由于扩展资源不可超量分配，因此没有必要在配额中为同一扩展资源同时指定 `requests` 和 `limits`。
对于扩展资源而言，仅允许使用前缀为 `requests.` 的配额项。

<!--
Take the GPU resource as an example, if the resource name is `nvidia.com/gpu`, and you want to
limit the total number of GPUs requested in a namespace to 4, you can define a quota as follows:
-->
以 GPU 拓展资源为例，如果资源名称为 `nvidia.com/gpu`，并且要将命名空间中请求的 GPU
资源总数限制为 4，则可以如下定义配额：

* `requests.nvidia.com/gpu: 4`

<!--
See [Viewing and Setting Quotas](#viewing-and-setting-quotas) for more details.
-->
有关更多详细信息，请参阅[查看和设置配额](#viewing-and-setting-quotas)。

<!--
## Storage Resource Quota

You can limit the total sum of [storage resources](/docs/concepts/storage/persistent-volumes/)
that can be requested in a given namespace.

In addition, you can limit consumption of storage resources based on associated storage-class.
-->
## 存储资源配额  {#storage-resource-quota}

用户可以对给定命名空间下的[存储资源](/zh-cn/docs/concepts/storage/persistent-volumes/)
总量进行限制。

此外，还可以根据相关的存储类（Storage Class）来限制存储资源的消耗。

<!--
| Resource Name | Description |
| ------------- | ----------- |
| `requests.storage` | Across all persistent volume claims, the sum of storage requests cannot exceed this value. |
| `persistentvolumeclaims` | The total number of [PersistentVolumeClaims](/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) that can exist in the namespace. |
| `<storage-class-name>.storageclass.storage.k8s.io/requests.storage` | Across all persistent volume claims associated with the `<storage-class-name>`, the sum of storage requests cannot exceed this value. |
| `<storage-class-name>.storageclass.storage.k8s.io/persistentvolumeclaims` | Across all persistent volume claims associated with the `<storage-class-name>`, the total number of [persistent volume claims](/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) that can exist in the namespace. |
-->
| 资源名称 | 描述 |
| ------------- | ----------- |
| `requests.storage` | 所有 PVC，存储资源的需求总量不能超过该值。 |
| `persistentvolumeclaims` | 在该命名空间中所允许的 [PVC](/zh-cn/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) 总量。 |
| `<storage-class-name>.storageclass.storage.k8s.io/requests.storage` | 在所有与 `<storage-class-name>` 相关的持久卷申领中，存储请求的总和不能超过该值。 |
| `<storage-class-name>.storageclass.storage.k8s.io/persistentvolumeclaims` | 在与 storage-class-name 相关的所有持久卷申领中，命名空间中可以存在的[持久卷申领](/zh-cn/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims)总数。 |

<!--
For example, if you want to quota storage with `gold` StorageClass separate from
a `bronze` StorageClass, you can define a quota as follows:
-->
例如，如果你想要将 `gold` StorageClass 与 `bronze` StorageClass 分开进行存储配额配置，
则可以按如下方式定义配额：

* `gold.storageclass.storage.k8s.io/requests.storage: 500Gi`
* `bronze.storageclass.storage.k8s.io/requests.storage: 100Gi`

<!--
In release 1.8, quota support for local ephemeral storage is added as an alpha feature:
-->
在 Kubernetes 1.8 版本中，本地临时存储的配额支持已经是 Alpha 功能：

<!--
| Resource Name | Description |
| ------------- | ----------- |
| `requests.ephemeral-storage` | Across all pods in the namespace, the sum of local ephemeral storage requests cannot exceed this value. |
| `limits.ephemeral-storage` | Across all pods in the namespace, the sum of local ephemeral storage limits cannot exceed this value. |
| `ephemeral-storage` | Same as `requests.ephemeral-storage`. |
-->
| 资源名称 | 描述 |
| ------------- | ----------- |
| `requests.ephemeral-storage` | 在命名空间的所有 Pod 中，本地临时存储请求的总和不能超过此值。 |
| `limits.ephemeral-storage` | 在命名空间的所有 Pod 中，本地临时存储限制值的总和不能超过此值。 |
| `ephemeral-storage` | 与 `requests.ephemeral-storage` 相同。 |

{{< note >}}
<!--
When using a CRI container runtime, container logs will count against the ephemeral storage quota.
This can result in the unexpected eviction of pods that have exhausted their storage quotas.
Refer to [Logging Architecture](/docs/concepts/cluster-administration/logging/) for details.
-->
如果所使用的是 CRI 容器运行时，容器日志会被计入临时存储配额，
这可能会导致存储配额耗尽的 Pod 被意外地驱逐出节点。
参考[日志架构](/zh-cn/docs/concepts/cluster-administration/logging/)了解详细信息。
{{< /note >}}

<!--
## Object Count Quota

You can set quota for *the total number of one particular resource kind* in the Kubernetes API,
using the following syntax:

* `count/<resource>.<group>` for resources from non-core groups
* `count/<resource>` for resources from the core group
-->
## 对象数量配额  {#object-count-quota}

你可以使用以下语法为 Kubernetes API 中“一种特定资源类型的总数”设置配额：

* `count/<resource>.<group>`：用于非核心（core）组的资源
* `count/<resource>`：用于核心组的资源

<!--
Here is an example set of resources users may want to put under object count quota:
-->
这是用户可能希望利用对象计数配额来管理的一组资源示例：

* `count/persistentvolumeclaims`
* `count/services`
* `count/secrets`
* `count/configmaps`
* `count/replicationcontrollers`
* `count/deployments.apps`
* `count/replicasets.apps`
* `count/statefulsets.apps`
* `count/jobs.batch`
* `count/cronjobs.batch`

<!--
If you define a quota this way, it applies to Kubernetes' APIs that are part of the API server, and
to any custom resources backed by a CustomResourceDefinition. If you use
[API aggregation](/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/) to
add additional, custom APIs that are not defined as CustomResourceDefinitions, the core Kubernetes
control plane does not enforce quota for the aggregated API. The extension API server is expected to
provide quota enforcement if that's appropriate for the custom API.
For example, to create a quota on a `widgets` custom resource in the `example.com` API group, use `count/widgets.example.com`.
-->
如果你以这种方式定义配额，它将应用于属于 API 服务器一部分的 Kubernetes API，以及 CustomResourceDefinition
支持的任何自定义资源。
如果你使用[聚合 API](/zh-cn/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/)
添加未定义为 CustomResourceDefinitions 的其他自定义 API，则核心 Kubernetes 控制平面不会对聚合 API 实施配额管理。
如果合适，扩展 API 服务器需要为自定义 API 提供配额管理。
例如，要对 `example.com` API 组中的自定义资源 `widgets` 设置配额，请使用
`count/widgets.example.com`。

<!--
When using such a resource quota (nearly for all object kinds), an object is charged
against the quota if the object kind exists (is defined) in the control plane.
These types of quotas are useful to protect against exhaustion of storage resources. For example, you may
want to limit the number of Secrets in a server given their large size. Too many Secrets in a cluster can
actually prevent servers and controllers from starting. You can set a quota for Jobs to protect against
a poorly configured CronJob. CronJobs that create too many Jobs in a namespace can lead to a denial of service.
-->
当使用这样的资源配额（几乎涵盖所有对象类别）时，如果对象类别在控制平面中已存在（已定义），
则该对象管理会参考配额设置。
这些类型的配额有助于防止存储资源耗尽。例如，用户可能想根据服务器的存储能力来对服务器中
Secret 的数量进行配额限制。
集群中存在过多的 Secret 实际上会导致服务器和控制器无法启动。
用户可以选择对 Job 进行配额管理，以防止配置不当的 CronJob 在某命名空间中创建太多
Job 而导致集群拒绝服务。

<!--
There is another syntax only to set the same type of quota for certain resources.
The following types are supported:
-->
还有另一种语法仅用于为某些资源设置相同类型的配额。

支持以下类型：

<!--
| Resource Name | Description |
| ------------- | ----------- |
| `configmaps` | The total number of ConfigMaps that can exist in the namespace. |
| `persistentvolumeclaims` | The total number of [PersistentVolumeClaims](/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) that can exist in the namespace. |
| `pods` | The total number of Pods in a non-terminal state that can exist in the namespace.  A pod is in a terminal state if `.status.phase in (Failed, Succeeded)` is true.  |
| `replicationcontrollers` | The total number of ReplicationControllers that can exist in the namespace. |
| `resourcequotas` | The total number of ResourceQuotas that can exist in the namespace. |
| `services` | The total number of Services that can exist in the namespace. |
| `services.loadbalancers` | The total number of Services of type `LoadBalancer` that can exist in the namespace. |
| `services.nodeports` | The total number of `NodePorts` allocated to Services of type `NodePort` or `LoadBalancer` that can exist in the namespace.                                                      |
| `secrets` | The total number of Secrets that can exist in the namespace. |
-->
| 资源名称 | 描述 |
| ------------------------------- | ------------------------------------------------- |
| `configmaps` | 在该命名空间中允许存在的 ConfigMap 总数上限。 |
| `persistentvolumeclaims` | 在该命名空间中允许存在的 [PVC](/zh-cn/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) 的总数上限。 |
| `pods` | 在该命名空间中允许存在的非终止状态的 Pod 总数上限。Pod 终止状态等价于 Pod 的 `.status.phase in (Failed, Succeeded)` 为真。 |
| `replicationcontrollers` | 在该命名空间中允许存在的 ReplicationController 总数上限。 |
| `resourcequotas` | 在该命名空间中允许存在的 ResourceQuota 总数上限。 |
| `services` | 在该命名空间中允许存在的 Service 总数上限。 |
| `services.loadbalancers` | 在该命名空间中允许存在的 LoadBalancer 类型的 Service 总数上限。 |
| `services.nodeports` | 在该命名空间中允许存在的 NodePort 或 LoadBalancer 类型的 Service 的 NodePort 总数上限。 |
| `secrets` | 在该命名空间中允许存在的 Secret 总数上限。 |

<!--
For example, `pods` quota counts and enforces a maximum on the number of `pods`
created in a single namespace that are not terminal. You might want to set a `pods`
quota on a namespace to avoid the case where a user creates many small pods and
exhausts the cluster's supply of Pod IPs.
-->
例如，`pods` 配额统计某个命名空间中所创建的、非终止状态的 `pods` 个数并确保其不超过某上限值。
用户可能希望在某命名空间中设置 `pods` 配额，以避免有用户创建很多小的 Pod，
从而耗尽集群所能提供的 Pod IP 地址。

<!--
You can find more examples on [Viewing and Setting Quotas](#viewing-and-setting-quotas).
-->
你可以在[查看和设置配额](#viewing-and-setting-quotas)一节查看更多示例。

<!--
## Quota Scopes

Each quota can have an associated set of `scopes`. A quota will only measure usage for a resource if it matches
the intersection of enumerated scopes.
-->
## 配额作用域   {#quota-scopes}

每个配额都有一组相关的 `scope`（作用域），配额只会对作用域内的资源生效。
配额机制仅统计所列举的作用域的交集中的资源用量。

<!--
When a scope is added to the quota, it limits the number of resources it supports to those that pertain to the scope.
Resources specified on the quota outside of the allowed set results in a validation error.
-->
当一个作用域被添加到配额中后，它会对作用域相关的资源数量作限制。
如配额中指定了允许（作用域）集合之外的资源，会导致验证错误。

<!--
| Scope | Description |
| ----- | ----------- |
| `Terminating` | Match pods where `.spec.activeDeadlineSeconds` >= `0` |
| `NotTerminating` | Match pods where `.spec.activeDeadlineSeconds` is `nil` |
| `BestEffort` | Match pods that have best effort quality of service. |
| `NotBestEffort` | Match pods that do not have best effort quality of service. |
| `PriorityClass` | Match pods that references the specified [priority class](/docs/concepts/scheduling-eviction/pod-priority-preemption). |
| `CrossNamespacePodAffinity` | Match pods that have cross-namespace pod [(anti)affinity terms](/docs/concepts/scheduling-eviction/assign-pod-node). |
| `VolumeAttributesClass` | Match persistentvolumeclaims that references the specified [volume attributes class](/docs/concepts/storage/volume-attributes-classes). |
-->
| 作用域 | 描述 |
| ----- | ----------- |
| `Terminating` | 匹配所有 `spec.activeDeadlineSeconds` 不小于 0 的 Pod。 |
| `NotTerminating` | 匹配所有 `spec.activeDeadlineSeconds` 是 nil 的 Pod。 |
| `BestEffort` | 匹配所有 Qos 是 BestEffort 的 Pod。 |
| `NotBestEffort` | 匹配所有 Qos 不是 BestEffort 的 Pod。 |
| `PriorityClass` | 匹配所有引用了所指定的[优先级类](/zh-cn/docs/concepts/scheduling-eviction/pod-priority-preemption)的 Pod。 |
| `CrossNamespacePodAffinity` | 匹配那些设置了跨名字空间[（反）亲和性条件](/zh-cn/docs/concepts/scheduling-eviction/assign-pod-node)的 Pod。 |
| `VolumeAttributesClass` | 匹配引用了指定[卷属性类](/zh-cn/docs/concepts/storage/volume-attributes-classes)的 PersistentVolumeClaim。 |

<!--
The `BestEffort` scope restricts a quota to tracking the following resource:

* `pods`

The `Terminating`, `NotTerminating`, `NotBestEffort` and `PriorityClass`
scopes restrict a quota to tracking the following resources:
-->
`BestEffort` 作用域限制配额跟踪以下资源：

* `pods`

`Terminating`、`NotTerminating`、`NotBestEffort` 和 `PriorityClass` 这些作用域限制配额跟踪以下资源：

* `pods`
* `cpu`
* `memory`
* `requests.cpu`
* `requests.memory`
* `limits.cpu`
* `limits.memory`

<!--
Note that you cannot specify both the `Terminating` and the `NotTerminating`
scopes in the same quota, and you cannot specify both the `BestEffort` and
`NotBestEffort` scopes in the same quota either.

The `scopeSelector` supports the following values in the `operator` field:
-->
需要注意的是，你不可以在同一个配额对象中同时设置 `Terminating` 和 `NotTerminating`
作用域，你也不可以在同一个配额中同时设置 `BestEffort` 和 `NotBestEffort`
作用域。

`scopeSelector` 支持在 `operator` 字段中使用以下值：

* `In`
* `NotIn`
* `Exists`
* `DoesNotExist`

<!--
When using one of the following values as the `scopeName` when defining the
`scopeSelector`, the `operator` must be `Exists`.
-->
定义 `scopeSelector` 时，如果使用以下值之一作为 `scopeName` 的值，则对应的
`operator` 只能是 `Exists`。

* `Terminating`
* `NotTerminating`
* `BestEffort`
* `NotBestEffort`

<!--
If the `operator` is `In` or `NotIn`, the `values` field must have at least
one value. For example:
-->
如果 `operator` 是 `In` 或 `NotIn` 之一，则 `values` 字段必须至少包含一个值。
例如：

```yaml
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - middle
```

<!--
If the `operator` is `Exists` or `DoesNotExist`, the `values` field must *NOT* be
specified.
-->
如果 `operator` 为 `Exists` 或 `DoesNotExist`，则**不**可以设置 `values` 字段。

<!--
### Resource Quota Per PriorityClass
-->
### 基于优先级类（PriorityClass）来设置资源配额  {#resource-quota-per-priorityclass}

{{< feature-state for_k8s_version="v1.17" state="stable" >}}

<!--
Pods can be created at a specific [priority](/docs/concepts/scheduling-eviction/pod-priority-preemption/#pod-priority).
You can control a pod's consumption of system resources based on a pod's priority, by using the `scopeSelector`
field in the quota spec.
-->
Pod 可以创建为特定的[优先级](/zh-cn/docs/concepts/scheduling-eviction/pod-priority-preemption/#pod-priority)。
通过使用配额规约中的 `scopeSelector` 字段，用户可以根据 Pod 的优先级控制其系统资源消耗。

<!--
A quota is matched and consumed only if `scopeSelector` in the quota spec selects the pod.
-->
仅当配额规约中的 `scopeSelector` 字段选择到某 Pod 时，配额机制才会匹配和计量 Pod 的资源消耗。

<!--
When quota is scoped for priority class using `scopeSelector` field, quota object
is restricted to track only following resources:
-->
如果配额对象通过 `scopeSelector` 字段设置其作用域为优先级类，
则配额对象只能跟踪以下资源：

* `pods`
* `cpu`
* `memory`
* `ephemeral-storage`
* `limits.cpu`
* `limits.memory`
* `limits.ephemeral-storage`
* `requests.cpu`
* `requests.memory`
* `requests.ephemeral-storage`

<!--
This example creates a quota object and matches it with pods at specific priorities. The example
works as follows:
-->
本示例创建一个配额对象，并将其与具有特定优先级的 Pod 进行匹配，其工作方式如下：

<!--
- Pods in the cluster have one of the three priority classes, "low", "medium", "high".
- One quota object is created for each priority.
-->
- 集群中的 Pod 可取三个优先级类之一，即 "low"、"medium"、"high"。
- 为每个优先级创建一个配额对象。

<!--
Save the following YAML to a file `quota.yaml`.
-->
将以下 YAML 保存到文件 `quota.yaml` 中。

{{% code_sample file="policy/quota.yaml" %}}

<!--
Apply the YAML using `kubectl create`.
-->
使用 `kubectl create` 命令运行以下操作。

```shell
kubectl create -f ./quota.yaml
```

```
resourcequota/pods-high created
resourcequota/pods-medium created
resourcequota/pods-low created
```

<!--
Verify that `Used` quota is `0` using `kubectl describe quota`.
-->
使用 `kubectl describe quota` 操作验证配额的 `Used` 值为 `0`。

```shell
kubectl describe quota
```

```
Name:       pods-high
Namespace:  default
Resource    Used  Hard
--------    ----  ----
cpu         0     1k
memory      0     200Gi
pods        0     10


Name:       pods-low
Namespace:  default
Resource    Used  Hard
--------    ----  ----
cpu         0     5
memory      0     10Gi
pods        0     10


Name:       pods-medium
Namespace:  default
Resource    Used  Hard
--------    ----  ----
cpu         0     10
memory      0     20Gi
pods        0     10
```

<!--
Create a pod with priority "high". Save the following YAML to a
file `high-priority-pod.yaml`.
-->
创建优先级为 "high" 的 Pod。
将以下 YAML 保存到文件 `high-priority-pod.yaml` 中。

{{% code_sample file="policy/high-priority-pod.yaml" %}}

<!--
Apply it with `kubectl create`.
-->
使用 `kubectl create` 运行以下操作。

```shell
kubectl create -f ./high-priority-pod.yaml
```

<!--
Verify that "Used" stats for "high" priority quota, `pods-high`, has changed and that
the other two quotas are unchanged.
-->
确认 "high" 优先级配额 `pods-high` 的 "Used" 统计信息已更改，并且其他两个配额未更改。

```shell
kubectl describe quota
```

```
Name:       pods-high
Namespace:  default
Resource    Used  Hard
--------    ----  ----
cpu         500m  1k
memory      10Gi  200Gi
pods        1     10


Name:       pods-low
Namespace:  default
Resource    Used  Hard
--------    ----  ----
cpu         0     5
memory      0     10Gi
pods        0     10


Name:       pods-medium
Namespace:  default
Resource    Used  Hard
--------    ----  ----
cpu         0     10
memory      0     20Gi
pods        0     10
```

<!--
### Cross-namespace Pod Affinity Quota
-->
### 跨名字空间的 Pod 亲和性配额   {#cross-namespace-pod-affinity-quota}

{{< feature-state for_k8s_version="v1.24" state="stable" >}}

<!--
Operators can use `CrossNamespacePodAffinity` quota scope to limit which namespaces are allowed to
have pods with affinity terms that cross namespaces. Specifically, it controls which pods are allowed
to set `namespaces` or `namespaceSelector` fields in pod affinity terms.
-->
集群运维人员可以使用 `CrossNamespacePodAffinity`
配额作用域来限制哪个名字空间中可以存在包含跨名字空间亲和性规则的 Pod。
更为具体一点，此作用域用来配置哪些 Pod 可以在其 Pod 亲和性规则中设置
`namespaces` 或 `namespaceSelector` 字段。

<!--
Preventing users from using cross-namespace affinity terms might be desired since a pod
with anti-affinity constraints can block pods from all other namespaces
from getting scheduled in a failure domain.
-->
禁止用户使用跨名字空间的亲和性规则可能是一种被需要的能力，
因为带有反亲和性约束的 Pod 可能会阻止所有其他名字空间的 Pod 被调度到某失效域中。

<!--
Using this scope operators can prevent certain namespaces (`foo-ns` in the example below)
from having pods that use cross-namespace pod affinity by creating a resource quota object in
that namespace with `CrossNamespacePodAffinity` scope and hard limit of 0:
-->
使用此作用域操作符可以避免某些名字空间（例如下面例子中的 `foo-ns`）运行特别的 Pod，
这类 Pod 使用跨名字空间的 Pod 亲和性约束，在该名字空间中创建了作用域为
`CrossNamespacePodAffinity` 的、硬性约束为 0 的资源配额对象。

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: disable-cross-namespace-affinity
  namespace: foo-ns
spec:
  hard:
    pods: "0"
  scopeSelector:
    matchExpressions:
    - scopeName: CrossNamespacePodAffinity
      operator: Exists
```

<!--
If operators want to disallow using `namespaces` and `namespaceSelector` by default, and
only allow it for specific namespaces, they could configure `CrossNamespacePodAffinity`
as a limited resource by setting the kube-apiserver flag `--admission-control-config-file`
to the path of the following configuration file:
-->
如果集群运维人员希望默认禁止使用 `namespaces` 和 `namespaceSelector`，
而仅仅允许在特定命名空间中这样做，他们可以将 `CrossNamespacePodAffinity`
作为一个被约束的资源。方法是为 `kube-apiserver` 设置标志
`--admission-control-config-file`，使之指向如下的配置文件：

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: "ResourceQuota"
  configuration:
    apiVersion: apiserver.config.k8s.io/v1
    kind: ResourceQuotaConfiguration
    limitedResources:
    - resource: pods
      matchScopes:
      - scopeName: CrossNamespacePodAffinity
        operator: Exists
```

<!--
With the above configuration, pods can use `namespaces` and `namespaceSelector` in pod affinity only
if the namespace where they are created have a resource quota object with
`CrossNamespacePodAffinity` scope and a hard limit greater than or equal to the number of pods using those fields.
-->
基于上面的配置，只有名字空间中包含作用域为 `CrossNamespacePodAffinity`
且硬性约束大于或等于使用 `namespaces` 和 `namespaceSelector` 字段的 Pod
个数时，才可以在该名字空间中继续创建在其 Pod 亲和性规则中设置 `namespaces`
或 `namespaceSelector` 的新 Pod。

<!--
### Resource Quota Per VolumeAttributesClass
-->
### 按 VolumeAttributesClass 设置资源配额

{{< feature-state feature_gate_name="VolumeAttributesClass" >}}

<!--
PersistentVolumeClaims can be created with a specific [volume attributes class](/docs/concepts/storage/volume-attributes-classes/), and might be modified after creation. You can control a PVC's consumption of storage resources based on the associated volume attributes classes, by using the `scopeSelector` field in the quota spec.

The PVC references the associated volume attributes class by the following fields:
-->
PersistentVolumeClaim（PVC）可以在创建时指定一个特定的[卷属性类](/zh-cn/docs/concepts/storage/volume-attributes-classes/)，
并且在创建后也可以进行修改。你可以通过在配额规约中使用 `scopeSelector`
字段，基于关联的卷属性类来控制 PVC 对存储资源的消耗。

PVC 通过以下字段引用关联的卷属性类：

* `spec.volumeAttributesClassName`
* `status.currentVolumeAttributesClassName`
* `status.modifyVolumeStatus.targetVolumeAttributesClassName`

<!--
A quota is matched and consumed only if `scopeSelector` in the quota spec selects the PVC.

When the quota is scoped for the volume attributes class using the `scopeSelector` field, the quota object is restricted to track only the following resources:
-->
仅当配额规约中的 `scopeSelector` 选择 PVC 时，配额才会被匹配并计入消耗。

当使用 `scopeSelector` 字段为卷属性类限定配额范围时，配额对象只会跟踪以下资源：

* `persistentvolumeclaims`
* `requests.storage`

<!--
This example creates a quota object and matches it with PVC at specific volume attributes classes. The example works as follows:

- PVCs in the cluster have at least one of the three volume attributes classes, "gold", "silver", "copper".
- One quota object is created for each volume attributes class.

Save the following YAML to a file `quota-vac.yaml`.
-->
以下示例创建一个配额对象，并将其与具有特定卷属性类的 PVC 进行匹配。示例逻辑如下：

- 集群中的 PVC 至少属于三个卷属性类之一：“gold”、“silver”、“copper”。
- 为每个卷属性类分别创建一个配额对象。

将以下 YAML 保存为文件 `quota-vac.yaml`：

{{% code_sample file="policy/quota-vac.yaml" %}}

<!--
Apply the YAML using `kubectl create`.
-->
使用 `kubectl create` 应用 YAML 文件：

```shell
kubectl create -f ./quota-vac.yaml
```

```
resourcequota/pvcs-gold created
resourcequota/pvcs-silver created
resourcequota/pvcs-copper created
```

<!--
Verify that `Used` quota is `0` using `kubectl describe quota`.
-->
使用 `kubectl describe quota` 验证 `Used` 配额为 `0`：

```shell
kubectl describe quota
```

```
Name:                   pvcs-gold
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     10Gi


Name:                   pvcs-silver
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     20Gi


Name:                   pvcs-copper
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     30Gi
```

<!--
Create a pvc with volume attributes class "gold". Save the following YAML to a file `gold-vac-pvc.yaml`.
-->
创建一个卷属性类为 "gold" 的 PVC。将以下 YAML 保存为文件 `gold-vac-pvc.yaml`：

{{% code_sample file="policy/gold-vac-pvc.yaml" %}}

<!--
Apply it with `kubectl create`.
-->
使用 `kubectl create` 应用此 YAML：

```shell
kubectl create -f ./gold-vac-pvc.yaml
```

<!--
Verify that "Used" stats for "gold" volume attributes class quota, `pvcs-gold` has changed and that the other two quotas are unchanged.
-->
验证 “gold” 卷属性类配额的 "Used" 统计，`pvcs-gold` 已发生了变化，而另外两个配额没有变化：

```shell
kubectl describe quota
```

```
Name:                   pvcs-gold
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   10Gi


Name:                   pvcs-silver
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     20Gi


Name:                   pvcs-copper
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     30Gi
```

<!--
Once the PVC is bound, it is allowed to modify the desired volume attributes class. Let's change it to "silver" with kubectl patch.
-->
一旦 PVC 被绑定，就允许修改预期卷属性类。使用 `kubectl patch` 将其修改为 "silver"：

```shell
kubectl patch pvc gold-vac-pvc --type='merge' -p '{"spec":{"volumeAttributesClassName":"silver"}}'
```

<!--
Verify that "Used" stats for "silver" volume attributes class quota, `pvcs-silver` has changed, `pvcs-copper` is unchanged, and `pvcs-gold` might be unchanged or released, which depends on the PVC's status.
-->
验证 “silver” 卷属性类配额的 “Used” 统计，`pvcs-silver` 已发生变化，
`pvcs-copper` 没有变化，`pvcs-gold` 可能没有变化或已释放（具体取决于 PVC 的状态）：

```shell
kubectl describe quota
```

```
Name:                   pvcs-gold
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   10Gi


Name:                   pvcs-silver
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   20Gi


Name:                   pvcs-copper
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     30Gi
```

<!--
Let's change it to "copper" with kubectl patch.
-->
使用 `kubectl patch` 将其修改为 "copper"：

```shell
kubectl patch pvc gold-vac-pvc --type='merge' -p '{"spec":{"volumeAttributesClassName":"copper"}}'
```

<!--
Verify that "Used" stats for "copper" volume attributes class quota, `pvcs-copper` has changed, `pvcs-silver` and `pvcs-gold` might be unchanged or released, which depends on the PVC's status.
-->
验证 "copper" 卷属性类配额的 “Used” 统计，`pvcs-copper` 已经发生变化，
`pvcs-silver` 和 `pvcs-gold` 可能没有变化或已释放（取决于 PVC 的状态）。

```shell
kubectl describe quota
```

```
Name:                   pvcs-gold
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   10Gi


Name:                   pvcs-silver
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   20Gi


Name:                   pvcs-copper
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   30Gi
```

<!--
Print the manifest of the PVC using the following command:
-->
使用以下命令打印 PVC 的清单：

```shell
kubectl get pvc gold-vac-pvc -o yaml
```

<!--
It might show the following output:
-->
可能会显示如下输出：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gold-vac-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
  storageClassName: default
  volumeAttributesClassName: copper
status:
  accessModes:
    - ReadWriteOnce
  capacity:
    storage: 2Gi
  currentVolumeAttributesClassName: gold
  phase: Bound
  modifyVolumeStatus:
    status: InProgress
    targetVolumeAttributesClassName: silver
  storageClassName: default
```

<!--
Wait a moment for the volume modification to complete, then verify the quota again.
-->
稍等片刻，待卷修改完成后，再次验证配额：

```shell
kubectl describe quota
```

```
Name:                   pvcs-gold
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     10Gi


Name:                   pvcs-silver
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  0     10
requests.storage        0     20Gi


Name:                   pvcs-copper
Namespace:              default
Resource                Used  Hard
--------                ----  ----
persistentvolumeclaims  1     10
requests.storage        2Gi   30Gi
```

<!--
## Requests compared to Limits {#requests-vs-limits}

When allocating compute resources, each container may specify a request and a limit value for either CPU or memory.
The quota can be configured to quota either value.
-->
## 请求与限制的比较   {#requests-vs-limits}

分配计算资源时，每个容器可以为 CPU 或内存指定请求和约束。
配额可以针对二者之一进行设置。

<!--
If the quota has a value specified for `requests.cpu` or `requests.memory`, then it requires that every incoming
container makes an explicit request for those resources. If the quota has a value specified for `limits.cpu` or `limits.memory`,
then it requires that every incoming container specifies an explicit limit for those resources.
-->
如果配额中指定了 `requests.cpu` 或 `requests.memory` 的值，则它要求每个容器都显式给出对这些资源的请求。
同理，如果配额中指定了 `limits.cpu` 或 `limits.memory` 的值，那么它要求每个容器都显式设定对应资源的限制。

<!--
## Viewing and Setting Quotas

kubectl supports creating, updating, and viewing quotas:
-->
## 查看和设置配额   {#viewing-and-setting-quotas}

kubectl 支持创建、更新和查看配额：

```shell
kubectl create namespace myspace
```

```shell
cat <<EOF > compute-resources.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
spec:
  hard:
    requests.cpu: "1"
    requests.memory: "1Gi"
    limits.cpu: "2"
    limits.memory: "2Gi"
    requests.nvidia.com/gpu: 4
EOF
```

```shell
kubectl create -f ./compute-resources.yaml --namespace=myspace
```

```shell
cat <<EOF > object-counts.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-counts
spec:
  hard:
    configmaps: "10"
    persistentvolumeclaims: "4"
    pods: "4"
    replicationcontrollers: "20"
    secrets: "10"
    services: "10"
    services.loadbalancers: "2"
EOF
```

```shell
kubectl create -f ./object-counts.yaml --namespace=myspace
```

```shell
kubectl get quota --namespace=myspace
```

```none
NAME                    AGE
compute-resources       30s
object-counts           32s
```

```shell
kubectl describe quota compute-resources --namespace=myspace
```

```none
Name:                    compute-resources
Namespace:               myspace
Resource                 Used  Hard
--------                 ----  ----
limits.cpu               0     2
limits.memory            0     2Gi
requests.cpu             0     1
requests.memory          0     1Gi
requests.nvidia.com/gpu  0     4
```

```shell
kubectl describe quota object-counts --namespace=myspace
```

```none
Name:                   object-counts
Namespace:              myspace
Resource                Used    Hard
--------                ----    ----
configmaps              0       10
persistentvolumeclaims  0       4
pods                    0       4
replicationcontrollers  0       20
secrets                 1       10
services                0       10
services.loadbalancers  0       2
```

<!--
kubectl also supports object count quota for all standard namespaced resources
using the syntax `count/<resource>.<group>`:
-->
kubectl 还使用语法 `count/<resource>.<group>` 支持所有标准的、命名空间域的资源的对象计数配额：

```shell
kubectl create namespace myspace
```

```shell
kubectl create quota test --hard=count/deployments.apps=2,count/replicasets.apps=4,count/pods=3,count/secrets=4 --namespace=myspace
```

```shell
kubectl create deployment nginx --image=nginx --namespace=myspace --replicas=2
```

```shell
kubectl describe quota --namespace=myspace
```

```
Name:                         test
Namespace:                    myspace
Resource                      Used  Hard
--------                      ----  ----
count/deployments.apps        1     2
count/pods                    2     3
count/replicasets.apps        1     4
count/secrets                 1     4
```

<!--
## Quota and Cluster Capacity

ResourceQuotas are independent of the cluster capacity. They are
expressed in absolute units. So, if you add nodes to your cluster, this does *not*
automatically give each namespace the ability to consume more resources.
-->
## 配额和集群容量   {#quota-and-cluster-capacity}

ResourceQuota 与集群资源总量是完全独立的。它们通过绝对的单位来配置。
所以，为集群添加节点时，资源配额**不会**自动赋予每个命名空间消耗更多资源的能力。

<!--
Sometimes more complex policies may be desired, such as:

- Proportionally divide total cluster resources among several teams.
- Allow each tenant to grow resource usage as needed, but have a generous
  limit to prevent accidental resource exhaustion.
- Detect demand from one namespace, add nodes, and increase quota.
-->
有时可能需要资源配额支持更复杂的策略，比如：

- 在几个团队中按比例划分总的集群资源。
- 允许每个租户根据需要增加资源使用量，但要有足够的限制以防止资源意外耗尽。
- 探测某个命名空间的需求，添加物理节点并扩大资源配额值。

<!--
Such policies could be implemented using `ResourceQuotas` as building blocks, by
writing a "controller" that watches the quota usage and adjusts the quota
hard limits of each namespace according to other signals.
-->
这些策略可以通过将资源配额作为一个组成模块、手动编写一个控制器来监控资源使用情况，
并结合其他信号调整命名空间上的硬性资源配额来实现。

<!--
Note that resource quota divides up aggregate cluster resources, but it creates no
restrictions around nodes: pods from several namespaces may run on the same node.
-->
注意：资源配额对集群资源总体进行划分，但它对节点没有限制：来自不同命名空间的 Pod 可能在同一节点上运行。

<!--
## Limit Priority Class consumption by default

It may be desired that pods at a particular priority, such as "cluster-services",
should be allowed in a namespace, if and only if, a matching quota object exists.
-->
## 默认情况下限制特定优先级的资源消耗  {#limit-priority-class-consumption-by-default}

有时候可能希望当且仅当某名字空间中存在匹配的配额对象时，才可以创建特定优先级
（例如 "cluster-services"）的 Pod。

<!--
With this mechanism, operators are able to restrict usage of certain high
priority classes to a limited number of namespaces and not every namespace
will be able to consume these priority classes by default.
-->
通过这种机制，操作人员能够限制某些高优先级类仅出现在有限数量的命名空间中，
而并非每个命名空间默认情况下都能够使用这些优先级类。

<!--
To enforce this, `kube-apiserver` flag `--admission-control-config-file` should be
used to pass path to the following configuration file:
-->
要实现此目的，应设置 `kube-apiserver` 的标志 `--admission-control-config-file` 
指向如下配置文件：

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: "ResourceQuota"
  configuration:
    apiVersion: apiserver.config.k8s.io/v1
    kind: ResourceQuotaConfiguration
    limitedResources:
    - resource: pods
      matchScopes:
      - scopeName: PriorityClass
        operator: In
        values: ["cluster-services"]
```

<!--
Then, create a resource quota object in the `kube-system` namespace:
-->
现在在 `kube-system` 名字空间中创建一个资源配额对象：

{{% code_sample file="policy/priority-class-resourcequota.yaml" %}}

```shell
kubectl apply -f https://k8s.io/examples/policy/priority-class-resourcequota.yaml -n kube-system
```

```none
resourcequota/pods-cluster-services created
```

<!--
In this case, a pod creation will be allowed if:

1. the Pod's `priorityClassName` is not specified.
1. the Pod's `priorityClassName` is specified to a value other than `cluster-services`.
1. the Pod's `priorityClassName` is set to `cluster-services`, it is to be created
   in the `kube-system` namespace, and it has passed the resource quota check.
-->
在这里，当以下条件满足时可以创建 Pod：

1. Pod 未设置 `priorityClassName`
1. Pod 的 `priorityClassName` 设置值不是 `cluster-services`
1. Pod 的 `priorityClassName` 设置值为 `cluster-services`，它将被创建于
   `kube-system` 名字空间中，并且它已经通过了资源配额检查。

<!--
A Pod creation request is rejected if its `priorityClassName` is set to `cluster-services`
and it is to be created in a namespace other than `kube-system`.
-->
如果 Pod 的 `priorityClassName` 设置为 `cluster-services`，但要被创建到
`kube-system` 之外的别的名字空间，则 Pod 创建请求也被拒绝。

## {{% heading "whatsnext" %}}

<!--
- See a [detailed example for how to use resource quota](/docs/tasks/administer-cluster/quota-api-object/).
- Read the ResourceQuota [API reference](/docs/reference/kubernetes-api/policy-resources/resource-quota-v1/)
- Learn about [LimitRanges](/docs/concepts/policy/limit-range/)
- You can read the historical [ResourceQuota design document](https://git.k8s.io/design-proposals-archive/resource-management/admission_control_resource_quota.md)
  for more information.
- You can also read the [Quota support for priority class design document](https://git.k8s.io/design-proposals-archive/scheduling/pod-priority-resourcequota.md).
-->
- 参阅[如何使用资源配额的详细示例](/zh-cn/docs/tasks/administer-cluster/quota-api-object/)。
- 阅读 ResourceQuota [API 参考](/zh-cn/docs/reference/kubernetes-api/policy-resources/resource-quota-v1/)
- 了解 [LimitRanges](/zh-cn/docs/concepts/policy/limit-range/)
- 你可以阅读历史的
  [ResourceQuota 设计文档](https://git.k8s.io/design-proposals-archive/resource-management/admission_control_resource_quota.md)获取更多信息。
- 你也可以阅读[优先级类配额支持设计文档](https://git.k8s.io/design-proposals-archive/scheduling/pod-priority-resourcequota.md)。
