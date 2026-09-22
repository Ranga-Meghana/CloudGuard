"""API tests. Run:  pytest -q   (from the backend folder)"""


def test_health_is_public(client):
    client.environ_base.pop("HTTP_AUTHORIZATION")
    body = client.get("/api/health").get_json()
    assert body["status"] == "ok" and body["demo_environment"] is True


def test_auth_required_and_login(client):
    token = client.environ_base.pop("HTTP_AUTHORIZATION")
    assert client.get("/api/dashboard").status_code == 401
    bad = client.post("/api/auth/login", json={"email": "demo@cloudguard.io", "password": "nope"})
    assert bad.status_code == 401
    ok = client.post("/api/auth/login", json={"email": "demo@cloudguard.io", "password": "Demo@1234"})
    assert ok.status_code == 200 and ok.get_json()["user"]["name"] == "Meghana"
    assert "password_hash" not in ok.get_json()["user"]
    assert token


def test_seed_data_is_populated(client):
    assert client.get("/api/resources").get_json()["count"] == 24
    dash = client.get("/api/dashboard").get_json()
    assert dash["summary"]["total_resources"]["value"] == 24
    assert dash["summary"]["security_score"]["value"] == 92
    assert dash["summary"]["active_alerts"]["value"] == 7
    assert len(dash["anomalies"]) >= 3


def test_resource_filters_and_detail(client):
    compute = client.get("/api/resources?type=compute").get_json()
    assert compute["count"] == 10
    assert client.get("/api/resources?q=bucket").get_json()["count"] == 4
    detail = client.get("/api/resources/res-003").get_json()
    assert detail["name"] == "EC2-Production-03" and len(detail["series"]) == 72
    assert detail["findings"] and client.get("/api/resources/nope").status_code == 404


def test_security_scan_and_resolve(client):
    scan = client.post("/api/security/scan").get_json()
    assert scan["total_findings"] == 11
    assert scan["counts"] == {"critical": 1, "high": 3, "medium": 5, "low": 2}
    resp = client.patch("/api/security/findings/f-public_storage-res-014", json={"status": "resolved"})
    assert resp.status_code == 200 and resp.get_json()["score"] > 92
    assert client.post("/api/security/scan").get_json()["total_findings"] == 10  # fix persisted
    assert client.patch("/api/security/findings/x", json={"status": "bogus"}).status_code == 400


def test_anomaly_detection(client):
    items = client.get("/api/analytics/anomalies").get_json()["items"]
    names = {(a["resource_name"], a["metric"]) for a in items}
    assert ("EC2-Production-03", "cpu") in names
    cpu = next(a for a in items if a["resource_name"] == "EC2-Production-03")
    assert cpu["message"] == "Anomalous CPU spike detected" and cpu["value"] == 96


def test_costs_and_apply_recommendation(client):
    before = client.get("/api/costs/summary").get_json()
    assert before["change_pct"] == -12.4 and before["potential_savings"] > 0
    rec = client.patch("/api/recommendations/rec-downsize-res-004", json={"status": "applied"}).get_json()
    assert rec["item"]["status"] == "applied"
    after = client.get("/api/costs/summary").get_json()
    assert round(before["monthly_cost"] - after["monthly_cost"], 2) == 18.0
    assert client.patch("/api/recommendations/rec-downsize-res-004", json={"status": "applied"}).status_code == 400


def test_analytics_ranges(client):
    for rng, minimum in (("24h", 24), ("7d", 40), ("30d", 29), ("90d", 89)):
        body = client.get(f"/api/analytics?range={rng}").get_json()
        assert len(body["series"]) >= minimum and body["insights"]
    assert client.get("/api/analytics?range=1y").status_code == 400
    assert len(client.get("/api/metrics?range=1h").get_json()["series"]) == 60


def test_alerts_lifecycle(client):
    alerts = client.get("/api/alerts?status=open").get_json()
    assert alerts["count"] == 7
    aid = alerts["items"][0]["_id"]
    assert client.patch(f"/api/alerts/{aid}", json={"read": True}).status_code == 200
    assert client.patch(f"/api/alerts/{aid}", json={"status": "resolved"}).get_json()["item"]["status"] == "resolved"
    assert client.patch(f"/api/alerts/{aid}", json={"nope": 1}).status_code == 400
    assert client.delete(f"/api/alerts/{aid}").get_json()["deleted"] is True
    assert client.delete(f"/api/alerts/{aid}").status_code == 404
    assert client.post("/api/alerts/read-all").get_json()["counts"]["unread"] == 0


def test_resource_actions_and_refresh(client):
    stopped = client.post("/api/resources/res-002/action", json={"action": "stop"}).get_json()
    assert stopped["status"] == "stopped"
    assert client.post("/api/resources/res-002/action", json={"action": "stop"}).status_code == 400
    assert client.post("/api/resources/res-002/action", json={"action": "start"}).get_json()["status"] == "running"
    assert client.post("/api/resources/res-011/action", json={"action": "stop"}).status_code == 400
    refreshed = client.post("/api/refresh").get_json()
    assert "refreshed_at" in refreshed and "cpu" in refreshed["utilization"]


def test_profile_settings(client):
    resp = client.patch("/api/profile", json={"settings": {"appearance": {"accent": "violet"}}})
    assert resp.get_json()["settings"]["appearance"]["accent"] == "violet"
    assert client.patch("/api/profile", json={"settings": {"appearance": {"accent": "pink"}}}).status_code == 400
