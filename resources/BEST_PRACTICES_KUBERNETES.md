# ✅ Monitoring Best Practices in Kubernetes

---

## 1. Separate Namespace

Deploy Prometheus and Grafana in a dedicated namespace (e.g., `monitoring`) to isolate observability tools from application microservices. This brings benefits like:

- Easier user permission management
- Resource limits (CPU/memory) via Kubernetes quotas
- Clear separation for upgrades, troubleshooting, and maintenance

---

## 2. Persistent Volumes

Ensure that Prometheus and Grafana retain important data across restarts:

- Use Persistent Volumes (PVs) for Prometheus to keep historical metrics
- Use PVs for Grafana to persist dashboards and configuration

---

## 3. Label-Based Discovery

Label your services and pods consistently so Prometheus can discover them automatically. This ensures that metrics are still collected after updates or scaling.

Recommended labels:

```yaml
app: my-service
monitoring: "true"
```

PrometheusSelector Example:

```yaml
matchLabels:
  monitoring: "true"
```

---

## 4. Use ServiceMonitor / PodMonitor

Use special configuration files called ServiceMonitor and PodMonitor to tell Prometheus which services or pods it should collect data from. These objects are part of the Prometheus Operator and help define what Prometheus should monitor. They automatically adapt to changes in your deployments.

---

## 5. Dashboards as Code

Avoid manual configuration in environments:

- Store Grafana dashboards as version-controlled files (JSON)
- Use Helm or config maps to provision dashboards and data sources
- This ensures consistency and easier collaboration

---

## 6. Optional: Access Control

Secure your monitoring tools:

- Protect Prometheus and Grafana with authentication (e.g., via Rancher)
- Use TLS for encrypted connections
- Apply role-based access control (RBAC) to manage user permissions

---

## 7. Version Visibility

Expose application version information as a custom Prometheus metric:

- Helps track which version is currently deployed
- Makes it easier to correlate performance changes or issues with specific releases
- Visualize versions in Grafana dashboards

---

## 8. Alerting Rules

Set up meaningful and actionable alerts:

1. Define rules such as:
   - High error rate
   - Pod restart count > 5
   - Slow response time
2. Use PrometheusRule CRDs (Custom Resource Definitions) if working with Prometheus Operator
3. Connect to Alertmanager for routing alerts to:
   - Email
   - Slack
   - PagerDuty
