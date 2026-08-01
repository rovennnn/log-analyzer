"""
Generates two synthetic sample log files so a visitor can try the dashboard
without needing their own logs:

  - ecommerce-api-48h.jsonl   ~48h of normal traffic with one incident spike
  - checkout-service-6h.jsonl ~6h, smaller/denser file, a second payment-gateway incident

Entirely synthetic — no real traffic, users, or IPs. Safe to commit.
"""
import json
import random
from datetime import datetime, timedelta, timezone

random.seed(42)

SERVICES = ["checkout-api", "catalog-api", "auth-api", "search-api"]

ROUTES = [
    ("GET", "/api/catalog/products"),
    ("GET", "/api/catalog/products/{id}"),
    ("GET", "/api/search"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/refresh"),
    ("GET", "/api/cart/{id}"),
    ("POST", "/api/cart/{id}/items"),
    ("POST", "/api/checkout"),
    ("GET", "/api/checkout/{id}/status"),
    ("POST", "/api/payments/charge"),
    ("GET", "/api/users/{id}/orders"),
    ("GET", "/api/health"),
]

# routes that are naturally slower (simulate real-world variance)
SLOW_ROUTES = {"/api/search", "/api/checkout", "/api/payments/charge", "/api/catalog/products"}

ERROR_MESSAGES = [
    ("error", 500, "Payment gateway timeout: connection reset by peer"),
    ("error", 502, "Upstream inventory service returned invalid response"),
    ("error", 500, "Unhandled exception in order total calculation"),
    ("error", 503, "Database connection pool exhausted"),
    ("warn", 429, "Rate limit exceeded for client"),
    ("error", 500, "Redis cache miss cascade caused timeout"),
    ("error", 404, "Requested product SKU not found"),
    ("error", 401, "JWT signature verification failed"),
    ("fatal", 500, "Out of memory while serializing response"),
]


def rand_ip():
    return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def gen_line(ts, incident=False):
    method, path = random.choice(ROUTES)
    service = random.choice(SERVICES)
    request_id = f"{random.randint(0, 0xffffffff):08x}"
    ip = rand_ip()

    base_latency = random.gauss(60, 20) if path not in SLOW_ROUTES else random.gauss(220, 90)
    base_latency = max(base_latency, 5)

    # incident window: elevated error rate + elevated latency on checkout/payments
    incident_relevant = path in ("/api/checkout", "/api/payments/charge")
    error_chance = 0.02
    if incident and incident_relevant:
        error_chance = 0.55
        base_latency *= random.uniform(2.5, 6)
    elif incident:
        error_chance = 0.05

    if random.random() < error_chance:
        level, status, message = random.choice(ERROR_MESSAGES)
        duration = base_latency * random.uniform(1.2, 3.0)
    else:
        level = "info"
        status = random.choices([200, 201, 204, 301, 304], weights=[80, 8, 5, 4, 3])[0]
        message = "request completed"
        duration = base_latency

    return {
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z",
        "level": level,
        "service": service,
        "method": method,
        "path": path,
        "status": status,
        "duration_ms": round(duration, 1),
        "ip": ip,
        "request_id": request_id,
        "message": message,
    }


def generate(start, hours, avg_requests_per_min, incident_windows, out_path):
    lines = []
    t = start
    end = start + timedelta(hours=hours)
    while t < end:
        in_incident = any(w0 <= t <= w1 for w0, w1 in incident_windows)
        n = max(1, int(random.gauss(avg_requests_per_min, avg_requests_per_min * 0.25)))
        if in_incident:
            n = int(n * 1.4)  # incidents often correlate with traffic spikes too
        for _ in range(n):
            jitter = timedelta(seconds=random.uniform(0, 59))
            lines.append(gen_line(t + jitter, incident=in_incident))
        t += timedelta(minutes=1)

    lines.sort(key=lambda l: l["timestamp"])
    with open(out_path, "w") as f:
        for l in lines:
            f.write(json.dumps(l) + "\n")
    print(f"Wrote {len(lines)} lines to {out_path}")


if __name__ == "__main__":
    start1 = datetime(2026, 7, 13, 0, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
    generate(
        start=start1,
        hours=36,
        avg_requests_per_min=5,
        incident_windows=[(start1 + timedelta(hours=22), start1 + timedelta(hours=22, minutes=25))],
        out_path="ecommerce-api-36h.jsonl",
    )

    start2 = datetime(2026, 7, 20, 9, 0, 0)
    generate(
        start=start2,
        hours=4,
        avg_requests_per_min=10,
        incident_windows=[(start2 + timedelta(hours=1, minutes=40), start2 + timedelta(hours=2, minutes=10))],
        out_path="checkout-service-4h.jsonl",
    )
