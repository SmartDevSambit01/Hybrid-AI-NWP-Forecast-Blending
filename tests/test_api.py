"""
API Endpoint Tests for FastAPI Backend.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Ministry of Earth Sciences" in data["organization"]


def test_config_endpoint():
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert len(data["forecast_sources"]) >= 4


def test_models_endpoint():
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_forecasts_endpoint():
    response = client.get("/api/forecasts")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_observations_endpoint():
    response = client.get("/api/observations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_model_health_endpoint():
    response = client.get("/api/model-health")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_model_weights_endpoint():
    response = client.get("/api/model-weights")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_verification_endpoint():
    response = client.get("/api/verification")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
